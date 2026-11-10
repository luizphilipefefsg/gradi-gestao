import React, { useState } from 'react';
import { X, Building2, User, Phone, FileText, Check, Sparkles, Loader2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Fornecedor } from '../../types';
import { maskPhone, maskCNPJ, consultarCNPJ, formatPhone } from '../../utils/formatters';

interface NovoFornecedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (fornecedor: Fornecedor) => void;
}

export const NovoFornecedorModal: React.FC<NovoFornecedorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { adicionarFornecedor } = useStore();
  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [erro, setErro] = useState('');
  const [sucessoMsg, setSucessoMsg] = useState('');
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);

  if (!isOpen) return null;

  const handleBuscarCnpj = async (cnpjParaBuscar: string) => {
    const limpo = cnpjParaBuscar.replace(/\D/g, '');
    if (limpo.length !== 14) {
      setErro(`O CNPJ precisa ter 14 dígitos (você informou ${limpo.length}).`);
      return;
    }

    setBuscandoCnpj(true);
    setErro('');
    setSucessoMsg('');

    try {
      const res = await consultarCNPJ(limpo);
      if (res.success) {
        const nomeEmpresa = res.nome_fantasia || res.razao_social || '';
        if (nomeEmpresa) {
          setNome(nomeEmpresa);
        }
        if (res.telefone) {
          setTelefone(formatPhone(res.telefone));
        }
        if (res.contato) {
          setContato(res.contato);
        }

        if (res.telefone) {
          setSucessoMsg('Dados puxados com sucesso da Receita Federal!');
        } else {
          setSucessoMsg(`Empresa localizada: "${nomeEmpresa}". (Informe o WhatsApp para contato)`);
        }
      } else {
        setErro(res.message || 'Não foi possível encontrar dados para este CNPJ.');
      }
    } catch {
      setErro('Falha ao consultar CNPJ. Verifique sua conexão ou preencha manualmente.');
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCNPJ(e.target.value);
    setCnpj(masked);
    const digits = masked.replace(/\D/g, '');
    if (digits.length === 14) {
      handleBuscarCnpj(digits);
    }
  };

  const handleBuscarClick = () => {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) {
      setErro(`Informe os 14 dígitos do CNPJ para puxar os dados (atualmente possui ${digits.length} dígitos).`);
      return;
    }
    handleBuscarCnpj(digits);
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(maskPhone(e.target.value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe o nome da confecção ou fábrica');
      return;
    }
    if (!telefone.trim()) {
      setErro('Informe o telefone ou WhatsApp do fornecedor');
      return;
    }

    const novo = adicionarFornecedor({
      nome: nome.trim(),
      contato: contato.trim() || 'Comercial / Vendas',
      telefone: telefone.trim(),
      cnpj: cnpj.trim() || undefined,
    });

    if (onSuccess) onSuccess(novo);
    setNome('');
    setContato('');
    setTelefone('');
    setCnpj('');
    setErro('');
    setSucessoMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-purple-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-gradient-to-r from-[#280F4D] via-[#351465] to-[#481B84] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 text-white rounded-xl backdrop-blur-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Cadastrar Novo Fornecedor</h3>
              <p className="text-xs text-purple-100">Confecções, malharias e distribuidores</p>
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

          {sucessoMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{sucessoMsg}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                CNPJ (Opcional)
              </label>
              <button
                type="button"
                onClick={handleBuscarClick}
                disabled={buscandoCnpj}
                className="text-[11px] font-bold text-[#351465] hover:text-[#280F4D] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer transition-colors"
                title="Puxar razão social e telefone automaticamente da Receita Federal"
              >
                {buscandoCnpj ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#351465]" />
                    <span>Puxando dados...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Puxar dados automático</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <FileText className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="00.000.000/0001-00"
                value={cnpj}
                onChange={handleCnpjChange}
                maxLength={18}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-hidden"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Dica: Digite ou cole o CNPJ que o sistema puxa a Razão Social e telefone automaticamente.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome da Confecção / Empresa *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex: Confecções Bella Moda"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome do Contato / Representante
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Ex: Carlos (Representante Comercial)"
                value={contato}
                onChange={e => setContato(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Telefone / WhatsApp *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="(11) 98765-4321"
                value={telefone}
                onChange={handleTelefoneChange}
                maxLength={15}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-hidden"
              />
            </div>
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
              Salvar Fornecedor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
