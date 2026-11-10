import React, { useState } from 'react';
import { X, UserPlus, Phone, User, MapPin, Check } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Cliente } from '../../types';
import { maskPhone, maskCPF } from '../../utils/formatters';

interface NovoClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (cliente: Cliente) => void;
}

export const NovoClienteModal: React.FC<NovoClienteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { adicionarCliente } = useStore();
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe o nome do cliente');
      return;
    }
    if (!whatsapp.trim()) {
      setErro('Informe o telefone ou WhatsApp');
      return;
    }

    const novo = adicionarCliente({
      nome: nome.trim(),
      whatsapp: whatsapp.trim(),
      cpf: cpf.trim() || undefined,
      endereco: endereco.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
    });

    if (onSuccess) onSuccess(novo);
    setNome('');
    setWhatsapp('');
    setCpf('');
    setEndereco('');
    setObservacoes('');
    setErro('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-purple-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-gradient-to-r from-[#280F4D] via-[#351465] to-[#481B84] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 text-white rounded-xl backdrop-blur-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Cadastrar Novo Cliente</h3>
              <p className="text-xs text-purple-100">Fácil, rápido e direto ao ponto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome do Cliente *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex: Mariana Silva"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              WhatsApp / Celular *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="(11) 99876-5432"
                value={whatsapp}
                maxLength={15}
                onChange={e => setWhatsapp(maskPhone(e.target.value))}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              CPF (Opcional)
            </label>
            <input
              type="text"
              placeholder="000.000.000-00"
              value={cpf}
              maxLength={14}
              onChange={e => setCpf(maskCPF(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-400 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Endereço / Cidade (Opcional)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rua, número, bairro..."
                value={endereco}
                onChange={e => setEndereco(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-400 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Observações (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Paga sempre no 5º dia útil..."
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-400 outline-hidden"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-[#280F4D] via-[#351465] to-[#481B84] hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-md shadow-[#280F4D]/25 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.01]"
            >
              <Check className="w-4 h-4" />
              Salvar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
