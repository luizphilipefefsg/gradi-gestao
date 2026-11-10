import React, { useState } from 'react';
import {
  Users,
  User,
  UserPlus,
  Store,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  Trash2,
  Lock,
  Unlock,
  Phone,
  Mail,
  Search,
  Eye,
  EyeOff,
  MessageSquare,
  Sparkles,
  AlertCircle,
  X,
  RefreshCw,
  Building2,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UsuarioSistema } from '../../types';

export const UsuariosSistemaScreen: React.FC = () => {
  const {
    usuariosSistema,
    usuarioSistema: currentUser,
    isAdmin,
    cadastrarUsuarioSistema,
    atualizarUsuarioSistema,
    excluirUsuarioSistema,
  } = useAuth();

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativo' | 'suspenso'>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioSistema | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'toggle'; user: UsuarioSistema } | null>(null);
  const [whatsappModal, setWhatsappModal] = useState<{
    user: UsuarioSistema;
    msg: string;
    linkWpp: string;
  } | null>(null);

  // Form states
  const [nome, setNome] = useState('');
  const [nomeLoja, setNomeLoja] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [role, setRole] = useState<'admin' | 'lojista' | 'vendedora'>('lojista');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Copied alert feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Senhas iniciais ficam somente na memória desta sessão; nunca são gravadas no Firestore.
  const [senhasTemporarias, setSenhasTemporarias] = useState<Record<string, string>>({});

  const resetForm = () => {
    setNome('');
    setNomeLoja('');
    setEmail('');
    setSenha('');
    setWhatsapp('');
    setRole('lojista');
    setMostrarSenha(false);
    setFormErro(null);
    setEditingUser(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    // Gerar senha aleatória inicial amigável
    const randomPass = Math.random().toString(36).slice(-6) + '@' + Math.floor(10 + Math.random() * 90);
    setSenha(randomPass);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UsuarioSistema) => {
    setEditingUser(user);
    setNome(user.nome);
    setNomeLoja(user.nomeLoja);
    setEmail(user.email);
    setSenha('');
    setWhatsapp(user.whatsapp || '');
    setRole(user.role);
    setFormErro(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErro(null);

    if (!nome.trim() || !nomeLoja.trim() || !email.trim()) {
      setFormErro('Por favor, preencha o Nome, o Nome da Loja e o E-mail.');
      return;
    }

    if (!editingUser && !senha.trim()) {
      setFormErro('Defina uma senha de acesso para o cliente.');
      return;
    }

    setIsSaving(true);

    try {
      if (editingUser) {
        // Atualização
        const res = await atualizarUsuarioSistema(editingUser.id, {
          nome: nome.trim(),
          nomeLoja: nomeLoja.trim(),
          email: email.trim().toLowerCase(),
          whatsapp: whatsapp.trim(),
          role,
        });

        if (!res.success) {
          setFormErro(res.message || 'Erro ao atualizar dados do cliente.');
          setIsSaving(false);
          return;
        }
      } else {
        // Novo cadastro
        const res = await cadastrarUsuarioSistema({
          nome: nome.trim(),
          nomeLoja: nomeLoja.trim(),
          email: email.trim().toLowerCase(),
          senha: senha.trim(),
          whatsapp: whatsapp.trim(),
          role,
          status: 'ativo',
          criadoPor: currentUser?.email || 'Admin',
        });

        if (!res.success) {
          setFormErro(res.message || 'Erro ao cadastrar novo cliente do sistema.');
          setIsSaving(false);
          return;
        }
      }

      if (!editingUser) {
        setSenhasTemporarias((prev) => ({ ...prev, [email.trim().toLowerCase()]: senha.trim() }));
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: unknown) {
      setFormErro(err instanceof Error ? err.message : 'Erro ao salvar cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = (user: UsuarioSistema) => {
    setConfirmAction({ type: 'toggle', user });
  };

  const handleDelete = (user: UsuarioSistema) => {
    if (user.email.toLowerCase() === 'administrativo@gmail.com') {
      return;
    }
    setConfirmAction({ type: 'delete', user });
  };

  // Gerar e copiar mensagem de boas-vindas com credenciais para o WhatsApp
  const handleCopiarDadosWhatsApp = (user: UsuarioSistema) => {
    const urlSistema = window.location.origin;
    const msg = `✨ *GRADI GESTÃO - SEUS DADOS DE ACESSO* ✨\n\nOlá, *${user.nome}* da *${user.nomeLoja}*! 👋\nSeu acesso ao Gradi Gestão já está liberado e pronto para uso! 🚀\n\n🌐 *Link de Acesso:* ${urlSistema}\n📧 *E-mail de Login:* ${user.email}\n🔑 *Senha Inicial:* ${senhasTemporarias[user.email] || '(senha protegida; solicite uma redefinição ao administrador)'}\n\n👗 *Tudo pronto para alavancar suas vendas!*\nVocê já pode cadastrar suas peças, cores, tamanhos, clientes e emitir suas vendas no PDV.\n\nBoas vendas e muito sucesso! 🛍️🎉`;

    navigator.clipboard.writeText(msg);
    setCopiedId(user.id);
    setTimeout(() => setCopiedId(null), 3000);

    const foneLimpo = (user.whatsapp || '').replace(/\D/g, '');
    const ddi = foneLimpo.startsWith('55') && foneLimpo.length >= 12 ? foneLimpo : `55${foneLimpo}`;
    const linkWpp = foneLimpo
      ? `https://api.whatsapp.com/send?phone=${ddi}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    setWhatsappModal({ user, msg, linkWpp });

    if (foneLimpo) {
      window.open(linkWpp, '_blank');
    }
  };

  const usuariosFiltrados = usuariosSistema.filter(u => {
    const termo = busca.toLowerCase();
    const matchBusca =
      u.nome.toLowerCase().includes(termo) ||
      u.nomeLoja.toLowerCase().includes(termo) ||
      u.email.toLowerCase().includes(termo) ||
      (u.whatsapp && u.whatsapp.includes(termo));

    if (!matchBusca) return false;
    if (filtroStatus === 'todos') return true;
    return u.status === filtroStatus;
  });

  const totalAtivos = usuariosSistema.filter(u => u.status === 'ativo').length;
  const totalSuspensos = usuariosSistema.filter(u => u.status === 'suspenso').length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-[#280F4D] via-[#351465] to-[#481B84] text-white p-6 sm:p-8 rounded-2xl shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-semibold backdrop-blur-xs border border-purple-400/20">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              Módulo Administrativo • Gradi Gestão
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Painel Administrativo
            </h1>
            <p className="text-purple-200/90 text-sm max-w-2xl leading-relaxed">
              Gestão de lojas parceiras, controle de acessos, senhas dos clientes lojistas e configurações administrativas do sistema.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenAdd}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Novo Cliente</span>
            </button>
          </div>
        </div>

        {/* Cards de Métricas Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-purple-400/20">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-xs text-purple-200 font-medium">Total de Lojas / Clientes</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {usuariosSistema.length}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-xs text-emerald-200 font-medium">Acessos Ativos</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5">
              {totalAtivos}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-xs text-rose-200 font-medium">Suspensos</div>
            <div className="text-xl sm:text-2xl font-black text-rose-300 mt-0.5">
              {totalSuspensos}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-purple-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Campo de Busca */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome do lojista, nome da loja, e-mail ou WhatsApp..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#280F4D]/20 focus:border-[#280F4D] text-sm text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Filtro de Status */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold self-start md:self-auto">
          <button
            onClick={() => setFiltroStatus('todos')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filtroStatus === 'todos'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({usuariosSistema.length})
          </button>
          <button
            onClick={() => setFiltroStatus('ativo')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filtroStatus === 'ativo'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Ativos ({totalAtivos})
          </button>
          <button
            onClick={() => setFiltroStatus('suspenso')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filtroStatus === 'suspenso'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            Suspensos ({totalSuspensos})
          </button>
        </div>
      </div>

      {/* Lista / Tabela de Clientes */}
      <div className="bg-white rounded-2xl shadow-xs border border-purple-100 overflow-hidden">
        {usuariosFiltrados.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Users className="w-12 h-12 text-purple-200 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">Nenhum cliente encontrado</h3>
            <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
              Nenhum lojista corresponde aos critérios da busca. Clique no botão acima para cadastrar um novo cliente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-purple-50/70 border-b border-purple-100 text-xs font-bold text-[#280F4D] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Cliente / Loja</th>
                  <th className="py-3.5 px-4">E-mail de Acesso</th>
                  <th className="py-3.5 px-4">Senha Cadastrada</th>
                  <th className="py-3.5 px-4">WhatsApp</th>
                  <th className="py-3.5 px-4">Perfil</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuariosFiltrados.map(user => {
                  const isCurrent = currentUser?.id === user.id || currentUser?.email.toLowerCase() === user.email.toLowerCase();
                  const isMaster = user.email.toLowerCase() === 'administrativo@gmail.com';

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-purple-50/30 transition-colors group"
                    >
                      {/* Cliente / Loja */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#280F4D] to-[#481B84] text-white flex items-center justify-center shadow-xs shrink-0">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {user.nome}
                              {isCurrent && (
                                <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-semibold">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-purple-700 font-medium flex items-center gap-1 mt-0.5">
                              <Store className="w-3 h-3 text-purple-400" />
                              {user.nomeLoja}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* E-mail */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{user.email}</span>
                        </div>
                        {user.ultimoAcesso && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Último acesso: {new Date(user.ultimoAcesso).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>

                      {/* Senha */}
                      <td className="py-3.5 px-4">
                        {senhasTemporarias[user.email] ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-xs font-mono font-semibold text-slate-700">
                            <KeyRound className="w-3 h-3 text-slate-400" />
                            <span>{senhasTemporarias[user.email]}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Protegida pelo Firebase</span>
                        )}
                      </td>

                      {/* WhatsApp */}
                      <td className="py-3.5 px-4">
                        {user.whatsapp ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{user.whatsapp}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Não informado</span>
                        )}
                      </td>

                      {/* Perfil */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-[#280F4D] border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {user.role === 'admin' ? (
                            <>
                              <ShieldCheck className="w-3 h-3" />
                              Administrador
                            </>
                          ) : (
                            <>
                              <Store className="w-3 h-3" />
                              Lojista
                            </>
                          )}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            user.status === 'ativo'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'ativo' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {user.status === 'ativo' ? 'Ativo' : 'Suspenso'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão Copiar/Enviar WhatsApp */}
                          <button
                            onClick={() => handleCopiarDadosWhatsApp(user)}
                            title="Copiar dados de acesso e abrir WhatsApp do lojista"
                            className={`p-2 rounded-lg font-medium text-xs flex items-center gap-1 transition-all cursor-pointer ${
                              copiedId === user.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {copiedId === user.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden xl:inline">Enviar WPP</span>
                              </>
                            )}
                          </button>

                          {/* Alternar Status (Ativar / Suspender) */}
                          {!isMaster && (
                            <button
                              onClick={() => handleToggleStatus(user)}
                              title={user.status === 'ativo' ? 'Suspender acesso' : 'Reativar acesso'}
                              className={`p-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                user.status === 'ativo'
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {user.status === 'ativo' ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEdit(user)}
                            title="Editar dados do cliente"
                            className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#280F4D] transition-all cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Excluir */}
                          {!isMaster && (
                            <button
                              onClick={() => handleDelete(user)}
                              title="Excluir cadastro"
                              className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro / Edição de Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-purple-100 w-full max-w-lg overflow-hidden animate-scaleUp">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-[#280F4D] to-[#481B84] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-purple-200" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {editingUser ? 'Editar Cliente do Sistema' : 'Cadastrar Novo Cliente Lojista'}
                  </h3>
                  <p className="text-xs text-purple-200 mt-0.5">
                    Defina o acesso para a loja utilizar o Gradi Gestão
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formErro && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formErro}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome do Responsável */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Nome do Lojista / Responsável <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Ex: Amanda Carvalho"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#280F4D]/20 focus:border-[#280F4D] text-xs text-slate-800"
                  />
                </div>

                {/* Nome da Loja */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Nome da Loja <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeLoja}
                    onChange={e => setNomeLoja(e.target.value)}
                    placeholder="Ex: Donna Bella Boutique"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#280F4D]/20 focus:border-[#280F4D] text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* E-mail de Login */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  E-mail de Login no Sistema <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="exemplo@loja.com"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#280F4D]/20 focus:border-[#280F4D] text-xs text-slate-800"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Este será o usuário para entrar na tela de login.
                </p>
              </div>

              {/* Senha inicial: nunca é recuperada do Firebase */}
              {!editingUser && <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Senha de Acesso {editingUser && '(deixe em branco para manter)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const random =
                        Math.random().toString(36).slice(-6) + '@' + Math.floor(10 + Math.random() * 90);
                      setSenha(random);
                    }}
                    className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Gerar Senha Forte
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder={editingUser ? 'Manter senha atual' : 'Digite ou gere uma senha'}
                    className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#280F4D]/20 focus:border-[#280F4D] text-xs text-slate-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {mostrarSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>}
              {editingUser && <p className="text-[10px] text-slate-500">A senha é protegida pelo Firebase e não pode ser visualizada ou alterada por este formulário.</p>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* WhatsApp */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">WhatsApp para Contato</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={whatsapp}
                      onChange={e => setWhatsapp(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#280F4D]/20 focus:border-[#280F4D] text-xs text-slate-800"
                    />
                  </div>
                </div>

                {/* Perfil de Acesso */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tipo de Acesso</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as 'admin' | 'lojista' | 'vendedora')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#280F4D]/20 focus:border-[#280F4D] text-xs text-slate-800 bg-white"
                  >
                    <option value="lojista">Lojista / Cliente (Padrão)</option>
                    <option value="vendedora">Vendedora / Atendente</option>
                    <option value="admin">Administrador Geral</option>
                  </select>
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#280F4D] to-[#481B84] hover:from-[#351465] hover:to-[#57209e] text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving
                    ? 'Salvando...'
                    : editingUser
                    ? 'Atualizar Dados'
                    : 'Salvar & Ativar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Ações Administrativas (Excluir / Suspender / Reativar) */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-purple-100 text-center space-y-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
                confirmAction.type === 'delete'
                  ? 'bg-rose-50 text-rose-600 border-rose-100'
                  : confirmAction.user.status === 'ativo'
                  ? 'bg-amber-50 text-amber-600 border-amber-100'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}
            >
              {confirmAction.type === 'delete' ? (
                <Trash2 className="w-6 h-6" />
              ) : confirmAction.user.status === 'ativo' ? (
                <Lock className="w-6 h-6" />
              ) : (
                <Unlock className="w-6 h-6" />
              )}
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {confirmAction.type === 'delete'
                  ? 'Excluir Cliente'
                  : confirmAction.user.status === 'ativo'
                  ? 'Suspender Acesso'
                  : 'Reativar Acesso'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {confirmAction.type === 'delete' ? (
                  <>
                    Deseja realmente remover o cliente{' '}
                    <strong className="text-slate-800">{confirmAction.user.nome}</strong> (
                    {confirmAction.user.nomeLoja})?
                  </>
                ) : confirmAction.user.status === 'ativo' ? (
                  <>
                    Deseja suspender o acesso de{' '}
                    <strong className="text-slate-800">{confirmAction.user.nome}</strong>? Ele não
                    poderá entrar até ser reativado.
                  </>
                ) : (
                  <>
                    Deseja reativar o acesso de{' '}
                    <strong className="text-slate-800">{confirmAction.user.nome}</strong>?
                  </>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="py-2.5 px-4 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirmAction.type === 'delete') {
                    await excluirUsuarioSistema(confirmAction.user.id);
                  } else {
                    const novoStatus = confirmAction.user.status === 'ativo' ? 'suspenso' : 'ativo';
                    await atualizarUsuarioSistema(confirmAction.user.id, { status: novoStatus });
                  }
                  setConfirmAction(null);
                }}
                className={`py-2.5 px-4 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer ${
                  confirmAction.type === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmAction.user.status === 'ativo'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmAction.type === 'delete'
                  ? 'Sim, Excluir'
                  : confirmAction.user.status === 'ativo'
                  ? 'Sim, Suspender'
                  : 'Sim, Reativar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Prévia e Envio da Mensagem do WhatsApp */}
      {whatsappModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-emerald-100 space-y-4 animate-in zoom-in-95 duration-150 relative">
            <button
              type="button"
              onClick={() => setWhatsappModal(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Mensagem de Acesso (WhatsApp)</h3>
                <p className="text-xs text-slate-500">
                  Pronta para envio para <strong className="text-slate-800">{whatsappModal.user.nome}</strong> ({whatsappModal.user.nomeLoja})
                </p>
              </div>
            </div>

            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 text-xs font-mono text-slate-700 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed shadow-inner">
              {whatsappModal.msg}
            </div>

            <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Texto copiado para a área de transferência!
              </span>
              <span>Pronto para colar</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(whatsappModal.msg);
                  setCopiedId(whatsappModal.user.id);
                  setTimeout(() => setCopiedId(null), 3000);
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Novamente</span>
              </button>
              <a
                href={whatsappModal.linkWpp}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center active:scale-95"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Abrir no WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
