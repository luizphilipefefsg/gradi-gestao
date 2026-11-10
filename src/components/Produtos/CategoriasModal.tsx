import React, { useState } from 'react';
import {
  X,
  Tag,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Sparkles,
  Edit2,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface CategoriasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryAdded?: (nome: string) => void;
}

export const CategoriasModal: React.FC<CategoriasModalProps> = ({
  isOpen,
  onClose,
  onCategoryAdded,
}) => {
  const { categorias, produtos, adicionarCategoria, editarCategoria, excluirCategoria } = useStore();
  
  const [novoNome, setNovoNome] = useState('');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');
  
  // Confirmação de exclusão
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<{
    nome: string;
    qtdPecas: number;
  } | null>(null);

  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  if (!isOpen) return null;

  const showFeedback = (tipo: 'sucesso' | 'erro', texto: string) => {
    setFeedback({ tipo, texto });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleCadastrar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) {
      showFeedback('erro', 'Digite o nome da categoria.');
      return;
    }

    const res = adicionarCategoria(novoNome.trim());
    if (res.success) {
      showFeedback('sucesso', res.message || 'Categoria cadastrada com sucesso!');
      if (onCategoryAdded) onCategoryAdded(novoNome.trim());
      setNovoNome('');
    } else {
      showFeedback('erro', res.message || 'Erro ao cadastrar categoria.');
    }
  };

  const handleStartEdit = (cat: string) => {
    setEditingCat(cat);
    setEditingNome(cat);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat) return;
    if (!editingNome.trim()) {
      showFeedback('erro', 'O nome da categoria não pode ficar vazio.');
      return;
    }

    const res = editarCategoria(editingCat, editingNome.trim());
    if (res.success) {
      showFeedback('sucesso', res.message || 'Categoria atualizada com sucesso!');
      setEditingCat(null);
      setEditingNome('');
    } else {
      showFeedback('erro', res.message || 'Erro ao atualizar categoria.');
    }
  };

  const handleCancelEdit = () => {
    setEditingCat(null);
    setEditingNome('');
  };

  const handleSolicitarExclusao = (cat: string) => {
    const qtdPecas = produtos.filter(
      p => p.categoria.toLowerCase() === cat.toLowerCase()
    ).length;
    setConfirmDeleteCat({ nome: cat, qtdPecas });
  };

  const handleConfirmarExclusao = () => {
    if (!confirmDeleteCat) return;
    const { nome, qtdPecas } = confirmDeleteCat;
    const res = excluirCategoria(nome, 'Geral');
    if (res.success) {
      showFeedback('sucesso', res.message || 'Categoria excluída com sucesso.');
      setConfirmDeleteCat(null);
    } else {
      showFeedback('erro', res.message || 'Erro ao excluir categoria.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-purple-100 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Cabeçalho Modal com as cores Gradi Gestão (#2D1254) */}
        <div className="bg-gradient-to-r from-[#2D1254] via-[#38166D] to-[#4F238E] px-5 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 text-purple-200 rounded-xl backdrop-blur-xs">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Categorias de Produtos</h3>
              <p className="text-xs text-purple-200">
                Cadastre, edite os nomes ou exclua categorias da loja
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Mensagem de Feedback */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                feedback.tipo === 'sucesso'
                  ? 'bg-purple-50 border-purple-200 text-purple-900'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {feedback.tipo === 'sucesso' ? (
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span>{feedback.texto}</span>
            </div>
          )}

          {/* Modal / Caixa de Confirmação de Exclusão */}
          {confirmDeleteCat && (
            <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-rose-950 text-sm">
                    Excluir categoria &quot;{confirmDeleteCat.nome}&quot;?
                  </h4>
                  {confirmDeleteCat.qtdPecas > 0 ? (
                    <p className="text-rose-800 mt-1">
                      Há <strong>{confirmDeleteCat.qtdPecas} {confirmDeleteCat.qtdPecas === 1 ? 'modelo cadastrado' : 'modelos cadastrados'}</strong> nesta categoria.
                      Ao confirmar, eles serão transferidos automaticamente para a categoria <strong>&quot;Geral&quot;</strong>, sem perda de estoque ou dados.
                    </p>
                  ) : (
                    <p className="text-rose-700 mt-1">
                      Esta categoria não possui produtos vinculados e será removida permanentemente.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCat(null)}
                  className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold border border-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarExclusao}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          )}

          {/* Formulário para Cadastrar Nova Categoria */}
          <form onSubmit={handleCadastrar} className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Cadastrar Nova Categoria
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Ex: Jeans, Moda Praia, Acessórios..."
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-purple-50/30 border border-purple-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#38166D] focus:border-[#38166D] outline-hidden"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-[#2D1254] to-[#4F238E] hover:from-[#230d43] hover:to-[#431c82] text-white rounded-xl text-xs font-bold shadow-xs transition-all shrink-0 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar</span>
              </button>
            </div>
          </form>

          {/* Lista de Categorias com Opção de Editar e Excluir */}
          <div className="space-y-2 pt-3 border-t border-purple-100">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
              <span>Categorias ({categorias.length})</span>
              <span>Modelos &amp; Ações</span>
            </div>

            <div className="divide-y divide-purple-50 max-h-64 overflow-y-auto pr-1 space-y-1">
              {categorias.map(cat => {
                const qtdPecas = produtos.filter(
                  p => p.categoria.toLowerCase() === cat.toLowerCase()
                ).length;

                const isEditing = editingCat === cat;

                return (
                  <div
                    key={cat}
                    className={`py-2 px-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                      isEditing
                        ? 'bg-purple-100/70 border border-purple-300'
                        : 'hover:bg-purple-50/50'
                    }`}
                  >
                    {isEditing ? (
                      /* Formulário Inline de Edição */
                      <form
                        onSubmit={handleSaveEdit}
                        className="flex-1 flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={editingNome}
                          autoFocus
                          onChange={e => setEditingNome(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-purple-400 rounded-lg text-xs font-bold text-slate-900 outline-hidden focus:ring-2 focus:ring-[#38166D]"
                        />
                        <button
                          type="submit"
                          title="Salvar alteração"
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          title="Cancelar edição"
                          className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      /* Exibição Normal da Categoria */
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-[#2D1254]/10 text-[#2D1254] flex items-center justify-center text-xs font-bold shrink-0">
                            {cat.substring(0, 1).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-800 text-xs truncate">
                            {cat}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {qtdPecas} {qtdPecas === 1 ? 'modelo' : 'modelos'}
                          </span>

                          {/* Botão de Editar */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            title={`Editar nome da categoria "${cat}"`}
                            className="p-1.5 text-slate-400 hover:text-[#38166D] hover:bg-purple-100/70 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Botão de Excluir */}
                          <button
                            type="button"
                            onClick={() => handleSolicitarExclusao(cat)}
                            title={`Excluir categoria "${cat}"`}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 bg-purple-50/40 border-t border-purple-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-[#2D1254] to-[#4F238E] hover:from-[#230d43] hover:to-[#431c82] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
