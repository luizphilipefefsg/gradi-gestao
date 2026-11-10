import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F2FC] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-md border border-purple-100 max-w-md w-full">
            <div className="w-12 h-12 bg-purple-100 text-[#280F4D] rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              !
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Ops! Algo deu errado</h1>
            <p className="text-sm text-slate-500 mb-6">
              Ocorreu uma falha ao renderizar. Clique abaixo para reiniciar o sistema com segurança.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="w-full py-2.5 px-4 bg-[#280F4D] hover:bg-[#351465] text-white rounded-xl text-sm font-bold shadow-xs transition-colors"
              >
                Recarregar Sistema
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="w-full py-2.5 px-4 bg-purple-50 hover:bg-purple-100 text-[#280F4D] border border-purple-200 rounded-xl text-xs font-bold transition-colors"
              >
                Limpar Cache e Restaurar Padrões
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
