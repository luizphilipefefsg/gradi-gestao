import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  CheckCircle2,
  Plus,
  Building2,
  PieChart,
  BarChart3,
  Clock,
  Sparkles,
  Filter,
  Search,
  ReceiptText,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ContaPagar } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const FinanceiroScreen: React.FC = () => {
  const { vendas, contasPagar, contasReceber, produtos, adicionarContaPagar, pagarContaPagar } =
    useStore();

  const [abaFinanceira, setAbaFinanceira] = useState<'dashboard' | 'receber' | 'pagar'>('dashboard');

  // Nova conta a pagar modal
  const [isNovaContaPagarOpen, setIsNovaContaPagarOpen] = useState(false);
  const [descricaoCP, setDescricaoCP] = useState('');
  const [categoriaCP, setCategoriaCP] = useState<ContaPagar['categoria']>('fornecedor');
  const [valorCP, setValorCP] = useState('');
  const [vencimentoCP, setVencimentoCP] = useState(() => new Date().toISOString().split('T')[0]);

  // Filtros personalizáveis de Contas a Pagar
  const hojeStr = new Date().toISOString().split('T')[0];
  const fimDoMesStr = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];
  const em7DiasStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const [filtroDataAteCP, setFiltroDataAteCP] = useState<string>(''); // Vazio = Todas as datas
  const [filtroStatusCP, setFiltroStatusCP] = useState<'todas' | 'aberto' | 'pago'>('todas');
  const [buscaCP, setBuscaCP] = useState('');

  // Contas a pagar filtradas pelo limite de data e status
  const contasPagarFiltradas = contasPagar.filter(cp => {
    if (filtroDataAteCP && cp.data_vencimento > filtroDataAteCP) return false;
    if (filtroStatusCP === 'aberto' && cp.status !== 'aberto') return false;
    if (filtroStatusCP === 'pago' && cp.status !== 'pago') return false;

    if (buscaCP) {
      const q = buscaCP.toLowerCase();
      const matchDesc = cp.descricao.toLowerCase().includes(q);
      const matchCat = cp.categoria.toLowerCase().includes(q);
      return matchDesc || matchCat;
    }
    return true;
  });

  // Totalizadores de Contas a Pagar no período selecionado
  const totalEmAbertoCP = contasPagarFiltradas
    .filter(cp => cp.status === 'aberto')
    .reduce((acc, cp) => acc + cp.valor, 0);
  const qtdEmAbertoCP = contasPagarFiltradas.filter(cp => cp.status === 'aberto').length;

  const totalVencidasCP = contasPagarFiltradas
    .filter(cp => cp.status === 'aberto' && cp.data_vencimento < hojeStr)
    .reduce((acc, cp) => acc + cp.valor, 0);
  const qtdVencidasCP = contasPagarFiltradas.filter(
    cp => cp.status === 'aberto' && cp.data_vencimento < hojeStr
  ).length;

  const totalPagasCP = contasPagarFiltradas
    .filter(cp => cp.status === 'pago')
    .reduce((acc, cp) => acc + cp.valor, 0);
  const qtdPagasCP = contasPagarFiltradas.filter(cp => cp.status === 'pago').length;

  const totalGeralCP = contasPagarFiltradas.reduce((acc, cp) => acc + cp.valor, 0);

  // Filtros personalizáveis de Data para Resumo & Lucro (Dashboard)
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const seteDiasAtrasStr = seteDiasAtras.toISOString().split('T')[0];
  const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const primeiroDiaMesStr = primeiroDiaMes.toISOString().split('T')[0];

  const [dataAteDashboard, setDataAteDashboard] = useState<string>(''); // Vazio = Todas as datas / Todo o histórico
  const [dataDeDashboard, setDataDeDashboard] = useState<string>('');

  // Vendas finalizadas filtradas pelo período selecionado no Resumo & Lucro
  const vendasFinalizadas = vendas.filter(v => {
    if (v.status !== 'finalizada') return false;
    const dataVendaDia = v.data_venda ? v.data_venda.split('T')[0] : '';
    if (dataDeDashboard && dataVendaDia < dataDeDashboard) return false;
    if (dataAteDashboard && dataVendaDia > dataAteDashboard) return false;
    return true;
  });

  // Faturamento Bruto do período
  const faturamentoBruto = vendasFinalizadas.reduce((acc, v) => acc + v.total, 0);

  // CMV (Custo das Mercadorias Vendidas) do período
  let cmvTotal = 0;
  vendasFinalizadas.forEach(v => {
    v.itens.forEach(it => {
      cmvTotal += (it.preco_custo_unitario || 0) * it.quantidade;
    });
  });

  // Despesas pagas no período selecionado
  const despesasPagas = contasPagar
    .filter(cp => {
      if (cp.status !== 'pago') return false;
      const dataPgto = cp.data_pagamento || cp.data_vencimento;
      if (dataDeDashboard && dataPgto < dataDeDashboard) return false;
      if (dataAteDashboard && dataPgto > dataAteDashboard) return false;
      return true;
    })
    .reduce((acc, cp) => acc + cp.valor, 0);

  // Lucro Bruto e Lucro Líquido do período
  const lucroBruto = Math.max(0, faturamentoBruto - cmvTotal);
  const margemBrutaPercentual =
    faturamentoBruto > 0 ? Math.round((lucroBruto / faturamentoBruto) * 100) : 0;
  const lucroLiquidoEstimado = lucroBruto - despesasPagas;

  // Crediário a receber no período selecionado
  const crediarioReceberTotal = contasReceber
    .filter(cr => {
      if (cr.status !== 'aberto' && cr.status !== 'atrasado') return false;
      if (dataDeDashboard && cr.data_vencimento < dataDeDashboard) return false;
      if (dataAteDashboard && cr.data_vencimento > dataAteDashboard) return false;
      return true;
    })
    .reduce((acc, cr) => acc + cr.valor, 0);

  const crediarioAtrasadoTotal = contasReceber
    .filter(cr => {
      if (cr.status !== 'atrasado') return false;
      if (dataDeDashboard && cr.data_vencimento < dataDeDashboard) return false;
      if (dataAteDashboard && cr.data_vencimento > dataAteDashboard) return false;
      return true;
    })
    .reduce((acc, cr) => acc + cr.valor, 0);

  // Ranking de produtos mais vendidos
  const rankingProdutosMap: {
    [prodId: string]: { nome: string; quantidade: number; receita: number };
  } = {};

  vendasFinalizadas.forEach(v => {
    v.itens.forEach(it => {
      if (!rankingProdutosMap[it.produto_id]) {
        rankingProdutosMap[it.produto_id] = {
          nome: it.produto_nome,
          quantidade: 0,
          receita: 0,
        };
      }
      rankingProdutosMap[it.produto_id].quantidade += it.quantidade;
      rankingProdutosMap[it.produto_id].receita += it.subtotal;
    });
  });

  const rankingProdutos = Object.values(rankingProdutosMap).sort(
    (a, b) => b.quantidade - a.quantidade
  );
  const maxQtdVendida = rankingProdutos.length > 0 ? rankingProdutos[0].quantidade : 1;

  // Alertas de estoque crítico (< 2 un)
  const itensEstoqueCritico: {
    produtoNome: string;
    tamanho: string;
    cor: string;
    estoque: number;
  }[] = [];

  produtos.forEach(p => {
    p.grades.forEach(g => {
      if (g.estoque_disponivel <= 2) {
        itensEstoqueCritico.push({
          produtoNome: p.nome,
          tamanho: g.tamanho,
          cor: g.cor,
          estoque: g.estoque_disponivel,
        });
      }
    });
  });

  const handleSalvarContaPagar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricaoCP || !valorCP) return;

    adicionarContaPagar({
      descricao: descricaoCP,
      categoria: categoriaCP,
      valor: parseFloat(valorCP) || 0,
      data_vencimento: vencimentoCP,
      status: 'aberto',
    });

    setDescricaoCP('');
    setValorCP('');
    setIsNovaContaPagarOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Topo Limpo: Título da Tela e Abas Financeiras */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-[#280F4D] tracking-tight">Financeiro & Faturamento</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhe o faturamento bruto, lucro real baseado no custo das peças e projeção de recebimento do crediário.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-purple-50 p-1 rounded-xl border border-purple-200">
          {[
            { id: 'dashboard', label: 'Resumo & Lucro' },
            { id: 'receber', label: `A Receber (${contasReceber.length})` },
            { id: 'pagar', label: `Contas a Pagar (${contasPagar.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setAbaFinanceira(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                abaFinanceira === tab.id
                  ? 'bg-[#351465] text-white shadow-xs'
                  : 'text-purple-900 hover:text-purple-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>



      {/* DASHBOARD ABA */}
      {abaFinanceira === 'dashboard' && (
        <div className="space-y-4">
          {/* BARRA DE PERSONALIZAÇÃO DE DATA (IGUAL AO HISTÓRICO DE VENDAS) */}
          <div className="bg-white rounded-2xl border border-purple-100 p-4 shadow-xs space-y-3">
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
                    value={dataDeDashboard}
                    onChange={e => setDataDeDashboard(e.target.value)}
                    className="px-2.5 py-1.5 bg-purple-50/40 border border-purple-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:ring-2 focus:ring-[#280F4D] cursor-pointer"
                    title="Data inicial"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-medium">Até</span>
                  <input
                    type="date"
                    value={dataAteDashboard}
                    onChange={e => setDataAteDashboard(e.target.value)}
                    className="px-2.5 py-1.5 bg-purple-50/40 border border-purple-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:ring-2 focus:ring-[#280F4D] cursor-pointer"
                    title="Data final"
                  />
                </div>

                {(dataDeDashboard || dataAteDashboard) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDataDeDashboard('');
                      setDataAteDashboard('');
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
                    setDataDeDashboard(hojeStr);
                    setDataAteDashboard(hojeStr);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    dataDeDashboard === hojeStr && dataAteDashboard === hojeStr
                      ? 'bg-[#280F4D] text-white shadow-xs'
                      : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDataDeDashboard(seteDiasAtrasStr);
                    setDataAteDashboard(hojeStr);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    dataDeDashboard === seteDiasAtrasStr && dataAteDashboard === hojeStr
                      ? 'bg-[#280F4D] text-white shadow-xs'
                      : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
                  }`}
                >
                  Últimos 7 dias
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDataDeDashboard(primeiroDiaMesStr);
                    setDataAteDashboard(hojeStr);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    dataDeDashboard === primeiroDiaMesStr && dataAteDashboard === hojeStr
                      ? 'bg-[#280F4D] text-white shadow-xs'
                      : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
                  }`}
                >
                  Este Mês
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDataDeDashboard('');
                    setDataAteDashboard('');
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    !dataDeDashboard && !dataAteDashboard
                      ? 'bg-[#280F4D] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Todo o histórico
                </button>
              </div>
            </div>

            {/* Subtítulo indicando período ativo e total de vendas */}
            <div className="pt-2 border-t border-purple-50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Período analisado: </span>
                <strong className="text-slate-800">
                  {dataDeDashboard && dataAteDashboard
                    ? `${formatDate(dataDeDashboard)} até ${formatDate(dataAteDashboard)}`
                    : dataAteDashboard
                    ? `Até ${formatDate(dataAteDashboard)}`
                    : dataDeDashboard
                    ? `A partir de ${formatDate(dataDeDashboard)}`
                    : 'Todo o histórico da loja'}
                </strong>
              </span>
              <span className="font-semibold text-purple-900">
                {vendasFinalizadas.length} {vendasFinalizadas.length === 1 ? 'venda no período' : 'vendas no período'}
              </span>
            </div>
          </div>

          {/* Main KPI 4-Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Faturamento Bruto</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {formatCurrency(faturamentoBruto)}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                <ArrowUpCircle className="w-3.5 h-3.5" /> {vendasFinalizadas.length}{' '}
                {vendasFinalizadas.length === 1 ? 'venda concluída' : 'vendas concluídas'}
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
                Margem média: +{margemBrutaPercentual}% sobre custo
              </span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-amber-900 block">
                {dataDeDashboard || dataAteDashboard ? 'Crediário a Receber (Período)' : 'Crediário a Receber no Mês'}
              </span>
              <span className="text-2xl font-black text-amber-950 mt-1 block">
                {formatCurrency(crediarioReceberTotal)}
              </span>
              <span className="text-[11px] text-amber-800 font-semibold block mt-1">
                Atrasado: {formatCurrency(crediarioAtrasadoTotal)}
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Lucro Líquido Real</span>
              <span className="text-2xl font-black text-blue-900 mt-1 block">
                {formatCurrency(lucroLiquidoEstimado)}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                {despesasPagas > 0
                  ? `Após dedução de ${formatCurrency(despesasPagas)} em despesas`
                  : 'Sem despesas pagas no período'}
              </span>
            </div>
          </div>

          {/* DRE Simplificado & Curva de Mais Vendidos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Curva de Mais Vendidos (7 cols) */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  Curva de Produtos Mais Vendidos (Volume & Receita)
                </h3>
              </div>

              {rankingProdutos.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhuma venda realizada ainda para gerar o ranking.
                </div>
              ) : (
                <div className="space-y-3">
                  {rankingProdutos.map((item, idx) => {
                    const pct = Math.round((item.quantidade / maxQtdVendida) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-black">
                              {idx + 1}º
                            </span>
                            {item.nome}
                          </span>
                          <span className="text-slate-600 font-semibold">
                            {item.quantidade} un |{' '}
                            <strong className="text-slate-900">
                              {formatCurrency(item.receita)}
                            </strong>
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Alertas de Estoque Crítico & CMV (5 cols) */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Alertas de Reposição de Grade (&lt; 2 un)
                </h3>
              </div>

              {itensEstoqueCritico.length === 0 ? (
                <div className="py-8 text-center text-xs text-emerald-600 font-medium">
                  ✓ Todos os tamanhos e cores estão com estoque saudável!
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {itensEstoqueCritico.map((crit, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <strong className="text-slate-900 block truncate max-w-[200px]">
                          {crit.produtoNome}
                        </strong>
                        <span className="text-[11px] text-amber-900">
                          Tam: <strong>{crit.tamanho}</strong> | Cor: {crit.cor}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded font-black text-xs ${
                          crit.estoque === 0
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {crit.estoque === 0 ? 'Zerado' : `${crit.estoque} un`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA: CONTAS A RECEBER */}
      {abaFinanceira === 'receber' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Contas a Receber (Vendas & Crediário Próprio)
              </h3>
              <p className="text-xs text-slate-500">
                Integração automática com o módulo de parcelas do crediário da loja.
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Descrição / Parcela</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Vencimento</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contasReceber.map((cr, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">{cr.descricao}</td>
                    <td className="p-3 font-bold text-slate-900">{cr.cliente_nome}</td>
                    <td className="p-3 font-medium text-slate-700">
                      {formatDate(cr.data_vencimento)}
                    </td>
                    <td className="p-3 text-right font-black text-slate-900">
                      {formatCurrency(cr.valor)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          cr.status === 'recebido'
                            ? 'bg-emerald-100 text-emerald-800'
                            : cr.status === 'atrasado'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {cr.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA: CONTAS A PAGAR */}
      {abaFinanceira === 'pagar' && (
        <div className="space-y-4">
          {/* Header e Ação de Lançamento */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-[#280F4D]" />
                Contas a Pagar (Despesas & Fornecedores)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Controle compras de tecidos, confecções, aluguel, energia e boletos com filtro de vencimento personalizável.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNovaContaPagarOpen(true)}
              className="h-10 px-5 min-w-[170px] bg-gradient-to-r from-[#280F4D] to-[#481B84] hover:opacity-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Lançar Despesa</span>
            </button>
          </div>

          {/* TOTALIZADOR DE CONTAS A PAGAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-rose-50/70 border border-rose-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-rose-900 block flex items-center justify-between">
                <span>Total a Pagar (Em Aberto)</span>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              </span>
              <span className="text-2xl font-black text-rose-950 mt-1 block">
                {formatCurrency(totalEmAbertoCP)}
              </span>
              <span className="text-[11px] text-rose-700 font-semibold block mt-1">
                {qtdEmAbertoCP} conta(s) pendente(s)
              </span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-amber-900 block flex items-center justify-between">
                <span>Vencidas / Em Atraso</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              </span>
              <span className="text-2xl font-black text-amber-950 mt-1 block">
                {formatCurrency(totalVencidasCP)}
              </span>
              <span className="text-[11px] text-amber-800 font-semibold block mt-1">
                {qtdVencidasCP > 0 ? `${qtdVencidasCP} conta(s) em atraso!` : 'Nenhuma conta atrasada'}
              </span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-emerald-900 block flex items-center justify-between">
                <span>Total Já Pago</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </span>
              <span className="text-2xl font-black text-emerald-950 mt-1 block">
                {formatCurrency(totalPagasCP)}
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold block mt-1">
                {qtdPagasCP} conta(s) quitada(s)
              </span>
            </div>

            <div className="bg-purple-50/60 border border-purple-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-[#280F4D] block flex items-center justify-between">
                <span>Total Geral (Período)</span>
                <DollarSign className="w-3.5 h-3.5 text-purple-700" />
              </span>
              <span className="text-2xl font-black text-[#280F4D] mt-1 block">
                {formatCurrency(totalGeralCP)}
              </span>
              <span className="text-[11px] text-purple-700 font-semibold block mt-1">
                {contasPagarFiltradas.length} lançamento(s) no total
              </span>
            </div>
          </div>

          {/* BARRA DE PERSONALIZAÇÃO DE DATA & FILTROS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Filtro: Até que data deseja ver */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#280F4D]" />
                  Até que data deseja ver:
                </span>
                <input
                  type="date"
                  value={filtroDataAteCP}
                  onChange={e => setFiltroDataAteCP(e.target.value)}
                  className="px-3 py-1.5 bg-purple-50/40 border border-purple-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:ring-2 focus:ring-[#280F4D]"
                />
              </div>

              {/* Botões de Atalho Rápido de Data */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setFiltroDataAteCP(hojeStr)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    filtroDataAteCP === hojeStr
                      ? 'bg-[#280F4D] text-white shadow-xs'
                      : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroDataAteCP(em7DiasStr)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    filtroDataAteCP === em7DiasStr
                      ? 'bg-[#280F4D] text-white shadow-xs'
                      : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
                  }`}
                >
                  Próximos 7 dias
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroDataAteCP(fimDoMesStr)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    filtroDataAteCP === fimDoMesStr
                      ? 'bg-[#280F4D] text-white shadow-xs'
                      : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
                  }`}
                >
                  Até o fim do mês
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroDataAteCP('')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    !filtroDataAteCP
                      ? 'bg-[#280F4D] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Todas as datas
                </button>
              </div>
            </div>

            {/* Linha 2: Busca por descrição/categoria e Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar por descrição da despesa ou fornecedor..."
                  value={buscaCP}
                  onChange={e => setBuscaCP(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-[#280F4D]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setFiltroStatusCP('todas')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    filtroStatusCP === 'todas'
                      ? 'bg-[#280F4D] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Todas ({contasPagar.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusCP('aberto')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    filtroStatusCP === 'aberto'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  Em Aberto
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusCP('pago')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    filtroStatusCP === 'pago'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  Pagas
                </button>
              </div>
            </div>
          </div>

          {/* Tabela de Contas a Pagar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Descrição da Despesa</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Vencimento</th>
                    <th className="p-3 text-right">Valor</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contasPagarFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Nenhuma conta a pagar encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    contasPagarFiltradas.map(cp => {
                      const estaVencida = cp.status === 'aberto' && cp.data_vencimento < hojeStr;
                      return (
                        <tr key={cp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-slate-800">{cp.descricao}</td>
                          <td className="p-3">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700 uppercase">
                              {cp.categoria}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-semibold ${estaVencida ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                                {formatDate(cp.data_vencimento)}
                              </span>
                              {estaVencida && (
                                <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">
                                  Vencida
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right font-black text-rose-700">
                            {formatCurrency(cp.valor)}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                cp.status === 'pago'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : estaVencida
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {cp.status === 'pago' ? 'PAGO' : estaVencida ? 'ATRASADO' : 'EM ABERTO'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {cp.status !== 'pago' ? (
                              <button
                                type="button"
                                onClick={() => pagarContaPagar(cp.id)}
                                className="px-3 py-1 bg-[#280F4D] hover:bg-[#351465] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                              >
                                Marcar Paga
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs font-medium">Concluído</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lançar Conta a Pagar */}
      {isNovaContaPagarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Lançar Nova Conta a Pagar</h3>
              <button
                onClick={() => setIsNovaContaPagarOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarContaPagar} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Compra de Sacolas Personalizadas"
                  value={descricaoCP}
                  onChange={e => setDescricaoCP(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Categoria
                  </label>
                  <select
                    value={categoriaCP}
                    onChange={e => setCategoriaCP(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-hidden"
                  >
                    <option value="fornecedor">Fornecedor</option>
                    <option value="aluguel">Aluguel</option>
                    <option value="energia">Energia</option>
                    <option value="internet">Internet</option>
                    <option value="comissao">Comissão</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0,00"
                    value={valorCP}
                    onChange={e => setValorCP(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden font-bold text-rose-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Data de Vencimento *
                </label>
                <input
                  type="date"
                  required
                  value={vencimentoCP}
                  onChange={e => setVencimentoCP(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-hidden font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNovaContaPagarOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
