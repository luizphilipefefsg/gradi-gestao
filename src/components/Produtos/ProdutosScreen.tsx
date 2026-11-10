import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Tag,
  Search,
  ChevronDown,
  ChevronUp,
  Package,
  Barcode,
  Sparkles,
  Edit3,
  Trash2,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Produto } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { NovoProdutoModal } from './NovoProdutoModal';
import { CategoriasModal } from './CategoriasModal';

export const ProdutosScreen: React.FC = () => {
  const { produtos, categorias, excluirProduto } = useStore();

  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [expandedProdId, setExpandedProdId] = useState<string | null>(null);

  // Modals
  const [isNovoProdutoOpen, setIsNovoProdutoOpen] = useState(false);
  const [isCategoriasOpen, setIsCategoriasOpen] = useState(false);
  const [produtoParaEditar, setProdutoParaEditar] = useState<Produto | null>(null);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<{ id: string; nome: string } | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedProdId(prev => (prev === id ? null : id));
  };

  const produtosFiltrados = produtos.filter(p => {
    const matchCat = categoriaFiltro === 'Todas' || p.categoria.toLowerCase() === categoriaFiltro.toLowerCase();
    const q = busca.toLowerCase();
    const matchBusca =
      !busca ||
      p.nome.toLowerCase().includes(q) ||
      p.referencia.toLowerCase().includes(q) ||
      p.categoria.toLowerCase().includes(q) ||
      p.grades.some(g => g.sku.toLowerCase().includes(q) || g.codigo_barras.includes(q));
    return matchCat && matchBusca;
  });

  const totalEstoquePecas = produtos.reduce(
    (acc, p) => acc + p.grades.reduce((gAcc, g) => gAcc + g.estoque_disponivel, 0),
    0
  );

  return (
    <div className="space-y-5">
      {/* Topo Limpo: Título da Tela e Ações Rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-[#280F4D] tracking-tight">Produtos & Grade por Tamanho</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cada peça possui variações por Tamanho (P, M, G, GG...) e Cor, com geração automática de código de barras.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCategoriasOpen(true)}
            className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#351465] border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Cadastrar, editar ou excluir categorias de roupas"
          >
            <Tag className="w-3.5 h-3.5 text-purple-700 shrink-0" />
            <span>Categorias</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setProdutoParaEditar(null);
              setIsNovoProdutoOpen(true);
            }}
            className="px-4 py-1.5 bg-[#351465] hover:bg-[#280F4D] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-purple-200 shrink-0" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Resumo Rápido e Didático */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Modelos Cadastrados</span>
            <p className="text-lg font-black text-slate-900">{produtos.length} modelos</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Peças Físicas em Estoque</span>
            <p className="text-lg font-black text-slate-900">{totalEstoquePecas} unidades</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Categorias Ativas</span>
            <p className="text-lg font-black text-slate-900">{categorias.length} categorias</p>
          </div>
        </div>
      </div>

      {/* Busca e Filtro de Categorias */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar produto por nome, modelo, categoria ou código de barras..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-hidden transition-all shadow-xs"
          />
        </div>

        {/* Categorias Pills + Botão Adicionar Categoria */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            type="button"
            onClick={() => setCategoriaFiltro('Todas')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              categoriaFiltro === 'Todas'
                ? 'bg-[#351465] text-white shadow-xs'
                : 'bg-white text-purple-900 border border-purple-200 hover:bg-purple-50'
            }`}
          >
            Todas ({produtos.length})
          </button>

          {categorias.map(cat => {
            const count = produtos.filter(
              p => p.categoria.toLowerCase() === cat.toLowerCase()
            ).length;
            const isAtiva = categoriaFiltro.toLowerCase() === cat.toLowerCase();

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaFiltro(cat)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isAtiva
                    ? 'bg-[#351465] text-white font-bold shadow-xs'
                    : 'bg-white text-slate-700 border border-purple-100 hover:border-purple-300 hover:bg-purple-50/50'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isAtiva ? 'bg-white/20 text-white' : 'bg-purple-50 text-[#351465]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsCategoriasOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors shrink-0 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Categorias</span>
          </button>
        </div>
      </div>

      {/* Lista de Produtos com Grade Didática */}
      <div className="space-y-3">
        {produtosFiltrados.map(prod => {
          const totalEstoqueDisp = prod.grades.reduce((acc, g) => acc + g.estoque_disponivel, 0);
          const totalEstoqueCond = prod.grades.reduce((acc, g) => acc + g.estoque_condicional, 0);
          const isExpanded = expandedProdId === prod.id;

          return (
            <div
              key={prod.id}
              className="bg-white border border-purple-100/90 rounded-2xl overflow-hidden shadow-xs hover:border-purple-300 transition-all"
            >
              {/* Linha Principal do Produto */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 font-extrabold flex items-center justify-center text-sm border border-purple-100 shrink-0">
                    {prod.categoria.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md">
                        {prod.categoria}
                      </span>
                      <span className="font-mono text-xs text-slate-400 font-bold">
                        Ref: {prod.referencia}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-0.5">
                      {prod.nome}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Fornecedor: <span className="font-medium text-slate-700">{prod.fornecedor_nome || prod.fornecedor || 'Próprio'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-slate-400 block font-medium">Venda</span>
                    <span className="font-black text-sm sm:text-base text-purple-900">
                      {formatCurrency(prod.preco_venda)}
                    </span>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-slate-400 block font-medium">Estoque Total</span>
                    <span className="font-bold text-xs sm:text-sm text-slate-800">
                      {totalEstoqueDisp} un{' '}
                      {totalEstoqueCond > 0 && (
                        <span className="text-[11px] text-purple-600 font-medium">
                          (+{totalEstoqueCond} em condicional)
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setProdutoParaEditar(prod);
                        setIsNovoProdutoOpen(true);
                      }}
                      title="Editar peça e grade completa"
                      className="p-2 text-purple-700 hover:text-purple-900 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setProdutoParaExcluir({ id: prod.id, nome: prod.nome })}
                      title="Excluir produto"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(prod.id)}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Grade ({prod.grades.length})</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Matriz de Variações da Grade Expandida */}
              {isExpanded && (
                <div className="p-4 bg-purple-50/40 border-t border-purple-100 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-950 uppercase tracking-wider text-[11px]">
                      Variações de Tamanho × Cor desta peça:
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Preço de Custo:{' '}
                      <strong className="text-slate-800">{formatCurrency(prod.preco_custo)}</strong>{' '}
                      (Margem: {prod.margem_lucro !== undefined ? prod.margem_lucro : Math.round(((prod.preco_venda - prod.preco_custo) / prod.preco_custo) * 100)}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {prod.grades.map(grade => (
                      <div
                        key={grade.id}
                        className="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-purple-900 bg-purple-50 px-2 py-0.5 rounded">
                            Tam {grade.tamanho}
                          </span>
                          <span className="text-xs font-semibold text-slate-700">{grade.cor}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                          <span className="text-slate-500 font-medium">Disponível:</span>
                          <strong
                            className={`font-bold ${
                              grade.estoque_disponivel <= 0
                                ? 'text-rose-600'
                                : grade.estoque_disponivel <= 2
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {grade.estoque_disponivel} un
                          </strong>
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono pt-1">
                          Cód: {grade.codigo_barras}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modais de Cadastro de Produto e Categorias */}
      <NovoProdutoModal
        isOpen={isNovoProdutoOpen}
        onClose={() => {
          setIsNovoProdutoOpen(false);
          setProdutoParaEditar(null);
        }}
        produtoParaEditar={produtoParaEditar}
      />

      <CategoriasModal
        isOpen={isCategoriasOpen}
        onClose={() => setIsCategoriasOpen(false)}
      />

      {/* Modal de Confirmação de Exclusão de Produto */}
      {produtoParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-purple-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Remover Produto</h3>
              <p className="text-xs text-slate-500 mt-1">
                Deseja realmente excluir o produto <strong className="text-slate-800">{produtoParaExcluir.nome}</strong> e suas variações?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProdutoParaExcluir(null)}
                className="py-2.5 px-4 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  excluirProduto(produtoParaExcluir.id);
                  setProdutoParaExcluir(null);
                }}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
