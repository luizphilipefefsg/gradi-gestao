import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Tag,
  Search,
  Printer,
  Download,
  Plus,
  Minus,
  Trash2,
  Check,
  X,
  Package,
  Barcode,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Produto, ProdutoGrade } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { renderBarcodeToSvg } from '../../utils/barcode';
import {
  gerarPdfEtiquetas,
  formatarTextoEtiqueta,
  ModeloPdfConfig,
  ItemEtiquetaPdf,
} from '../../utils/labelPdf';

export type ModeloEtiquetaId =
  | 'a4_a4351'
  | 'a4_6187'
  | 'a4_a4349'
  | 'a4_ebf23'
  | 'termica_50x30'
  | 'termica_80x40';

export interface ModeloConfig extends ModeloPdfConfig {
  id: ModeloEtiquetaId;
}

export const MODELOS_CONFIG: ModeloConfig[] = [
  {
    id: 'a4_a4351',
    label: 'Pimaco A4351 (65 etiquetas/folha • 38,1 x 21,2 mm)',
    tipo: 'folha_a4',
    colunas: 5,
    etiquetasPorFolha: 65,
    larguraMm: 38.1,
    alturaMm: 21.2,
    gapXMm: 2.5,
    gapYMm: 0.0,
    margemSuperiorMm: 10.70,
    margemEsquerdaMm: 5.50,
    descricao: '5 colunas × 13 linhas — Padrão oficial vestuário (Medidas exatas do PDF)',
  },
  {
    id: 'a4_6187',
    label: 'Pimaco/Maxprint 6187 (80 etiquetas/folha • 48,2 x 12,7 mm)',
    tipo: 'folha_a4',
    colunas: 4,
    etiquetasPorFolha: 80,
    larguraMm: 48.2,
    alturaMm: 12.7,
    gapXMm: 0.0,
    gapYMm: 0.0,
    margemSuperiorMm: 10.70,
    margemEsquerdaMm: 8.60,
    descricao: '4 colunas × 20 linhas',
  },
  {
    id: 'a4_a4349',
    label: 'Pimaco A4349 (126 mini etiquetas • 25,4 x 12,7 mm)',
    tipo: 'folha_a4',
    colunas: 7,
    etiquetasPorFolha: 126,
    larguraMm: 25.4,
    alturaMm: 12.7,
    gapXMm: 0.0,
    gapYMm: 0.0,
    margemSuperiorMm: 34.20,
    margemEsquerdaMm: 16.10,
    descricao: '7 colunas × 18 linhas mini',
  },
  {
    id: 'a4_ebf23',
    label: 'Singularis EBF23 (40 etiquetas anel/acessórios)',
    tipo: 'folha_a4',
    colunas: 4,
    etiquetasPorFolha: 40,
    larguraMm: 48.2,
    alturaMm: 25.4,
    gapXMm: 0.0,
    gapYMm: 0.0,
    margemSuperiorMm: 21.50,
    margemEsquerdaMm: 8.60,
    descricao: '4 colunas × 10 linhas para bijuterias/tags',
  },
  {
    id: 'termica_50x30',
    label: 'Bobina Térmica 50x30 mm (Zebra / Elgin / Argox)',
    tipo: 'termica',
    colunas: 1,
    etiquetasPorFolha: 1,
    larguraMm: 50,
    alturaMm: 30,
    descricao: 'Rolo contínuo 1 coluna',
  },
  {
    id: 'termica_80x40',
    label: 'Bobina Térmica 80x40 mm (Grande)',
    tipo: 'termica',
    colunas: 1,
    etiquetasPorFolha: 1,
    larguraMm: 80,
    alturaMm: 40,
    descricao: 'Rolo contínuo grande',
  },
];

export interface ItemFilaEtiqueta {
  id: string; // grade.id
  produtoId: string;
  produtoNome: string;
  referencia: string;
  categoria: string;
  precoVenda: number;
  grade: ProdutoGrade;
  copias: number;
}

export const EtiquetasScreen: React.FC = () => {
  const { produtos, categorias } = useStore();

  // Estados principais
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');
  const [modeloSelecionado, setModeloSelecionado] = useState<ModeloEtiquetaId>('a4_a4351');
  const [etiquetasVaziasNaFila, setEtiquetasVaziasNaFila] = useState<number>(0);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [apenasSelecionados, setApenasSelecionados] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mapa de quantidades por grade.id (inicia vazio para tela limpa)
  const [fila, setFila] = useState<{ [gradeId: string]: number }>({});

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const configAtual =
    MODELOS_CONFIG.find(m => m.id === modeloSelecionado) || MODELOS_CONFIG[0];

  // Auto-foco e Listener Global para Leitor de Código de Barras (funciona sem clicar no campo)
  useEffect(() => {
    searchInputRef.current?.focus();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');

      if (e.key === 'Enter') {
        const query = busca.trim().toLowerCase();
        if (query) {
          // Procura variação por código de barras ou SKU
          for (const prod of produtos) {
            const g = prod.grades.find(
              grade =>
                grade.codigo_barras.toLowerCase() === query ||
                grade.sku.toLowerCase() === query
            );
            if (g) {
              setCopiasGrade(g.id, (fila[g.id] || 0) + 1);
              showToast(`+1 etiqueta adicionada: ${prod.nome} (${g.tamanho})`);
              setBusca('');
              e.preventDefault();
              searchInputRef.current?.focus();
              return;
            }
          }
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (!isInput) {
          searchInputRef.current?.focus();
          setBusca(prev => prev + e.key);
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [busca, produtos, fila]);

  // Filtra produtos sob demanda: aparecem apenas quando o usuário digita as letras na pesquisa
  const termo = busca.trim().toLowerCase();
  const produtosFiltrados = useMemo(() => {
    // Se não houver busca digitada e não estiver filtrando os itens da fila, não lista nada antecipadamente
    if (!termo && !apenasSelecionados) {
      return [];
    }

    return produtos.filter(prod => {
      const matchCat =
        categoriaAtiva === 'Todas' ||
        prod.categoria.toLowerCase() === categoriaAtiva.toLowerCase();

      if (!matchCat) return false;

      if (!termo) {
        if (apenasSelecionados) {
          return prod.grades.some(g => (fila[g.id] || 0) > 0);
        }
        return false;
      }

      const matchNome = prod.nome.toLowerCase().includes(termo);
      const matchRef = prod.referencia.toLowerCase().includes(termo);
      const matchCatText = prod.categoria.toLowerCase().includes(termo);
      const matchGrade = prod.grades.some(
        g =>
          g.tamanho.toLowerCase().includes(termo) ||
          g.cor.toLowerCase().includes(termo) ||
          g.sku.toLowerCase().includes(termo) ||
          g.codigo_barras.includes(termo)
      );

      const matches = matchNome || matchRef || matchCatText || matchGrade;
      if (apenasSelecionados) {
        return matches && prod.grades.some(g => (fila[g.id] || 0) > 0);
      }
      return matches;
    });
  }, [produtos, categoriaAtiva, termo, apenasSelecionados, fila]);

  // Lista consolidada de itens na fila
  const itensFila: ItemFilaEtiqueta[] = useMemo(() => {
    const list: ItemFilaEtiqueta[] = [];
    produtos.forEach(prod => {
      prod.grades.forEach(g => {
        const copias = fila[g.id] || 0;
        if (copias > 0) {
          list.push({
            id: g.id,
            produtoId: prod.id,
            produtoNome: prod.nome,
            referencia: prod.referencia,
            categoria: prod.categoria,
            precoVenda: prod.preco_venda,
            grade: g,
            copias,
          });
        }
      });
    });
    return list;
  }, [produtos, fila]);

  const totalEtiquetasProdutos = useMemo(() => {
    return Object.values(fila).reduce((acc, qty) => acc + qty, 0);
  }, [fila]);

  const totalEtiquetas = totalEtiquetasProdutos + etiquetasVaziasNaFila;

  const totalFolhasNecessarias = useMemo(() => {
    if (configAtual.tipo === 'termica') return totalEtiquetasProdutos;
    const totalSlots = totalEtiquetasProdutos + etiquetasVaziasNaFila;
    return Math.max(1, Math.ceil(totalSlots / configAtual.etiquetasPorFolha));
  }, [totalEtiquetasProdutos, etiquetasVaziasNaFila, configAtual]);

  // Modificadores de quantidade
  const setCopiasGrade = (gradeId: string, quantidade: number) => {
    setFila(prev => {
      const next = { ...prev };
      if (quantidade <= 0) {
        delete next[gradeId];
      } else {
        next[gradeId] = quantidade;
      }
      return next;
    });
  };

  const alterarCopias = (gradeId: string, delta: number) => {
    const atual = fila[gradeId] || 0;
    setCopiasGrade(gradeId, Math.max(0, atual + delta));
  };

  // Função simples para adicionar/remover etiquetas vazias na folha
  const alterarEtiquetasVaziasFila = (delta: number) => {
    setEtiquetasVaziasNaFila(prev => {
      const nextVal = Math.max(0, prev + delta);
      if (delta > 0) {
        showToast(`+${delta} etiqueta vazia adicionada (${nextVal} no total)`);
      } else if (nextVal === 0) {
        showToast('Etiquetas vazias removidas');
      }
      return nextVal;
    });
  };

  // Preenche a quantidade de cada variação conforme o estoque real
  const preencherConformeEstoque = () => {
    const next: { [gradeId: string]: number } = {};
    produtos.forEach(p => {
      p.grades.forEach(g => {
        if (g.estoque_disponivel > 0) {
          next[g.id] = g.estoque_disponivel;
        }
      });
    });
    setFila(next);
    showToast('Quantidade ajustada conforme o estoque atual!');
  };

  // 1 cópia para cada variação cadastrada no sistema
  const preencherUmaCopiaTudo = () => {
    const next: { [gradeId: string]: number } = {};
    produtos.forEach(p => {
      p.grades.forEach(g => {
        next[g.id] = 1;
      });
    });
    setFila(next);
    showToast('1 etiqueta definida para todas as variações!');
  };

  const limparFila = () => {
    setFila({});
    setEtiquetasVaziasNaFila(0);
    showToast('Seleção limpa.');
  };

  const adicionarTodasDoProduto = (prod: Produto) => {
    setFila(prev => {
      const next = { ...prev };
      prod.grades.forEach(g => {
        next[g.id] = (next[g.id] || 0) + 1;
      });
      return next;
    });
  };

  // Gerar e Baixar PDF com gabarito oficial e suporte a posições vazias no início
  const handleBaixarPdf = async () => {
    if (totalEtiquetasProdutos === 0 && etiquetasVaziasNaFila === 0) return;
    setGerandoPdf(true);
    try {
      const itensPdf: ItemEtiquetaPdf[] = [];

      // 1. Inserir etiquetas vazias no início para pular posições já utilizadas na folha
      if (etiquetasVaziasNaFila > 0) {
        itensPdf.push({
          produtoNome: '__ESPACO_VAZIO__',
          referencia: '',
          categoria: '',
          precoVenda: 0,
          grade: {
            tamanho: '',
            cor: '',
            sku: '',
            codigo_barras: '',
          },
          copias: etiquetasVaziasNaFila,
          selecionado: true,
          isVazia: true,
        });
      }

      // 2. Inserir etiquetas dos produtos selecionados
      itensFila.forEach(it => {
        itensPdf.push({
          produtoNome: it.produtoNome,
          referencia: it.referencia,
          categoria: it.categoria,
          precoVenda: it.precoVenda,
          grade: {
            tamanho: it.grade.tamanho,
            cor: it.grade.cor,
            sku: it.grade.sku,
            codigo_barras: it.grade.codigo_barras,
          },
          copias: it.copias,
          selecionado: true,
          isVazia: false,
        });
      });

      const doc = await gerarPdfEtiquetas(
        itensPdf,
        configAtual,
        1,
        true
      );

      const hoje = new Date().toISOString().split('T')[0];
      doc.save(`etiquetas-${configAtual.id}-${hoje}.pdf`);
      showToast('PDF baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF de etiquetas:', err);
      showToast('Erro ao gerar PDF.');
    } finally {
      setGerandoPdf(false);
    }
  };

  // Imprimir diretamente
  const handleImprimir = async () => {
    await handleBaixarPdf();
    setTimeout(() => {
      window.print();
    }, 450);
  };

  // Amostra para pré-visualização ao vivo
  const itemPreview = itensFila[0] || (produtos[0]?.grades[0]
    ? {
        produtoNome: produtos[0].nome,
        grade: produtos[0].grades[0],
        precoVenda: produtos[0].preco_venda,
      }
    : null);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Toast Notificação */}
      {toastMsg && (
        <div className="fixed top-18 right-6 z-50 bg-slate-900 text-white px-3.5 py-2 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Topo Limpo: Título da Tela e Ações Rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-[#280F4D] tracking-tight">Impressão de Etiquetas</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecione os produtos, ajuste as quantidades e imprima em folha Pimaco ou bobina térmica.
          </p>
        </div>

        {/* Controles de Configuração e Impressão Compactos */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Modelo */}
          <select
            value={modeloSelecionado}
            onChange={e => {
              setModeloSelecionado(e.target.value as ModeloEtiquetaId);
            }}
            className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-hidden focus:border-[#280F4D] cursor-pointer"
          >
            {MODELOS_CONFIG.map(m => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Botão Único para Ir Adicionando Etiqueta Vazia */}
          {configAtual.tipo !== 'termica' && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => alterarEtiquetasVaziasFila(1)}
                className={`h-9 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 ${
                  etiquetasVaziasNaFila > 0
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                    : 'bg-purple-50 hover:bg-purple-100 text-[#280F4D] border border-purple-200'
                }`}
                title="Clique para adicionar etiqueta vazia e pular espaço na folha"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Etiqueta Vazia</span>
                {etiquetasVaziasNaFila > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-[#280F4D] text-white rounded-full text-[10px] font-black">
                    {etiquetasVaziasNaFila}
                  </span>
                )}
              </button>

              {etiquetasVaziasNaFila > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setEtiquetasVaziasNaFila(0);
                    showToast('Espaços vazios removidos');
                  }}
                  className="h-9 px-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold border border-rose-200 transition-colors cursor-pointer"
                  title="Zerar etiquetas vazias"
                >
                  Limpar
                </button>
              )}
            </div>
          )}

          {/* Botão Baixar PDF */}
          <button
            type="button"
            onClick={handleBaixarPdf}
            disabled={totalEtiquetas === 0 || gerandoPdf}
            className="h-9 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 disabled:opacity-40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Baixar arquivo PDF da folha para salvar no computador"
          >
            {gerandoPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#280F4D]" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>PDF</span>
          </button>

          {/* Botão Imprimir Principal */}
          <button
            type="button"
            onClick={handleImprimir}
            disabled={totalEtiquetas === 0 || gerandoPdf}
            className="h-9 px-4 bg-[#280F4D] hover:bg-[#39156e] active:scale-95 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir ({totalEtiquetas})</span>
          </button>
        </div>
      </div>



      {/* Layout Principal: 2 Colunas Limpas (Lista 8 cols / Painel Resumo 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ========================================================= */}
        {/* COLUNA ESQUERDA: Barra de Busca + Tabela Simples de Peças */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 space-y-3">
          {/* Barra de Pesquisa Estilo PDV & Ações Rápidas */}
          <div className="bg-white rounded-xl p-3 border border-purple-100 shadow-2xs space-y-2.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  autoFocus
                  type="text"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Pesquisar por peça, referência, tamanho ou código de barras..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-hidden focus:border-[#280F4D] focus:bg-white font-medium"
                />
                {busca && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusca('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Botão toggle para ver apenas os selecionados */}
              <button
                type="button"
                onClick={() => setApenasSelecionados(!apenasSelecionados)}
                className={`h-9 px-3 rounded-lg text-xs font-semibold shrink-0 transition-colors border cursor-pointer ${
                  apenasSelecionados
                    ? 'bg-purple-100 border-purple-300 text-[#280F4D]'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title="Exibir somente as peças que já têm etiquetas selecionadas"
              >
                Na Fila ({itensFila.length})
              </button>
            </div>

            {/* Categorias e Ações Rápidas em linha única */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
              {/* Chips de Categoria */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setCategoriaAtiva('Todas')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                    categoriaAtiva === 'Todas'
                      ? 'bg-[#280F4D] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas ({produtos.length})
                </button>
                {categorias.map(cat => {
                  const count = produtos.filter(
                    p => p.categoria.toLowerCase() === cat.toLowerCase()
                  ).length;
                  if (count === 0) return null;
                  const isSel = categoriaAtiva.toLowerCase() === cat.toLowerCase();
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategoriaAtiva(cat);
                        searchInputRef.current?.focus();
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                        isSel
                          ? 'bg-[#280F4D] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Ações Rápidas de Seleção */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={preencherConformeEstoque}
                  className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-[#280F4D] rounded font-semibold text-[11px] transition-colors cursor-pointer"
                  title="Define as quantidades com base no estoque de cada peça"
                >
                  Conforme Estoque
                </button>
                <button
                  type="button"
                  onClick={preencherUmaCopiaTudo}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                  title="Adiciona 1 etiqueta para cada variação"
                >
                  1 de Cada
                </button>
                {totalEtiquetas > 0 && (
                  <button
                    type="button"
                    onClick={limparFila}
                    className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                  >
                    Zerar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Lista Simples e Direta dos Produtos (aparecem apenas ao digitar na pesquisa) */}
          <div className="bg-white rounded-xl border border-purple-100 shadow-2xs overflow-hidden">
            {!termo && !apenasSelecionados ? (
              <div className="p-8 sm:p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#280F4D] flex items-center justify-center mx-auto">
                  <Search className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    Comece a digitar para pesquisar os produtos
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Digite o nome da peça, referência (ex: Ref), tamanho ou bipe o código de barras no leitor.
                  </p>
                </div>

                {/* Atalhos rápidos de clique */}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 text-xs">
                  <span className="text-[11px] text-slate-400">Sugestões rápidas:</span>
                  {produtos.slice(0, 4).map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setBusca(p.nome)}
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-[#280F4D] rounded-lg font-medium text-xs transition-colors cursor-pointer"
                    >
                      {p.nome}
                    </button>
                  ))}
                </div>
              </div>
            ) : produtosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                <Package className="w-7 h-7 mx-auto text-slate-300 mb-1" />
                <p className="font-semibold text-slate-600">Nenhum produto encontrado</p>
                <p className="text-[11px]">
                  {termo
                    ? `Nenhum resultado encontrado para "${busca}".`
                    : 'Nenhuma peça com etiqueta selecionada na fila.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {produtosFiltrados.map(prod => {
                  const totalProdutoNaFila = prod.grades.reduce(
                    (acc, g) => acc + (fila[g.id] || 0),
                    0
                  );

                  return (
                    <div
                      key={prod.id}
                      className={`p-3 transition-colors ${
                        totalProdutoNaFila > 0 ? 'bg-purple-50/25' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Linha Resumo do Produto */}
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {prod.nome}
                          </span>
                          <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            Ref: {prod.referencia}
                          </span>
                          <span className="text-xs font-bold text-emerald-700">
                            {formatCurrency(prod.preco_venda)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => adicionarTodasDoProduto(prod)}
                          className="text-[11px] text-[#280F4D] hover:underline font-semibold shrink-0 cursor-pointer"
                          title="Adiciona 1 etiqueta para cada tamanho deste produto"
                        >
                          +1 em todos os tam.
                        </button>
                      </div>

                      {/* Grades / Tamanhos do Produto em Linha Leve */}
                      <div className="flex flex-wrap items-center gap-2">
                        {prod.grades.map(g => {
                          const copias = fila[g.id] || 0;
                          const selecionado = copias > 0;

                          return (
                            <div
                              key={g.id}
                              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs transition-all ${
                                selecionado
                                  ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold shadow-2xs'
                                  : 'bg-slate-50/70 border-slate-200 text-slate-700'
                              }`}
                            >
                              {/* Identificação do Tamanho e Estoque */}
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold">Tam: {g.tamanho}</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({g.estoque_disponivel} un)
                                </span>
                              </div>

                              {/* Controle Numérico Leve de Cópias */}
                              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded p-0.5 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => alterarCopias(g.id, -1)}
                                  disabled={copias === 0}
                                  className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  max="999"
                                  value={copias}
                                  onChange={e =>
                                    setCopiasGrade(g.id, Math.max(0, parseInt(e.target.value) || 0))
                                  }
                                  className="w-7 text-center font-bold text-xs bg-transparent border-0 outline-hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() => alterarCopias(g.id, 1)}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-[#280F4D] text-white hover:bg-[#39156e] cursor-pointer"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUNA DIREITA: Fila Resumida & Pré-visualização da Etiqueta */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-3">
          {/* Card Resumo da Fila */}
          <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Fila de Impressão
                </span>
                {configAtual.tipo !== 'termica' && (
                  <button
                    type="button"
                    onClick={() => alterarEtiquetasVaziasFila(1)}
                    className="text-[10px] text-[#280F4D] hover:underline font-bold flex items-center gap-0.5 cursor-pointer ml-1"
                    title="Adicionar etiqueta vazia para criar espaço na folha"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>+ Vazia</span>
                  </button>
                )}
              </div>
              <span className="text-xs font-bold text-[#280F4D]">
                {totalEtiquetas} {totalEtiquetas === 1 ? 'etiqueta' : 'etiquetas'}
              </span>
            </div>



            {/* Informações de Folha */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-500 block">Total a Imprimir</span>
                <span className="text-base font-black text-slate-900">{totalEtiquetas}</span>
              </div>
              <div className="bg-purple-50/60 p-2.5 rounded-lg">
                <span className="text-[10px] text-purple-700 block">
                  {configAtual.tipo === 'termica' ? 'Etiquetas Bobina' : 'Folhas Necessárias'}
                </span>
                <span className="text-base font-black text-[#280F4D]">
                  {totalFolhasNecessarias} {totalFolhasNecessarias === 1 ? 'folha' : 'folhas'}
                </span>
              </div>
            </div>

            {/* Lista Compacta de Itens na Fila (com suporte a etiquetas vazias) */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
              {/* Item de Etiquetas Vazias adicionadas para aproveitar a folha */}
              {etiquetasVaziasNaFila > 0 && (
                <div className="pt-1.5 pb-0.5 flex items-center justify-between text-xs bg-amber-50/60 p-2 rounded-lg border border-dashed border-amber-300">
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-amber-900 truncate flex items-center gap-1">
                      <span>Etiqueta Vazia (Espaço em Branco)</span>
                    </div>
                    <div className="text-[11px] text-amber-700">
                      Pula {etiquetasVaziasNaFila} {etiquetasVaziasNaFila === 1 ? 'posição' : 'posições'} para aproveitar a folha
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1 bg-white border border-amber-300 rounded p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => alterarEtiquetasVaziasFila(-1)}
                        className="w-4 h-4 flex items-center justify-center rounded text-amber-800 hover:bg-amber-50 cursor-pointer font-bold"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-bold text-xs text-amber-950">
                        {etiquetasVaziasNaFila}x
                      </span>
                      <button
                        type="button"
                        onClick={() => alterarEtiquetasVaziasFila(1)}
                        className="w-4 h-4 flex items-center justify-center rounded bg-amber-600 text-white hover:bg-amber-700 cursor-pointer font-bold"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEtiquetasVaziasNaFila(0)}
                      className="text-amber-700 hover:text-rose-600 p-0.5 cursor-pointer"
                      title="Remover espaços vazios"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {itensFila.length === 0 && etiquetasVaziasNaFila === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  Nenhuma etiqueta selecionada ainda.
                </div>
              ) : (
                itensFila.map(it => (
                  <div key={it.id} className="pt-1.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-800 truncate">
                        {it.produtoNome}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Tam: <strong className="text-slate-700">{it.grade.tamanho}</strong>
                        {it.grade.cor && (
                          <> • Cor: <strong className="text-slate-700">{it.grade.cor}</strong></>
                        )}
                        {' '}• Ref: {it.referencia}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-bold text-slate-900 text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                        {it.copias}x
                      </span>
                      <button
                        type="button"
                        onClick={() => setCopiasGrade(it.id, 0)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                        title="Remover"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Botão de Impressão Direta */}
            <button
              type="button"
              onClick={handleImprimir}
              disabled={totalEtiquetas === 0 || gerandoPdf}
              className="w-full py-2.5 bg-[#280F4D] hover:bg-[#39156e] disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir {totalEtiquetas} Etiquetas</span>
            </button>
          </div>

          {/* Prévia da Etiqueta Individual */}
          <div className="bg-white rounded-xl p-3.5 border border-purple-100 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Prévia da Etiqueta</span>
              <span className="text-[10px] text-slate-500 font-mono">Gabarito 600 DPI</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-center">
              {itemPreview ? (
                <div className="bg-white p-2 rounded border border-slate-300 shadow-2xs w-full max-w-[200px]">
                  <EtiquetaPreviewBox
                    produtoNome={itemPreview.produtoNome}
                    tamanho={itemPreview.grade.tamanho}
                    cor={itemPreview.grade.cor}
                    preco={itemPreview.precoVenda}
                    codigoBarras={itemPreview.grade.codigo_barras || itemPreview.grade.sku}
                  />
                </div>
              ) : (
                <div className="text-slate-400 text-xs py-2 text-center">
                  Selecione um produto para visualizar
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA OCULTA DE IMPRESSÃO VIA NAVEGADOR (@media print) */}
      <div id="printable-labels-sheet" className="hidden">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden !important; }
              #printable-labels-sheet, #printable-labels-sheet * { visibility: visible !important; }
              #printable-labels-sheet {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                display: block !important;
              }
              @page {
                size: ${configAtual.tipo === 'termica' ? `${configAtual.larguraMm}mm ${configAtual.alturaMm}mm` : 'A4 portrait'};
                margin: ${configAtual.tipo === 'termica' ? '0mm' : `${configAtual.margemSuperiorMm ?? 10.7}mm ${configAtual.margemEsquerdaMm ?? 5.5}mm`};
              }
            }
          `
        }} />

        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${configAtual.colunas}, ${configAtual.larguraMm}mm)`,
            columnGap: `${configAtual.gapXMm ?? (configAtual.id === 'a4_a4351' ? 2.5 : 0)}mm`,
            rowGap: `${configAtual.gapYMm ?? 0}mm`,
            width: '100%',
          }}
        >
          {/* Espaços vazios no início para aproveitar a folha */}
          {Array.from({ length: etiquetasVaziasNaFila }).map((_, vIdx) => (
            <div
              key={`empty-print-${vIdx}`}
              style={{
                width: `${configAtual.larguraMm}mm`,
                height: `${configAtual.alturaMm}mm`,
              }}
            />
          ))}

          {/* Todas as etiquetas da fila multiplicadas pelas cópias */}
          {itensFila.map(item =>
            Array.from({ length: item.copias }).map((_, cIdx) => (
              <div
                key={`print-${item.id}-${cIdx}`}
                style={{
                  width: `${configAtual.larguraMm}mm`,
                  height: `${configAtual.alturaMm}mm`,
                  boxSizing: 'border-box',
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid',
                }}
                className="p-1 flex flex-col justify-between items-center text-center overflow-hidden"
              >
                <EtiquetaPrintBox
                  produtoNome={item.produtoNome}
                  tamanho={item.grade.tamanho}
                  cor={item.grade.cor}
                  preco={item.precoVenda}
                  codigoBarras={item.grade.codigo_barras || item.grade.sku}
                />
              </div>
            ))
          )}
        </div>

        {configAtual.tipo !== 'termica' && (
          <div className="text-center text-[10px] text-slate-600 pt-5 font-mono tracking-wider">
            M.E.0.00 | M.S.0.00 | E.L.0.00 | E.C.0.00
          </div>
        )}
      </div>
    </div>
  );
};

// Box de pré-visualização ao vivo da etiqueta individual
const EtiquetaPreviewBox: React.FC<{
  produtoNome: string;
  tamanho: string;
  cor?: string;
  preco: number;
  codigoBarras: string;
}> = ({ produtoNome, tamanho, cor, preco, codigoBarras }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { linha1, linha2 } = formatarTextoEtiqueta(produtoNome, tamanho, 28, cor);
  const precoFormatado = `R$${(preco || 0).toFixed(2).replace('.', ',')}`;

  useEffect(() => {
    if (svgRef.current) {
      renderBarcodeToSvg(svgRef.current, codigoBarras, {
        width: 1.25,
        height: 25,
        fontSize: 9.5,
        margin: 0,
      });
    }
  }, [codigoBarras]);

  return (
    <div className="text-black font-sans leading-tight select-none">
      <div className="text-[9.5px] font-normal truncate text-slate-900">{linha1}</div>
      <div className="text-[9.5px] font-normal truncate text-slate-900">{linha2}</div>
      <div className="text-[13px] font-black text-center my-0.5 tracking-tight text-black">
        {precoFormatado}
      </div>
      <div className="flex justify-center items-center w-full overflow-hidden">
        <svg ref={svgRef} className="max-w-full" />
      </div>
    </div>
  );
};

// Box individual para impressão física direta
const EtiquetaPrintBox: React.FC<{
  produtoNome: string;
  tamanho: string;
  cor?: string;
  preco: number;
  codigoBarras: string;
}> = ({ produtoNome, tamanho, cor, preco, codigoBarras }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { linha1, linha2 } = formatarTextoEtiqueta(produtoNome, tamanho, 28, cor);
  const precoFormatado = `R$${(preco || 0).toFixed(2).replace('.', ',')}`;

  useEffect(() => {
    if (svgRef.current) {
      renderBarcodeToSvg(svgRef.current, codigoBarras, {
        width: 1.2,
        height: 24,
        fontSize: 9,
        margin: 0,
      });
    }
  }, [codigoBarras]);

  return (
    <div className="w-full h-full flex flex-col justify-between text-black font-sans leading-tight">
      <div className="w-full text-left">
        <div className="text-[9px] font-normal truncate">{linha1}</div>
        <div className="text-[9px] font-normal truncate">{linha2}</div>
      </div>
      <div className="text-[13px] font-black text-center tracking-tight">
        {precoFormatado}
      </div>
      <div className="flex justify-center items-center w-full">
        <svg ref={svgRef} className="max-w-full" />
      </div>
    </div>
  );
};
