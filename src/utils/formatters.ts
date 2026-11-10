export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return dateStr;
  }
}

export function maskPhone(value: string): string {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function formatPhone(phone?: string): string {
  if (!phone) return '-';
  let cleaned = phone.replace(/\D/g, '');
  // Strip Brazil 55 country prefix if included in raw digits
  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }
  return maskPhone(cleaned) || phone;
}

export function formatWhatsApp(phone: string): string {
  return formatPhone(phone);
}

export function getWhatsAppClean(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}

export function maskCNPJ(value: string): string {
  const digits = (value || '').replace(/\D/g, '').slice(0, 14);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function formatCNPJ(cnpj?: string): string {
  if (!cnpj) return '';
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
  }
  return maskCNPJ(digits) || cnpj;
}

export function maskCPF(value: string): string {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatCPF(cpf?: string): string {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }
  return maskCPF(digits) || cpf;
}

export interface ConsultaCNPJResult {
  success: boolean;
  razao_social?: string;
  nome_fantasia?: string;
  telefone?: string;
  contato?: string;
  cidade?: string;
  uf?: string;
  message?: string;
}

export async function consultarCNPJ(cnpj: string): Promise<ConsultaCNPJResult> {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) {
    return { success: false, message: 'CNPJ deve conter 14 dígitos.' };
  }

  // 1. Tentar BrasilAPI
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const razao = (data.razao_social || '').trim();
      const fantasia = (data.nome_fantasia || '').trim();
      let tel = '';
      if (data.ddd_telefone_1 && data.ddd_telefone_1.trim()) {
        tel = formatPhone(data.ddd_telefone_1);
      } else if (data.ddd_telefone_2 && data.ddd_telefone_2.trim()) {
        tel = formatPhone(data.ddd_telefone_2);
      }

      let contato = '';
      if (Array.isArray(data.qsa) && data.qsa.length > 0 && data.qsa[0].nome_socio) {
        contato = data.qsa[0].nome_socio.trim();
      }

      if (razao || fantasia) {
        return {
          success: true,
          razao_social: razao,
          nome_fantasia: fantasia,
          telefone: tel,
          contato,
          cidade: data.municipio,
          uf: data.uf,
        };
      }
    } else if (response.status === 404) {
      return { success: false, message: 'CNPJ não encontrado na base da Receita Federal.' };
    }
  } catch {
    // Falha na BrasilAPI, tenta o próximo provedor
  }

  // 2. Fallback: MinhaReceita.org (espelho oficial de alta disponibilidade com CORS aberto)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`https://minhareceita.org/${cleaned}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const razao = (data.razao_social || '').trim();
      const fantasia = (data.nome_fantasia || '').trim();
      let tel = '';
      if (data.ddd_telefone_1 && data.ddd_telefone_1.trim()) {
        tel = formatPhone(data.ddd_telefone_1);
      } else if (data.ddd_telefone_2 && data.ddd_telefone_2.trim()) {
        tel = formatPhone(data.ddd_telefone_2);
      }

      let contato = '';
      if (Array.isArray(data.qsa) && data.qsa.length > 0 && data.qsa[0].nome_socio) {
        contato = data.qsa[0].nome_socio.trim();
      }

      if (razao || fantasia) {
        return {
          success: true,
          razao_social: razao,
          nome_fantasia: fantasia,
          telefone: tel,
          contato,
          cidade: data.municipio,
          uf: data.uf,
        };
      }
    }
  } catch {
    // Falha na MinhaReceita, tenta o terceiro provedor
  }

  // 3. Fallback: Publica CNPJ.ws
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`https://publica.cnpj.ws/cnpj/${cleaned}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const razao = (data.razao_social || '').trim();
      const fantasia = (data.estabelecimento?.nome_fantasia || '').trim();
      let tel = '';
      if (data.estabelecimento?.ddd1 && data.estabelecimento?.telefone1) {
        tel = formatPhone(`${data.estabelecimento.ddd1}${data.estabelecimento.telefone1}`);
      } else if (data.estabelecimento?.ddd2 && data.estabelecimento?.telefone2) {
        tel = formatPhone(`${data.estabelecimento.ddd2}${data.estabelecimento.telefone2}`);
      }

      let contato = '';
      if (Array.isArray(data.socios) && data.socios.length > 0 && data.socios[0].nome) {
        contato = data.socios[0].nome.trim();
      }

      if (razao || fantasia) {
        return {
          success: true,
          razao_social: razao,
          nome_fantasia: fantasia,
          telefone: tel,
          contato,
          cidade: data.estabelecimento?.cidade?.nome,
          uf: data.estabelecimento?.estado?.sigla,
        };
      }
    }
  } catch {
    // Fallback esgotado
  }

  return {
    success: false,
    message: 'Não foi possível consultar os dados deste CNPJ na Receita Federal no momento. Verifique o número digitado ou preencha manualmente.',
  };
}

export function generateEAN13(skuSeed: number | string): string {
  let num = 0;
  if (typeof skuSeed === 'number') {
    num = skuSeed;
  } else {
    for (let i = 0; i < skuSeed.length; i++) {
      num = (num * 31 + skuSeed.charCodeAt(i)) % 1000000000;
    }
  }
  // 789 is Brazil GS1 prefix, plus 9 digits, plus checksum
  const base = `789${String(Math.abs(num)).padStart(9, '0').slice(-9)}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return `${base}${checksum}`;
}
