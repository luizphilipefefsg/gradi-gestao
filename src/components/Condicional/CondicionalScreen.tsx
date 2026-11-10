import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Calendar,
  User,
  Phone,
  FileCheck,
  MessageCircle,
  ReceiptText,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Condicional, Venda } from '../../types';
import { formatCurrency, formatDate, formatWhatsApp } from '../../utils/formatters';
import { NewCondicionalModal } from './NewCondicionalModal';
import { AcertoCondicionalModal } from './AcertoCondicionalModal';
import { ReceiptModal } from '../PDV/ReceiptModal';

export const CondicionalScreen: React.FC = () => {
  const { condicionais, vendas } = useStore();
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [condicionalParaAcerto, setCondicionalParaAcerto] = useState<Condicional | null>(null);
  const [vendaAcertoParaRecibo, setVendaAcertoParaRecibo] = useState<Venda | null>(null);

  const hoje = new Date().toISOString().split('T')[0];

  const getWhatsAppCobrancaUrl = (cond: Condicional) => {
    const cleanPhone = cond.cliente_whatsapp ? cond.cliente_whatsapp.replace(/\D/g, '') : '';
    const isAtrasada = cond.status === 'ativa' && cond.data_prevista_devolucao < hoje;

    let msg = `Olá ${cond.cliente_nome}! Tudo bem? 😊\n\n`;
    if (isAtrasada) {
      msg += `Passando para lembrar com carinho sobre a sua sacola condicional, com prazo de devolução até ${formatDate(cond.data_prevista_devolucao)}.\n\n`;
      msg += `Conseguiu provar as peças? Ficamos no aguardo para fazer o seu acerto ou buscar a sacola! Se precisar de mais tempo, nos avise por aqui! 🛍️✨`;
    } else {
      msg += `Passando para saber como você está e se deu tudo certo com as peças da sua sacola condicional! 🥰\n\n`;
      msg += `A previsão de retorno é até ${formatDate(cond.data_prevista_devolucao)}. Quando terminar de provar, estamos à disposição para fazer o acerto das peças que você amou! 🛍️✨`;
    }

    if (cleanPhone) {
      return `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(msg)}`;
    }
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  };

  const handleAbrirCupomCondicional = (cond: Condicional) => {
    // 1. Tenta achar venda gravada no histórico
    const vendaCorrespondente = vendas.find(
      v =>
        v.observacoes?.includes(cond.codigo_condicional) ||
        (cond.venda_id && v.id === cond.venda_id)
    );

    if (vendaCorrespondente) {
      setVendaAcertoParaRecibo(vendaCorrespondente);
      return;
    }

    // 2. Se não encontrou venda correspondente gravada, monta comprovante não fiscal fiel dos itens
    const itensVendidos = cond.itens.filter(i => i.status === 'vendido');
    const totalVendido = itensVendidos.reduce(
      (acc, i) => acc + i.preco_unitario * i.quantidade,
      0
    );

    const itensCupom = (itensVendidos.length > 0 ? itensVendidos : cond.itens).map(it => ({
      id: it.id,
      venda_id: '',
      grade_id: it.grade_id,
      produto_id: it.produto_id,
      produto_nome: it.status === 'devolvido' ? `${it.produto_nome} (DEVOLVIDO)` : it.produto_nome,
      tamanho: it.tamanho,
      cor: it.cor,
      sku: it.sku,
      codigo_barras: '',
      preco_unitario: it.status === 'devolvido' ? 0 : it.preco_unitario,
      preco_custo_unitario: 0,
      quantidade: it.quantidade,
      subtotal: it.status === 'devolvido' ? 0 : it.preco_unitario * it.quantidade,
    }));

    setVendaAcertoParaRecibo({
      id: `rec-${cond.id}`,
      codigo_venda: `VND-${cond.codigo_condicional}`,
      cliente_id: cond.cliente_id,
      cliente_nome: cond.cliente_nome,
      cliente_whatsapp: cond.cliente_whatsapp,
      data_venda: cond.data_retirada,
      status: 'finalizada',
      subtotal: totalVendido,
      desconto: 0,
      acrescimo: 0,
      total: totalVendido,
      forma_pagamento: 'pix',
      itens: itensCupom,
      observacoes: `Comprovante de Acerto da Sacola Condicional ${cond.codigo_condicional}`,
    });
  };

  const condicionaisFiltradas = condicionais.filter(c => {
    if (filtroStatus === 'todas') return true;
    if (filtroStatus === 'ativas') return c.status === 'ativa';
    if (filtroStatus === 'atrasadas')
      return c.status === 'ativa' && c.data_prevista_devolucao < hoje;
    if (filtroStatus === 'finalizadas')
      return c.status === 'convertida' || c.status === 'devolvida';
    return true;
  });

  const totalAtivas = condicionais.filter(c => c.status === 'ativa').length;
  const totalAtrasadas = condicionais.filter(
    c => c.status === 'ativa' && c.data_prevista_devolucao < hoje
  ).length;
  const valorEmRua = condicionais
    .filter(c => c.status === 'ativa')
    .reduce((acc, c) => acc + c.total_estimado, 0);

  return (
    <div className="space-y-5">
      {/* Topo Limpo: Título da Tela e Ação Rápida */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-[#280F4D] tracking-tight">Condicional & Sacolas de Prova</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Envie peças para o cliente provar em casa com baixa imediata de estoque e acerto de devolução em 1 clique.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="px-4 py-1.5 bg-[#351465] hover:bg-[#280F4D] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-purple-200 shrink-0" />
          <span>Enviar Sacola Condicional</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-purple-50/70 border border-purple-200 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-purple-900 block">Sacolas em Prova (Rua)</span>
            <span className="text-2xl font-black text-purple-950">{totalAtivas}</span>
            <span className="text-[11px] text-purple-700 block mt-0.5">
              Peças reservadas temporariamente
            </span>
          </div>
          <div className="p-3 bg-purple-200/60 rounded-xl text-purple-800">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-900 block">
              Valor Total Consignado
            </span>
            <span className="text-2xl font-black text-emerald-950">
              {formatCurrency(valorEmRua)}
            </span>
            <span className="text-[11px] text-emerald-700 block mt-0.5">Potencial de conversão</span>
          </div>
          <div className="p-3 bg-emerald-200/60 rounded-xl text-emerald-800">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>

        <div
          onClick={() => setFiltroStatus('atrasadas')}
          className="bg-rose-50/70 border border-rose-200 hover:border-rose-300 p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:shadow-xs"
          title="Clique para filtrar apenas as sacolas com prazo vencido"
        >
          <div>
            <span className="text-xs font-semibold text-rose-900 block">Prazos Vencidos</span>
            <span className="text-2xl font-black text-rose-950">{totalAtrasadas}</span>
            <span className="text-[11px] text-rose-700 block mt-0.5 font-medium flex items-center gap-1">
              <MessageCircle className="w-3 h-3 text-rose-600" />
              <span>Cobrar retorno via WhatsApp</span>
            </span>
          </div>
          <div className="p-3 bg-rose-200/60 rounded-xl text-rose-800">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        {[
          { id: 'todas', label: 'Todas as Sacolas' },
          { id: 'ativas', label: `Em Aberto (${totalAtivas})` },
          { id: 'atrasadas', label: `Atrasadas (${totalAtrasadas})` },
          { id: 'finalizadas', label: 'Acertadas / Concluídas' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFiltroStatus(tab.id)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filtroStatus === tab.id
                ? 'bg-[#351465] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Condicionais Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {condicionaisFiltradas.length === 0 ? (
          <div className="md:col-span-2 py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">Nenhuma sacola condicional encontrada nesta categoria.</p>
          </div>
        ) : (
          condicionaisFiltradas.map(cond => {
            const isAtrasada = cond.status === 'ativa' && cond.data_prevista_devolucao < hoje;
            return (
              <div
                key={cond.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {cond.codigo_condicional}
                        </span>
                        {cond.status === 'ativa' && (
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              isAtrasada
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-purple-100 text-purple-800 border border-purple-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isAtrasada ? 'bg-rose-600 animate-ping' : 'bg-[#351465]'
                              }`}
                            ></span>
                            {isAtrasada ? 'Atrasada' : 'Em Prova'}
                          </span>
                        )}
                        {cond.status === 'convertida' && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Venda Concluída
                          </span>
                        )}
                        {cond.status === 'devolvida' && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            Devolvida Total
                          </span>
                        )}
                        {cond.status === 'parcial' && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            Acerto Parcial
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm mt-1.5">
                        {cond.cliente_nome}
                      </h4>
                      <a
                        href={getWhatsAppCobrancaUrl(cond)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 mt-0.5 hover:underline cursor-pointer"
                        title="Cobrar retorno pelo WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        <span>{formatWhatsApp(cond.cliente_whatsapp)}</span>
                      </a>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Total Estimado</span>
                      <strong className="text-sm font-bold text-slate-900">
                        {formatCurrency(cond.total_estimado)}
                      </strong>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-[11px] mt-2">
                    <div>
                      <span className="text-slate-400 block">Retirada:</span>
                      <span className="font-semibold text-slate-700">
                        {formatDate(cond.data_retirada)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Previsão Devolução:</span>
                      <span
                        className={`font-semibold ${
                          isAtrasada ? 'text-rose-600 font-bold' : 'text-slate-700'
                        }`}
                      >
                        {formatDate(cond.data_prevista_devolucao)}
                      </span>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="mt-2 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Peças na Sacola ({cond.itens.length}):
                    </span>
                    <div className="space-y-1 text-xs">
                      {cond.itens.slice(0, 3).map(it => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between text-slate-700 text-[11px]"
                        >
                          <span className="truncate max-w-[210px]">
                            • {it.produto_nome} ({it.tamanho} - {it.cor})
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(it.preco_unitario)}
                          </span>
                        </div>
                      ))}
                      {cond.itens.length > 3 && (
                        <div className="text-[10px] text-slate-400 italic">
                          + {cond.itens.length - 3} outra(s) peça(s)...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 truncate max-w-[140px]" title={cond.observacoes}>
                    {cond.observacoes || 'Sem observações'}
                  </span>

                  {cond.status === 'ativa' ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={getWhatsAppCobrancaUrl(cond)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 no-underline cursor-pointer ${
                          isAtrasada
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                        title="Enviar mensagem de cobrança/lembrete de retorno no WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Cobrar Retorno</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => setCondicionalParaAcerto(cond)}
                        className="px-3.5 py-1.5 bg-[#351465] hover:bg-[#280F4D] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Fazer Acerto</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAbrirCupomCondicional(cond)}
                        className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#351465] border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Ver / Enviar Cupom Não Fiscal deste acerto no WhatsApp"
                      >
                        <ReceiptText className="w-3.5 h-3.5 text-purple-700" />
                        <span>Cupom Não Fiscal</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <NewCondicionalModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={() => {}}
      />

      <AcertoCondicionalModal
        condicional={condicionalParaAcerto}
        onClose={() => setCondicionalParaAcerto(null)}
        onSuccess={(vendaGerada) => {
          setCondicionalParaAcerto(null);
          if (vendaGerada) {
            setVendaAcertoParaRecibo(vendaGerada);
          }
        }}
      />

      {/* Modal de Cupom Não Fiscal com envio para WhatsApp, cópia de imagem e download */}
      <ReceiptModal
        venda={vendaAcertoParaRecibo}
        onClose={() => setVendaAcertoParaRecibo(null)}
      />
    </div>
  );
};
