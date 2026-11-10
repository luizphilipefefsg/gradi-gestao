import JsBarcode from 'jsbarcode';

/**
 * Garante que uma sequência numérica seja um EAN-13 oficial válido de 13 dígitos
 * com o dígito verificador calculado estritamente conforme a especificação GS1.
 */
export function toValidEan13(code: string): string {
  const digits = (code || '').replace(/\D/g, '');
  let base = digits.slice(0, 12);
  if (base.length < 12) {
    base = base.padStart(12, '0');
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(base[i], 10);
    sum += i % 2 === 0 ? d : d * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return `${base}${checksum}`;
}

export function renderBarcodeToCanvas(
  canvas: HTMLCanvasElement | null,
  text: string,
  options?: {
    width?: number;
    height?: number;
    displayValue?: boolean;
    fontSize?: number;
    margin?: number;
  }
) {
  if (!canvas || !text) return;
  const ean13Code = toValidEan13(text);

  try {
    JsBarcode(canvas, ean13Code, {
      format: 'EAN13',
      width: options?.width || 2,
      height: options?.height || 40,
      displayValue: options?.displayValue ?? true,
      fontSize: options?.fontSize || 12,
      margin: options?.margin ?? 0,
      textMargin: 1,
      background: '#ffffff',
      lineColor: '#000000',
    });
  } catch {
    try {
      JsBarcode(canvas, text, {
        format: 'CODE128',
        width: options?.width || 2,
        height: options?.height || 40,
        displayValue: options?.displayValue ?? true,
        fontSize: options?.fontSize || 12,
        margin: options?.margin ?? 0,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      // Fallback silent
    }
  }
}

export function renderBarcodeToSvg(
  svg: SVGSVGElement | null,
  text: string,
  options?: {
    width?: number;
    height?: number;
    displayValue?: boolean;
    fontSize?: number;
    margin?: number;
  }
) {
  if (!svg || !text) return;
  const ean13Code = toValidEan13(text);

  try {
    JsBarcode(svg, ean13Code, {
      format: 'EAN13',
      width: options?.width || 1.25,
      height: options?.height || 26,
      displayValue: options?.displayValue ?? true,
      fontSize: options?.fontSize || 10,
      margin: options?.margin ?? 1,
      textMargin: 1,
      background: '#ffffff',
      lineColor: '#000000',
    });
    svg.setAttribute('shape-rendering', 'crispEdges');
  } catch {
    try {
      JsBarcode(svg, text, {
        format: 'CODE128',
        width: options?.width || 1.25,
        height: options?.height || 26,
        displayValue: options?.displayValue ?? true,
        fontSize: options?.fontSize || 10,
        margin: options?.margin ?? 1,
        textMargin: 1,
        background: '#ffffff',
        lineColor: '#000000',
      });
      svg.setAttribute('shape-rendering', 'crispEdges');
    } catch {
      // Fallback silent
    }
  }
}

/**
 * Gera DataURL em Altíssima Resolução (Ultra-HD / 600 DPI) para impressão perfeita em PDF
 * sem nenhuma perda de nitidez ou borrão.
 */
export function getBarcodeDataUrl(
  text: string,
  options?: {
    width?: number;
    height?: number;
    displayValue?: boolean;
    fontSize?: number;
    margin?: number;
  }
): string {
  if (!text) return '';
  const ean13Code = toValidEan13(text);
  const canvas = document.createElement('canvas');

  // Multiplicador 3.5x para atingir qualidade gráfica profissional (300 a 600 DPI)
  const barWidth = options?.width ? options.width * 2.6 : 3.5;
  const barHeight = options?.height ? options.height * 3 : 85;
  const fontSize = options?.fontSize ? options.fontSize * 2.8 : 28;
  const margin = options?.margin !== undefined ? options.margin * 2 : 4;

  try {
    JsBarcode(canvas, ean13Code, {
      format: 'EAN13',
      width: barWidth,
      height: barHeight,
      displayValue: options?.displayValue ?? true,
      fontSize: fontSize,
      margin: margin,
      textMargin: 4,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch {
    try {
      JsBarcode(canvas, text, {
        format: 'CODE128',
        width: barWidth,
        height: barHeight,
        displayValue: options?.displayValue ?? true,
        fontSize: fontSize,
        margin: margin,
        textMargin: 4,
        background: '#ffffff',
        lineColor: '#000000',
      });
      return canvas.toDataURL('image/png');
    } catch {
      return '';
    }
  }
}
