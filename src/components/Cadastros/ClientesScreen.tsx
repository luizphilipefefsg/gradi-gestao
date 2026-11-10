import React, { useState } from 'react';
import {
  Users,
  User,
  UserPlus,
  Search,
  Phone,
  CreditCard,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  ExternalLink,
  DollarSign,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Cliente } from '../../types';
import { formatCurrency, formatWhatsApp, formatCPF, maskPhone, maskCPF } from '../../utils/formatters';
import { NovoClienteModal } from './NovoClienteModal';

export const ClientesScreen: React.FC = () => {
  const { clientes, vendas, excluirCliente, atualizarCliente } = useStore();
  const [busca, setBusca] = useState('');
  const [isNovoClienteOpen, setIsNovoClienteOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [clienteParaExcluir, setClienteParaExcluir] = useState<{ id: string; nome: string } | null>(null);

  const clientesFiltrados = clientes.filter(c => {
    const q = busca.toLowerCase();
    return (
      c.nome.toLowerCase().includes(q) ||
      c.whatsapp.includes(q) ||
      (c.cpf && c.cpf.includes(q))
    );
  });

  const totalClientes = clientes.length;
  const clientesComDebito = clientes.filter(c => c.saldo_devedor > 0).length;
  const totalEmAbertoCrediario = clientes.reduce((acc, c) => acc + c.saldo_devedor, 0);

  const handleExcluir = (id: string, nome: string) => {
    setClienteParaExcluir({ id, nome });
  };

  const handleSalvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (clienteEditando) {
      atualizarCliente(clienteEditando);
      setClienteEditando(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Topo Limpo: Título da Tela e Ação Rápida */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-[#280F4D] tracking-tight">Clientes & Crediário</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre seus clientes para vendas fiado/crediário próprio e envio de peças no condicional.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNovoClienteOpen(true)}
          className="px-4 py-1.5 bg-[#351465] hover:bg-[#280F4D] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5 text-purple-200 shrink-0" />
          <span>Cadastrar Cliente</span>
        </button>
      </div>

      {/* Resumo Rápido (3 Cards didáticos sem poluição) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total de Clientes</span>
            <p className="text-lg font-black text-slate-900">{totalClientes} cadastrados</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Com Carnê Ativo</span>
            <p className="text-lg font-black text-slate-900">{clientesComDebito} clientes</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total a Receber</span>
            <p className="text-lg font-black text-slate-900">{formatCurrency(totalEmAbertoCrediario)}</p>
          </div>
        </div>
      </div>

      {/* Barra de Busca Simples */}
      <div className="relative">
        <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Buscar por nome do cliente ou WhatsApp..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-hidden transition-all shadow-xs"
        />
      </div>

      {/* Grid de Cards de Clientes - Didático, limpo e espaçoso */}
      {clientesFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-purple-100 p-8 text-center text-slate-500">
          <Users className="w-12 h-12 text-purple-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700">Nenhum cliente encontrado</p>
          <p className="text-xs text-slate-400 mt-1">
            Clique no botão acima para cadastrar um novo cliente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientesFiltrados.map(cliente => {
            const temDebito = cliente.saldo_devedor > 0;
            const zapClean = cliente.whatsapp.replace(/\D/g, '');

            return (
              <div
                key={cliente.id}
                className="bg-white rounded-2xl border border-purple-100 p-4 shadow-xs hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#280F4D] to-[#481B84] text-white flex items-center justify-center shadow-xs shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">
                          {cliente.nome}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <Phone className="w-3 h-3 text-purple-500" />
                          <span>{formatWhatsApp(cliente.whatsapp)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setClienteEditando(cliente)}
                        title="Editar cliente"
                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExcluir(cliente.id, cliente.nome)}
                        title="Remover cliente"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Informações de Crediário */}
                  <div className="mt-4 p-3 bg-purple-50/50 rounded-xl border border-purple-100/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Crediário da Loja:</span>
                      <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[11px]">
                        Liberado para compras
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-purple-100">
                      <span className="text-slate-600 font-semibold">Débito Atual no Carnê:</span>
                      <strong className={temDebito ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                        {temDebito ? formatCurrency(cliente.saldo_devedor) : 'Em dia (R$ 0,00)'}
                      </strong>
                    </div>
                  </div>

                  {/* Detalhes extras (CPF / Endereço) se preenchidos */}
                  {(cliente.cpf || cliente.endereco) && (
                    <div className="mt-3 text-[11px] text-slate-500 space-y-1">
                      {cliente.cpf && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span>CPF: {formatCPF(cliente.cpf)}</span>
                        </div>
                      )}
                      {cliente.endereco && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{cliente.endereco}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Botão de WhatsApp direto */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <a
                    href={`https://wa.me/55${zapClean}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir no WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Cadastro de Cliente */}
      <NovoClienteModal
        isOpen={isNovoClienteOpen}
        onClose={() => setIsNovoClienteOpen(false)}
      />

      {/* Modal de Edição de Cliente */}
      {clienteEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-purple-100">
            <div className="bg-gradient-to-r from-[#280F4D] via-[#351465] to-[#481B84] px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base">Editar Cliente</h3>
              <button
                onClick={() => setClienteEditando(null)}
                className="text-white/80 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={clienteEditando.nome}
                  onChange={e =>
                    setClienteEditando({ ...clienteEditando, nome: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  WhatsApp / Telefone
                </label>
                <input
                  type="text"
                  required
                  value={clienteEditando.whatsapp}
                  maxLength={15}
                  onChange={e =>
                    setClienteEditando({ ...clienteEditando, whatsapp: maskPhone(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  CPF (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={clienteEditando.cpf || ''}
                  maxLength={14}
                  onChange={e =>
                    setClienteEditando({ ...clienteEditando, cpf: maskCPF(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-hidden"
                />
              </div>



              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  value={clienteEditando.endereco || ''}
                  onChange={e =>
                    setClienteEditando({ ...clienteEditando, endereco: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-hidden"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClienteEditando(null)}
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

      {/* Modal de Confirmação de Exclusão de Cliente */}
      {clienteParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-purple-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Remover Cliente</h3>
              <p className="text-xs text-slate-500 mt-1">
                Deseja realmente remover o cliente <strong className="text-slate-800">{clienteParaExcluir.nome}</strong>?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClienteParaExcluir(null)}
                className="py-2.5 px-4 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  excluirCliente(clienteParaExcluir.id);
                  setClienteParaExcluir(null);
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
