import React, { useRef, useState } from 'react';
import {
  X,
  CheckCircle,
  Share2,
  Download,
  Copy,
  Loader2,
  Check,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { Venda } from '../../types';
import { formatCurrency, formatDate, formatDateTime, formatWhatsApp } from '../../utils/formatters';

interface ReceiptModalProps {
  venda: Venda | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ venda, onClose }) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [loadingPng, setLoadingPng] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ texto: string; sucesso: boolean } | null>(null);

  if (!venda) return null;

  const showToast = (texto: string, sucesso: boolean = true) => {
    setToastMsg({ texto, sucesso });
    setTimeout(() => {
      setToastMsg(null);
    }, 4500);
  };

  // Gera a imagem PNG em alta resolução do cupom usando html-to-image (compatível com oklch e CSS modern)
  const generateReceiptPngBlob = async (): Promise<Blob | null> => {
    if (!printAreaRef.current) return null;
    try {
      const dataUrl = await toPng(printAreaRef.current, {
        pixelRatio: 3, // Alta resolução 3x Ultra-nítida
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const res = await fetch(dataUrl);
      return await res.blob();
    } catch (err) {
      console.error('Erro ao gerar imagem PNG do comprovante:', err);
      return null;
    }
  };

  // Redirecionamento direto, leve e instantâneo para o WhatsApp do cliente
  const getWhatsAppDiretoUrl = () => {
    const cleanPhone = venda.cliente_whatsapp ? venda.cliente_whatsapp.replace(/\D/g, '') : '';
    let msg = `Olá ${venda.cliente_nome}! Segue o comprovante da sua compra na Gradi Gestão:\n\n`;
    msg += `🛍️ Pedido: ${venda.codigo_venda}\n`;
    msg += `💰 Total: ${formatCurrency(venda.total)}`;

    if (cleanPhone) {
      return `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(msg)}`;
    }
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  };

  // Envia a imagem PNG do comprovante direto para o WhatsApp do cliente
  const handleEnviarWhatsAppPng = async () => {
    setLoadingPng(true);
    const cleanPhone = venda.cliente_whatsapp ? venda.cliente_whatsapp.replace(/\D/g, '') : '';
    let msg = `Olá ${venda.cliente_nome}! Segue o comprovante da sua compra na Gradi Gestão:\n\n`;
    msg += `🛍️ Pedido: ${venda.codigo_venda}\n`;
    msg += `💰 Total: ${formatCurrency(venda.total)}\n\n`;
    msg += `*(Comprovante em imagem PNG)*`;

    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    // Abre a aba do WhatsApp imediatamente para evitar bloqueio de popup pelo navegador
    let waWindow: Window | null = null;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) {
      waWindow = window.open('about:blank', '_blank');
    }

    try {
      const blob = await generateReceiptPngBlob();
      if (!blob) throw new Error('Não foi possível gerar a imagem');

      const fileName = `comprovante-${venda.codigo_venda}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // 1. Em celulares/tablets com suporte a compartilhamento direto de arquivo
      if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Comprovante ${venda.codigo_venda} - Gradi Gestão`,
            text: msg,
          });
          showToast('Comprovante compartilhado com sucesso!');
          setLoadingPng(false);
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setLoadingPng(false);
            return;
          }
        }
      }

      // 2. Copia a imagem PNG para o Clipboard (Área de Transferência) para colar com Ctrl+V
      let copiouClipboard = false;
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          copiouClipboard = true;
        }
      } catch (clipErr) {
        console.warn('Área de transferência restrita:', clipErr);
      }

      // 3. Baixa automaticamente o arquivo PNG no computador como garantia
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 4. Redireciona a janela aberta para o WhatsApp do cliente
      if (waWindow) {
        waWindow.location.href = waUrl;
      } else {
        window.open(waUrl, '_blank');
      }

      if (copiouClipboard) {
        showToast('Redirecionando para o WhatsApp! Pressione Ctrl + V para colar a imagem.');
      } else {
        showToast('Redirecionando para o WhatsApp! Anexe a imagem baixada.');
      }
    } catch (error) {
      console.error(error);
      if (waWindow) waWindow.close();
      showToast('Erro ao preparar imagem do comprovante', false);
    } finally {
      setLoadingPng(false);
    }
  };

  // Baixa o comprovante diretamente como imagem PNG
  const handleBaixarPng = async () => {
    setLoadingPng(true);
    try {
      const blob = await generateReceiptPngBlob();
      if (!blob) throw new Error('Falha ao gerar PNG');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprovante-${venda.codigo_venda}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Imagem PNG salva no computador!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao baixar imagem PNG', false);
    } finally {
      setLoadingPng(false);
    }
  };

  // Copia a imagem do comprovante diretamente para a Área de Transferência
  const handleCopiarImagem = async () => {
    setLoadingPng(true);
    try {
      const blob = await generateReceiptPngBlob();
      if (!blob) throw new Error('Falha ao gerar PNG');

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        showToast('Imagem PNG copiada! Cole com Ctrl+V na conversa!');
      } else {
        showToast('Navegador não suporta cópia direta de imagem.', false);
      }
    } catch (err) {
      console.error(err);
      showToast('Não foi possível copiar imagem diretamente.', false);
    } finally {
      setLoadingPng(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 my-8 flex flex-col relative animate-in fade-in zoom-in-95 duration-150">
        {/* Toast Notificação de Ação */}
        {toastMsg && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold border border-slate-700 animate-in fade-in slide-in-from-top-2">
            {toastMsg.sucesso ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <X className="w-4 h-4 text-rose-400" />
            )}
            <span>{toastMsg.texto}</span>
          </div>
        )}

        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-[#280F4D] via-[#351465] to-[#481B84] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-bold text-sm block leading-tight">Venda Concluída com Sucesso!</span>
              <span className="text-[11px] text-purple-200">Comprovante de compra disponível para envio</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Receipt Area */}
        <div className="p-5 sm:p-6 bg-slate-100/70 flex flex-col items-center justify-center overflow-y-auto max-h-[65vh]">
          <div
            ref={printAreaRef}
            id="printable-receipt"
            className="bg-white p-6 shadow-md border border-slate-200 rounded-xl w-full max-w-[340px] text-slate-800 font-mono text-xs space-y-3"
          >
            {/* Header com Logo Oficial */}
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <img
                src="/assets/aistudio/gradi_logo_transparent.png"
                alt="Gradi Gestão"
                className="h-9 mx-auto mb-1.5 object-contain"
              />
              <h2 className="font-bold text-xs tracking-wider uppercase text-slate-900">
                GRADI GESTÃO DE VESTUÁRIO
              </h2>
              <p className="text-[10px] text-slate-500">Boutique &amp; Moda</p>
            </div>

            {/* Sale Details */}
            <div className="text-[11px] space-y-1 pb-2 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span>CUPOM NÃO FISCAL:</span>
                <span className="font-bold">{venda.codigo_venda}</span>
              </div>
              <div className="flex justify-between">
                <span>DATA/HORA:</span>
                <span>{formatDateTime(venda.data_venda)}</span>
              </div>
              <div className="flex justify-between">
                <span>CLIENTE:</span>
                <span className="font-bold truncate max-w-[180px]">{venda.cliente_nome}</span>
              </div>
              {venda.cliente_whatsapp && (
                <div className="flex justify-between">
                  <span>WHATSAPP:</span>
                  <span>{formatWhatsApp(venda.cliente_whatsapp)}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="pb-2 border-b border-dashed border-slate-300">
              <div className="text-[10px] font-bold text-slate-500 flex justify-between pb-1">
                <span>ITEM / GRADE</span>
                <span>QTD × VL. UN = TOTAL</span>
              </div>
              <div className="space-y-1.5 pt-1">
                {venda.itens.map((it, idx) => (
                  <div key={idx} className="text-[11px] leading-tight">
                    <div className="font-bold truncate">{it.produto_nome}</div>
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>
                        Tam: {it.tamanho} | Cor: {it.cor}
                      </span>
                      <span>
                        {it.quantidade} un × {formatCurrency(it.preco_unitario)} ={' '}
                        <strong>{formatCurrency(it.subtotal)}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>{formatCurrency(venda.subtotal)}</span>
              </div>
              {venda.desconto > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>DESCONTO:</span>
                  <span>- {formatCurrency(venda.desconto)}</span>
                </div>
              )}
              {venda.acrescimo > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>ACRÉSCIMO:</span>
                  <span>+ {formatCurrency(venda.acrescimo)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-black pt-1 border-t border-slate-200">
                <span>TOTAL A PAGAR:</span>
                <span className="text-sm font-black text-slate-900">{formatCurrency(venda.total)}</span>
              </div>
              <div className="flex justify-between text-[11px] pt-1">
                <span>FORMA PGTO:</span>
                <span className="font-bold uppercase">{venda.forma_pagamento}</span>
              </div>
            </div>

            {/* Crediário Carnê breakdown if applicable */}
            {venda.parcelas && venda.parcelas.length > 0 && (
              <div className="space-y-1.5 pb-2 border-b border-dashed border-slate-300 bg-amber-50/50 p-2 rounded">
                <div className="text-[10px] font-bold text-amber-900 uppercase text-center">
                  --- CARNÊ CREDIÁRIO PRÓPRIO ---
                </div>
                {venda.parcelas.map(p => (
                  <div key={p.id} className="flex justify-between text-[11px]">
                    <span>
                      {p.numero_parcela}ª Parcela (Venc: {formatDate(p.data_vencimento)})
                    </span>
                    <span className="font-bold">{formatCurrency(p.valor)}</span>
                  </div>
                ))}
                <div className="pt-2 text-[9px] text-slate-500 text-center">
                  Reconheço e pagarei o débito nas datas acima descritas.
                </div>
                <div className="pt-6 border-b border-slate-400 mx-4"></div>
                <div className="text-[9px] text-slate-600 text-center">Assinatura do Cliente</div>
              </div>
            )}

            {/* Footer note */}
            <div className="text-center text-[10px] text-slate-400 pt-1 space-y-0.5">
              <p>Trocas somente em até 7 dias com esta etiqueta.</p>
              <p>Obrigado pela preferência e carinho!</p>
            </div>
          </div>
        </div>

        {/* Modal Buttons com suporte a Envio Direto de Imagem PNG */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col gap-2.5 shrink-0">
          {/* Botão de Destaque: Redirecionamento Direto e Leve no WhatsApp */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <a
              href={getWhatsAppDiretoUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all text-center no-underline cursor-pointer"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>Mandar no WhatsApp</span>
            </a>

            <button
              type="button"
              disabled={loadingPng}
              onClick={handleCopiarImagem}
              className="py-3 px-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Copiar a imagem do comprovante para colar na conversa (Ctrl+V)"
            >
              <Copy className="w-3.5 h-3.5 text-purple-700" />
              <span>Copiar Imagem PNG</span>
            </button>

            <button
              type="button"
              disabled={loadingPng}
              onClick={handleBaixarPng}
              className="py-3 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Baixar comprovante como arquivo PNG"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Baixar PNG</span>
            </button>
          </div>

          {/* Orientação didática de como enviar a imagem para o WhatsApp */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 text-slate-800 text-xs shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1.5">
              <span className="text-sm">💡</span>
              <span>Como enviar a imagem do comprovante no WhatsApp:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed pl-0.5">
              <li>
                Clique no botão <strong className="text-purple-700">"Copiar Imagem PNG"</strong> (a imagem é copiada na hora).
              </li>
              <li>
                Clique em <strong className="text-emerald-700">"Mandar no WhatsApp"</strong> para abrir a conversa do cliente.
              </li>
              <li>
                Na conversa aberta, pressione <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800 shadow-2xs text-[10px]">Ctrl + V</kbd> (ou clique com o botão direito e escolha <em>Colar</em>) e tecle Enter para enviar a imagem!
              </li>
            </ol>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
