import { jsPDF } from 'jspdf';
import { getBarcodeDataUrl } from './barcode';

export interface ItemEtiquetaPdf {
  produtoNome: string;
  referencia: string;
  categoria: string;
  precoVenda: number;
  grade: {
    tamanho: string;
    cor: string;
    sku: string;
    codigo_barras: string;
  };
  copias: number;
  selecionado: boolean;
  isVazia?: boolean;
}

export interface ModeloPdfConfig {
  id: string;
  label: string;
  tipo: 'folha_a4' | 'folha_a5' | 'termica';
  colunas: number;
  etiquetasPorFolha: number;
  larguraMm: number;
  alturaMm: number;
  gapXMm?: number;
  gapYMm?: number;
  margemSuperiorMm?: number;
  margemEsquerdaMm?: number;
  descricao: string;
}

/**
 * Divide o texto do produto em 1 ou 2 linhas suportando 55+ caracteres
 * sem quebrar palavras ao meio, exatamente conforme o modelo do PDF original:
 * Linha 1: Nome do produto (com '-' no final se quebrar ou se for curto)
 * Linha 2: Continuação do nome + 'Tam: X'
 */
/**
 * Divide o texto do produto em 1 ou 2 linhas suportando 55+ caracteres
 * sem quebrar palavras ao meio, exatamente conforme o modelo do PDF original:
 * Linha 1: Nome do produto (com '-' no final se quebrar ou se for curto)
 * Linha 2: Continuação do nome + 'Tam: X' + 'Cor: Y'
 */
export function formatarTextoEtiqueta(
  nomeProduto: string,
  tamanho: string,
  maxCharsLinha1: number = 22,
  cor?: string
): { linha1: string; linha2: string } {
  const nomeLimpo = (nomeProduto || '').trim();

  const temTam = Boolean(tamanho && tamanho.trim() && tamanho.trim() !== '-');
  const temCor = Boolean(cor && cor.trim() && cor.trim() !== '-');

  let tamCorLabel = '';
  if (temTam && temCor) {
    tamCorLabel = `Tam: ${tamanho.trim()} | Cor: ${cor!.trim()}`;
  } else if (temTam) {
    tamCorLabel = `Tam: ${tamanho.trim()}`;
  } else if (temCor) {
    tamCorLabel = `Cor: ${cor!.trim()}`;
  }

  // Se o nome for curto (cabe na linha 1), coloca nome na linha 1 e Tam / Cor na linha 2
  if (nomeLimpo.length <= maxCharsLinha1) {
    return {
      linha1: `${nomeLimpo} -`,
      linha2: tamCorLabel,
    };
  }

  // Se o nome for mais longo, quebra por palavras
  const words = nomeLimpo.split(/\s+/);
  let l1 = '';
  let rest = '';

  for (let i = 0; i < words.length; i++) {
    const candidate = l1 ? `${l1} ${words[i]}` : words[i];
    if (candidate.length <= maxCharsLinha1) {
      l1 = candidate;
    } else {
      rest = words.slice(i).join(' ');
      break;
    }
  }

  if (!l1 && words.length > 0) {
    l1 = words[0].slice(0, maxCharsLinha1);
    rest = words[0].slice(maxCharsLinha1) + (words.length > 1 ? ' ' + words.slice(1).join(' ') : '');
  }

  let l2Final = '';
  if (rest && tamCorLabel) {
    l2Final = `${rest} - ${tamCorLabel}`;
  } else if (rest) {
    l2Final = rest;
  } else {
    l2Final = tamCorLabel;
  }

  if (l2Final.length > 36) {
    l2Final = l2Final.slice(0, 35).trim() + '…';
  }

  return {
    linha1: `${l1} -`,
    linha2: l2Final,
  };
}

/**
 * Gera o documento PDF com as medidas EXATAS do PDF oficial do cliente:
 * - Folha A4 padrão Pimaco A4351 (210 x 297 mm)
 * - 5 colunas x 13 linhas (65 etiquetas por folha)
 * - Largura da etiqueta: 38,1 mm
 * - Altura da etiqueta: 21,2 mm (passo exato de 21,192 mm)
 * - Espaçamento entre colunas (gapX): 2,5 mm (passo entre colunas: 40,6 mm)
 * - Margem Esquerda: 5,50 mm (ajustado levemente para a direita para calibração perfeita na impressora)
 * - Margem Superior: 10,70 mm
 * - Rodapé exato: M.E.0.00 | M.S.0.00 | E.L.0.00 | E.C.0.00
 */
export async function gerarPdfEtiquetas(
  itens: ItemEtiquetaPdf[],
  modelo: ModeloPdfConfig,
  posicaoInicial: number = 1,
  exibirNomeLoja: boolean = true
): Promise<jsPDF> {
  const isA5 = modelo.tipo === 'folha_a5';
  const isTermica = modelo.tipo === 'termica';

  const format: [number, number] | string = isA5
    ? 'a5'
    : isTermica
    ? [modelo.larguraMm, modelo.alturaMm]
    : 'a4';

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format,
  });

  const expandida: ItemEtiquetaPdf[] = [];
  itens
    .filter(it => it.selecionado)
    .forEach(it => {
      for (let c = 0; c < it.copias; c++) {
        expandida.push(it);
      }
    });

  if (expandida.length === 0) {
    return pdf;
  }

  if (isTermica) {
    for (let i = 0; i < expandida.length; i++) {
      if (i > 0) {
        pdf.addPage([modelo.larguraMm, modelo.alturaMm], 'portrait');
      }
      const it = expandida[i];
      desenharEtiquetaExata(
        pdf,
        it,
        1,
        1,
        modelo.larguraMm - 2,
        modelo.alturaMm - 2,
        modelo
      );
    }
  } else {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const colunas = modelo.colunas;
    const linhas = Math.ceil(modelo.etiquetasPorFolha / colunas);
    const labelW = modelo.larguraMm;
    const labelH = modelo.alturaMm;

    // Espaçamento e margens precisas para não cortar na impressão
    const gapX = modelo.gapXMm !== undefined ? modelo.gapXMm : modelo.id === 'a4_a4351' ? 2.5 : 0;
    const gapY = modelo.gapYMm !== undefined ? modelo.gapYMm : 0;

    const totalWLabels = colunas * labelW + (colunas - 1) * gapX;
    const marginX =
      modelo.margemEsquerdaMm !== undefined
        ? modelo.margemEsquerdaMm
        : Math.max(0, (pageWidth - totalWLabels) / 2);

    const totalHLabels = linhas * labelH + (linhas - 1) * gapY;
    const marginY =
      modelo.margemSuperiorMm !== undefined
        ? modelo.margemSuperiorMm
        : Math.max(0, (pageHeight - totalHLabels) / 2);

    const skipCount = Math.max(0, posicaoInicial - 1);
    let itemIdx = 0;
    let pageCount = 0;

    while (itemIdx < expandida.length) {
      if (pageCount > 0) {
        pdf.addPage(format, 'portrait');
      }
      pageCount++;

      for (let slot = 0; slot < modelo.etiquetasPorFolha && itemIdx < expandida.length; slot++) {
        // Pula slots se a folha foi iniciada em uma etiqueta posterior
        if (pageCount === 1 && slot < skipCount) {
          continue;
        }

        const it = expandida[itemIdx];
        itemIdx++;

        // Se for etiqueta vazia / espaço em branco para reaproveitar folha usada, não desenha nada
        if (it.isVazia || it.produtoNome === '__ESPACO_VAZIO__') {
          continue;
        }

        const col = slot % colunas;
        const row = Math.floor(slot / colunas);

        const x = marginX + col * (labelW + gapX);
        const y = marginY + row * (labelH + gapY);

        desenharEtiquetaExata(pdf, it, x, y, labelW, labelH, modelo);
      }

      // Rodapé da folha idêntico ao PDF original: M.E.0.00 | M.S.0.00 | E.L.0.00 | E.C.0.00
      if (!isTermica) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(60, 60, 60);
        pdf.text(
          'M.E.0.00 | M.S.0.00 | E.L.0.00 | E.C.0.00',
          pageWidth / 2,
          pageHeight - 5.5,
          { align: 'center' }
        );
      }
    }
  }

  return pdf;
}

/**
 * Desenha a etiqueta individual com as proporções exatas do PDF original:
 * - Linha 1: Nome do produto alinhado à esquerda (Helvetica 8.0pt)
 * - Linha 2: Tam: {tamanho} alinhado à esquerda (Helvetica 8.0pt)
 * - Linha 3: R${preco} em negrito destacado e centralizado (Helvetica-Bold 11.5pt)
 * - Linha 4: Código de barras EAN-13 oficial (34,0 x 8,3 mm) com dígitos legíveis
 */
function desenharEtiquetaExata(
  pdf: jsPDF,
  item: ItemEtiquetaPdf,
  x: number,
  y: number,
  w: number,
  h: number,
  modelo: ModeloPdfConfig
) {
  const centerX = x + w / 2;
  const leftX = x + 1.2; // 1.2mm de margem esquerda segura
  const isCompact = h < 16;
  const isMini = modelo.id === 'a4_a4349';

  pdf.setTextColor(0, 0, 0);

  // 1 & 2: Formatação de Nome, Tamanho e Cor exatamente como no modelo do cliente
  const { linha1, linha2 } = formatarTextoEtiqueta(
    item.produtoNome,
    item.grade.tamanho,
    isMini ? 16 : isCompact ? 20 : 22,
    item.grade.cor
  );

  pdf.setFont('helvetica', 'normal');
  const textFontSize = isMini ? 5.5 : isCompact ? 6.5 : 8.0;
  pdf.setFontSize(textFontSize);

  let currentY = y + (isMini ? 2.0 : isCompact ? 2.6 : 3.8);
  const maxTextW = w - 2.4;

  // Linha 1 (Nome) alinhado à esquerda com proteção de largura
  if (linha1) {
    const textW1 = pdf.getTextWidth(linha1);
    if (textW1 > maxTextW) {
      const scale1 = Math.max(0.75, maxTextW / textW1);
      pdf.setFontSize(textFontSize * scale1);
      pdf.text(linha1, leftX, currentY);
      pdf.setFontSize(textFontSize);
    } else {
      pdf.text(linha1, leftX, currentY);
    }
  }

  // Linha 2 (Tamanho e Cor ou continuação + Tamanho/Cor) alinhado à esquerda
  currentY += isMini ? 2.2 : isCompact ? 2.6 : 3.1;
  if (linha2) {
    const textW2 = pdf.getTextWidth(linha2);
    if (textW2 > maxTextW) {
      const scale2 = Math.max(0.72, maxTextW / textW2);
      pdf.setFontSize(textFontSize * scale2);
      pdf.text(linha2, leftX, currentY);
      pdf.setFontSize(textFontSize);
    } else {
      pdf.text(linha2, leftX, currentY);
    }
  }

  // 3. Preço: R$263,90 em Negrito, destacado e centralizado acima do código de barras
  currentY += isMini ? 2.8 : isCompact ? 3.4 : 4.3;
  pdf.setFont('helvetica', 'bold');
  const priceFontSize = isMini ? 7.5 : isCompact ? 8.5 : 11.5;
  pdf.setFontSize(priceFontSize);
  const precoValor = item.precoVenda || 0;
  const precoFormatado = `R$${precoValor.toFixed(2).replace('.', ',')}`;
  pdf.text(precoFormatado, centerX, currentY, { align: 'center' });

  // 4. Código de Barras EAN-13 Oficial em Altíssima Resolução (Ultra-HD / 600 DPI)
  currentY += isMini ? 0.6 : isCompact ? 0.8 : 0.7;

  const barcodeValue = item.grade.codigo_barras || item.grade.sku || '0000000889247';
  const barcodeDataUrl = getBarcodeDataUrl(barcodeValue, {
    width: 3.2,
    height: isCompact ? 50 : 70,
    fontSize: isMini ? 18 : isCompact ? 22 : 26,
    margin: 0,
    displayValue: true,
  });

  if (barcodeDataUrl) {
    const barW = isMini ? 22 : isCompact ? 28 : 34.0;
    const barH = isMini
      ? Math.max(4.5, h - (currentY - y) - 0.2)
      : isCompact
      ? Math.max(5.0, h - (currentY - y) - 0.3)
      : 8.3;
    const barX = centerX - barW / 2;
    pdf.addImage(barcodeDataUrl, 'PNG', barX, currentY, barW, barH, undefined, 'FAST');
  }
}
