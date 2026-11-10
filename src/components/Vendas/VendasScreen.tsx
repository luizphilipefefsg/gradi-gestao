import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Barcode,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  User,
  UserPlus,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  CreditCard,
  QrCode,
  Banknote,
  ReceiptText,
  Calendar,
  X,
  Printer,
  Sparkles,
  Receipt,
  ArrowRight,
  Shirt,
  DollarSign,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Cliente, FormaPagamento, ParcelaCrediario, Produto, ProdutoGrade, Venda } from '../../types';
import { formatCurrency, formatDateTime, formatWhatsApp } from '../../utils/formatters';
import { QuickCustomerModal } from '../PDV/QuickCustomerModal';
import { ReceiptModal } from '../PDV/ReceiptModal';

export const VendasScreen: React.FC = () => {
  const {
    produtos,
    clientes,
    vendas,
    vendaAtual,
    adicionarItemVendaAtual,
    removerItemVendaAtual,
    alterarQuantidadeItemVendaAtual,
    cancelarVendaAtual,
    vincularClienteVendaAtual,
    finalizarVendaAtual,
  } = useStore();

  // Abas: Nova Venda ou Histórico
  const [viewMode, setViewMode] = useState<'nova_venda' | 'historico'>('nova_venda');

  // Campo de busca de produto
  const [buscaProduto, setBuscaProduto] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Pagamento da venda
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [tipoDesconto, setTipoDesconto] = useState<'reais' | 'porcentagem'>('reais');
  const [descontoReais, setDescontoReais] = useState<number>(0);
  const [descontoPercentual, setDescontoPercentual] = useState<number>(0);
  const [observacoes, setObservacoes] = useState('');
  const [qtdParcelasCrediario, setQtdParcelasCrediario] = useState<number>(3);

  // Filtros personalizáveis do Histórico de Vendas
  const hojeStr = new Date().toISOString().split('T')[0];
  const seteDiasAtrasStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const primeiroDiaMesStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [buscaHistorico, setBuscaHistorico] = useState('');
  const [dataAteHistorico, setDataAteHistorico] = useState<string>(''); // Vazio = sem limite / todas as datas
  const [dataDeHistorico, setDataDeHistorico] = useState<string>('');
  const [filtroFormaHistorico, setFiltroFormaHistorico] = useState<string>('todas');

  // Modais
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [vendaConcluidaParaRecibo, setVendaConcluidaParaRecibo] = useState<Venda | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Beep sutil de confirmação sonora idêntico a PDV profissional
  const playBeep = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1250, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch {
      // Silencia caso política do navegador bloqueie áudio
    }
  };

  const showToast = (tipo: 'sucesso' | 'erro', texto: string) => {
    setToastMsg({ tipo, texto });
    setTimeout(() => {
      setToastMsg(null);
    }, 3200);
  };

  const clienteSelecionado = clientes.find(c => c.id === vendaAtual.cliente_id) || null;

  // Flattened searchable apparel items
  const termo = buscaProduto.trim().toLowerCase();
  const produtosSugeridos = useMemo(() => {
    if (!termo) return [];

    const list: {
      produto: Produto;
      grade: ProdutoGrade;
      titulo: string;
      preco: number;
      estoque: number;
      codigo_barras: string;
      sku: string;
    }[] = [];

    produtos.forEach(prod => {
      const matchNome = prod.nome.toLowerCase().includes(termo);
      const matchRef = prod.referencia.toLowerCase().includes(termo);
      const matchCat = prod.categoria.toLowerCase().includes(termo);

      prod.grades.forEach(g => {
        const matchGrade =
          g.tamanho.toLowerCase().includes(termo) ||
          g.cor.toLowerCase().includes(termo) ||
          g.sku.toLowerCase().includes(termo) ||
          g.codigo_barras.includes(termo);

        if (matchNome || matchRef || matchCat || matchGrade) {
          list.push({
            produto: prod,
            grade: g,
            titulo: `${prod.nome} (${g.tamanho} - ${g.cor})`,
            preco: prod.preco_venda,
            estoque: g.estoque_disponivel,
            codigo_barras: g.codigo_barras,
            sku: g.sku,
          });
        }
      });
    });

    return list.slice(0, 15);
  }, [produtos, termo]);

  // Adicionar item à venda
  const handleAddItem = (produto: Produto, grade: ProdutoGrade) => {
    const res = adicionarItemVendaAtual(produto, grade, 1);
    if (!res.success) {
      showToast('erro', res.message || 'Sem estoque disponível!');
    } else {
      showToast('sucesso', `+1 ${produto.nome} (${grade.tamanho}/${grade.cor}) adicionado à venda!`);
      setBuscaProduto('');
      barcodeBufferRef.current = '';
      // Garante que o foco permaneça sempre pronto para o próximo bip ou digitação
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 40);
    }
  };

  // Tenta localizar produto por código de barras ou SKU exato / parcial
  const tentarAdicionarPorCodigo = (codigo: string): boolean => {
    const raw = codigo.trim();
    if (!raw) return false;
    const limpo = raw.toLowerCase();
    const apenasDigitos = raw.replace(/\D/g, '');

    for (const prod of produtos) {
      for (const g of prod.grades) {
        const codGrade = (g.codigo_barras || '').trim().toLowerCase();
        const skuGrade = (g.sku || '').trim().toLowerCase();
        const codDigitos = codGrade.replace(/\D/g, '');

        if (
          codGrade === limpo ||
          skuGrade === limpo ||
          (apenasDigitos.length >= 6 && codDigitos === apenasDigitos) ||
          (apenasDigitos.length >= 6 && codDigitos.endsWith(apenasDigitos)) ||
          (apenasDigitos.length >= 6 && apenasDigitos.endsWith(codDigitos))
        ) {
          handleAddItem(prod, g);
          playBeep();
          return true;
        }
      }
    }
    return false;
  };

  // Listener Global para Leitor de Código de Barras (funciona sem precisar clicar no campo de busca!)
  useEffect(() => {
    if (viewMode !== 'nova_venda') return;

    // Foco automático ao carregar ou alternar para Nova Venda
    searchInputRef.current?.focus();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Se modais estiverem abertos, não interfere
      if (isQuickCustomerOpen || vendaConcluidaParaRecibo) return;

      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');

      const isSearchInput = target === searchInputRef.current;
      const now = Date.now();

      // Enter enviado pelo leitor óptico ao finalizar o código
      if (e.key === 'Enter') {
        const buffered = barcodeBufferRef.current.trim();
        const inputVal = buscaProduto.trim();
        barcodeBufferRef.current = '';

        // 1. Tenta pelo buffer do leitor
        if (buffered.length >= 3) {
          const ok = tentarAdicionarPorCodigo(buffered);
          if (ok) {
            e.preventDefault();
            e.stopPropagation();
            setBuscaProduto('');
            searchInputRef.current?.focus();
            return;
          }
        }

        // 2. Tenta pelo valor atualmente no campo de busca
        if (inputVal.length >= 1) {
          const ok = tentarAdicionarPorCodigo(inputVal);
          if (ok) {
            e.preventDefault();
            e.stopPropagation();
            setBuscaProduto('');
            searchInputRef.current?.focus();
            return;
          }

          // Se houver 1 único produto correspondente na lista sugerida
          if (produtosSugeridos.length === 1) {
            handleAddItem(produtosSugeridos[0].produto, produtosSugeridos[0].grade);
            playBeep();
            e.preventDefault();
            e.stopPropagation();
            setBuscaProduto('');
            searchInputRef.current?.focus();
            return;
          }
        }
        return;
      }

      // Teclas de caractere simples (letras, números, hífen)
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Se o usuário NÃO está focado no campo de busca ou em nenhum outro input:
        if (!isInput) {
          // Foca automaticamente no campo de busca e adiciona o caractere imediatamente
          searchInputRef.current?.focus();
          setBuscaProduto(prev => prev + e.key);

          if (now - lastKeyTimeRef.current > 400) {
            barcodeBufferRef.current = '';
          }
          lastKeyTimeRef.current = now;
          barcodeBufferRef.current += e.key;

          e.preventDefault();
        } else if (isSearchInput) {
          // Já está focado no campo de busca
          if (now - lastKeyTimeRef.current > 400) {
            barcodeBufferRef.current = '';
          }
          lastKeyTimeRef.current = now;
          barcodeBufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [
    viewMode,
    isQuickCustomerOpen,
    vendaConcluidaParaRecibo,
    produtos,
    buscaProduto,
    produtosSugeridos,
  ]);

  // Submissão do leitor / busca manual (Enter)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termo) return;

    // 1. Código de barras / SKU exato
    const ok = tentarAdicionarPorCodigo(termo);
    if (ok) return;

    // 2. Se houver 1 único produto sugerido
    if (produtosSugeridos.length === 1) {
      handleAddItem(produtosSugeridos[0].produto, produtosSugeridos[0].grade);
      playBeep();
      return;
    }

    if (produtosSugeridos.length === 0) {
      showToast('erro', `Nenhum produto encontrado para "${buscaProduto}".`);
    }
  };

  // Cálculo de valores com suporte a Desconto em R$ ou %
  const subtotal = vendaAtual.itens.reduce((acc, i) => acc + i.subtotal, 0);
  const valorDescontoCalculado =
    tipoDesconto === 'porcentagem'
      ? Math.round(((subtotal * (descontoPercentual || 0)) / 100) * 100) / 100
      : Math.min(subtotal, descontoReais || 0);

  const totalPagar = Math.max(0, subtotal - valorDescontoCalculado);
  const totalPecas = vendaAtual.itens.reduce((acc, i) => acc + i.quantidade, 0);

  // Concluir venda diretamente
  const handleConcluirVenda = () => {
    if (vendaAtual.itens.length === 0) {
      showToast('erro', 'Adicione pelo menos um produto à venda.');
      return;
    }

    let parcelasCrediario: ParcelaCrediario[] | undefined = undefined;

    if (formaPagamento === 'crediario') {
      if (!clienteSelecionado) {
        showToast('erro', 'Para vender no Crediário, selecione um cliente cadastrado.');
        return;
      }

      // Gera parcelas de 30 em 30 dias
      const baseVal = Math.floor((totalPagar / qtdParcelasCrediario) * 100) / 100;
      const sobra = Math.round((totalPagar - baseVal * qtdParcelasCrediario) * 100) / 100;
      const hoje = new Date();

      parcelasCrediario = Array.from({ length: qtdParcelasCrediario }, (_, idx) => {
        const d = new Date(hoje);
        d.setDate(d.getDate() + 30 * (idx + 1));
        return {
          id: `parc-${Date.now()}-${idx}`,
          venda_id: vendaAtual.id,
          cliente_id: clienteSelecionado.id,
          numero_parcela: idx + 1,
          total_parcelas: qtdParcelasCrediario,
          valor: idx === 0 ? baseVal + sobra : baseVal,
          data_vencimento: d.toISOString().split('T')[0],
          status: 'pendente' as const,
          valor_pago: 0,
        };
      });
    }

    const res = finalizarVendaAtual(
      formaPagamento,
      parcelasCrediario,
      valorDescontoCalculado,
      0,
      observacoes.trim() || undefined
    );

    if (res.success && res.vendaFinalizada) {
      setVendaConcluidaParaRecibo(res.vendaFinalizada);
      setDescontoReais(0);
      setDescontoPercentual(0);
      setObservacoes('');
      showToast('sucesso', `Venda ${res.vendaFinalizada.codigo_venda} concluída com sucesso!`);
    } else {
      showToast('erro', res.message || 'Erro ao finalizar venda.');
    }
  };

  // Histórico Filtrado por data personalizável, forma de pagamento e busca
  const vendasHistoricoFiltradas = vendas.filter(v => {
    const dataVendaDia = v.data_venda.split('T')[0];
    if (dataDeHistorico && dataVendaDia < dataDeHistorico) return false;
    if (dataAteHistorico && dataVendaDia > dataAteHistorico) return false;
    if (filtroFormaHistorico !== 'todas' && v.forma_pagamento !== filtroFormaHistorico) return false;

    if (buscaHistorico) {
      const q = buscaHistorico.toLowerCase();
      const matchCod = v.codigo_venda.toLowerCase().includes(q);
      const matchCli = (v.cliente_nome || '').toLowerCase().includes(q);
      return matchCod || matchCli;
    }
    return true;
  });

  // Totalizadores de Vendas baseados no período selecionado
  const totalFaturadoHistorico = vendasHistoricoFiltradas.reduce((acc, v) => acc + v.total, 0);
  const totalQtdVendas = vendasHistoricoFiltradas.length;
  const ticketMedioHistorico = totalQtdVendas > 0 ? totalFaturadoHistorico / totalQtdVendas : 0;
  const totalPecasHistorico = vendasHistoricoFiltradas.reduce(
    (acc, v) => acc + v.itens.reduce((iAcc, it) => iAcc + it.quantidade, 0),
    0
  );

  const totalCrediarioPeriodo = vendasHistoricoFiltradas
    .filter(v => v.forma_pagamento === 'crediario')
    .reduce((acc, v) => acc + v.total, 0);

  // CMV e Lucro Bruto do histórico de vendas filtrado
  let cmvHistorico = 0;
  vendasHistoricoFiltradas.forEach(v => {
    v.itens.forEach(it => {
      cmvHistorico += (it.preco_custo_unitario || 0) * it.quantidade;
    });
  });
  const lucroBrutoHistorico = Math.max(0, totalFaturadoHistorico - cmvHistorico);
  const margemLucroHistorico =
    totalFaturadoHistorico > 0
      ? Math.round((lucroBrutoHistorico / totalFaturadoHistorico) * 100)
      : 0;

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${
            toastMsg.tipo === 'sucesso'
              ? 'bg-[#280F4D] text-purple-100 border-[#4F238E]'
              : 'bg-rose-900 text-rose-100 border-rose-700'
          }`}
        >
          {toastMsg.tipo === 'sucesso' ? (
            <CheckCircle2 className="w-4 h-4 text-purple-300 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMsg.texto}</span>
        </div>
      )}

      {/* Topo Limpo: Título da Tela e Alternância Nova Venda / Histórico */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-[#280F4D] tracking-tight">Vendas</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Adicione o produto, cliente e forma de pagamento para registrar a venda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-purple-50 p-1 rounded-xl border border-purple-200">
            <button
              type="button"
              onClick={() => setViewMode('nova_venda')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'nova_venda'
                  ? 'bg-[#351465] text-white shadow-xs'
                  : 'text-purple-900 hover:text-purple-950'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Nova Venda</span>
              {vendaAtual.itens.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setViewMode('historico')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'historico'
                  ? 'bg-[#351465] text-white shadow-xs'
                  : 'text-purple-900 hover:text-purple-950'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Histórico de Vendas</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TELA LIMPA: APENAS FAZER A VENDA                        */}
      {/* ======================================================== */}
      {viewMode === 'nova_venda' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* LADO ESQUERDO: CLIENTE + ADICIONAR PRODUTOS (7 colunas) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* 1. SELEÇÃO DE CLIENTE */}
            <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#351465]" />
                  <span>Cliente</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerOpen(true)}
                  className="text-xs font-bold text-[#351465] hover:text-[#280F4D] flex items-center gap-1 hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Novo Cliente</span>
                </button>
              </div>

              <select
                value={vendaAtual.cliente_id || ''}
                onChange={e => {
                  const cid = e.target.value;
                  if (!cid) {
                    vincularClienteVendaAtual(null);
                  } else {
                    const c = clientes.find(item => item.id === cid);
                    if (c) vincularClienteVendaAtual(c);
                  }
                }}
                className="w-full px-3 py-2 bg-purple-50/30 border border-purple-200 rounded-xl text-xs font-medium text-slate-900 outline-hidden focus:border-[#351465] focus:bg-white"
              >
                <option value="">Consumidor Final (Sem cadastro)</option>
                {clientes.map(cli => (
                  <option key={cli.id} value={cli.id}>
                    {cli.nome} - {formatWhatsApp(cli.whatsapp)}
                  </option>
                ))}
              </select>

              {clienteSelecionado && (
                <div className="pt-1.5 flex flex-wrap items-center justify-between text-[11px] text-slate-600 border-t border-purple-50 gap-2">
                  <span>
                    WhatsApp: <strong>{formatWhatsApp(clienteSelecionado.whatsapp)}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <span>
                      Crediário da Loja:{' '}
                      <strong className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                        Liberado
                      </strong>
                    </span>
                    {clienteSelecionado.saldo_devedor > 0 && (
                      <span className="text-slate-500">
                        (Débito: <strong className="text-amber-700">{formatCurrency(clienteSelecionado.saldo_devedor)}</strong>)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. CAMPO PARA ADICIONAR PRODUTOS */}
            <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-[#351465]" />
                  <span>Adicionar Produto</span>
                </label>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Leitor Ativo • Pode bipar a qualquer momento</span>
                </div>
              </div>

              <div className="relative">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={buscaProduto}
                    onChange={e => setBuscaProduto(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    placeholder="Digite o nome, cor, tamanho ou bipe o código de barras..."
                    className="w-full pl-10 pr-20 py-2.5 bg-purple-50/30 border-2 border-purple-200 focus:border-[#351465] focus:bg-white rounded-xl text-xs font-medium text-slate-900 outline-hidden transition-all"
                  />
                  {buscaProduto && (
                    <button
                      type="button"
                      onClick={() => setBuscaProduto('')}
                      className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#351465] hover:bg-[#280F4D] text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Adicionar
                  </button>
                </form>

                {/* SUGESTÕES CONFORME DIGITA AS LETRAS */}
                {termo.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-purple-200 shadow-xl max-h-60 overflow-y-auto divide-y divide-purple-50 z-20 animate-in fade-in">
                    {produtosSugeridos.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        Nenhum produto encontrado para "{buscaProduto}".
                      </div>
                    ) : (
                      produtosSugeridos.map(item => {
                        const semEstoque = item.estoque <= 0;
                        return (
                          <div
                            key={`${item.produto.id}-${item.grade.id}`}
                            onClick={() => !semEstoque && handleAddItem(item.produto, item.grade)}
                            className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                              semEstoque
                                ? 'opacity-50 cursor-not-allowed bg-slate-50'
                                : 'hover:bg-purple-50/70'
                            }`}
                          >
                            <div>
                              <span className="font-bold text-slate-900">{item.titulo}</span>
                              <span className="text-[11px] text-slate-400 block font-mono">
                                Cód: {item.codigo_barras || item.sku}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  semEstoque
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {item.estoque} un
                              </span>
                              <span className="font-extrabold text-[#351465]">
                                {formatCurrency(item.preco)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. LISTA DE PRODUTOS DA VENDA */}
            <div className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-purple-50/50 border-b border-purple-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Produtos na Venda ({totalPecas} {totalPecas === 1 ? 'peça' : 'peças'})
                </span>
                {vendaAtual.itens.length > 0 && (
                  <button
                    type="button"
                    onClick={cancelarVendaAtual}
                    className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Limpar
                  </button>
                )}
              </div>

              <div className="p-2 divide-y divide-purple-50 max-h-[360px] overflow-y-auto">
                {vendaAtual.itens.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-1.5">
                    <Shirt className="w-8 h-8 text-purple-300 mx-auto stroke-1" />
                    <p className="text-xs font-bold text-slate-600">Nenhum produto adicionado ainda</p>
                    <p className="text-[11px] text-slate-400">
                      Pesquise e adicione as peças no campo acima para montar a venda.
                    </p>
                  </div>
                ) : (
                  vendaAtual.itens.map(item => (
                    <div
                      key={item.id}
                      className="p-2.5 flex items-center justify-between gap-3 text-xs hover:bg-purple-50/30 transition-colors rounded-xl"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 truncate">{item.produto_nome}</h4>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-semibold text-[#351465]">
                            {item.tamanho} - {item.cor}
                          </span>
                          <span>•</span>
                          <span>{formatCurrency(item.preco_unitario)} / un</span>
                        </div>
                      </div>

                      {/* Quantidade */}
                      <div className="flex items-center gap-1 border border-purple-200 rounded-lg p-0.5 bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            alterarQuantidadeItemVendaAtual(item.id, item.quantidade - 1)
                          }
                          className="p-1 hover:bg-purple-50 text-slate-600 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold text-slate-800">
                          {item.quantidade}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            alterarQuantidadeItemVendaAtual(item.id, item.quantidade + 1)
                          }
                          className="p-1 hover:bg-purple-50 text-slate-600 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-extrabold text-[#280F4D] w-18 text-right">
                        {formatCurrency(item.subtotal)}
                      </span>

                      <button
                        type="button"
                        onClick={() => removerItemVendaAtual(item.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 rounded transition-colors"
                        title="Remover produto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* LADO DIREITO: FORMA DE PAGAMENTO E FINALIZAR VENDA (5 colunas) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-purple-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-purple-100">
              <CreditCard className="w-4 h-4 text-[#351465]" />
              <span>Forma de Pagamento</span>
            </h3>

            {/* Opções de Pagamento */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'pix', label: 'PIX', icon: QrCode },
                { id: 'cartao_credito', label: 'Cartão de Crédito', icon: CreditCard },
                { id: 'cartao_debito', label: 'Cartão de Débito', icon: CreditCard },
                { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                { id: 'crediario', label: 'Crediário da Loja', icon: ReceiptText },
              ].map(opt => {
                const Icon = opt.icon;
                const isSelected = formaPagamento === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormaPagamento(opt.id as FormaPagamento)}
                    className={`p-3 rounded-xl border text-left font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#351465] text-white border-[#351465] shadow-xs'
                        : 'bg-purple-50/40 text-slate-700 border-purple-100 hover:bg-purple-100/50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Se Crediário, escolher parcelas - Totalmente flexível */}
            {formaPagamento === 'crediario' && (
              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#280F4D] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-[#351465]" />
                    <span>Dividir Crediário em:</span>
                  </label>
                  <span className="text-[11px] font-bold text-[#351465]">
                    {qtdParcelasCrediario}x de {formatCurrency(totalPagar / (qtdParcelasCrediario || 1))}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 10, 12].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQtdParcelasCrediario(num)}
                      className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer text-xs ${
                        qtdParcelasCrediario === num
                          ? 'bg-[#351465] text-white border-[#351465] shadow-xs'
                          : 'bg-white text-slate-700 border-purple-200 hover:bg-purple-100'
                      }`}
                    >
                      {num}x
                    </button>
                  ))}

                  {/* Campo customizado para dividir quantas vezes quiser */}
                  <div className="flex items-center gap-1 bg-white border border-purple-300 rounded-lg px-2 py-0.5 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500">Outro:</span>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={qtdParcelasCrediario}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val > 0) {
                          setQtdParcelasCrediario(Math.min(60, val));
                        }
                      }}
                      className="w-10 text-center text-xs font-black text-[#280F4D] outline-none"
                    />
                    <span className="text-xs font-bold text-[#280F4D]">x</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  Parcelas com vencimento a cada 30 dias lançadas automaticamente no carnê do cliente.
                </p>
              </div>
            )}

            {/* Desconto Opcional (R$ ou %) */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">Desconto:</label>
                <div className="flex items-center bg-purple-50 p-0.5 rounded-lg border border-purple-200">
                  <button
                    type="button"
                    onClick={() => setTipoDesconto('reais')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      tipoDesconto === 'reais'
                        ? 'bg-[#351465] text-white shadow-xs'
                        : 'text-purple-900 hover:text-purple-950'
                    }`}
                  >
                    R$
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoDesconto('porcentagem')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      tipoDesconto === 'porcentagem'
                        ? 'bg-[#351465] text-white shadow-xs'
                        : 'text-purple-900 hover:text-purple-950'
                    }`}
                  >
                    %
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max={tipoDesconto === 'porcentagem' ? 100 : subtotal}
                  step={tipoDesconto === 'porcentagem' ? '1' : '0.01'}
                  value={tipoDesconto === 'porcentagem' ? (descontoPercentual || '') : (descontoReais || '')}
                  onChange={e => {
                    const val = Math.max(0, parseFloat(e.target.value) || 0);
                    if (tipoDesconto === 'porcentagem') {
                      setDescontoPercentual(Math.min(100, val));
                    } else {
                      setDescontoReais(Math.min(subtotal, val));
                    }
                  }}
                  placeholder={tipoDesconto === 'porcentagem' ? '0%' : '0,00'}
                  className="w-full pl-3 pr-10 py-2 bg-purple-50/30 border border-purple-200 rounded-xl text-xs font-semibold text-slate-900 outline-hidden focus:border-[#351465]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-purple-700">
                  {tipoDesconto === 'porcentagem' ? '%' : 'R$'}
                </span>
              </div>

              {/* Botões rápidos de porcentagem quando no modo % */}
              {tipoDesconto === 'porcentagem' && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  {[5, 10, 15, 20].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDescontoPercentual(pct)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                        descontoPercentual === pct
                          ? 'bg-[#351465] text-white border-[#351465]'
                          : 'bg-white text-purple-800 border-purple-200 hover:bg-purple-50'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                  {descontoPercentual > 0 && (
                    <button
                      type="button"
                      onClick={() => setDescontoPercentual(0)}
                      className="text-[10px] text-slate-400 hover:text-rose-600 ml-auto cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              )}

              {/* Conversão em tempo real */}
              {valorDescontoCalculado > 0 && (
                <div className="text-[11px] text-emerald-700 font-semibold flex justify-between pt-0.5">
                  <span>
                    {tipoDesconto === 'porcentagem'
                      ? `Desconto aplicado (${descontoPercentual}%):`
                      : `Desconto equivalente:`}
                  </span>
                  <span>
                    {tipoDesconto === 'porcentagem'
                      ? `- ${formatCurrency(valorDescontoCalculado)}`
                      : `${subtotal > 0 ? ((valorDescontoCalculado / subtotal) * 100).toFixed(1) : 0}%`}
                  </span>
                </div>
              )}
            </div>

            {/* Observações Opcionais */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700">Observações (opcional):</label>
              <input
                type="text"
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Ex: Entrega na sexta, ajuste de barra..."
                className="w-full px-3 py-2 bg-purple-50/30 border border-purple-200 rounded-xl text-xs text-slate-900 outline-hidden focus:border-[#351465]"
              />
            </div>

            {/* Resumo de Valores */}
            <div className="pt-3 border-t border-purple-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal ({totalPecas} peças):</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {valorDescontoCalculado > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>
                    Desconto {tipoDesconto === 'porcentagem' ? `(${descontoPercentual}%)` : ''}:
                  </span>
                  <span>- {formatCurrency(valorDescontoCalculado)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-purple-100">
                <span className="font-bold text-slate-800 text-sm">Total da Venda:</span>
                <span className="text-2xl font-black text-[#280F4D]">
                  {formatCurrency(totalPagar)}
                </span>
              </div>
            </div>

            {/* Botão de Conclusão */}
            <button
              type="button"
              disabled={vendaAtual.itens.length === 0}
              onClick={handleConcluirVenda}
              className="w-full py-3.5 bg-gradient-to-r from-[#280F4D] via-[#351465] to-[#481B84] hover:opacity-95 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-sm font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Concluir Venda</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* HISTÓRICO DE VENDAS CONCLUÍDAS                          */}
      {/* ======================================================== */}
      {viewMode === 'historico' && (
        <div className="space-y-4">
          {/* TOTALIZADOR DE VENDAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-gradient-to-br from-[#280F4D]/10 to-[#481B84]/5 border border-purple-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-[#280F4D] block flex items-center justify-between">
                <span>Total Vendido (Período)</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </span>
              <span className="text-2xl font-black text-[#280F4D] mt-1 block">
                {formatCurrency(totalFaturadoHistorico)}
              </span>
              <span className="text-[11px] text-emerald-700 font-bold block mt-1">
                Lucro Bruto: +{formatCurrency(lucroBrutoHistorico)} ({margemLucroHistorico}%)
              </span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-emerald-900 block flex items-center justify-between">
                <span>Ticket Médio por Venda</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </span>
              <span className="text-2xl font-black text-emerald-950 mt-1 block">
                {formatCurrency(ticketMedioHistorico)}
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold block mt-1">
                {totalQtdVendas} {totalQtdVendas === 1 ? 'venda realizada' : 'vendas realizadas'}
              </span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-amber-900 block flex items-center justify-between">
                <span>Peças Vendidas</span>
                <Shirt className="w-4 h-4 text-amber-600" />
              </span>
              <span className="text-2xl font-black text-amber-950 mt-1 block">
                {totalPecasHistorico} un
              </span>
              <span className="text-[11px] text-amber-800 font-semibold block mt-1">
                Volume de produtos saídos
              </span>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-blue-900 block flex items-center justify-between">
                <span>Vendido no Crediário</span>
                <ReceiptText className="w-4 h-4 text-blue-600" />
              </span>
              <span className="text-2xl font-black text-blue-950 mt-1 block">
                {formatCurrency(totalCrediarioPeriodo)}
              </span>
              <span className="text-[11px] text-blue-700 font-semibold block mt-1">
                {vendasHistoricoFiltradas.filter(v => v.forma_pagamento === 'crediario').length} venda(s) parcelada(s)
              </span>
            </div>
          </div>

          {/* BARRA DE PERSONALIZAÇÃO DE DATA & FILTROS */}
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
                    value={dataDeHistorico}
                    onChange={e => setDataDeHistorico(e.target.value)}
                    className="px-2.5 py-1.5 bg-purple-50/40 border border-purple-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:ring-2 focus:ring-[#280F4D] cursor-pointer"
                    title="Data inicial"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-medium">Até</span>
                  <input
                    type="date"
                    value={dataAteHistorico}
                    onChange={e => setDataAteHistorico(e.target.value)}
                    className="px-2.5 py-1.5 bg-purple-50/40 border border-purple-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:ring-2 focus:ring-[#280F4D] cursor-pointer"
                    title="Data final"
                  />
                </div>

                {(dataDeHistorico || dataAteHistorico) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDataDeHistorico('');
                      setDataAteHistorico('');
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
                    setDataDeHistorico(hojeStr);
                    setDataAteHistorico(hojeStr);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    dataDeHistorico === hojeStr && dataAteHistorico === hojeStr
                      ? 'bg-[#280F4D] text-white shadow-xs'
                      : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDataDeHistorico(seteDiasAtrasStr);
                    setDataAteHistorico(hojeStr);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    dataDeHistorico === seteDiasAtrasStr && dataAteHistorico === hojeStr
                      ? 'bg-[#280F4D] text-white shadow-xs'
                      : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
                  }`}
                >
                  Últimos 7 dias
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDataDeHistorico(primeiroDiaMesStr);
                    setDataAteHistorico(hojeStr);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    dataDeHistorico === primeiroDiaMesStr && dataAteHistorico === hojeStr
                      ? 'bg-[#280F4D] text-white shadow-xs'
                      : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
                  }`}
                >
                  Este Mês
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDataDeHistorico('');
                    setDataAteHistorico('');
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    !dataDeHistorico && !dataAteHistorico
                      ? 'bg-[#280F4D] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Todo o histórico
                </button>
              </div>
            </div>

            {/* Linha 2: Busca por cliente/código e Forma de Pagamento */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-purple-50">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-purple-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por código de venda ou nome do cliente..."
                  value={buscaHistorico}
                  onChange={e => setBuscaHistorico(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-purple-50/30 border border-purple-200 rounded-xl text-xs outline-hidden focus:border-[#351465]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { id: 'todas', label: 'Todas as formas' },
                  { id: 'pix', label: 'PIX' },
                  { id: 'dinheiro', label: 'Dinheiro' },
                  { id: 'cartao_credito', label: 'Cartão Crédito' },
                  { id: 'cartao_debito', label: 'Cartão Débito' },
                  { id: 'crediario', label: 'Crediário' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFiltroFormaHistorico(item.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      filtroFormaHistorico === item.id
                        ? 'bg-[#280F4D] text-white shadow-2xs'
                        : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-purple-50/70 border-b border-purple-100 text-[#280F4D] uppercase font-bold text-[10px]">
                    <th className="py-3 px-4">Código / Data</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Peças</th>
                    <th className="py-3 px-4">Pagamento</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Recibo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50">
                  {vendasHistoricoFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Nenhuma venda encontrada.
                      </td>
                    </tr>
                  ) : (
                    vendasHistoricoFiltradas.map(v => (
                      <tr key={v.id} className="hover:bg-purple-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-[#280F4D] block">
                            {v.codigo_venda}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatDateTime(v.data_venda)}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {v.cliente_nome || 'Consumidor Final'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {v.itens.reduce((acc, i) => acc + i.quantidade, 0)} peças
                        </td>
                        <td className="py-3 px-4">
                          <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-[#280F4D]">
                            {v.forma_pagamento}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-[#280F4D]">
                          {formatCurrency(v.total)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setVendaConcluidaParaRecibo(v)}
                            className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#280F4D] rounded-lg text-xs font-bold inline-flex items-center gap-1 border border-purple-200 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Recibo</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Cadastro Rápido de Cliente */}
      <QuickCustomerModal
        isOpen={isQuickCustomerOpen}
        onClose={() => setIsQuickCustomerOpen(false)}
        onSelectCreated={(novoCliente: Cliente) => {
          vincularClienteVendaAtual(novoCliente);
          setIsQuickCustomerOpen(false);
          showToast('sucesso', `Cliente ${novoCliente.nome} vinculado à venda!`);
        }}
      />

      {/* MODAL 2: Recibo Térmico & WhatsApp */}
      <ReceiptModal
        venda={vendaConcluidaParaRecibo}
        onClose={() => setVendaConcluidaParaRecibo(null)}
      />
    </div>
  );
};
