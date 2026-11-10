import React, { useState } from 'react';
import {
  X,
  CheckCircle,
  RotateCcw,
  ShoppingBag,
  CreditCard,
  QrCode,
  Banknote,
  ReceiptText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Condicional, FormaPagamento, ParcelaCrediario, Venda } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface AcertoCondicionalModalProps {
  condicional: Condicional | null;
  onClose: () => void;
  onSuccess?: (vendaGerada?: Venda) => void;
}

export const AcertoCondicionalModal: React.FC<AcertoCondicionalModalProps> = ({
  condicional,
  onClose,
  onSuccess,
}) => {
  const { acertarCondicional, clientes } = useStore();

  // Map itemId -> 'comprar' | 'devolver'
  const [decisoes, setDecisoes] = useState<{ [itemId: string]: 'comprar' | 'devolver' }>(() => {
    if (!condicional) return {};
    const initial: { [itemId: string]: 'comprar' | 'devolver' } = {};
    condicional.itens.forEach(it => {
      initial[it.id] = 'comprar'; // default to kept
    });
    return initial;
  });

  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [qtdParcelasCrediario, setQtdParcelasCrediario] = useState(2);
  const [erro, setErro] = useState('');

  if (!condicional) return null;

  const cliente = clientes.find(c => c.id === condicional.cliente_id);

  const toggleDecisao = (itemId: string, acao: 'comprar' | 'devolver') => {
    setDecisoes(prev => ({
      ...prev,
      [itemId]: acao,
    }));
  };

  // Mark all to keep or all to return
  const marcarTodos = (acao: 'comprar' | 'devolver') => {
    const atualizado: { [itemId: string]: 'comprar' | 'devolver' } = {};
    condicional.itens.forEach(it => {
      atualizado[it.id] = acao;
    });
    setDecisoes(atualizado);
  };

  // Calculate totals
  const itensComprados = condicional.itens.filter(i => decisoes[i.id] === 'comprar');
  const itensDevolvidos = condicional.itens.filter(i => decisoes[i.id] === 'devolver');

  const totalVendaFinal = itensComprados.reduce(
    (acc, curr) => acc + curr.preco_unitario * curr.quantidade,
    0
  );

  const handleFinalizarAcerto = () => {
    setErro('');

    const arrayDecisoes = Object.entries(decisoes).map(([itemId, acao]) => ({
      itemId,
      acao,
    }));

    let parcelasCred: ParcelaCrediario[] | undefined;

    if (formaPagamento === 'crediario' && totalVendaFinal > 0) {
      if (!cliente) {
        setErro('Cliente não encontrado para crediário.');
        return;
      }
      const valorBase = Math.floor((totalVendaFinal / qtdParcelasCrediario) * 100) / 100;
      const sobra = Math.round((totalVendaFinal - valorBase * qtdParcelasCrediario) * 100) / 100;

      const hoje = new Date();
      parcelasCred = Array.from({ length: qtdParcelasCrediario }, (_, idx) => {
        const d = new Date(hoje);
        d.setDate(d.getDate() + 30 * (idx + 1));
        return {
          id: `parc-cond-${Date.now()}-${idx + 1}`,
          venda_id: '',
          cliente_id: cliente.id,
          numero_parcela: idx + 1,
          total_parcelas: qtdParcelasCrediario,
          valor: idx === qtdParcelasCrediario - 1 ? valorBase + sobra : valorBase,
          data_vencimento: d.toISOString().split('T')[0],
          status: 'pendente',
          valor_pago: 0,
        };
      });
    }

    const res = acertarCondicional(condicional.id, arrayDecisoes, formaPagamento, parcelasCred);
    if (!res.success) {
      setErro(res.message || 'Erro ao processar acerto da condicional.');
      return;
    }

    let vendaFinal = res.vendaGerada;

    // Se nenhuma peça foi comprada (todas devolvidas), cria o comprovante de devolução formal
    if (!vendaFinal && itensDevolvidos.length > 0) {
      vendaFinal = {
        id: `dev-${condicional.id}`,
        codigo_venda: `DEV-${condicional.codigo_condicional}`,
        cliente_id: condicional.cliente_id,
        cliente_nome: condicional.cliente_nome,
        cliente_whatsapp: condicional.cliente_whatsapp,
        data_venda: new Date().toISOString(),
        status: 'finalizada',
        subtotal: 0,
        desconto: 0,
        acrescimo: 0,
        total: 0,
        forma_pagamento: 'dinheiro',
        itens: itensDevolvidos.map(it => ({
          id: it.id,
          venda_id: '',
          grade_id: it.grade_id,
          produto_id: it.produto_id,
          produto_nome: `${it.produto_nome} (DEVOLVIDO)`,
          tamanho: it.tamanho,
          cor: it.cor,
          sku: it.sku,
          codigo_barras: '',
          preco_unitario: 0,
          preco_custo_unitario: 0,
          quantidade: it.quantidade,
          subtotal: 0,
        })),
        observacoes: `Comprovante de Devolução Total da Sacola ${condicional.codigo_condicional}`,
      };
    }

    if (onSuccess) onSuccess(vendaFinal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-purple-100 my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#280F4D] via-[#351465] to-[#481B84] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 text-white rounded-xl backdrop-blur-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Acerto de Condicional (1-Clique)</h3>
              <p className="text-xs text-purple-100">
                Sacola: <strong className="text-white">{condicional.codigo_condicional}</strong> | Cliente:{' '}
                <strong className="text-white">{condicional.cliente_nome}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Quick Bulk Actions */}
          <div className="flex items-center justify-between text-xs pb-1">
            <span className="font-semibold text-slate-600">
              Defina o destino de cada peça trazida pelo cliente:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => marcarTodos('comprar')}
                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
              >
                Ficou com Tudo
              </button>
              <button
                type="button"
                onClick={() => marcarTodos('devolver')}
                className="text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors"
              >
                Devolveu Tudo
              </button>
            </div>
          </div>

          {/* Items Decision List */}
          <div className="space-y-2.5">
            {condicional.itens.map(item => {
              const decisao = decisoes[item.id] || 'comprar';
              const isComprar = decisao === 'comprar';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isComprar
                      ? 'bg-emerald-50/60 border-emerald-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">{item.produto_nome}</h5>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="bg-white border border-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">
                        {item.tamanho}
                      </span>
                      <span>{item.cor}</span>
                      <span className="font-mono text-slate-400">SKU: {item.sku}</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(item.preco_unitario)}
                      </span>
                    </div>
                  </div>

                  {/* Toggle decision buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleDecisao(item.id, 'comprar')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isComprar
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Cliente Ficou (Comprar)
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleDecisao(item.id, 'devolver')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        !isComprar
                          ? 'bg-slate-700 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Devolver ao Estoque
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment block if any piece was kept */}
          {itensComprados.length > 0 ? (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Peças Compradas:</span>
                  <strong className="text-slate-900 text-sm">
                    {itensComprados.length} de {condicional.itens.length} peças
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Total a Pagar:</span>
                  <span className="text-xl font-black text-emerald-600">
                    {formatCurrency(totalVendaFinal)}
                  </span>
                </div>
              </div>

              {/* Forma de pagamento */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Forma de Pagamento das Peças Vendidas
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'pix', label: 'Pix Instantâneo', icon: QrCode },
                    { id: 'cartao_credito', label: 'Cartão Crédito', icon: CreditCard },
                    { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                    { id: 'crediario', label: 'Crediário Loja', icon: ReceiptText },
                  ].map(opt => {
                    const Icon = opt.icon;
                    const isSel = formaPagamento === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormaPagamento(opt.id as FormaPagamento)}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all ${
                          isSel
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSel ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="text-xs">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {formaPagamento === 'crediario' && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-amber-900">
                      Lançar no Carnê do Cliente em:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={[1, 2, 3, 4, 5, 6, 10, 12].includes(qtdParcelasCrediario) ? qtdParcelasCrediario : 'custom'}
                        onChange={e => {
                          if (e.target.value !== 'custom') {
                            setQtdParcelasCrediario(Number(e.target.value));
                          }
                        }}
                        className="bg-white border border-amber-300 rounded-lg px-2 py-1 font-bold text-amber-900 outline-hidden"
                      >
                        <option value="1">1x (30 dias)</option>
                        <option value="2">2x mensais</option>
                        <option value="3">3x mensais</option>
                        <option value="4">4x mensais</option>
                        <option value="5">5x mensais</option>
                        <option value="6">6x mensais</option>
                        <option value="10">10x mensais</option>
                        <option value="12">12x mensais</option>
                        <option value="custom">Outro valor...</option>
                      </select>

                      <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-lg px-2 py-0.5">
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
                          className="w-10 text-center font-black text-amber-950 outline-none"
                        />
                        <span className="font-bold text-amber-900">x</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-800 flex flex-wrap items-center justify-between gap-1">
                    <span>O valor será lançado no carnê e adicionado ao contas a receber.</span>
                    <strong className="text-amber-950 font-bold">
                      {qtdParcelasCrediario}x de {formatCurrency(totalVendaFinal / (qtdParcelasCrediario || 1))}
                    </strong>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-center text-xs text-slate-600">
              Todas as peças serão devolvidas. Nenhuma cobrança financeira será gerada.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={handleFinalizarAcerto}
            className="px-6 py-2.5 bg-gradient-to-r from-[#280F4D] via-[#351465] to-[#481B84] hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-md shadow-[#280F4D]/25 flex items-center gap-2 transition-all hover:scale-[1.01] cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Concluir Acerto &amp; Emitir Cupom
          </button>
        </div>
      </div>
    </div>
  );
};
