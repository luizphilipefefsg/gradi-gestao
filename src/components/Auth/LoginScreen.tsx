import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { loginComCredenciais, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!email.trim() || !senha.trim()) {
      setErro('Por favor, informe seu e-mail e sua senha de acesso.');
      return;
    }

    setIsSubmitting(true);
    const res = await loginComCredenciais(email, senha);
    setIsSubmitting(false);

    if (!res.success) {
      setErro(res.message || 'E-mail ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 sm:p-6 text-slate-800">
      {/* Card de Login com fundo branco, cantos arredondados e sombra suave sofisticada */}
      <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-slate-100 p-8 sm:p-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Topo com Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img
              src="/assets/aistudio/gradi_logo_transparent.png"
              alt="Gradi Gestão"
              className="h-14 sm:h-16 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-black text-[#280F4D] tracking-tight">
            Acesso ao Sistema
          </h1>
          <p className="text-xs text-slate-500 mt-1.5">
            Digite seu e-mail e senha para entrar na sua loja
          </p>
        </div>

        {/* Mensagem de Erro */}
        {erro && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{erro}</div>
          </div>
        )}

        {/* Formulário Simples: Apenas E-mail e Senha */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              E-mail de Acesso
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-purple-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                placeholder="seuemail@loja.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-[#351465] focus:ring-2 focus:ring-purple-200 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-purple-400 absolute left-3.5 top-3.5" />
              <input
                type={mostrarSenha ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-[#351465] focus:ring-2 focus:ring-purple-200 transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-purple-700 transition-colors cursor-pointer"
                title={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
              >
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#280F4D] via-[#351465] to-[#481B84] hover:opacity-95 text-white rounded-xl text-sm font-bold shadow-md shadow-[#280F4D]/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Entrando...</span>
            ) : (
              <>
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Rodapé Simples e Discreto */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Acesso seguro fornecido pelo Gradi Gestão</span>
        </div>
      </div>
    </div>
  );
};
