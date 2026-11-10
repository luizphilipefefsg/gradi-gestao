import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Venda, Produto } from '../types';
import { formatCurrency, formatDate, formatWhatsApp } from './formatters';

interface HeaderOptions {
  titulo: string;
  subtitulo?: string;
  periodo?: string;
}

/**
 * Cabeçalho Padrão A4 em Preto e Branco (Monocromático de Alto Contraste)
 * Ideal para impressoras a laser e jato de tinta sem desperdício de tinta colorida.
 */
function adicionarCabecalhoPdf(doc: jsPDF, opt: HeaderOptions): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Identificação do Sistema
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('GRADI GESTÃO', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text('Sistema Especializado para Lojas de Roupas • Relatório Gerencial (A4 P&B)', 14, 17);

  // Data e hora de Emissão no canto direito
  const agora = new Date();
  const dataEmissao = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.text(`Emissão: ${dataEmissao}`, pageWidth - 14, 13, { align: 'right' });
  doc.text('Formato: Folha A4 • Monocromático', pageWidth - 14, 17, { align: 'right' });

  // Linha horizontal superior preta
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.line(14, 20.5, pageWidth - 14, 20.5);

  // 2. Título do Relatório
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text(opt.titulo.toUpperCase(), 14, 28);

  // Período analisado
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  const textoPeriodo = opt.periodo ? `Período: ${opt.periodo}` : 'Período: Todo o Histórico da Loja';
  doc.text(textoPeriodo, 14, 33);

  // Linha separadora do cabeçalho
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(14, 36, pageWidth - 14, 36);

  return 40; // Próximo Y seguro
}

/**
 * Rodapé em Preto e Branco com numeração de páginas A4
 */
function adicionarRodapePdf(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text('Gradi Gestão • Documento para conferência financeira e operacional • Folha A4 P&B', 14, pageHeight - 6);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  }
}

/**
 * 1. RELATÓRIO EXECUTIVO: RESUMO, FATURAMENTO & LUCRO (DRE) - A4 P&B
 */
export function gerarPdfResumoLucro(dados: {
  periodoDesc: string;
  faturamentoBruto: number;
  cmvTotal: number;
  lucroBruto: number;
  margemBruta: number;
  despesasPagas: number;
  lucroLiquido: number;
  totalVendas: number;
  ticketMedio: number;
  totalPecas: number;
  crediarioTotal: number;
  formasPagamento: { forma: string; total: number; qtd: number }[];
  topProdutos: { nome: string; quantidade: number; receita: number }[];
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = adicionarCabecalhoPdf(doc, {
    titulo: 'Relatório de Faturamento, Resumo & Lucro (DRE)',
    periodo: dados.periodoDesc,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const colWidth = (pageWidth - 28 - 6) / 3;

  // Bloco de 6 Cartões com Indicadores Chave em Preto e Branco
  const kpis = [
    { label: 'Faturamento Bruto', valor: formatCurrency(dados.faturamentoBruto), sub: `${dados.totalVendas} venda(s) realizada(s)` },
    { label: 'Lucro Bruto (Margem CMV)', valor: formatCurrency(dados.lucroBruto), sub: `Margem: +${dados.margemBruta}% sobre custo` },
    { label: 'Lucro Líquido Real', valor: formatCurrency(dados.lucroLiquido), sub: `Dedução de ${formatCurrency(dados.despesasPagas)}` },
    { label: 'Ticket Médio por Venda', valor: formatCurrency(dados.ticketMedio), sub: 'Média por compra concluída' },
    { label: 'Volume de Peças', valor: `${dados.totalPecas} un`, sub: 'Peças saídas do estoque' },
    { label: 'Vendido no Crediário', valor: formatCurrency(dados.crediarioTotal), sub: 'Financiamento via carnê' },
  ];

  kpis.forEach((kpi, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = 14 + col * (colWidth + 3);
    const y = startY + row * 18;

    // Fundo branco com borda preta sólida
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, colWidth, 15, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text(kpi.label.toUpperCase(), x + 3, y + 4.5);

    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    doc.text(kpi.valor, x + 3, y + 9.5);

    if (kpi.sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(70, 70, 70);
      doc.text(kpi.sub, x + 3, y + 13.2);
    }
  });

  let currentY = startY + 41;

  // DRE Sintético Preto e Branco
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('DEMONSTRATIVO DE RESULTADO DO EXERCÍCIO (DRE)', 14, currentY);
  currentY += 2;

  const dreRows = [
    ['(+) FATURAMENTO BRUTO DE VENDAS', formatCurrency(dados.faturamentoBruto), '100%'],
    ['(-) Custo das Mercadorias Vendidas (CMV)', `(${formatCurrency(dados.cmvTotal)})`, `${dados.faturamentoBruto > 0 ? Math.round((dados.cmvTotal / dados.faturamentoBruto) * 100) : 0}%`],
    ['(=) LUCRO BRUTO OPERACIONAL', formatCurrency(dados.lucroBruto), `+${dados.margemBruta}%`],
    ['(-) Despesas Operacionais Pagas', `(${formatCurrency(dados.despesasPagas)})`, `${dados.faturamentoBruto > 0 ? Math.round((dados.despesasPagas / dados.faturamentoBruto) * 100) : 0}%`],
    ['(=) LUCRO LÍQUIDO FINAL ESTIMADO', formatCurrency(dados.lucroLiquido), `${dados.faturamentoBruto > 0 ? Math.round((dados.lucroLiquido / dados.faturamentoBruto) * 100) : 0}%`],
  ];

  autoTable(doc, {
    startY: currentY + 1,
    head: [['Estrutura do DRE', 'Valor (R$)', '% sobre Faturamento']],
    body: dreRows,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [0, 0, 0] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.2,
    columnStyles: {
      0: { cellWidth: 102, fontStyle: 'bold' },
      1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 35, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Recebimentos por Forma de Pagamento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('RECEBIMENTOS POR FORMA DE PAGAMENTO', 14, currentY);
  currentY += 2;

  const formasRows = dados.formasPagamento.map(f => [
    f.forma,
    `${f.qtd} transação(ões)`,
    formatCurrency(f.total),
    `${dados.faturamentoBruto > 0 ? Math.round((f.total / dados.faturamentoBruto) * 100) : 0}%`,
  ]);

  autoTable(doc, {
    startY: currentY + 1,
    head: [['Forma de Pagamento', 'Transações', 'Total Recebido (R$)', 'Participação']],
    body: formasRows,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [0, 0, 0] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.2,
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'right', fontStyle: 'bold' },
      3: { halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  adicionarRodapePdf(doc);
  return doc;
}

/**
 * 2. RELATÓRIO ANALÍTICO DE VENDAS - A4 RETRATO P&B
 */
export function gerarPdfVendas(vendas: Venda[], periodoDesc: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = adicionarCabecalhoPdf(doc, {
    titulo: 'Relatório Analítico de Vendas Concluídas',
    periodo: periodoDesc,
  });

  const totalFaturado = vendas.reduce((acc, v) => acc + v.total, 0);
  const totalDescontos = vendas.reduce((acc, v) => acc + (v.desconto || 0), 0);
  const totalPecas = vendas.reduce((acc, v) => acc + v.itens.reduce((sum, it) => sum + it.quantidade, 0), 0);

  const rows = vendas.map(v => {
    const dataHora = v.data_venda ? formatDate(v.data_venda.split('T')[0]) : '-';
    const formaFormatada = formatarFormaPagamento(v.forma_pagamento);
    const qtdItens = v.itens.reduce((acc, i) => acc + i.quantidade, 0);

    const itensTexto = v.itens
      .map(it => `${it.produto_nome} (${it.tamanho}/${it.cor})`)
      .slice(0, 2)
      .join(', ') + (v.itens.length > 2 ? ` +${v.itens.length - 2}` : '');

    return [
      v.codigo_venda || v.id.slice(0, 8),
      dataHora,
      v.cliente_nome || 'Consumidor',
      itensTexto,
      `${qtdItens}`,
      formaFormatada,
      v.desconto > 0 ? formatCurrency(v.desconto) : '-',
      formatCurrency(v.total),
    ];
  });

  // Largura útil de A4 Retrato: 182 mm
  autoTable(doc, {
    startY,
    head: [['Código', 'Data', 'Cliente', 'Peças Vendidas', 'Qtd', 'Pagamento', 'Desconto', 'Total']],
    body: rows,
    theme: 'grid',
    styles: { cellPadding: 1.2, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [0, 0, 0] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.2,
    columnStyles: {
      0: { cellWidth: 16, fontStyle: 'bold' },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 34, fontStyle: 'bold' },
      3: { cellWidth: 44 },
      4: { cellWidth: 8, halign: 'center' },
      5: { cellWidth: 21 },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
    },
    foot: [[
      'TOTAIS',
      `${vendas.length} vend.`,
      '',
      '',
      `${totalPecas}`,
      '',
      formatCurrency(totalDescontos),
      formatCurrency(totalFaturado),
    ]],
    footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5 },
    margin: { left: 14, right: 14 },
  });

  adicionarRodapePdf(doc);
  return doc;
}

/**
 * 3. RELATÓRIO DE MAIS VENDIDOS - A4 RETRATO P&B
 */
export function gerarPdfMaisVendidos(
  itens: {
    rank: number;
    nome: string;
    categoria: string;
    quantidade: number;
    receita: number;
    custoMedio: number;
    lucroEstimado: number;
    margem: number;
  }[],
  periodoDesc: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = adicionarCabecalhoPdf(doc, {
    titulo: 'Relatório de Produtos Mais Vendidos (Curva de Saída)',
    periodo: periodoDesc,
  });

  const totalQtd = itens.reduce((acc, i) => acc + i.quantidade, 0);
  const totalReceita = itens.reduce((acc, i) => acc + i.receita, 0);
  const totalLucro = itens.reduce((acc, i) => acc + i.lucroEstimado, 0);

  const rows = itens.map(i => [
    `${i.rank}º`,
    i.nome,
    i.categoria,
    `${i.quantidade} un`,
    formatCurrency(i.receita),
    formatCurrency(i.lucroEstimado),
    `+${i.margem}%`,
  ]);

  autoTable(doc, {
    startY,
    head: [['Pos.', 'Produto / Descrição', 'Categoria', 'Qtd Saída', 'Receita Total', 'Lucro Est.', 'Margem']],
    body: rows,
    theme: 'grid',
    styles: { cellPadding: 1.2, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.8 },
    bodyStyles: { fontSize: 7.2, textColor: [0, 0, 0] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.2,
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 62, fontStyle: 'bold' },
      2: { cellWidth: 26 },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 18, halign: 'center' },
    },
    foot: [[
      'TOTAIS',
      `${itens.length} modelos`,
      '',
      `${totalQtd} un`,
      formatCurrency(totalReceita),
      formatCurrency(totalLucro),
      totalReceita > 0 ? `+${Math.round((totalLucro / totalReceita) * 100)}%` : '-',
    ]],
    footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.8 },
    margin: { left: 14, right: 14 },
  });

  adicionarRodapePdf(doc);
  return doc;
}

/**
 * 4. RELATÓRIO DE CREDIÁRIO & COBRANÇA - A4 RETRATO P&B
 */
export function gerarPdfCrediario(
  parcelas: {
    clienteNome: string;
    whatsapp: string;
    parcelaInfo: string;
    vencimento: string;
    valor: number;
    status: string;
    diasAtraso?: number;
  }[],
  periodoDesc: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = adicionarCabecalhoPdf(doc, {
    titulo: 'Relatório de Carnês & Crediário da Loja',
    periodo: periodoDesc,
  });

  const totalValor = parcelas.reduce((acc, p) => acc + p.valor, 0);

  const rows = parcelas.map(p => {
    const statusFormatado =
      p.status === 'atrasado'
        ? `Atrasada (${p.diasAtraso || 0}d)`
        : p.status === 'pago'
        ? 'Paga'
        : 'Em Aberto (No Prazo)';

    return [
      p.clienteNome,
      p.whatsapp ? formatWhatsApp(p.whatsapp) : '-',
      p.parcelaInfo,
      formatDate(p.vencimento),
      formatCurrency(p.valor),
      statusFormatado,
    ];
  });

  autoTable(doc, {
    startY,
    head: [['Cliente', 'WhatsApp', 'Parcela', 'Vencimento', 'Valor (R$)', 'Situação']],
    body: rows,
    theme: 'grid',
    styles: { cellPadding: 1.2, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.8 },
    bodyStyles: { fontSize: 7.2, textColor: [0, 0, 0] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.2,
    columnStyles: {
      0: { cellWidth: 52, fontStyle: 'bold' },
      1: { cellWidth: 32 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 30, halign: 'center' },
    },
    foot: [[
      'TOTAL',
      `${parcelas.length} parcela(s)`,
      '',
      '',
      formatCurrency(totalValor),
      '',
    ]],
    footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.8 },
    margin: { left: 14, right: 14 },
  });

  adicionarRodapePdf(doc);
  return doc;
}

/**
 * 5. RELATÓRIO DE ESTOQUE & INVENTÁRIO - A4 RETRATO P&B
 */
export function gerarPdfEstoque(produtos: Produto[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = adicionarCabecalhoPdf(doc, {
    titulo: 'Relatório de Posição de Estoque & Inventário',
    periodo: 'Posição Atual do Estoque',
  });

  let totalPecasEstoque = 0;
  let valorCustoTotal = 0;
  let valorVendaTotal = 0;

  const rows: string[][] = [];

  produtos.forEach(p => {
    p.grades.forEach(g => {
      totalPecasEstoque += g.estoque_disponivel;
      valorCustoTotal += g.estoque_disponivel * p.preco_custo;
      valorVendaTotal += g.estoque_disponivel * p.preco_venda;

      rows.push([
        p.nome,
        p.referencia || '-',
        g.tamanho,
        g.cor || '-',
        `${g.estoque_disponivel} un`,
        formatCurrency(p.preco_custo),
        formatCurrency(p.preco_venda),
        formatCurrency(g.estoque_disponivel * p.preco_venda),
      ]);
    });
  });

  autoTable(doc, {
    startY,
    head: [['Produto', 'Ref.', 'Tam', 'Cor', 'Estoque', 'Custo Un.', 'Preço Venda', 'Total Venda']],
    body: rows,
    theme: 'grid',
    styles: { cellPadding: 1.2, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.8 },
    bodyStyles: { fontSize: 7.2, textColor: [0, 0, 0] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.2,
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 18 },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 20 },
      4: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
    },
    foot: [[
      'TOTAIS',
      `${produtos.length} modelos`,
      '',
      '',
      `${totalPecasEstoque} un`,
      formatCurrency(valorCustoTotal),
      '',
      formatCurrency(valorVendaTotal),
    ]],
    footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.8 },
    margin: { left: 14, right: 14 },
  });

  adicionarRodapePdf(doc);
  return doc;
}

/**
 * EXPORTADOR UNIVERSAL PARA CSV / EXCEL
 */
export function exportarCsv(nomeArquivo: string, cabecalhos: string[], linhas: (string | number)[][]) {
  const delimitador = ';';
  const conteudoCsv = [
    cabecalhos.join(delimitador),
    ...linhas.map(row =>
      row
        .map(val => {
          const str = String(val ?? '').replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(delimitador)
    ),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + conteudoCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${nomeArquivo}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatarFormaPagamento(f?: string): string {
  switch (f) {
    case 'pix':
      return 'PIX';
    case 'cartao_credito':
      return 'Cartão Crédito';
    case 'cartao_debito':
      return 'Cartão Débito';
    case 'dinheiro':
      return 'Dinheiro';
    case 'crediario':
      return 'Crediário Loja';
    case 'misto':
      return 'Misto';
    default:
      return f || 'Outros';
  }
}
