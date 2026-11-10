import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Calendar,
  User,
  AlertCircle,
  Check,
  Search,
  Barcode,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency, formatWhatsApp } from '../../utils/formatters';

interface NewCondicionalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const NewCondicionalModal: React.FC<NewCondicionalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { clientes, produtos, criarCondicional } = useStore();

  const [clienteId, setClienteId] = useState('');
  const [dataPrevista, setDataPrevista] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3); // padrão de 3 dias
    return d.toISOString().split('T')[0];
  });
  const [observacoes, setObservacoes] = useState('');

  // Itens selecionados na sacola: array de { gradeId, quantidade }
  const [itensBag, setItensBag] = useState<{ gradeId: string; quantidade: number }[]>([]);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [erro, setErro] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Monta lista de peças com estoque disponível para seleção
  const gradesDisponiveis = useMemo(() => {
    const lista: {
      gradeId: string;
      produtoNome: string;
      tamanho: string;
      cor: string;
      sku: string;
      codigo_barras: string;
      referencia: string;
      categoria: string;
      preco: number;
      estoque: number;
    }[] = [];

    produtos.forEach(p => {
      p.grades.forEach(g => {
        if (g.estoque_disponivel > 0) {
          lista.push({
            gradeId: g.id,
            produtoNome: p.nome,
            tamanho: g.tamanho,
            cor: g.cor,
            sku: g.sku,
            codigo_barras: g.codigo_barras || '',
            referencia: p.referencia || '',
            categoria: p.categoria || '',
            preco: p.preco_venda,
            estoque: g.estoque_disponivel,
          });
        }
      });
    });

    return lista;
  }, [produtos]);

  // Filtro de busca em tempo real conforme digita (igual ao de Vendas / PDV)
  const termo = buscaProduto.trim().toLowerCase();
  const produtosFiltrados = useMemo(() => {
    if (!termo) {
      return gradesDisponiveis.slice(0, 15);
    }
    return gradesDisponiveis.filter(item => {
      return (
        item.produtoNome.toLowerCase().includes(termo) ||
        item.referencia.toLowerCase().includes(termo) ||
        item.categoria.toLowerCase().includes(termo) ||
        item.cor.toLowerCase().includes(termo) ||
        item.tamanho.toLowerCase().includes(termo) ||
        item.sku.toLowerCase().includes(termo) ||
        item.codigo_barras.includes(termo)
      );
    });
  }, [termo, gradesDisponiveis]);

  if (!isOpen) return null;

  const handleSelectGrade = (grade: typeof gradesDisponiveis[0]) => {
    setItensBag(prev => {
      const existing = prev.find(i => i.gradeId === grade.gradeId);
      if (existing) {
        if (existing.quantidade >= grade.estoque) {
          setErro(`Limite de estoque disponível atingido para ${grade.produtoNome} (${grade.estoque} un)`);
          return prev;
        }
        return prev.map(i =>
          i.gradeId === grade.gradeId ? { ...i, quantidade: i.quantidade + 1 } : i
        );
      }
      return [...prev, { gradeId: grade.gradeId, quantidade: 1 }];
    });
    setErro('');
    setBuscaProduto('');
    searchInputRef.current?.focus();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termo) return;

    // 1. Match exato por código de barras ou SKU
    const matchExato = gradesDisponiveis.find(
      g => g.codigo_barras === termo || g.sku.toLowerCase() === termo
    );
    if (matchExato) {
      handleSelectGrade(matchExato);
      return;
    }

    // 2. Primeiro item da lista filtrada
    if (produtosFiltrados.length > 0) {
      handleSelectGrade(produtosFiltrados[0]);
    } else {
      setErro(`Nenhuma peça encontrada para "${buscaProduto}".`);
    }
  };

  const handleIncreaseQty = (gradeId: string) => {
    const grade = gradesDisponiveis.find(g => g.gradeId === gradeId);
    if (!grade) return;
    setItensBag(prev =>
      prev.map(i => {
        if (i.gradeId === gradeId) {
          if (i.quantidade >= grade.estoque) {
            setErro(`Limite de estoque disponível atingido para esta variação (${grade.estoque} un)`);
            return i;
          }
          setErro('');
          return { ...i, quantidade: i.quantidade + 1 };
        }
        return i;
      })
    );
  };

  const handleDecreaseQty = (gradeId: string) => {
    setItensBag(prev =>
      prev
        .map(i => (i.gradeId === gradeId ? { ...i, quantidade: i.quantidade - 1 } : i))
        .filter(i => i.quantidade > 0)
    );
    setErro('');
  };

  const handleRemoveItem = (gradeId: string) => {
    setItensBag(prev => prev.filter(i => i.gradeId !== gradeId));
    setErro('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) {
      setErro('Selecione o cliente que vai receber a Sacola Condicional.');
      return;
    }
    if (itensBag.length === 0) {
      setErro('Adicione ao menos uma peça na Sacola Condicional.');
      return;
    }

    const res = criarCondicional(clienteId, itensBag, dataPrevista, observacoes);
    if (!res.success) {
      setErro(res.message || 'Erro ao criar condicional.');
      return;
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  const totalEstimado = itensBag.reduce((acc, item) => {
    const grade = gradesDisponiveis.find(g => g.gradeId === item.gradeId);
    return acc + (grade ? grade.preco * item.quantidade : 0);
  }, 0);

  const totalPecas = itensBag.reduce((acc, item) => acc + item.quantidade, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-purple-100 my-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho da Sacola com gradiente padrão do sistema */}
        <div className="bg-gradient-to-r from-[#280F4D] via-[#351465] to-[#481B84] px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 text-white rounded-xl backdrop-blur-xs">
              <ShoppingBag className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Enviar Sacola Condicional
              </h3>
              <p className="text-xs text-purple-200">
                Peças enviadas para a cliente provar em casa com baixa automática do estoque
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Cliente e Data de Devolução Lado a Lado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Cliente Responsável *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-purple-500 absolute left-3.5 top-3" />
                <select
                  required
                  value={clienteId}
                  onChange={e => setClienteId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-purple-50/30 border border-purple-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden focus:border-[#351465] focus:bg-white cursor-pointer"
                >
                  <option value="">Selecione a cliente...</option>
                  {clientes.map(cli => (
                    <option key={cli.id} value={cli.id}>
                      {cli.nome} — {formatWhatsApp(cli.whatsapp)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Previsão de Devolução / Retorno *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-purple-500 absolute left-3.5 top-3" />
                <input
                  type="date"
                  required
                  value={dataPrevista}
                  onChange={e => setDataPrevista(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-purple-50/30 border border-purple-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden focus:border-[#351465] focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* ========================================================
              CAMPO DE BUSCA IGUAL AO DE VENDAS / PDV (EM TEMPO REAL)
             ======================================================== */}
          <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200 space-y-2.5">
            <div>
              <label className="block text-xs font-bold text-[#280F4D] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#351465]" />
                Adicionar Peça na Sacola Condicional
              </label>
            </div>

            {/* Barra de Pesquisa Estilo PDV */}
            <div className="bg-white rounded-xl border-2 border-purple-200 focus-within:border-[#351465] shadow-2xs p-1.5 transition-all">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#351465] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={buscaProduto}
                    onFocus={() => setIsSearchFocused(true)}
                    onChange={e => setBuscaProduto(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchSubmit(e);
                      }
                    }}
                    placeholder="Digite o nome, ref, cor ou bipe o código de barras da peça..."
                    className="w-full pl-9 pr-8 py-2 bg-purple-50/20 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 outline-hidden"
                  />
                  {buscaProduto && (
                    <button
                      type="button"
                      onClick={() => {
                        setBuscaProduto('');
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="px-3 py-2 bg-[#351465] hover:bg-[#280F4D] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
                  title="Inserir primeiro item encontrado ou bipado"
                >
                  <Barcode className="w-3.5 h-3.5" />
                  <span>Inserir</span>
                </button>
              </div>
            </div>

            {/* Lista Dinâmica de Produtos Filtrados que aparecem conforme digita */}
            <div className="bg-white rounded-xl border border-purple-100 shadow-2xs overflow-hidden">
              <div className="px-3.5 py-2 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#280F4D]">
                  {termo ? `Resultados para "${buscaProduto}":` : 'Peças Disponíveis no Estoque (clique para adicionar):'}
                </span>
                <span className="text-purple-600 font-semibold">
                  {produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'peça' : 'peças'}
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-purple-50">
                {produtosFiltrados.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">
                    <p className="text-xs font-semibold text-slate-600">Nenhuma peça encontrada</p>
                    <p className="text-[11px] text-slate-400">
                      Tente digitar outro nome, tamanho, cor ou código de barras.
                    </p>
                  </div>
                ) : (
                  produtosFiltrados.map((item, idx) => {
                    const isFirst = termo && idx === 0;
                    return (
                      <div
                        key={item.gradeId}
                        onClick={() => handleSelectGrade(item)}
                        className={`p-2.5 transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                          isFirst
                            ? 'bg-purple-50/80 hover:bg-purple-100/80 border-l-4 border-[#351465]'
                            : 'hover:bg-purple-50/50 bg-white'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-xs text-slate-900 group-hover:text-[#280F4D] truncate">
                              {item.produtoNome}
                            </h5>
                            <span className="px-1.5 py-0.5 bg-[#280F4D] text-white text-[10px] font-black rounded">
                              {item.tamanho}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-600">
                              {item.cor}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            {item.referencia && <span>Ref: {item.referencia}</span>}
                            {item.categoria && <span>• {item.categoria}</span>}
                            <span>• Cód: {item.codigo_barras || item.sku}</span>
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                              {item.estoque} un disp.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-xs font-black text-[#280F4D]">
                            {formatCurrency(item.preco)}
                          </span>
                          <span className="p-1 bg-purple-100 text-[#351465] group-hover:bg-[#351465] group-hover:text-white rounded-lg transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Lista de Peças Selecionadas na Sacola */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-slate-700 uppercase tracking-wider">
                Peças na Sacola ({totalPecas} {totalPecas === 1 ? 'peça' : 'peças'})
              </span>
              {itensBag.length > 0 && (
                <span className="text-[11px] text-purple-700 font-semibold">
                  {itensBag.length} modelo(s)
                </span>
              )}
            </div>

            {itensBag.length === 0 ? (
              <div className="py-6 px-4 bg-purple-50/20 border-2 border-dashed border-purple-200/80 rounded-2xl text-center space-y-1">
                <ShoppingBag className="w-7 h-7 text-purple-300 mx-auto stroke-1" />
                <p className="text-xs font-bold text-slate-600">Nenhuma peça adicionada ainda à Sacola.</p>
                <p className="text-[11px] text-slate-400">
                  Pesquise e clique nas peças acima para incluir na condicional.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {itensBag.map(item => {
                  const grade = gradesDisponiveis.find(g => g.gradeId === item.gradeId);
                  if (!grade) return null;
                  return (
                    <div
                      key={item.gradeId}
                      className="p-3 bg-white border border-purple-100 hover:border-purple-300 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <strong className="text-slate-900 block font-bold truncate">
                          {grade.produtoNome}
                        </strong>
                        <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-0.5">
                          <span className="font-bold bg-purple-50 text-[#280F4D] px-2 py-0.5 rounded">
                            Tam: {grade.tamanho}
                          </span>
                          <span>•</span>
                          <span>Cor: {grade.cor}</span>
                          <span>•</span>
                          <span>Unit: {formatCurrency(grade.preco)}</span>
                        </div>
                      </div>

                      {/* Controle de Quantidade (+ e -) */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center bg-purple-50 border border-purple-200 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleDecreaseQty(item.gradeId)}
                            className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded transition-colors cursor-pointer"
                            title="Diminuir quantidade"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 font-bold text-xs text-slate-800 min-w-[20px] text-center">
                            {item.quantidade}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleIncreaseQty(item.gradeId)}
                            className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded transition-colors cursor-pointer"
                            title="Aumentar quantidade"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="font-extrabold text-[#280F4D] text-sm min-w-[70px] text-right">
                          {formatCurrency(grade.preco * item.quantidade)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.gradeId)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remover peça da sacola"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Observações da Condicional */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Observações (ex: provar para evento, ajuste de peças, data de retorno)
            </label>
            <input
              type="text"
              placeholder="Digite anotações ou observações para esta sacola..."
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-hidden focus:bg-white focus:ring-2 focus:ring-purple-400 font-medium"
            />
          </div>

          {/* Totalizador da Sacola */}
          <div className="p-4 bg-gradient-to-r from-purple-50 via-purple-50/60 to-purple-100/50 rounded-2xl border border-purple-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-purple-900 font-semibold block">Valor Total Estimado da Sacola:</span>
              <span className="text-[11px] text-purple-700 font-medium">{totalPecas} peça(s) no total</span>
            </div>
            <span className="text-2xl font-black text-[#280F4D]">
              {formatCurrency(totalEstimado)}
            </span>
          </div>

          {/* Rodapé com Ações */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={itensBag.length === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-[#280F4D] via-[#351465] to-[#481B84] hover:opacity-95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold rounded-xl shadow-md shadow-[#280F4D]/25 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <Check className="w-4 h-4" />
              <span>Liberar Sacola e Baixar Estoque</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
