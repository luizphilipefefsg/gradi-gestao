import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { collection, doc, getDocs, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Cliente,
  Condicional,
  ContaPagar,
  ContaReceber,
  FormaPagamento,
  Fornecedor,
  ItemCondicional,
  ItemVenda,
  ParcelaCrediario,
  Produto,
  ProdutoGrade,
  StatusCondicional,
  Venda,
} from '../types';
import {
  INITIAL_CLIENTES,
  INITIAL_CONDICIONAIS,
  INITIAL_CONTAS_PAGAR,
  INITIAL_FORNECEDORES,
  INITIAL_PRODUTOS,
  INITIAL_VENDAS,
} from '../data/initialData';
import { toValidEan13 } from '../utils/barcode';
import { useAuth } from './AuthContext';

interface StoreContextType {
  produtos: Produto[];
  clientes: Cliente[];
  fornecedores: Fornecedor[];
  condicionais: Condicional[];
  vendas: Venda[];
  contasPagar: ContaPagar[];
  contasReceber: ContaReceber[];
  vendaAtual: Venda;
  categorias: string[];
  
  // Actions
  adicionarProduto: (produto: Produto) => void;
  atualizarProduto: (produto: Produto) => void;
  excluirProduto: (produtoId: string) => void;
  adicionarCliente: (cliente: Omit<Cliente, 'id' | 'saldo_devedor' | 'criado_em'>) => Cliente;
  atualizarCliente: (cliente: Cliente) => void;
  excluirCliente: (clienteId: string) => void;
  adicionarFornecedor: (fornecedor: Omit<Fornecedor, 'id'>) => Fornecedor;
  atualizarFornecedor: (fornecedor: Fornecedor) => void;
  excluirFornecedor: (fornecedorId: string) => void;
  adicionarCategoria: (nome: string) => { success: boolean; message?: string };
  editarCategoria: (nomeAntigo: string, novoNome: string) => { success: boolean; message?: string };
  excluirCategoria: (nome: string, moverPara?: string) => { success: boolean; message?: string };
  
  // PDV & Golden Stock Rule
  adicionarItemVendaAtual: (produto: Produto, grade: ProdutoGrade, quantidade?: number) => { success: boolean; message?: string };
  removerItemVendaAtual: (itemId: string) => void;
  alterarQuantidadeItemVendaAtual: (itemId: string, novaQtd: number) => { success: boolean; message?: string };
  cancelarVendaAtual: () => void;
  vincularClienteVendaAtual: (cliente: Cliente | null) => void;
  finalizarVendaAtual: (
    formaPagamento: FormaPagamento,
    parcelas?: ParcelaCrediario[],
    desconto?: number,
    acrescimo?: number,
    observacoes?: string
  ) => { success: boolean; vendaFinalizada?: Venda; message?: string };
  
  // Condicional
  criarCondicional: (
    clienteId: string,
    itens: { gradeId: string; quantidade: number }[],
    dataPrevistaDevolucao: string,
    observacoes?: string
  ) => { success: boolean; message?: string; condicional?: Condicional };
  acertarCondicional: (
    condicionalId: string,
    decisoes: { itemId: string; acao: 'comprar' | 'devolver' }[],
    formaPagamento?: FormaPagamento,
    parcelas?: ParcelaCrediario[]
  ) => { success: boolean; message?: string; vendaGerada?: Venda };
  
  // Crediário
  baixarParcelaCrediario: (parcelaId: string, valorPago: number) => { success: boolean; message?: string };
  
  // Financeiro
  adicionarContaPagar: (conta: Omit<ContaPagar, 'id'>) => void;
  pagarContaPagar: (contaId: string) => void;
  
  // Sistema
  restaurarDadosPadrao: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

function createEmptyVenda(): Venda {
  return {
    id: `vnd-${Date.now()}`,
    codigo_venda: `VND-${Math.floor(10000 + Math.random() * 90000)}`,
    cliente_nome: 'Consumidor Balcão',
    data_venda: new Date().toISOString(),
    status: 'em_aberto',
    subtotal: 0,
    desconto: 0,
    acrescimo: 0,
    total: 0,
    itens: [],
  };
}

const DEFAULT_CATEGORIAS = [
  'Vestidos',
  'Calças',
  'Blusas & Tops',
  'Casacos & Blazers',
  'Camisas',
  'Saias',
  'Jeans',
  'Conjuntos',
  'Moda Íntima',
  'Acessórios',
];

export const StoreProvider: React.FC<{ children: React.ReactNode; tenantId?: string }> = ({
  children,
  tenantId: propTenantId,
}) => {
  const { usuarioSistema, user } = useAuth();
  const activeTenant =
    propTenantId ||
    usuarioSistema?.lojaId ||
    (user?.uid ? `loja-${user.uid}` : 'unauthenticated');

  const getStorageKey = (key: string) => `vestuario_${activeTenant}_${key}`;

  const [produtos, setProdutos] = useState<Produto[]>([]);

  const [categorias, setCategorias] = useState<string[]>(DEFAULT_CATEGORIAS);


  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  const [condicionais, setCondicionais] = useState<Condicional[]>([]);

  const [vendas, setVendas] = useState<Venda[]>([]);

  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);

  function safeJsonParse<T>(subKey: string, fallback: T): T {
    try {
      const saved = localStorage.getItem(getStorageKey(subKey));
      return saved ? (JSON.parse(saved) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  const [vendaAtual, setVendaAtual] = useState<Venda>(() =>
    safeJsonParse('venda_atual', createEmptyVenda())
  );

  // Calculate dynamic contas a receber from crediario parcelas
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);

  // Sincronização multi-lojas: cada loja possui subcoleções próprias no Firestore.
  const [cloudReady, setCloudReady] = useState(false);
  const lastRemote = useRef<Record<string, string>>({});
  const collectionState = { categorias, produtos, clientes, fornecedores, condicionais, vendas, contasPagar };

  useEffect(() => {
    if (!user || !usuarioSistema?.lojaId || activeTenant === 'unauthenticated') {
      setCloudReady(false);
      return;
    }
    setCloudReady(false);
    lastRemote.current = {};
    let loaded = new Set<string>();
    const definitions: { name: string; apply: (items: any[]) => void }[] = [
      { name: 'produtos', apply: setProdutos },
      { name: 'clientes', apply: setClientes },
      { name: 'fornecedores', apply: setFornecedores },
      { name: 'condicionais', apply: setCondicionais },
      { name: 'vendas', apply: setVendas },
      { name: 'contas_pagar', apply: setContasPagar },
      { name: 'categorias', apply: (items) => setCategorias(items.length ? items.map((item: any) => item.nome) : DEFAULT_CATEGORIAS) },
    ];
    const unsubscribers = definitions.map(({ name, apply }) => onSnapshot(
      collection(db, 'stores', activeTenant, name),
      (snapshot) => {
        const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        if (name === 'categorias') {
          const names = items.map((item: any) => item.nome as string).filter(Boolean);
          lastRemote.current[name] = JSON.stringify([...names].sort());
          apply(names);
        } else {
          lastRemote.current[name] = JSON.stringify([...items].sort((a: any, b: any) => String(a.id).localeCompare(String(b.id))));
          apply(items);
        }
        loaded.add(name);
        if (loaded.size === definitions.length) setCloudReady(true);
      },
      (error) => console.error(`Erro ao sincronizar ${name}:`, error),
    ));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [activeTenant, user?.uid, usuarioSistema?.lojaId]);

  useEffect(() => {
    if (!cloudReady || !user || !usuarioSistema?.lojaId) return;
    let cancelled = false;
    const persist = async (name: string, values: any[]) => {
      const normalized = name === 'categorias'
        ? values.map((nome: string) => ({ id: nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-'), nome }))
        : values;
      const fingerprint = JSON.stringify(name === 'categorias' ? [...values].sort() : [...normalized].sort((a: any, b: any) => String(a.id).localeCompare(String(b.id))));
      if (lastRemote.current[name] === fingerprint) return;
      try {
        const target = collection(db, 'stores', activeTenant, name);
        const existing = await getDocs(target);
        const nextIds = new Set(normalized.map((item: any) => String(item.id)));
        const batch = writeBatch(db);
        let writes = 0;
        existing.docs.forEach((item) => {
          if (!nextIds.has(item.id)) { batch.delete(item.ref); writes += 1; }
        });
        normalized.forEach((item: any) => {
          if (!item?.id) return;
          const { id, ...data } = item;
          batch.set(doc(db, 'stores', activeTenant, name, String(id)), data);
          writes += 1;
        });
        if (writes > 0) await batch.commit();
        if (!cancelled) lastRemote.current[name] = fingerprint;
      } catch (error) {
        console.error(`Erro ao salvar ${name} no Firestore:`, error);
      }
    };
    Object.entries(collectionState).forEach(([name, values]) => { void persist(name, values as any[]); });
    return () => { cancelled = true; };
  }, [cloudReady, activeTenant, user?.uid, usuarioSistema?.lojaId, categorias, produtos, clientes, fornecedores, condicionais, vendas, contasPagar]);

  // O rascunho do caixa é temporário e permanece apenas neste navegador.
  useEffect(() => {
    localStorage.setItem(getStorageKey('venda_atual'), JSON.stringify(vendaAtual));
  }, [vendaAtual, activeTenant]);

  // Recompute Contas a Receber from all sales with crediario
  useEffect(() => {
    const crList: ContaReceber[] = [];
    vendas.forEach(v => {
      if (v.status === 'finalizada' && v.parcelas && v.parcelas.length > 0) {
        v.parcelas.forEach(p => {
          crList.push({
            id: `cr-${p.id}`,
            origem: 'crediario',
            referencia_id: p.id,
            cliente_id: p.cliente_id,
            cliente_nome: v.cliente_nome,
            descricao: `Parcela ${p.numero_parcela}/${p.total_parcelas} - Pedido ${v.codigo_venda}`,
            valor: p.valor,
            data_vencimento: p.data_vencimento,
            data_recebimento: p.data_pagamento,
            status: p.status === 'pago' ? 'recebido' : (new Date(p.data_vencimento) < new Date() ? 'atrasado' : 'aberto'),
          });
        });
      }
    });
    setContasReceber(crList);
  }, [vendas]);

  // Recalculate customer debt balances accurately
  useEffect(() => {
    setClientes(prevClientes => {
      return prevClientes.map(c => {
        let totalDebt = 0;
        vendas.forEach(v => {
          if (v.status === 'finalizada' && v.cliente_id === c.id && v.parcelas) {
            v.parcelas.forEach(p => {
              if (p.status !== 'pago') {
                totalDebt += (p.valor - (p.valor_pago || 0));
              }
            });
          }
        });
        return { ...c, saldo_devedor: totalDebt };
      });
    });
  }, [vendas]);

  // Helper to adjust stock
  const ajustarEstoqueGrade = (gradeId: string, deltaDisp: number, deltaCond: number) => {
    setProdutos(prevProdutos =>
      prevProdutos.map(prod => {
        const gradeExists = prod.grades.some(g => g.id === gradeId);
        if (!gradeExists) return prod;

        return {
          ...prod,
          grades: prod.grades.map(g => {
            if (g.id === gradeId) {
              return {
                ...g,
                estoque_disponivel: Math.max(0, g.estoque_disponivel + deltaDisp),
                estoque_condicional: Math.max(0, g.estoque_condicional + deltaCond),
              };
            }
            return g;
          }),
        };
      })
    );
  };

  const adicionarProduto = (produto: Produto) => {
    const normalizado: Produto = {
      ...produto,
      grades: (produto.grades || []).map(g => ({
        ...g,
        codigo_barras: toValidEan13(g.codigo_barras || g.sku),
      })),
    };
    setProdutos(prev => [normalizado, ...prev]);
  };

  const atualizarProduto = (produto: Produto) => {
    const normalizado: Produto = {
      ...produto,
      grades: (produto.grades || []).map(g => ({
        ...g,
        codigo_barras: toValidEan13(g.codigo_barras || g.sku),
      })),
    };
    setProdutos(prev => prev.map(p => (p.id === produto.id ? normalizado : p)));
  };

  const excluirProduto = (produtoId: string) => {
    setProdutos(prev => prev.filter(p => p.id !== produtoId));
  };

  const adicionarCliente = (clienteData: Omit<Cliente, 'id' | 'saldo_devedor' | 'criado_em'>): Cliente => {
    const novoCliente: Cliente = {
      ...clienteData,
      id: `cli-${Date.now()}`,
      saldo_devedor: 0,
      criado_em: new Date().toISOString(),
    };
    setClientes(prev => [novoCliente, ...prev]);
    return novoCliente;
  };

  const atualizarCliente = (cliente: Cliente) => {
    setClientes(prev => prev.map(c => (c.id === cliente.id ? cliente : c)));
  };

  const excluirCliente = (clienteId: string) => {
    setClientes(prev => prev.filter(c => c.id !== clienteId));
  };

  const adicionarFornecedor = (fornData: Omit<Fornecedor, 'id'>): Fornecedor => {
    const novoForn: Fornecedor = {
      ...fornData,
      id: `forn-${Date.now()}`,
    };
    setFornecedores(prev => [novoForn, ...prev]);
    return novoForn;
  };

  const atualizarFornecedor = (fornecedor: Fornecedor) => {
    setFornecedores(prev => prev.map(f => (f.id === fornecedor.id ? fornecedor : f)));
  };

  const excluirFornecedor = (fornecedorId: string) => {
    setFornecedores(prev => prev.filter(f => f.id !== fornecedorId));
  };

  const adicionarCategoria = (nome: string): { success: boolean; message?: string } => {
    const limpo = nome.trim();
    if (!limpo) {
      return { success: false, message: 'Informe o nome da categoria.' };
    }
    if (categorias.some(c => c.toLowerCase() === limpo.toLowerCase())) {
      return { success: false, message: `A categoria "${limpo}" já está cadastrada.` };
    }
    setCategorias(prev => [...prev, limpo]);
    return { success: true, message: `Categoria "${limpo}" cadastrada com sucesso!` };
  };

  const editarCategoria = (nomeAntigo: string, novoNome: string): { success: boolean; message?: string } => {
    const antigo = nomeAntigo.trim();
    const novo = novoNome.trim();
    if (!novo) {
      return { success: false, message: 'O novo nome da categoria não pode ser vazio.' };
    }
    if (antigo.toLowerCase() !== novo.toLowerCase() && categorias.some(c => c.toLowerCase() === novo.toLowerCase())) {
      return { success: false, message: `Já existe uma categoria chamada "${novo}".` };
    }

    setCategorias(prev => prev.map(c => (c.toLowerCase() === antigo.toLowerCase() ? novo : c)));

    setProdutos(prev =>
      prev.map(p => (p.categoria.toLowerCase() === antigo.toLowerCase() ? { ...p, categoria: novo } : p))
    );

    return { success: true, message: `Categoria alterada para "${novo}" e produtos atualizados!` };
  };

  const excluirCategoria = (nome: string, moverPara: string = 'Geral'): { success: boolean; message?: string } => {
    const limpo = nome.trim();
    const produtosAfetados = produtos.filter(p => p.categoria.toLowerCase() === limpo.toLowerCase());

    setCategorias(prev => {
      const filtradas = prev.filter(c => c.toLowerCase() !== limpo.toLowerCase());
      if (produtosAfetados.length > 0 && !filtradas.some(c => c.toLowerCase() === moverPara.toLowerCase())) {
        return [...filtradas, moverPara];
      }
      return filtradas;
    });

    if (produtosAfetados.length > 0) {
      setProdutos(prev =>
        prev.map(p =>
          p.categoria.toLowerCase() === limpo.toLowerCase() ? { ...p, categoria: moverPara } : p
        )
      );
      return {
        success: true,
        message: `Categoria "${limpo}" excluída. ${produtosAfetados.length} ${
          produtosAfetados.length === 1 ? 'modelo foi movido' : 'modelos foram movidos'
        } para "${moverPara}".`,
      };
    }

    return { success: true, message: `Categoria "${limpo}" removida com sucesso.` };
  };

  // ==========================================
  // PDV & REGRA DE OURO DA BAIXA DE ESTOQUE
  // ==========================================

  const adicionarItemVendaAtual = (
    produto: Produto,
    grade: ProdutoGrade,
    quantidade: number = 1
  ): { success: boolean; message?: string } => {
    if (grade.estoque_disponivel < quantidade) {
      return {
        success: false,
        message: `Estoque insuficiente! Disponível em loja: ${grade.estoque_disponivel} un.`,
      };
    }

    // BAIXA IMEDIATA NO ESTOQUE (Regra de Ouro)
    ajustarEstoqueGrade(grade.id, -quantidade, 0);

    setVendaAtual(prev => {
      const itemExistenteIndex = prev.itens.findIndex(item => item.grade_id === grade.id);
      let novosItens: ItemVenda[];

      if (itemExistenteIndex >= 0) {
        novosItens = prev.itens.map((item, idx) => {
          if (idx === itemExistenteIndex) {
            const novaQtd = item.quantidade + quantidade;
            return {
              ...item,
              quantidade: novaQtd,
              subtotal: novaQtd * item.preco_unitario,
            };
          }
          return item;
        });
      } else {
        const novoItem: ItemVenda = {
          id: `itv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          venda_id: prev.id,
          grade_id: grade.id,
          produto_id: produto.id,
          produto_nome: produto.nome,
          tamanho: grade.tamanho,
          cor: grade.cor,
          sku: grade.sku,
          codigo_barras: grade.codigo_barras,
          preco_unitario: produto.preco_venda,
          preco_custo_unitario: produto.preco_custo,
          quantidade: quantidade,
          subtotal: produto.preco_venda * quantidade,
        };
        novosItens = [...prev.itens, novoItem];
      }

      const novoSubtotal = novosItens.reduce((acc, curr) => acc + curr.subtotal, 0);
      const novoTotal = Math.max(0, novoSubtotal - prev.desconto + prev.acrescimo);

      return {
        ...prev,
        status: 'em_aberto', // Garante que continua EM ABERTO
        itens: novosItens,
        subtotal: novoSubtotal,
        total: novoTotal,
      };
    });

    return { success: true };
  };

  const removerItemVendaAtual = (itemId: string) => {
    const item = vendaAtual.itens.find(i => i.id === itemId);
    if (!item) return;

    // ESTORNO IMEDIATO PARA O ESTOQUE
    ajustarEstoqueGrade(item.grade_id, +item.quantidade, 0);

    setVendaAtual(prev => {
      const novosItens = prev.itens.filter(i => i.id !== itemId);
      const novoSubtotal = novosItens.reduce((acc, curr) => acc + curr.subtotal, 0);
      const novoTotal = Math.max(0, novoSubtotal - prev.desconto + prev.acrescimo);

      return {
        ...prev,
        itens: novosItens,
        subtotal: novoSubtotal,
        total: novoTotal,
      };
    });
  };

  const alterarQuantidadeItemVendaAtual = (
    itemId: string,
    novaQtd: number
  ): { success: boolean; message?: string } => {
    const item = vendaAtual.itens.find(i => i.id === itemId);
    if (!item) return { success: false, message: 'Item não encontrado.' };

    if (novaQtd <= 0) {
      removerItemVendaAtual(itemId);
      return { success: true };
    }

    const delta = novaQtd - item.quantidade; // se delta > 0 precisa de mais estoque; se < 0 devolve estoque

    if (delta > 0) {
      // Verificar se há estoque disponível
      let disp = 0;
      for (const prod of produtos) {
        const g = prod.grades.find(gr => gr.id === item.grade_id);
        if (g) {
          disp = g.estoque_disponivel;
          break;
        }
      }
      if (disp < delta) {
        return {
          success: false,
          message: `Estoque insuficiente! Disponível em loja: ${disp} un.`,
        };
      }
      ajustarEstoqueGrade(item.grade_id, -delta, 0);
    } else if (delta < 0) {
      // Devolve a sobra ao estoque
      ajustarEstoqueGrade(item.grade_id, Math.abs(delta), 0);
    }

    setVendaAtual(prev => {
      const novosItens = prev.itens.map(i => {
        if (i.id === itemId) {
          return {
            ...i,
            quantidade: novaQtd,
            subtotal: novaQtd * i.preco_unitario,
          };
        }
        return i;
      });
      const novoSubtotal = novosItens.reduce((acc, curr) => acc + curr.subtotal, 0);
      const novoTotal = Math.max(0, novoSubtotal - prev.desconto + prev.acrescimo);

      return {
        ...prev,
        itens: novosItens,
        subtotal: novoSubtotal,
        total: novoTotal,
      };
    });

    return { success: true };
  };

  const cancelarVendaAtual = () => {
    // ESTORNA TODOS OS ITENS DE VOLTA AO ESTOQUE
    vendaAtual.itens.forEach(item => {
      ajustarEstoqueGrade(item.grade_id, +item.quantidade, 0);
    });

    // Cria nova venda em branco
    setVendaAtual(createEmptyVenda());
  };

  const vincularClienteVendaAtual = (cliente: Cliente | null) => {
    setVendaAtual(prev => ({
      ...prev,
      cliente_id: cliente ? cliente.id : undefined,
      cliente_nome: cliente ? cliente.nome : 'Consumidor Balcão',
      cliente_whatsapp: cliente ? cliente.whatsapp : undefined,
    }));
  };

  const finalizarVendaAtual = (
    formaPagamento: FormaPagamento,
    parcelas?: ParcelaCrediario[],
    desconto: number = 0,
    acrescimo: number = 0,
    observacoes?: string
  ): { success: boolean; vendaFinalizada?: Venda; message?: string } => {
    if (vendaAtual.itens.length === 0) {
      return { success: false, message: 'Sacola vazia! Adicione itens para finalizar a venda.' };
    }

    if (formaPagamento === 'crediario' && !vendaAtual.cliente_id) {
      return {
        success: false,
        message: 'Para vender no Crediário da Loja, selecione ou cadastre o cliente!',
      };
    }

    const subtotal = vendaAtual.itens.reduce((acc, curr) => acc + curr.subtotal, 0);
    const totalFinal = Math.max(0, subtotal - desconto + acrescimo);

    // Crediário livre para qualquer cliente selecionado
    if (formaPagamento === 'crediario' && !vendaAtual.cliente_id) {
      return {
        success: false,
        message: 'Para vender no Crediário da Loja, selecione o cliente cadastrado!',
      };
    }

    const vendaConcluida: Venda = {
      ...vendaAtual,
      subtotal,
      desconto,
      acrescimo,
      total: totalFinal,
      status: 'finalizada', // Muda para FINALIZADA
      forma_pagamento: formaPagamento,
      parcelas: parcelas || [],
      observacoes,
      finalizada_em: new Date().toISOString(),
    };

    // Note: Stock was ALREADY deducted when item was added to bag! So no double deduction.
    setVendas(prev => [vendaConcluida, ...prev]);

    // Reseta a comanda do PDV
    setVendaAtual(createEmptyVenda());

    return { success: true, vendaFinalizada: vendaConcluida };
  };

  // ==========================================
  // GESTÃO DE CONDICIONAL (CONSIGNADO)
  // ==========================================

  const criarCondicional = (
    clienteId: string,
    itensSelecionados: { gradeId: string; quantidade: number }[],
    dataPrevistaDevolucao: string,
    observacoes?: string
  ): { success: boolean; message?: string; condicional?: Condicional } => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return { success: false, message: 'Cliente não encontrado' };
    if (itensSelecionados.length === 0) return { success: false, message: 'Selecione ao menos 1 peça' };

    // Verificar estoque disponível de cada item
    for (const itemSel of itensSelecionados) {
      let gradeEncontrada: ProdutoGrade | undefined;
      for (const prod of produtos) {
        const g = prod.grades.find(gr => gr.id === itemSel.gradeId);
        if (g) {
          gradeEncontrada = g;
          break;
        }
      }
      if (!gradeEncontrada || gradeEncontrada.estoque_disponivel < itemSel.quantidade) {
        return {
          success: false,
          message: `Estoque indisponível para o item selecionado!`,
        };
      }
    }

    const condicionalId = `cnd-${Date.now()}`;
    const codigoCond = `CND-${Math.floor(1000 + Math.random() * 9000)}`;
    const novosItensCond: ItemCondicional[] = [];
    let totalEstimado = 0;

    // Baixa do estoque disponível e move para estoque_condicional
    for (const itemSel of itensSelecionados) {
      let prodRef: Produto | undefined;
      let gradeRef: ProdutoGrade | undefined;
      for (const prod of produtos) {
        const g = prod.grades.find(gr => gr.id === itemSel.gradeId);
        if (g) {
          prodRef = prod;
          gradeRef = g;
          break;
        }
      }
      if (prodRef && gradeRef) {
        ajustarEstoqueGrade(gradeRef.id, -itemSel.quantidade, +itemSel.quantidade);
        const itemCond: ItemCondicional = {
          id: `itc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          condicional_id: condicionalId,
          grade_id: gradeRef.id,
          produto_id: prodRef.id,
          produto_nome: prodRef.nome,
          tamanho: gradeRef.tamanho,
          cor: gradeRef.cor,
          sku: gradeRef.sku,
          preco_unitario: prodRef.preco_venda,
          quantidade: itemSel.quantidade,
          status: 'em_condicional',
        };
        novosItensCond.push(itemCond);
        totalEstimado += itemCond.preco_unitario * itemCond.quantidade;
      }
    }

    const novaCond: Condicional = {
      id: condicionalId,
      codigo_condicional: codigoCond,
      cliente_id: cliente.id,
      cliente_nome: cliente.nome,
      cliente_whatsapp: cliente.whatsapp,
      data_retirada: new Date().toISOString(),
      data_prevista_devolucao: dataPrevistaDevolucao,
      status: 'ativa',
      observacoes,
      itens: novosItensCond,
      total_estimado: totalEstimado,
    };

    setCondicionais(prev => [novaCond, ...prev]);
    return { success: true, condicional: novaCond };
  };

  const acertarCondicional = (
    condicionalId: string,
    decisoes: { itemId: string; acao: 'comprar' | 'devolver' }[],
    formaPagamento: FormaPagamento = 'pix',
    parcelas?: ParcelaCrediario[]
  ): { success: boolean; message?: string; vendaGerada?: Venda } => {
    const cond = condicionais.find(c => c.id === condicionalId);
    if (!cond) return { success: false, message: 'Condicional não encontrada' };

    const itensParaVenda: ItemVenda[] = [];
    const agora = new Date().toISOString();

    const itensAtualizados = cond.itens.map(item => {
      const decisao = decisoes.find(d => d.itemId === item.id);
      if (!decisao) return item;

      if (decisao.acao === 'devolver') {
        // Devolve ao estoque disponível e remove do condicional
        ajustarEstoqueGrade(item.grade_id, +item.quantidade, -item.quantidade);
        return {
          ...item,
          status: 'devolvido' as const,
          devolvido_em: agora,
        };
      } else {
        // Cliente comprou: baixa do estoque_condicional (já não está no disponível)
        ajustarEstoqueGrade(item.grade_id, 0, -item.quantidade);

        // Achar dados do produto para custo
        let precoCusto = 0;
        let codigoBarras = '';
        for (const p of produtos) {
          const g = p.grades.find(gr => gr.id === item.grade_id);
          if (g) {
            precoCusto = p.preco_custo;
            codigoBarras = g.codigo_barras;
            break;
          }
        }

        itensParaVenda.push({
          id: `itv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          venda_id: '',
          grade_id: item.grade_id,
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          tamanho: item.tamanho,
          cor: item.cor,
          sku: item.sku,
          codigo_barras: codigoBarras,
          preco_unitario: item.preco_unitario,
          preco_custo_unitario: precoCusto,
          quantidade: item.quantidade,
          subtotal: item.preco_unitario * item.quantidade,
        });

        return {
          ...item,
          status: 'vendido' as const,
          vendido_em: agora,
        };
      }
    });

    let vendaGerada: Venda | undefined;

    // Se houve itens comprados, gera a venda formal
    if (itensParaVenda.length > 0) {
      const subtotalVenda = itensParaVenda.reduce((acc, curr) => acc + curr.subtotal, 0);
      const vendaId = `vnd-${Date.now()}`;
      
      const itensComVendaId = itensParaVenda.map(it => ({ ...it, venda_id: vendaId }));

      // Ajusta parcelas se for crediário
      const parcelasFinal: ParcelaCrediario[] = (parcelas || []).map(p => ({
        ...p,
        venda_id: vendaId,
      }));

      vendaGerada = {
        id: vendaId,
        codigo_venda: `VND-CND-${Math.floor(1000 + Math.random() * 9000)}`,
        cliente_id: cond.cliente_id,
        cliente_nome: cond.cliente_nome,
        cliente_whatsapp: cond.cliente_whatsapp,
        data_venda: agora,
        status: 'finalizada',
        subtotal: subtotalVenda,
        desconto: 0,
        acrescimo: 0,
        total: subtotalVenda,
        forma_pagamento: formaPagamento,
        itens: itensComVendaId,
        parcelas: parcelasFinal,
        observacoes: `Convertido a partir da Condicional ${cond.codigo_condicional}`,
        finalizada_em: agora,
      };

      setVendas(prev => [vendaGerada!, ...prev]);
    }

    const todosDevolvidos = itensAtualizados.every(i => i.status === 'devolvido');
    const todosVendidos = itensAtualizados.every(i => i.status === 'vendido');
    const novoStatus: StatusCondicional = todosDevolvidos
      ? 'devolvida'
      : todosVendidos
      ? 'convertida'
      : 'parcial';

    setCondicionais(prev =>
      prev.map(c =>
        c.id === condicionalId
          ? {
              ...c,
              status: novoStatus,
              itens: itensAtualizados,
              venda_id: vendaGerada?.id || c.venda_id,
            }
          : c
      )
    );

    return { success: true, vendaGerada };
  };

  // ==========================================
  // CREDIÁRIO: BAIXA DE PARCELA
  // ==========================================

  const baixarParcelaCrediario = (
    parcelaId: string,
    valorPago: number
  ): { success: boolean; message?: string } => {
    let parcelaEncontrada = false;

    setVendas(prevVendas =>
      prevVendas.map(venda => {
        if (!venda.parcelas || venda.parcelas.length === 0) return venda;

        const parcelasAtualizadas = venda.parcelas.map(p => {
          if (p.id === parcelaId) {
            parcelaEncontrada = true;
            const novoValorPago = (p.valor_pago || 0) + valorPago;
            const estaQuitada = novoValorPago >= p.valor;
            return {
              ...p,
              valor_pago: novoValorPago,
              status: (estaQuitada ? 'pago' : 'parcial') as ParcelaCrediario['status'],
              data_pagamento: estaQuitada ? new Date().toISOString().split('T')[0] : p.data_pagamento,
            };
          }
          return p;
        });

        return {
          ...venda,
          parcelas: parcelasAtualizadas,
        };
      })
    );

    if (!parcelaEncontrada) {
      return { success: false, message: 'Parcela não encontrada.' };
    }

    return { success: true, message: 'Pagamento de crediário registrado com sucesso!' };
  };

  // Financeiro
  const adicionarContaPagar = (contaData: Omit<ContaPagar, 'id'>) => {
    const novaConta: ContaPagar = {
      ...contaData,
      id: `cp-${Date.now()}`,
    };
    setContasPagar(prev => [novaConta, ...prev]);
  };

  const pagarContaPagar = (contaId: string) => {
    setContasPagar(prev =>
      prev.map(c =>
        c.id === contaId
          ? {
              ...c,
              status: 'pago',
              data_pagamento: new Date().toISOString().split('T')[0],
            }
          : c
      )
    );
  };

  const restaurarDadosPadrao = () => {
    localStorage.removeItem(getStorageKey('produtos'));
    localStorage.removeItem(getStorageKey('clientes'));
    localStorage.removeItem(getStorageKey('fornecedores'));
    localStorage.removeItem(getStorageKey('condicionais'));
    localStorage.removeItem(getStorageKey('vendas'));
    localStorage.removeItem(getStorageKey('contas_pagar'));
    localStorage.removeItem(getStorageKey('venda_atual'));

    setProdutos(INITIAL_PRODUTOS);
    setClientes(INITIAL_CLIENTES);
    setFornecedores(INITIAL_FORNECEDORES);
    setCondicionais(INITIAL_CONDICIONAIS);
    setVendas(INITIAL_VENDAS);
    setContasPagar(INITIAL_CONTAS_PAGAR);
    setVendaAtual(createEmptyVenda());
  };

  return (
    <StoreContext.Provider
      value={{
        produtos,
        clientes,
        fornecedores,
        condicionais,
        vendas,
        contasPagar,
        contasReceber,
        vendaAtual,
        categorias,
        adicionarProduto,
        atualizarProduto,
        excluirProduto,
        adicionarCliente,
        atualizarCliente,
        excluirCliente,
        adicionarFornecedor,
        atualizarFornecedor,
        excluirFornecedor,
        adicionarCategoria,
        editarCategoria,
        excluirCategoria,
        adicionarItemVendaAtual,
        removerItemVendaAtual,
        alterarQuantidadeItemVendaAtual,
        cancelarVendaAtual,
        vincularClienteVendaAtual,
        finalizarVendaAtual,
        criarCondicional,
        acertarCondicional,
        baixarParcelaCrediario,
        adicionarContaPagar,
        pagarContaPagar,
        restaurarDadosPadrao,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
