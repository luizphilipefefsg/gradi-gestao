import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Phone,
  User,
  FileText,
  Package,
  Edit2,
  Trash2,
  ExternalLink,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Fornecedor } from '../../types';
import { formatPhone, formatCNPJ, maskPhone, maskCNPJ, consultarCNPJ } from '../../utils/formatters';
import { NovoFornecedorModal } from './NovoFornecedorModal';

export const FornecedoresScreen: React.FC = () => {
  const { fornecedores, produtos, excluirFornecedor, atualizarFornecedor } = useStore();
  const [busca, setBusca] = useState('');
  const [isNovoFornecedorOpen, setIsNovoFornecedorOpen] = useState(false);
  const [fornecedorEditando, setFornecedorEditando] = useState<Fornecedor | null>(null);
  const [fornecedorParaExcluir, setFornecedorParaExcluir] = useState<{ id: string; nome: string } | null>(null);
  const [buscandoCnpjEdit, setBuscandoCnpjEdit] = useState(false);
  const [msgEdit, setMsgEdit] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const fornecedoresFiltrados = fornecedores.filter(f => {
    const q = busca.toLowerCase();
    const qNum = busca.replace(/\D/g, '');
    const telNum = f.telefone.replace(/\D/g, '');
    const cnpNum = (f.cnpj || '').replace(/\D/g, '');

    return (
      f.nome.toLowerCase().includes(q) ||
      f.contato.toLowerCase().includes(q) ||
      f.telefone.toLowerCase().includes(q) ||
      (qNum && telNum.includes(qNum)) ||
      (f.cnpj && f.cnpj.toLowerCase().includes(q)) ||
      (qNum && cnpNum.includes(qNum))
    );
  });

  const handleExcluir = (id: string, nome: string) => {
    setFornecedorParaExcluir({ id, nome });
  };

  const handleBuscarCnpjEdit = async () => {
    if (!fornecedorEditando) return;
    const limpo = (fornecedorEditando.cnpj || '').replace(/\D/g, '');
    if (limpo.length !== 14) {
      setMsgEdit({
        tipo: 'erro',
        texto: `Informe os 14 dígitos do CNPJ para buscar (atualmente possui ${limpo.length} dígitos).`,
      });
      return;
    }

    setBuscandoCnpjEdit(true);
    setMsgEdit(null);

    try {
      const res = await consultarCNPJ(limpo);
      if (res.success) {
        const nomeEmpresa = res.nome_fantasia || res.razao_social || '';
        setFornecedorEditando(prev => {
          if (!prev) return null;
          return {
            ...prev,
            nome: nomeEmpresa || prev.nome,
            telefone: res.telefone ? formatPhone(res.telefone) : prev.telefone,
            contato: res.contato || prev.contato,
          };
        });
        if (res.telefone) {
          setMsgEdit({ tipo: 'sucesso', texto: 'Dados atualizados da Receita Federal com sucesso!' });
        } else {
          setMsgEdit({
            tipo: 'sucesso',
            texto: `Empresa "${nomeEmpresa}" localizada! (Telefone não cadastrado na Receita, informe manualmente)`,
          });
        }
      } else {
        setMsgEdit({ tipo: 'erro', texto: res.message || 'CNPJ não localizado na Receita Federal.' });
      }
    } catch {
      setMsgEdit({ tipo: 'erro', texto: 'Erro de conexão ao consultar CNPJ. Tente novamente.' });
    } finally {
      setBuscandoCnpjEdit(false);
    }
  };

  const handleSalvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (fornecedorEditando) {
      atualizarFornecedor({
        ...fornecedorEditando,
        telefone: formatPhone(fornecedorEditando.telefone),
        cnpj: fornecedorEditando.cnpj ? formatCNPJ(fornecedorEditando.cnpj) : undefined,
      });
      setFornecedorEditando(null);
      setMsgEdit(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Topo Limpo: Título da Tela e Ação Rápida */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-[#280F4D] tracking-tight">Fornecedores & Confecções</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre as malharias, tecelagens e fábricas que fornecem as peças para a sua loja.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNovoFornecedorOpen(true)}
          className="px-4 py-1.5 bg-[#351465] hover:bg-[#280F4D] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-purple-200 shrink-0" />
          <span>Cadastrar Fornecedor</span>
        </button>
      </div>

      {/* Resumo Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Fornecedores Ativos</span>
            <p className="text-lg font-black text-slate-900">{fornecedores.length} parceiros</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Modelos Cadastrados na Loja</span>
            <p className="text-lg font-black text-slate-900">{produtos.length} produtos</p>
          </div>
        </div>
      </div>

      {/* Busca Simples */}
      <div className="relative">
        <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Buscar por nome da confecção, contato ou telefone..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-hidden transition-all shadow-xs"
        />
      </div>

      {/* Grid de Cards de Fornecedores */}
      {fornecedoresFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-purple-100 p-8 text-center text-slate-500">
          <Building2 className="w-12 h-12 text-purple-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700">Nenhum fornecedor encontrado</p>
          <p className="text-xs text-slate-400 mt-1">
            Clique no botão acima para cadastrar um novo fornecedor.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fornecedoresFiltrados.map(fornecedor => {
            const produtosDesteFornecedor = produtos.filter(
              p => (p.fornecedor_nome || p.fornecedor || '').toLowerCase() === fornecedor.nome.toLowerCase()
            );
            const zapClean = fornecedor.telefone.replace(/\D/g, '');

            return (
              <div
                key={fornecedor.id}
                className="bg-white rounded-2xl border border-purple-100 p-4 shadow-xs hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 font-extrabold flex items-center justify-center text-base shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">
                          {fornecedor.nome}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <User className="w-3 h-3 text-purple-500" />
                          <span>{fornecedor.contato}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFornecedorEditando(fornecedor)}
                        title="Editar fornecedor"
                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExcluir(fornecedor.id, fornecedor.nome)}
                        title="Remover fornecedor"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Informações de Contato e Documentos */}
                  <div className="mt-3.5 p-3 bg-purple-50/40 rounded-xl border border-purple-100 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-purple-500" />
                      <span className="font-medium">{formatPhone(fornecedor.telefone)}</span>
                    </div>

                    {fornecedor.cnpj && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-[11px]">CNPJ: {formatCNPJ(fornecedor.cnpj)}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1 border-t border-purple-100 text-purple-900">
                      <Package className="w-3.5 h-3.5 text-purple-600" />
                      <span className="font-semibold">
                        {produtosDesteFornecedor.length} produtos fornecidos
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ação: WhatsApp */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <a
                    href={`https://wa.me/55${zapClean}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Falar com Fornecedor no WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Cadastro */}
      <NovoFornecedorModal
        isOpen={isNovoFornecedorOpen}
        onClose={() => setIsNovoFornecedorOpen(false)}
      />

      {/* Modal de Edição */}
      {fornecedorEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-purple-100">
            <div className="bg-gradient-to-r from-[#280F4D] via-[#351465] to-[#481B84] px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base">Editar Fornecedor</h3>
              <button
                onClick={() => {
                  setFornecedorEditando(null);
                  setMsgEdit(null);
                }}
                className="text-white/80 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="p-6 space-y-3.5">
              {msgEdit && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                    msgEdit.tipo === 'sucesso'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {msgEdit.tipo === 'sucesso' ? (
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span>{msgEdit.texto}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    CNPJ (Opcional)
                  </label>
                  <button
                    type="button"
                    onClick={handleBuscarCnpjEdit}
                    disabled={buscandoCnpjEdit}
                    className="text-[11px] font-bold text-[#351465] hover:text-[#280F4D] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer transition-colors"
                    title="Puxar razão social e telefone automaticamente da Receita Federal"
                  >
                    {buscandoCnpjEdit ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#351465]" />
                        <span>Puxando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>Puxar dados automático</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={fornecedorEditando.cnpj || ''}
                  maxLength={18}
                  onChange={e => {
                    const masked = maskCNPJ(e.target.value);
                    setFornecedorEditando({ ...fornecedorEditando, cnpj: masked });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-purple-400 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome da Empresa / Confecção
                </label>
                <input
                  type="text"
                  required
                  value={fornecedorEditando.nome}
                  onChange={e =>
                    setFornecedorEditando({ ...fornecedorEditando, nome: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome do Contato / Representante
                </label>
                <input
                  type="text"
                  value={fornecedorEditando.contato}
                  onChange={e =>
                    setFornecedorEditando({ ...fornecedorEditando, contato: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  required
                  value={fornecedorEditando.telefone}
                  maxLength={15}
                  onChange={e =>
                    setFornecedorEditando({
                      ...fornecedorEditando,
                      telefone: maskPhone(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-hidden"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setFornecedorEditando(null);
                    setMsgEdit(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#280F4D] via-[#351465] to-[#481B84] hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Fornecedor */}
      {fornecedorParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-purple-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Remover Fornecedor</h3>
              <p className="text-xs text-slate-500 mt-1">
                Deseja realmente remover o fornecedor <strong className="text-slate-800">{fornecedorParaExcluir.nome}</strong>?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFornecedorParaExcluir(null)}
                className="py-2.5 px-4 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  excluirFornecedor(fornecedorParaExcluir.id);
                  setFornecedorParaExcluir(null);
                }}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
