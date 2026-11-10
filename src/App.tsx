import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { LoginScreen } from './components/Auth/LoginScreen';
import { UsuariosSistemaScreen } from './components/Auth/UsuariosSistemaScreen';
import { VendasScreen } from './components/Vendas/VendasScreen';
import { ClientesScreen } from './components/Cadastros/ClientesScreen';
import { FornecedoresScreen } from './components/Cadastros/FornecedoresScreen';
import { ProdutosScreen } from './components/Produtos/ProdutosScreen';
import { CondicionalScreen } from './components/Condicional/CondicionalScreen';
import { CrediarioScreen } from './components/Crediario/CrediarioScreen';
import { FinanceiroScreen } from './components/Financeiro/FinanceiroScreen';
import { EtiquetasScreen } from './components/Produtos/EtiquetasScreen';
import { RelatoriosScreen } from './components/Relatorios/RelatoriosScreen';

const MainApp: React.FC = () => {
  const { user, usuarioSistema, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('vendas');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.07)] border border-slate-100">
          <img
            src="/assets/aistudio/gradi_logo_transparent.png"
            alt="Gradi Gestão"
            className="h-14 w-auto object-contain"
          />
          <div className="w-7 h-7 border-3 border-purple-200 border-t-[#280F4D] rounded-full animate-spin"></div>
          <p className="text-slate-500 text-xs font-medium">
            Carregando Gradi Gestão...
          </p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, exibe a Tela de Login
  if (!user && !usuarioSistema) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans antialiased">
      {/* Navigation Header Clean com sombra suave e cantos arredondados */}
      <div className="print:hidden">
        <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 print:p-0 print:m-0 print:max-w-none print:w-full">
        {(currentTab === 'vendas' || currentTab === 'pdv') && <VendasScreen />}
        {currentTab === 'produtos' && <ProdutosScreen />}
        {currentTab === 'etiquetas' && <EtiquetasScreen />}
        {currentTab === 'clientes' && <ClientesScreen />}
        {currentTab === 'fornecedores' && <FornecedoresScreen />}
        {currentTab === 'condicional' && <CondicionalScreen />}
        {currentTab === 'crediario' && <CrediarioScreen />}
        {currentTab === 'financeiro' && <FinanceiroScreen />}
        {currentTab === 'relatorios' && <RelatoriosScreen />}
        {(currentTab === 'administrativo' || currentTab === 'usuarios_sistema') && (
          <UsuariosSistemaScreen />
        )}
      </main>

      {/* Rodapé Limpo e Minimalista */}
      <footer className="bg-white border-t border-slate-100 py-3.5 px-4 sm:px-6 text-slate-500 text-xs print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <img
              src="/assets/aistudio/gradi_logo_transparent.png"
              alt="Gradi Gestão"
              className="h-4 w-auto object-contain opacity-80"
            />
            <span className="font-semibold text-slate-700">
              Gradi Gestão - Sistema para Lojas de Roupas
            </span>
          </div>
          <span className="text-[11px] text-slate-600 font-medium">
            Gestão de Vendas &amp; Controle de Estoque
          </span>
        </div>
      </footer>
    </div>
  );
};

const StoreProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { usuarioSistema, user } = useAuth();
  const tenantId = usuarioSistema?.lojaId || (user?.uid ? `loja-${user.uid}` : 'unauthenticated');

  return (
    <StoreProvider key={tenantId} tenantId={tenantId}>
      {children}
    </StoreProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StoreProviderWrapper>
        <MainApp />
      </StoreProviderWrapper>
    </AuthProvider>
  );
}
