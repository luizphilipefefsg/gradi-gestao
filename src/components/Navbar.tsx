import React, { useState } from 'react';
import {
  ShoppingBag,
  Layers,
  ReceiptText,
  TrendingUp,
  User,
  Store,
  Users,
  Building2,
  Tag,
  FileBarChart,
  ShieldCheck,
  LogOut,
  KeyRound,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const { vendaAtual, condicionais, vendas } = useStore();
  const { usuarioSistema, user, isAdmin, logout } = useAuth();

  const itensNaSacola = vendaAtual.itens.reduce((acc, i) => acc + i.quantidade, 0);
  const condicionaisAtivas = condicionais.filter(c => c.status === 'ativa').length;

  const hoje = new Date().toISOString().split('T')[0];
  let crediariosAtrasados = 0;
  vendas.forEach(v => {
    if (v.status === 'finalizada' && v.parcelas) {
      v.parcelas.forEach(p => {
        if (p.status !== 'pago' && p.data_vencimento < hoje) {
          crediariosAtrasados += 1;
        }
      });
    }
  });

  const navItems = [
    {
      id: 'vendas',
      label: 'Vendas',
      icon: ShoppingBag,
      badge: itensNaSacola > 0 ? `${itensNaSacola}` : null,
      badgeColor: 'bg-emerald-400 text-emerald-950',
    },
    {
      id: 'produtos',
      label: 'Produtos',
      icon: Layers,
    },
    {
      id: 'etiquetas',
      label: 'Etiquetas',
      icon: Tag,
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: Users,
    },
    {
      id: 'fornecedores',
      label: 'Fornecedores',
      icon: Building2,
    },
    {
      id: 'condicional',
      label: 'Condicional',
      icon: Store,
      badge: condicionaisAtivas > 0 ? `${condicionaisAtivas}` : null,
      badgeColor: 'bg-amber-300 text-amber-950',
    },
    {
      id: 'crediario',
      label: 'Crediário',
      icon: ReceiptText,
      badge: crediariosAtrasados > 0 ? `${crediariosAtrasados}` : null,
      badgeColor: 'bg-rose-400 text-white',
    },
    {
      id: 'financeiro',
      label: 'Financeiro',
      icon: TrendingUp,
    },
    {
      id: 'relatorios',
      label: 'Relatórios',
      icon: FileBarChart,
    },
  ];

  // Adiciona a aba Administrativo para Administradores
  if (isAdmin) {
    navItems.push({
      id: 'administrativo',
      label: 'Admin',
      icon: ShieldCheck,
      badge: null,
      badgeColor: '',
    });
  }

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error('Erro ao sair:', err);
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
    }
  };

  const displayName = usuarioSistema?.nome || user?.displayName || 'Usuário';
  const displayLoja = usuarioSistema?.nomeLoja || 'Gradi Gestão';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md pt-3 pb-2 px-3 sm:px-6">
      <div className="max-w-[1440px] mx-auto bg-white rounded-2xl sm:rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.07)] border border-slate-100/90 px-3 sm:px-4 2xl:px-6">
        <div className="flex items-center justify-between h-16 gap-2 2xl:gap-3">
          {/* Logo do Sistema - Apenas a logo sem fundo */}
          <div
            onClick={() => onSelectTab('vendas')}
            className="flex items-center cursor-pointer select-none py-1 group shrink-0"
            title="Gradi Gestão - Início"
          >
            <img
              src="/assets/aistudio/gradi_logo_transparent.png"
              alt="Gradi Gestão"
              className="h-8 sm:h-9 w-auto object-contain group-hover:opacity-85 transition-opacity"
            />
          </div>

          {/* Links de Navegação Didáticos */}
          <nav className="hidden xl:flex items-center gap-0.5 2xl:gap-1 flex-1 justify-center min-w-0">
            {navItems.map(item => {
              const Icon = item.icon;
              const isSel = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`h-9 px-2 2xl:px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 2xl:gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isSel
                      ? 'bg-gradient-to-r from-[#280F4D] to-[#481B84] text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-[#280F4D] hover:bg-purple-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Usuário e Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Informações da Loja e Usuário */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-purple-50/80 border border-purple-100 max-w-[150px] sm:max-w-[190px] 2xl:max-w-[240px]">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#280F4D] to-[#481B84] text-white flex items-center justify-center shadow-2xs shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="leading-tight text-left min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate" title={displayName}>
                  {displayName}
                </div>
                <div className="text-[10px] text-purple-700 font-semibold truncate flex items-center gap-1" title={displayLoja}>
                  <Store className="w-2.5 h-2.5 shrink-0 text-purple-400" />
                  <span className="truncate">{displayLoja}</span>
                </div>
              </div>
            </div>

            {/* Botão Sair */}
            <button
              type="button"
              onClick={() => setIsLogoutModalOpen(true)}
              title="Sair do sistema (Logout)"
              className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Horizontal Navigation */}
        <div className="flex xl:hidden items-center gap-1 overflow-x-auto py-2 border-t border-purple-100 text-xs scrollbar-none">
          {navItems.map(item => {
            const Icon = item.icon;
            const isSel = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                  isSel
                    ? 'bg-gradient-to-r from-[#280F4D] to-[#481B84] text-white font-bold'
                    : 'text-slate-600 hover:bg-purple-50'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>

    {/* Modal de Confirmação de Saída de Conta (Centralizado no meio da tela com z-[9999]) */}
    {isLogoutModalOpen && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-purple-100 text-center space-y-4 animate-in zoom-in-95 duration-150 relative my-auto">
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(false)}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-2xs">
            <LogOut className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">Sair da Conta</h3>
            <p className="text-xs text-slate-500 mt-1">
              Deseja realmente encerrar a sessão no <strong className="text-slate-800">Gradi Gestão</strong>?
            </p>
          </div>

          <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-100 text-left text-xs space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
              <div className="w-5 h-5 rounded-md bg-[#280F4D] text-white flex items-center justify-center shrink-0">
                <User className="w-3 h-3 text-white" />
              </div>
              <span className="truncate">{displayName}</span>
            </div>
            <div className="text-[11px] text-purple-700 flex items-center gap-1 truncate font-medium">
              <Store className="w-3 h-3 text-purple-400 shrink-0" />
              <span className="truncate">{displayLoja}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsLogoutModalOpen(false)}
              disabled={isLoggingOut}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmLogout}
              disabled={isLoggingOut}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs shadow-md shadow-rose-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? 'Saindo...' : 'Sim, Sair'}</span>
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
};

