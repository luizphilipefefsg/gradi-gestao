import React, { useState } from 'react';
import {
  FileBarChart,
  FileText,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Layers,
  ReceiptText,
  Printer,
  Table,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, formatWhatsApp } from '../../utils/formatters';
import {
  gerarPdfResumoLucro,
  gerarPdfVendas,
  gerarPdfMaisVendidos,
  gerarPdfCrediario,
  gerarPdfEstoque,
  exportarCsv,
} from '../../utils/reportPdf';

type TipoRelatorio = 'resumo_lucro' | 'vendas' | 'mais_vendidos' | 'crediario' | 'estoque';

export const RelatoriosScreen: React.FC = () => {
  const { vendas, contasPagar, contasReceber, produtos, clientes } = useStore();
  const { usuarioSistema } = useAuth();
  const nomeLoja = usuarioSistema?.nomeLoja || 'GRADI GESTÃO';

  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>('resumo_lucro');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Filtros de Data
  const hojeStr = new Date().toISOString().split('T')[0];
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const seteDiasAtrasStr = seteDiasAtras.toISOString().split('T')[0];
  const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const primeiroDiaMesStr = primeiroDiaMes.toISOString().split('T')[0];

  const [dataAte, setDataAte] = useState<string>('');
  const [dataDe, setDataDe] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Descrição legível do período selecionado
  const periodoDesc =
    dataDe && dataAte
      ? `${formatDate(dataDe)} até ${formatDate(dataAte)}`
      : dataAte
      ? `Até ${formatDate(dataAte)}`
      : dataDe
      ? `A partir de ${formatDate(dataDe)}`
      : 'Histórico Completo';

  // 1. DADOS DE VENDAS FILTRADAS
  const vendasFiltradas = vendas.filter(v => {
    if (v.status !== 'finalizada') return false;
    const dataVendaDia = v.data_venda ? v.data_venda.split('T')[0] : '';
    if (dataDe && dataVendaDia < dataDe) return false;
    if (dataAte && dataVendaDia > dataAte) return false;
    return true;
  });

  // Faturamento e CMV
  const faturamentoBruto = vendasFiltradas.reduce((acc, v) => acc + v.total, 0);
  let cmvTotal = 0;
  vendasFiltradas.forEach(v => {
    v.itens.forEach(it => {
      cmvTotal += (it.preco_custo_unitario || 0) * it.quantidade;
    });
  });

  const totalPecasVendidas = vendasFiltradas.reduce(
    (acc, v) => acc + v.itens.reduce((iAcc, it) => iAcc + it.quantidade, 0),
    0
  );

  // Despesas pagas no período
  const despesasPagas = contasPagar
    .filter(cp => {
      if (cp.status !== 'pago') return false;
      const dataPgto = cp.data_pagamento || cp.data_vencimento;
      if (dataDe && dataPgto < dataDe) return false;
      if (dataAte && dataPgto > dataAte) return false;
      return true;
    })
    .reduce((acc, cp) => acc + cp.valor, 0);

  const lucroBruto = Math.max(0, faturamentoBruto - cmvTotal);
  const margemBrutaPercentual =
    faturamentoBruto > 0 ? Math.round((lucroBruto / faturamentoBruto) * 100) : 0;
  const lucroLiquidoEstimado = lucroBruto - despesasPagas;
  const ticketMedio = vendasFiltradas.length > 0 ? faturamentoBruto / vendasFiltradas.length : 0;

  const crediarioTotalPeriodo = vendasFiltradas
    .filter(v => v.forma_pagamento === 'crediario')
    .reduce((acc, v) => acc + v.total, 0);

  // Formas de pagamento agrupadas
  const formasMap: { [forma: string]: { total: number; qtd: number } } = {};
  vendasFiltradas.forEach(v => {
    const f = v.forma_pagamento || 'outros';
    if (!formasMap[f]) formasMap[f] = { total: 0, qtd: 0 };
    formasMap[f].total += v.total;
    formasMap[f].qtd += 1;
  });

  const formasPagamento = Object.entries(formasMap).map(([k, v]) => ({
    forma: formatarNomeFormaPagamento(k),
    total: v.total,
    qtd: v.qtd,
  }));

  // Ranking de produtos mais vendidos
  const rankingMap: {
    [prodId: string]: {
      nome: string;
      categoria: string;
      quantidade: number;
      receita: number;
      custoTotal: number;
    };
  } = {};

  vendasFiltradas.forEach(v => {
    v.itens.forEach(it => {
      if (!rankingMap[it.produto_id]) {
        const prodRef = produtos.find(p => p.id === it.produto_id);
        rankingMap[it.produto_id] = {
          nome: it.produto_nome,
          categoria: prodRef?.categoria || 'Geral',
          quantidade: 0,
          receita: 0,
          custoTotal: 0,
        };
      }
      rankingMap[it.produto_id].quantidade += it.quantidade;
      rankingMap[it.produto_id].receita += it.subtotal;
      rankingMap[it.produto_id].custoTotal += (it.preco_custo_unitario || 0) * it.quantidade;
    });
  });

  const maisVendidosLista = Object.values(rankingMap)
    .sort((a, b) => b.quantidade - a.quantidade)
    .map((item, idx) => {
      const lucroEst = Math.max(0, item.receita - item.custoTotal);
      const margem = item.receita > 0 ? Math.round((lucroEst / item.receita) * 100) : 0;
      return {
        rank: idx + 1,
        nome: item.nome,
        categoria: item.categoria,
        quantidade: item.quantidade,
        receita: item.receita,
        custoMedio: item.quantidade > 0 ? item.custoTotal / item.quantidade : 0,
        lucroEstimado: lucroEst,
        margem,
      };
    });

  // 4. CREDIÁRIO
  const todasParcelasCrediario: {
    clienteNome: string;
    whatsapp: string;
    parcelaInfo: string;
    vencimento: string;
    valor: number;
    status: string;
    diasAtraso?: number;
  }[] = [];

  vendas.forEach(v => {
    if (v.status === 'finalizada' && v.parcelas) {
      v.parcelas.forEach(p => {
        if (dataDe && p.data_vencimento < dataDe) return;
        if (dataAte && p.data_vencimento > dataAte) return;

        const cli = clientes.find(c => c.id === p.cliente_id);
        const isAtrasado = p.status !== 'pago' && p.data_vencimento < hojeStr;
        let dias = 0;
        if (isAtrasado) {
          const diff = new Date(hojeStr).getTime() - new Date(p.data_vencimento).getTime();
          dias = Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
        }

        todasParcelasCrediario.push({
          clienteNome: cli?.nome || v.cliente_nome || 'Cliente',
          whatsapp: cli?.whatsapp || v.cliente_whatsapp || '',
          parcelaInfo: `${p.numero_parcela}/${p.total_parcelas}`,
          vencimento: p.data_vencimento,
          valor: p.valor,
          status: p.status === 'pago' ? 'pago' : isAtrasado ? 'atrasado' : 'aberto',
          diasAtraso: dias,
        });
      });
    }
  });

  // --- FUNÇÕES DE DOWNLOAD DE RELATÓRIO ---
  const handleBaixarPdf = () => {
    try {
      const sufixoData = hojeStr;
      if (tipoRelatorio === 'resumo_lucro') {
        const doc = gerarPdfResumoLucro({
          periodoDesc,
          faturamentoBruto,
          cmvTotal,
          lucroBruto,
          margemBruta: margemBrutaPercentual,
          despesasPagas,
          lucroLiquido: lucroLiquidoEstimado,
          totalVendas: vendasFiltradas.length,
          ticketMedio,
          totalPecas: totalPecasVendidas,
          crediarioTotal: crediarioTotalPeriodo,
          formasPagamento,
          topProdutos: maisVendidosLista.slice(0, 5),
        });
        doc.save(`relatorio-faturamento-lucro-${sufixoData}.pdf`);
      } else if (tipoRelatorio === 'vendas') {
        const doc = gerarPdfVendas(vendasFiltradas, periodoDesc);
        doc.save(`relatorio-vendas-detalhado-${sufixoData}.pdf`);
      } else if (tipoRelatorio === 'mais_vendidos') {
        const doc = gerarPdfMaisVendidos(maisVendidosLista, periodoDesc);
        doc.save(`relatorio-produtos-mais-vendidos-${sufixoData}.pdf`);
      } else if (tipoRelatorio === 'crediario') {
        const doc = gerarPdfCrediario(todasParcelasCrediario, periodoDesc);
        doc.save(`relatorio-crediario-carne-${sufixoData}.pdf`);
      } else if (tipoRelatorio === 'estoque') {
        const doc = gerarPdfEstoque(produtos);
        doc.save(`relatorio-posicao-estoque-${sufixoData}.pdf`);
      }
      showToast('Relatório em PDF gerado e baixado com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar PDF do relatório.');
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const handleExportarCsv = () => {
    try {
      const sufixoData = hojeStr;
      if (tipoRelatorio === 'resumo_lucro') {
        const headers = ['Indicador', 'Valor R$', 'Observação'];
        const rows = [
          ['Faturamento Bruto', faturamentoBruto.toFixed(2), `${vendasFiltradas.length} vendas`],
          ['Custo Mercadorias (CMV)', cmvTotal.toFixed(2), 'Custo das peças saídas'],
          ['Lucro Bruto', lucroBruto.toFixed(2), `Margem +${margemBrutaPercentual}%`],
          ['Despesas Pagas', despesasPagas.toFixed(2), 'Contas operacionais quitadas'],
          ['Lucro Líquido Real', lucroLiquidoEstimado.toFixed(2), 'Após dedução das despesas'],
          ['Ticket Médio', ticketMedio.toFixed(2), 'Média por compra'],
          ['Peças Vendidas', totalPecasVendidas, 'Volume total'],
          ['Vendido no Crediário', crediarioTotalPeriodo.toFixed(2), 'Carnê da loja'],
        ];
        exportarCsv(`resumo-lucro-${sufixoData}`, headers, rows);
      } else if (tipoRelatorio === 'vendas') {
        const headers = [
          'Código',
          'Data',
          'Cliente',
          'Forma Pagamento',
          'Qtd Peças',
          'Subtotal',
          'Desconto',
          'Total Líquido',
        ];
        const rows = vendasFiltradas.map(v => [
          v.codigo_venda || v.id,
          v.data_venda,
          v.cliente_nome,
          formatarNomeFormaPagamento(v.forma_pagamento),
          v.itens.reduce((acc, i) => acc + i.quantidade, 0),
          v.subtotal.toFixed(2),
          v.desconto.toFixed(2),
          v.total.toFixed(2),
        ]);
        exportarCsv(`vendas-analitico-${sufixoData}`, headers, rows);
      } else if (tipoRelatorio === 'mais_vendidos') {
        const headers = ['Posição', 'Produto', 'Categoria', 'Volume Saído', 'Receita R$', 'Lucro R$', 'Margem %'];
        const rows = maisVendidosLista.map(i => [
          i.rank,
          i.nome,
          i.categoria,
          i.quantidade,
          i.receita.toFixed(2),
          i.lucroEstimado.toFixed(2),
          i.margem,
        ]);
        exportarCsv(`produtos-mais-vendidos-${sufixoData}`, headers, rows);
      } else if (tipoRelatorio === 'crediario') {
        const headers = ['Cliente', 'WhatsApp', 'Parcela', 'Vencimento', 'Valor R$', 'Situação', 'Dias Atraso'];
        const rows = todasParcelasCrediario.map(p => [
          p.clienteNome,
          p.whatsapp,
          p.parcelaInfo,
          p.vencimento,
          p.valor.toFixed(2),
          p.status,
          p.diasAtraso || 0,
        ]);
        exportarCsv(`crediario-carne-${sufixoData}`, headers, rows);
      } else if (tipoRelatorio === 'estoque') {
        const headers = ['Produto', 'Referência', 'Tamanho', 'Cor', 'Estoque', 'Custo Unit.', 'Preço Venda', 'Total Venda'];
        const rows: (string | number)[][] = [];
        produtos.forEach(p => {
          p.grades.forEach(g => {
            rows.push([
              p.nome,
              p.referencia,
              g.tamanho,
              g.cor,
              g.estoque_disponivel,
              p.preco_custo.toFixed(2),
              p.preco_venda.toFixed(2),
              (g.estoque_disponivel * p.preco_venda).toFixed(2),
            ]);
          });
        });
        exportarCsv(`posicao-estoque-${sufixoData}`, headers, rows);
      }
      showToast('Planilha Excel/CSV exportada com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao exportar planilha CSV.');
    }
  };

  const relatoriosTabs = [
    { id: 'resumo_lucro', label: 'Resumo & Lucro (DRE)', icon: TrendingUp },
    { id: 'vendas', label: 'Relatório de Vendas', icon: ShoppingBag },
    { id: 'mais_vendidos', label: 'Mais Vendidos', icon: FileBarChart },
    { id: 'crediario', label: 'Crediário & Carnê', icon: ReceiptText },
    { id: 'estoque', label: 'Estoque & Inventário', icon: Layers },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 print:p-0 print:m-0 print:max-w-none print:space-y-0">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-[#280F4D] text-white rounded-2xl shadow-xl border border-purple-400/30 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Topo Limpo: Título da Tela */}
      <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs print:hidden">
        <div>
          <h1 className="text-xl font-black text-[#280F4D] tracking-tight">Central de Relatórios Oficiais</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Exporte relatórios de faturamento, lucro bruto/líquido, vendas detalhadas, crediário e estoque prontos para impressão ou download em PDF e Excel.
          </p>
        </div>
      </div>

      {/* Navegação entre Relatórios */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar border-b border-purple-100 print:hidden">
        {relatoriosTabs.map(tab => {
          const Icon = tab.icon;
          const isAtivo = tipoRelatorio === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTipoRelatorio(tab.id as TipoRelatorio)}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                isAtivo
                  ? 'bg-[#351465] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-purple-100 hover:bg-purple-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* BARRA DE SELEÇÃO DE DATA PERSONALIZADA E ATALHOS */}
      <div className="bg-white rounded-2xl border border-purple-100 p-4 shadow-xs space-y-3 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Filtro: Período Personalizado (De tal dia até tal dia) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-0.5">
              <Calendar className="w-4 h-4 text-[#280F4D]" />
              Período:
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">De</span>
              <input
                type="date"
                value={dataDe}
                onChange={e => setDataDe(e.target.value)}
                className="px-2.5 py-1.5 bg-purple-50/40 border border-purple-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:ring-2 focus:ring-[#280F4D] cursor-pointer"
                title="Data inicial do relatório"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Até</span>
              <input
                type="date"
                value={dataAte}
                onChange={e => setDataAte(e.target.value)}
                className="px-2.5 py-1.5 bg-purple-50/40 border border-purple-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:ring-2 focus:ring-[#280F4D] cursor-pointer"
                title="Data final do relatório"
              />
            </div>

            {(dataDe || dataAte) && (
              <button
                type="button"
                onClick={() => {
                  setDataDe('');
                  setDataAte('');
                }}
                className="text-[11px] text-slate-400 hover:text-rose-600 font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                title="Limpar período de datas"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Botões de Atalho Rápido de Data */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setDataDe(hojeStr);
                setDataAte(hojeStr);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                dataDe === hojeStr && dataAte === hojeStr
                  ? 'bg-[#280F4D] text-white shadow-xs'
                  : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => {
                setDataDe(seteDiasAtrasStr);
                setDataAte(hojeStr);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                dataDe === seteDiasAtrasStr && dataAte === hojeStr
                  ? 'bg-[#280F4D] text-white shadow-xs'
                  : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
              }`}
            >
              Últimos 7 dias
            </button>
            <button
              type="button"
              onClick={() => {
                setDataDe(primeiroDiaMesStr);
                setDataAte(hojeStr);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                dataDe === primeiroDiaMesStr && dataAte === hojeStr
                  ? 'bg-[#280F4D] text-white shadow-xs'
                  : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
              }`}
            >
              Este Mês
            </button>
            <button
              type="button"
              onClick={() => {
                setDataDe('');
                setDataAte('');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                !dataDe && !dataAte
                  ? 'bg-[#280F4D] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todo o histórico
            </button>
          </div>
        </div>

        {/* Subtítulo informativo */}
        <div className="pt-2 border-t border-purple-50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Período analisado no relatório: </span>
            <strong className="text-slate-800">{periodoDesc}</strong>
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 mr-0.5">Exportar:</span>
            <button
              type="button"
              onClick={handleExportarCsv}
              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-[#351465] border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Exportar para Excel / CSV"
            >
              <Table className="w-3 h-3 text-purple-700" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={handleImprimir}
              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-[#351465] border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Imprimir direto em folha A4 em preto e branco"
            >
              <Printer className="w-3 h-3 text-purple-700" />
              <span>Imprimir (A4)</span>
            </button>
            <button
              type="button"
              onClick={handleBaixarPdf}
              className="px-3 py-1 bg-[#351465] hover:bg-[#280F4D] text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              title="Baixar relatório oficial formatado em Folha A4 em Preto e Branco"
            >
              <Download className="w-3 h-3 text-purple-200" />
              <span>Baixar PDF (A4)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ÁREA DO RELATÓRIO OTIMIZADA PARA FOLHA A4 E PRETO E BRANCO */}
      <div id="relatorio-preview-print" className="space-y-4">
        {/* Cabeçalho de Impressão Direta em Folha A4 Preto e Branco */}
        <div className="hidden print:block pb-3 mb-4 border-b-2 border-black">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black text-black tracking-tight">{nomeLoja.toUpperCase()}</h1>
              <p className="text-xs text-black font-medium">Sistema Gradi Gestão • Relatório Oficial da Loja</p>
              <h2 className="text-sm font-bold text-black uppercase mt-1">
                {tipoRelatorio === 'resumo_lucro' && 'Relatório Executivo: Resumo de Faturamento e Lucro (DRE)'}
                {tipoRelatorio === 'vendas' && 'Relatório Analítico de Vendas Concluídas'}
                {tipoRelatorio === 'mais_vendidos' && 'Relatório de Produtos Mais Vendidos'}
                {tipoRelatorio === 'crediario' && 'Relatório de Cobrança, Crediário e Carnês'}
                {tipoRelatorio === 'estoque' && 'Relatório de Inventário e Posição de Estoque'}
              </h2>
              <p className="text-xs text-black font-medium mt-0.5">Período: <strong>{periodoDesc}</strong></p>
            </div>
            <div className="text-right text-[11px] text-black space-y-0.5">
              <p>Emissão: <strong>{new Date().toLocaleDateString('pt-BR')}</strong> às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="font-semibold text-slate-700">Formato: Folha A4 • Impressão Direta</p>
            </div>
          </div>
        </div>

        {/* 1. RELATÓRIO DE RESUMO & LUCRO */}
        {tipoRelatorio === 'resumo_lucro' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Faturamento Bruto</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {formatCurrency(faturamentoBruto)}
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold block mt-1">
                {vendasFiltradas.length} venda(s) no período
              </span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-emerald-900 block">
                Lucro Bruto (Margem CMV)
              </span>
              <span className="text-2xl font-black text-emerald-950 mt-1 block">
                {formatCurrency(lucroBruto)}
              </span>
              <span className="text-[11px] text-emerald-800 font-bold block mt-1">
                Margem média: +{margemBrutaPercentual}% sobre o custo
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Lucro Líquido Real</span>
              <span className="text-2xl font-black text-blue-900 mt-1 block">
                {formatCurrency(lucroLiquidoEstimado)}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                Dedução de {formatCurrency(despesasPagas)} em despesas
              </span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-amber-900 block">Ticket Médio</span>
              <span className="text-2xl font-black text-amber-950 mt-1 block">
                {formatCurrency(ticketMedio)}
              </span>
              <span className="text-[11px] text-amber-800 font-semibold block mt-1">
                {totalPecasVendidas} peças comercializadas
              </span>
            </div>
          </div>

          {/* DRE e Recebimentos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between pb-2 border-b border-slate-100">
                <span>DRE Demonstrativo de Resultado (Período)</span>
                <span className="text-xs text-slate-400 font-normal">Valores Líquidos</span>
              </h3>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between font-bold text-slate-900">
                  <span>(+) Faturamento Bruto de Vendas</span>
                  <span>{formatCurrency(faturamentoBruto)}</span>
                </div>
                <div className="py-2.5 flex justify-between text-rose-700">
                  <span>(-) Custo das Mercadorias Vendidas (CMV)</span>
                  <span>- {formatCurrency(cmvTotal)}</span>
                </div>
                <div className="py-2.5 flex justify-between font-black text-emerald-800 bg-emerald-50/50 px-2 rounded-lg">
                  <span>(=) Lucro Bruto Operacional</span>
                  <span>{formatCurrency(lucroBruto)} (+{margemBrutaPercentual}%)</span>
                </div>
                <div className="py-2.5 flex justify-between text-slate-600">
                  <span>(-) Despesas Operacionais Pagas</span>
                  <span>- {formatCurrency(despesasPagas)}</span>
                </div>
                <div className="py-2.5 flex justify-between font-black text-blue-900 bg-blue-50/50 px-2 rounded-lg text-sm">
                  <span>(=) Lucro Líquido Final</span>
                  <span>{formatCurrency(lucroLiquidoEstimado)}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
                Recebimentos por Forma de Pagamento
              </h3>
              {formasPagamento.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhuma venda no período selecionado.
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {formasPagamento.map((f, idx) => {
                    const pct = faturamentoBruto > 0 ? Math.round((f.total / faturamentoBruto) * 100) : 0;
                    return (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
                        <div>
                          <strong className="text-slate-900 block">{f.forma}</strong>
                          <span className="text-[11px] text-slate-500">{f.qtd} transação(ões)</span>
                        </div>
                        <div className="text-right">
                          <strong className="text-slate-900 block">{formatCurrency(f.total)}</strong>
                          <span className="text-[10px] text-purple-700 font-bold">{pct}% do total</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. RELATÓRIO ANALÍTICO DE VENDAS */}
      {tipoRelatorio === 'vendas' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#280F4D]" />
              <span>Vendas Concluídas no Período ({vendasFiltradas.length})</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Total Faturado: <strong className="text-slate-900 font-black">{formatCurrency(faturamentoBruto)}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Peças na Venda</th>
                  <th className="p-3 text-center">Qtd</th>
                  <th className="p-3">Pagamento</th>
                  <th className="p-3 text-right">Desconto</th>
                  <th className="p-3 text-right">Total Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Nenhuma venda encontrada no período selecionado.
                    </td>
                  </tr>
                ) : (
                  vendasFiltradas.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-bold text-slate-700 whitespace-nowrap">{v.codigo_venda}</td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        {v.data_venda ? formatDate(v.data_venda.split('T')[0]) : '-'}
                      </td>
                      <td className="p-3 font-bold text-slate-900">{v.cliente_nome}</td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">
                        {v.itens.map(i => `${i.produto_nome} (${i.tamanho}/${i.cor})`).join(', ')}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700 whitespace-nowrap">
                        {v.itens.reduce((acc, i) => acc + i.quantidade, 0)}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-900">
                          {formatarNomeFormaPagamento(v.forma_pagamento)}
                        </span>
                      </td>
                      <td className="p-3 text-right text-emerald-700 font-medium whitespace-nowrap">
                        {v.desconto > 0 ? formatCurrency(v.desconto) : '-'}
                      </td>
                      <td className="p-3 text-right font-black text-slate-900 whitespace-nowrap">
                        {formatCurrency(v.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. RELATÓRIO DE MAIS VENDIDOS */}
      {tipoRelatorio === 'mais_vendidos' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileBarChart className="w-4 h-4 text-[#280F4D]" />
              <span>Curva de Produtos Mais Vendidos</span>
            </h3>
            <span className="text-xs text-slate-500">
              {maisVendidosLista.length} modelo(s) com saída no período
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center">Posição</th>
                  <th className="p-3">Produto</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3 text-center">Peças Saídas</th>
                  <th className="p-3 text-right">Receita Total</th>
                  <th className="p-3 text-right">Lucro Estimado</th>
                  <th className="p-3 text-center">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {maisVendidosLista.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Nenhum produto vendido no período selecionado.
                    </td>
                  </tr>
                ) : (
                  maisVendidosLista.map(item => (
                    <tr key={item.rank} className="hover:bg-slate-50/70">
                      <td className="p-3 text-center">
                        <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-950 font-black inline-flex items-center justify-center text-xs">
                          {item.rank}º
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-900">{item.nome}</td>
                      <td className="p-3 text-slate-500">{item.categoria}</td>
                      <td className="p-3 text-center font-bold text-slate-800">{item.quantidade} un</td>
                      <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(item.receita)}</td>
                      <td className="p-3 text-right font-bold text-emerald-800">{formatCurrency(item.lucroEstimado)}</td>
                      <td className="p-3 text-center font-bold text-emerald-700">+{item.margem}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. RELATÓRIO DE CREDIÁRIO */}
      {tipoRelatorio === 'crediario' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-[#280F4D]" />
              <span>Carnês &amp; Parcelas de Crediário</span>
            </h3>
            <span className="text-xs text-slate-500 font-semibold">
              Total listado: <strong className="text-slate-900">{formatCurrency(todasParcelasCrediario.reduce((acc, p) => acc + p.valor, 0))}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">WhatsApp</th>
                  <th className="p-3 text-center">Parcela</th>
                  <th className="p-3 text-center">Vencimento</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3 text-center">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todasParcelasCrediario.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Nenhuma parcela encontrada para o filtro selecionado.
                    </td>
                  </tr>
                ) : (
                  todasParcelasCrediario.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="p-3 font-bold text-slate-900">{p.clienteNome}</td>
                      <td className="p-3 text-slate-600">{formatWhatsApp(p.whatsapp)}</td>
                      <td className="p-3 text-center font-bold text-slate-700">{p.parcelaInfo}</td>
                      <td className="p-3 text-center text-slate-600">{formatDate(p.vencimento)}</td>
                      <td className="p-3 text-right font-black text-slate-900">{formatCurrency(p.valor)}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            p.status === 'pago'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'atrasado'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status === 'atrasado'
                            ? `Atrasada (${p.diasAtraso}d)`
                            : p.status === 'pago'
                            ? 'Paga'
                            : 'Em Aberto'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. RELATÓRIO DE ESTOQUE */}
      {tipoRelatorio === 'estoque' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#280F4D]" />
              <span>Inventário &amp; Posição de Estoque por Grade</span>
            </h3>
            <span className="text-xs text-slate-500">
              {produtos.length} modelos cadastrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Produto</th>
                  <th className="p-3">Ref.</th>
                  <th className="p-3 text-center">Tam</th>
                  <th className="p-3">Cor</th>
                  <th className="p-3 text-center">Estoque</th>
                  <th className="p-3 text-right">Custo Un.</th>
                  <th className="p-3 text-right">Preço Venda</th>
                  <th className="p-3 text-right">Total em Estoque (Venda)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produtos.map(p =>
                  p.grades.map(g => (
                    <tr key={g.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-bold text-slate-900">{p.nome}</td>
                      <td className="p-3 font-mono text-slate-600">{p.referencia}</td>
                      <td className="p-3 text-center font-bold text-slate-800">{g.tamanho}</td>
                      <td className="p-3 text-slate-600">{g.cor}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-black text-xs ${
                            g.estoque_disponivel === 0
                              ? 'bg-rose-100 text-rose-700'
                              : g.estoque_disponivel <= 2
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {g.estoque_disponivel} un
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-500">{formatCurrency(p.preco_custo)}</td>
                      <td className="p-3 text-right font-semibold text-slate-800">{formatCurrency(p.preco_venda)}</td>
                      <td className="p-3 text-right font-black text-slate-900">
                        {formatCurrency(g.estoque_disponivel * p.preco_venda)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

        {/* Rodapé exclusivo para impressão direta em papel A4 Preto e Branco */}
        <div className="hidden print:flex justify-between items-center pt-3 mt-4 border-t border-black text-[10px] text-black">
          <span>Gradi Gestão • Documento para conferência financeira e operacional • Folha A4 P&B</span>
          <span>Impresso via Navegador</span>
        </div>
      </div>
    </div>
  );
};

function formatarNomeFormaPagamento(f?: string): string {
  switch (f) {
    case 'pix':
      return 'PIX';
    case 'cartao_credito':
      return 'Cartão Crédito';
    case 'cartao_debito':
      return 'Cartão Débito';
    case 'dinheiro':
      return 'Dinheiro';
    case 'crediario':
      return 'Crediário Loja';
    case 'misto':
      return 'Misto';
    default:
      return f || 'Outros';
  }
}
