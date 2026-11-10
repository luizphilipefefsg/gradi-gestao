export type Tamanho = 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XGG' | '34' | '36' | '38' | '40' | '42' | '44' | '46' | 'ÚNICO';

export interface ProdutoGrade {
  id: string;
  produto_id: string;
  tamanho: string;
  cor: string;
  sku: string;
  codigo_barras: string;
  estoque_disponivel: number;
  estoque_condicional: number;
  estoque_minimo: number;
}

export interface Produto {
  id: string;
  nome: string;
  categoria: string;
  referencia: string;
  preco_custo: number;
  preco_venda: number;
  descricao?: string;
  fornecedor_id?: string;
  fornecedor_nome?: string;
  fornecedor?: string;
  margem_lucro?: number;
  foto_url?: string;
  grades: ProdutoGrade[];
  criado_em: string;
}

export interface Cliente {
  id: string;
  nome: string;
  whatsapp: string;
  cpf?: string;
  limite_crediario?: number;
  saldo_devedor: number;
  endereco?: string;
  observacoes?: string;
  criado_em: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  contato: string;
  telefone: string;
  cnpj?: string;
}

export interface ItemVenda {
  id: string;
  venda_id: string;
  grade_id: string;
  produto_id: string;
  produto_nome: string;
  tamanho: string;
  cor: string;
  sku: string;
  codigo_barras: string;
  preco_unitario: number;
  preco_custo_unitario: number;
  quantidade: number;
  subtotal: number;
}

export type FormaPagamento = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'crediario' | 'misto';

export interface ParcelaCrediario {
  id: string;
  venda_id: string;
  cliente_id: string;
  numero_parcela: number;
  total_parcelas: number;
  valor: number;
  data_vencimento: string; // YYYY-MM-DD
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'atrasado' | 'parcial';
  valor_pago: number;
  observacao?: string;
}

export interface Venda {
  id: string;
  codigo_venda: string;
  cliente_id?: string;
  cliente_nome: string;
  cliente_whatsapp?: string;
  data_venda: string;
  status: 'em_aberto' | 'finalizada' | 'cancelada';
  subtotal: number;
  desconto: number;
  acrescimo: number;
  total: number;
  forma_pagamento?: FormaPagamento;
  itens: ItemVenda[];
  parcelas?: ParcelaCrediario[];
  observacoes?: string;
  finalizada_em?: string;
}

export type StatusCondicional = 'ativa' | 'parcial' | 'devolvida' | 'convertida';

export interface ItemCondicional {
  id: string;
  condicional_id: string;
  grade_id: string;
  produto_id: string;
  produto_nome: string;
  tamanho: string;
  cor: string;
  sku: string;
  preco_unitario: number;
  quantidade: number;
  status: 'em_condicional' | 'devolvido' | 'vendido';
  devolvido_em?: string;
  vendido_em?: string;
}

export interface Condicional {
  id: string;
  codigo_condicional: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_whatsapp: string;
  data_retirada: string;
  data_prevista_devolucao: string;
  status: StatusCondicional;
  observacoes?: string;
  itens: ItemCondicional[];
  total_estimado: number;
  venda_id?: string;
}

export interface ContaPagar {
  id: string;
  descricao: string;
  categoria: 'fornecedor' | 'aluguel' | 'energia' | 'internet' | 'comissao' | 'outros';
  fornecedor_id?: string;
  fornecedor_nome?: string;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'aberto' | 'pago' | 'atrasado';
}

export interface ContaReceber {
  id: string;
  origem: 'venda' | 'crediario' | 'condicional';
  referencia_id: string;
  cliente_id?: string;
  cliente_nome: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_recebimento?: string;
  status: 'aberto' | 'recebido' | 'atrasado';
}

export interface UsuarioSistema {
  id: string;
  uid?: string;
  lojaId?: string;
  nome: string;
  nomeLoja: string;
  email: string;
  senha?: string;
  whatsapp?: string;
  role: 'admin' | 'lojista' | 'vendedora';
  status: 'ativo' | 'suspenso' | 'pendente';
  createdAt: string;
  criadoPor?: string;
  ultimoAcesso?: string;
}
