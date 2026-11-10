import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Sparkles,
  Layers,
  Check,
  AlertCircle,
  Trash2,
  Barcode,
  RefreshCw,
  Hash,
  Edit3,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Produto, ProdutoGrade } from '../../types';
import { generateEAN13 } from '../../utils/formatters';
import { toValidEan13 } from '../../utils/barcode';

export interface GradeItemEditavel {
  id?: string;
  tamanho: string;
  cor: string;
  modelo?: string;
  sku: string;
  barcode: string;
  estoque: number;
}

interface NovoProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  produtoParaEditar?: Produto | null;
}

export const NovoProdutoModal: React.FC<NovoProdutoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  produtoParaEditar,
}) => {
  const { fornecedores, adicionarProduto, atualizarProduto, categorias, adicionarCategoria } =
    useStore();

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('Vestidos');
  const [isNovaCategoriaOpen, setIsNovaCategoriaOpen] = useState(false);
  const [novaCategoriaInput, setNovaCategoriaInput] = useState('');
  const [referencia, setReferencia] = useState('');
  const [precoCusto, setPrecoCusto] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [descricao, setDescricao] = useState('');

  // Ativação da opção Produto com Grade
  const [produtoComGrade, setProdutoComGrade] = useState<boolean>(true);

  // Campos para produto simples (sem grade)
  const [estoqueSimples, setEstoqueSimples] = useState<number>(10);
  const [codigoBarrasSimples, setCodigoBarrasSimples] = useState<string>('');

  // 3 Modalidades de Grade / Variações
  const [mod1Nome, setMod1Nome] = useState('');
  const [mod1Valores, setMod1Valores] = useState('');
  const [mod2Nome, setMod2Nome] = useState('');
  const [mod2Valores, setMod2Valores] = useState('');
  const [mod3Nome, setMod3Nome] = useState('');
  const [mod3Valores, setMod3Valores] = useState('');

  // Grade editável
  const [gradesGeradas, setGradesGeradas] = useState<GradeItemEditavel[]>([]);
  const [erro, setErro] = useState('');

  const isEditando = Boolean(produtoParaEditar);

  // Carrega os dados quando o modal abre ou produtoParaEditar muda
  useEffect(() => {
    if (!isOpen) return;

    if (produtoParaEditar) {
      setNome(produtoParaEditar.nome);
      setCategoria(produtoParaEditar.categoria || 'Vestidos');
      // Filtra estritamente apenas números no código de referência
      setReferencia((produtoParaEditar.referencia || '').replace(/\D/g, ''));
      setPrecoCusto(produtoParaEditar.preco_custo ? String(produtoParaEditar.preco_custo) : '');
      setPrecoVenda(produtoParaEditar.preco_venda ? String(produtoParaEditar.preco_venda) : '');
      setFornecedorId(produtoParaEditar.fornecedor_id || '');
      setDescricao(produtoParaEditar.descricao || '');

      // Limpa os campos do gerador de modalidades para não vir pré-digitado
      setMod1Nome('');
      setMod1Valores('');
      setMod2Nome('');
      setMod2Valores('');
      setMod3Nome('');
      setMod3Valores('');

      const isComGrade =
        produtoParaEditar.grades.length > 1 ||
        (produtoParaEditar.grades.length === 1 &&
          produtoParaEditar.grades[0].tamanho !== 'ÚNICO' &&
          produtoParaEditar.grades[0].tamanho !== '');

      setProdutoComGrade(isComGrade);

      if (isComGrade) {
        setGradesGeradas(
          produtoParaEditar.grades.map(g => ({
            id: g.id,
            tamanho: g.tamanho,
            cor: g.cor,
            sku: g.sku,
            barcode: g.codigo_barras,
            estoque: g.estoque_disponivel,
          }))
        );
      } else {
        const unica = produtoParaEditar.grades[0];
        setEstoqueSimples(unica ? unica.estoque_disponivel : 10);
        setCodigoBarrasSimples(unica ? unica.codigo_barras : '');
        setGradesGeradas([]);
      }
    } else {
      // Novo Produto: Gera referência numérica aleatória de 6 dígitos
      const refNumericaAleatoria = String(Math.floor(100000 + Math.random() * 900000));
      setNome('');
      setCategoria('Vestidos');
      setReferencia(refNumericaAleatoria);
      setPrecoCusto('');
      setPrecoVenda('');
      setFornecedorId('');
      setDescricao('');
      setProdutoComGrade(true);
      setEstoqueSimples(10);
      setCodigoBarrasSimples('');
      setMod1Nome('');
      setMod1Valores('');
      setMod2Nome('');
      setMod2Valores('');
      setMod3Nome('');
      setMod3Valores('');
      setGradesGeradas([]);
    }
    setErro('');
  }, [isOpen, produtoParaEditar]);

  if (!isOpen) return null;

  // Atualização restrita a números para o Código de Referência
  const handleReferenciaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valNumerico = e.target.value.replace(/\D/g, '');
    setReferencia(valNumerico);
  };

  // Gerador de variações cruzando as modalidades preenchidas
  const handleGerarVariacoes = () => {
    const parseList = (str: string) =>
      str
        .split(/[\n,;]+/)
        .map(s => s.trim())
        .filter(Boolean);

    const lista1 = parseList(mod1Valores);
    const lista2 = parseList(mod2Valores);
    const lista3 = parseList(mod3Valores);

    if (lista1.length === 0 && lista2.length === 0) {
      setErro('Preencha ao menos uma modalidade (ex: Cor ou Tamanho) para gerar variações.');
      return;
    }

    // Referência estritamente numérica
    const refBase =
      referencia.replace(/\D/g, '').trim() || String(Math.floor(100000 + Math.random() * 900000));

    const novasGrades: GradeItemEditavel[] = [];
    const itens1 = lista1.length > 0 ? lista1 : ['Padrão'];
    const itens2 = lista2.length > 0 ? lista2 : ['Único'];
    const itens3 = lista3.length > 0 ? lista3 : [''];

    itens1.forEach(v1 => {
      itens2.forEach(v2 => {
        itens3.forEach(v3 => {
          let corVal = v1;
          let tamVal = v2;
          let modVal = v3 || undefined;

          const m1Lower = (mod1Nome || 'cor').toLowerCase();
          const m2Lower = (mod2Nome || 'tamanho').toLowerCase();
          if (m1Lower.includes('tam') && !m2Lower.includes('tam')) {
            tamVal = v1;
            corVal = v2;
          }

          const sigla1 = (v1.slice(0, 3) || 'V1').toUpperCase();
          const sigla2 = (v2.slice(0, 3) || 'V2').toUpperCase();
          const sigla3 = v3 ? `-${v3.slice(0, 3).toUpperCase()}` : '';
          const sku = `${refBase}-${sigla1}-${sigla2}${sigla3}`;
          const barcode = toValidEan13(generateEAN13(sku));

          novasGrades.push({
            id: `grd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            tamanho: tamVal,
            cor: corVal,
            modelo: modVal,
            sku,
            barcode,
            estoque: 4,
          });
        });
      });
    });

    setGradesGeradas(novasGrades);
    setErro('');
  };

  // Funções de edição completa da grade
  const updateGradeField = (
    index: number,
    field: keyof GradeItemEditavel,
    value: string | number
  ) => {
    setGradesGeradas(prev =>
      prev.map((g, idx) => {
        if (idx !== index) return g;
        return {
          ...g,
          [field]: field === 'estoque' ? Math.max(0, Number(value) || 0) : value,
        };
      })
    );
  };

  const handleRegenerarBarcodeGrade = (index: number) => {
    setGradesGeradas(prev =>
      prev.map((g, idx) => {
        if (idx !== index) return g;
        const seed = `${g.sku || referencia}-${g.tamanho}-${g.cor}-${Date.now()}`;
        return {
          ...g,
          barcode: toValidEan13(generateEAN13(seed)),
        };
      })
    );
  };

  const adicionarLinhaGradeManual = () => {
    const refAtual =
      referencia.replace(/\D/g, '').trim() || String(Math.floor(100000 + Math.random() * 900000));
    const idxNum = gradesGeradas.length + 1;
    const novoSku = `${refAtual}-TAM-${idxNum}`;
    const novoBarcode = toValidEan13(generateEAN13(novoSku));

    setGradesGeradas(prev => [
      ...prev,
      {
        id: `grd-manual-${Date.now()}-${idxNum}`,
        tamanho: 'M',
        cor: 'Padrão',
        sku: novoSku,
        barcode: novoBarcode,
        estoque: 2,
      },
    ]);
  };

  const removerGradeItem = (index: number) => {
    setGradesGeradas(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe o nome do modelo/peça');
      return;
    }
    const custo = parseFloat(precoCusto);
    const venda = parseFloat(precoVenda);
    if (!custo || custo <= 0) {
      setErro('Informe um preço de custo válido');
      return;
    }
    if (!venda || venda <= 0) {
      setErro('Informe um preço de venda válido');
      return;
    }

    const prodId = produtoParaEditar ? produtoParaEditar.id : `prod-${Date.now()}`;
    const forn = fornecedores.find(f => f.id === fornecedorId);
    // Código de referência garantido apenas em números
    const refFinal =
      referencia.replace(/\D/g, '').trim() || String(Math.floor(100000 + Math.random() * 900000));

    let gradesFinais: ProdutoGrade[] = [];

    if (!produtoComGrade) {
      // PRODUTO SIMPLES SEM GRADE
      const barcodeSimples =
        toValidEan13(codigoBarrasSimples.trim() || generateEAN13(`${refFinal}-UNI`));
      gradesFinais = [
        {
          id: produtoParaEditar?.grades[0]?.id || `grd-${Date.now()}-0`,
          produto_id: prodId,
          tamanho: 'ÚNICO',
          cor: 'Padrão',
          sku: `${refFinal}-UNI`,
          codigo_barras: barcodeSimples,
          estoque_disponivel: estoqueSimples,
          estoque_condicional: produtoParaEditar?.grades[0]?.estoque_condicional || 0,
          estoque_minimo: 2,
        },
      ];
    } else {
      // PRODUTO COM GRADE ATIVADA
      let gradesParaSalvar = gradesGeradas;

      if (gradesParaSalvar.length === 0) {
        setErro('Gere ou adicione ao menos uma variação na grade antes de salvar.');
        return;
      }

      // Converte as variações editadas pelo usuário em grades persistidas
      gradesFinais = gradesParaSalvar.map((g, idx) => {
        // Preserva o ID original se já existia na edição
        const originalGrade = produtoParaEditar?.grades.find(
          og => og.id === g.id || (og.tamanho === g.tamanho && og.cor === g.cor)
        );

        return {
          id: g.id || originalGrade?.id || `grd-${Date.now()}-${idx}`,
          produto_id: prodId,
          tamanho: g.tamanho.trim() || 'ÚNICO',
          cor: g.modelo ? `${g.cor.trim()} (${g.modelo.trim()})` : g.cor.trim() || 'Padrão',
          sku: g.sku.trim() || `${refFinal}-${(g.tamanho || 'T').slice(0, 3)}-${idx + 1}`,
          codigo_barras: toValidEan13(
            g.barcode.trim() ||
              generateEAN13(`${refFinal}-${g.tamanho}-${g.cor}-${Date.now()}`)
          ),
          estoque_disponivel: g.estoque,
          estoque_condicional: originalGrade?.estoque_condicional || 0,
          estoque_minimo: originalGrade?.estoque_minimo || 2,
        };
      });
    }

    const margem = Math.round(((venda - custo) / custo) * 100);

    const produtoDados: Produto = {
      id: prodId,
      nome: nome.trim(),
      categoria,
      referencia: refFinal,
      preco_custo: custo,
      preco_venda: venda,
      margem_lucro: margem,
      fornecedor: forn ? forn.nome : 'Próprio / Diversos',
      fornecedor_id: forn?.id,
      fornecedor_nome: forn?.nome,
      descricao: descricao.trim() || undefined,
      grades: gradesFinais,
      criado_em: produtoParaEditar?.criado_em || new Date().toISOString(),
    };

    if (produtoParaEditar) {
      atualizarProduto(produtoDados);
    } else {
      adicionarProduto(produtoDados);
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-purple-100 my-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-[#280F4D] via-[#351465] to-[#481B84] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 text-white rounded-xl backdrop-blur-xs">
              {isEditando ? <Edit3 className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {isEditando ? 'Editar Produto & Grade Completa' : 'Cadastrar Novo Produto'}
              </h3>
              <p className="text-xs text-purple-100">
                {isEditando
                  ? 'Edite qualquer informação da peça ou personalize a grade linha por linha'
                  : 'Cadastre peças com referência numérica e grade 100% editável'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Dados Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome do Modelo / Peça *
              </label>
              <input
                type="text"
                required
                autoFocus={!isEditando}
                placeholder="Ex: Vestido Midi Floral Crepe"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium outline-hidden focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Categoria
                </label>
                <button
                  type="button"
                  onClick={() => setIsNovaCategoriaOpen(!isNovaCategoriaOpen)}
                  className="text-[11px] font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                >
                  {isNovaCategoriaOpen ? 'Fechar' : '+ Nova'}
                </button>
              </div>

              {!isNovaCategoriaOpen ? (
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-hidden focus:ring-2 focus:ring-purple-400 cursor-pointer"
                >
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Nome da categoria..."
                    value={novaCategoriaInput}
                    onChange={e => setNovaCategoriaInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-purple-300 rounded-xl text-xs font-medium outline-hidden focus:ring-2 focus:ring-purple-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!novaCategoriaInput.trim()) return;
                      const res = adicionarCategoria(novaCategoriaInput.trim());
                      if (res.success) {
                        setCategoria(novaCategoriaInput.trim());
                        setNovaCategoriaInput('');
                        setIsNovaCategoriaOpen(false);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-[#351465] text-white rounded-xl text-xs font-bold shrink-0 hover:bg-[#280F4D] transition-colors cursor-pointer"
                  >
                    Salvar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* CÓDIGO REFERÊNCIA: APENAS NÚMEROS */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-purple-600" />
                  <span>Cód. Ref. (Só Números) *</span>
                </label>
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                placeholder="Ex: 889247"
                value={referencia}
                onChange={handleReferenciaChange}
                className="w-full px-3 py-2 border border-purple-200 bg-purple-50/20 rounded-xl text-xs font-mono font-bold text-purple-950 outline-hidden focus:ring-2 focus:ring-purple-400"
                title="Insira apenas números para o código de referência da peça"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Apenas dígitos (0-9)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Custo Confecção (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="59,90"
                value={precoCusto}
                onChange={e => setPrecoCusto(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Preço de Venda (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="149,90"
                value={precoVenda}
                onChange={e => setPrecoVenda(e.target.value)}
                className="w-full px-3 py-2 border border-purple-300 bg-purple-50/30 rounded-xl text-xs font-extrabold text-purple-900 outline-hidden focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Fornecedor
              </label>
              <select
                value={fornecedorId}
                onChange={e => setFornecedorId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-hidden cursor-pointer"
              >
                <option value="">Selecione...</option>
                {fornecedores.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BLOCO GRADE/VARIAÇÕES — 100% EDITÁVEL LINHA POR LINHA    */}
          {/* ======================================================== */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            {/* Barra de Ativação Superior com Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>Grade & Variações</span>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    100% Editável
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Você pode gerar as variações e depois alterar tamanhos, cores, SKUs, códigos de barras e estoque livremente.
                </p>
              </div>

              {/* Toggle switch */}
              <div className="flex items-center gap-3 self-end sm:self-auto select-none">
                <span className="text-xs font-semibold text-slate-700">Produto com grade</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={produtoComGrade}
                  onClick={() => setProdutoComGrade(!produtoComGrade)}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    produtoComGrade ? 'bg-[#16a34a]' : 'bg-slate-300'
                  }`}
                  title="Ativar/desativar produto com grade"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      produtoComGrade ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* SE ATIVADO: MODALIDADES E GRADE EDITÁVEL */}
            {produtoComGrade ? (
              <div className="space-y-4 pt-3 border-t border-slate-100 animate-in fade-in duration-150">
                {/* 3 Colunas de Modalidades para Gerar Cruzamentos Rápidos */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Gerador Automático de Modalidades (Opcional):
                    </span>
                    <button
                      type="button"
                      onClick={handleGerarVariacoes}
                      className="px-3.5 py-1.5 bg-[#280F4D] hover:bg-[#351465] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                      <span>Gerar / Cruzar Variações</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Modalidade 1 */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">Modalidade 1 (Nome)</label>
                      <input
                        type="text"
                        placeholder="Ex: Cor"
                        value={mod1Nome}
                        onChange={e => setMod1Nome(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:ring-1 focus:ring-purple-400"
                      />
                      <textarea
                        rows={2}
                        placeholder="Ex: Branco, Preto, Nude"
                        value={mod1Valores}
                        onChange={e => setMod1Valores(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:ring-1 focus:ring-purple-400 resize-none"
                      />
                    </div>

                    {/* Modalidade 2 */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">Modalidade 2 (Nome)</label>
                      <input
                        type="text"
                        placeholder="Ex: Tamanho"
                        value={mod2Nome}
                        onChange={e => setMod2Nome(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:ring-1 focus:ring-purple-400"
                      />
                      <textarea
                        rows={2}
                        placeholder="Ex: P, M, G, GG"
                        value={mod2Valores}
                        onChange={e => setMod2Valores(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:ring-1 focus:ring-purple-400 resize-none"
                      />
                    </div>

                    {/* Modalidade 3 */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">Modalidade 3 (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex: Modelo"
                        value={mod3Nome}
                        onChange={e => setMod3Nome(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:ring-1 focus:ring-purple-400"
                      />
                      <textarea
                        rows={2}
                        placeholder="Opcional: Curta, Longa..."
                        value={mod3Valores}
                        onChange={e => setMod3Valores(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:ring-1 focus:ring-purple-400 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* TABELA DE VARIAÇÕES COMPLETAMENTE EDITÁVEL */}
                <div className="space-y-2 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Variações da Grade ({gradesGeradas.length}):</span>
                        <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-mono font-bold">
                          Edite Tamanho, Cor, SKU, Código de Barras e Estoque
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={adicionarLinhaGradeManual}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                        title="Adicionar uma nova linha de variação à grade"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Variação</span>
                      </button>

                      {gradesGeradas.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setGradesGeradas([])}
                          className="px-2.5 py-1.5 text-slate-500 hover:text-rose-600 text-xs font-medium rounded-lg hover:bg-rose-50 transition-colors"
                          title="Limpar todas as variações"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>

                  {gradesGeradas.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-2 bg-slate-50/50">
                      <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">
                        Nenhuma variação adicionada na grade ainda.
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Clique em <strong>"Gerar / Cruzar Variações"</strong> acima ou clique no botão{' '}
                        <strong>"+ Adicionar Variação"</strong> para criar manualmente.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-purple-100 rounded-xl overflow-hidden shadow-2xs">
                      {/* Cabeçalho da Tabela de Edição */}
                      <div className="bg-purple-50/80 px-3 py-2 grid grid-cols-12 gap-2 text-[11px] font-bold text-[#280F4D]">
                        <span className="col-span-2">Tamanho</span>
                        <span className="col-span-3">Cor / Variação</span>
                        <span className="col-span-2 hidden md:block">SKU</span>
                        <span className="col-span-3 md:col-span-3">Cód. Barras (EAN-13)</span>
                        <span className="col-span-3 md:col-span-1 text-center">Estoque</span>
                        <span className="col-span-1 text-center">Excluir</span>
                      </div>

                      {/* Lista de Linhas Totalmente Editáveis */}
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 bg-white">
                        {gradesGeradas.map((grade, idx) => (
                          <div
                            key={grade.id || idx}
                            className="px-3 py-2 grid grid-cols-12 gap-2 items-center hover:bg-purple-50/30 transition-colors text-xs"
                          >
                            {/* 1. Tamanho Editável */}
                            <div className="col-span-2">
                              <input
                                type="text"
                                value={grade.tamanho}
                                onChange={e => updateGradeField(idx, 'tamanho', e.target.value)}
                                placeholder="P, M, 38..."
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-bold text-purple-950 focus:bg-white focus:ring-1 focus:ring-purple-400 outline-hidden"
                                title="Editar tamanho"
                              />
                            </div>

                            {/* 2. Cor Editável */}
                            <div className="col-span-3">
                              <input
                                type="text"
                                value={grade.cor}
                                onChange={e => updateGradeField(idx, 'cor', e.target.value)}
                                placeholder="Preto, Branco..."
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-purple-400 outline-hidden"
                                title="Editar cor ou estampa"
                              />
                            </div>

                            {/* 3. SKU Editável */}
                            <div className="col-span-2 hidden md:block">
                              <input
                                type="text"
                                value={grade.sku}
                                onChange={e => updateGradeField(idx, 'sku', e.target.value)}
                                placeholder="SKU"
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-[11px] text-slate-600 focus:bg-white focus:ring-1 focus:ring-purple-400 outline-hidden"
                                title="Editar SKU da peça"
                              />
                            </div>

                            {/* 4. Código de Barras EAN-13 Editável com Botão de Regenerar */}
                            <div className="col-span-3 md:col-span-3 flex items-center gap-1">
                              <input
                                type="text"
                                value={grade.barcode}
                                onChange={e => updateGradeField(idx, 'barcode', e.target.value)}
                                placeholder="EAN-13"
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-[11px] text-slate-800 focus:bg-white focus:ring-1 focus:ring-purple-400 outline-hidden"
                                title="Código de barras EAN-13"
                              />
                              <button
                                type="button"
                                onClick={() => handleRegenerarBarcodeGrade(idx)}
                                className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded transition-colors shrink-0"
                                title="Regenerar código de barras EAN-13 automaticamente"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* 5. Estoque Editável */}
                            <div className="col-span-3 md:col-span-1 flex items-center justify-center">
                              <input
                                type="number"
                                min="0"
                                value={grade.estoque}
                                onChange={e =>
                                  updateGradeField(idx, 'estoque', e.target.value)
                                }
                                className="w-14 px-1.5 py-1 bg-white border border-purple-300 rounded text-center font-bold text-purple-900 focus:ring-1 focus:ring-purple-400 outline-hidden"
                                title="Quantidade em estoque desta variação"
                              />
                            </div>

                            {/* 6. Remover Linha */}
                            <div className="col-span-1 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => removerGradeItem(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition-colors"
                                title="Excluir esta linha da grade"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* SE DESATIVADO: PRODUTO SIMPLES SEM GRADE */
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Estoque Inicial na Loja (unidades) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={estoqueSimples}
                    onChange={e => setEstoqueSimples(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-hidden focus:ring-2 focus:ring-purple-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Quantidade de peças prontas disponíveis para venda no balcão.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Código de Barras (EAN-13)
                  </label>
                  <input
                    type="text"
                    placeholder="Deixe em branco para gerar automaticamente"
                    value={codigoBarrasSimples}
                    onChange={e => setCodigoBarrasSimples(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-medium outline-hidden focus:ring-2 focus:ring-purple-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Opcional: se deixar em branco, o sistema cria um código de barras oficial EAN-13.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-[#280F4D] via-[#351465] to-[#481B84] hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-md shadow-[#280F4D]/20 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <Check className="w-4 h-4" />
              <span>{isEditando ? 'Salvar Alterações do Produto' : 'Salvar Produto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
