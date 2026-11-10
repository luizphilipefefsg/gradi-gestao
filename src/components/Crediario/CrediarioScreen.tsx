import React, { useState } from 'react';
import {
  ReceiptText,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  DollarSign,
  User,
  ArrowRight,
  Filter,
  Printer,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Cliente, ParcelaCrediario, Venda } from '../../types';
import { formatCurrency, formatDate, formatWhatsApp } from '../../utils/formatters';

export const CrediarioScreen: React.FC = () => {
  const { clientes, vendas, baixarParcelaCrediario } = useStore();

  const [clienteFiltroId, setClienteFiltroId] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [busca, setBusca] = useState('');

  // Baixa de parcela modal
  const [parcelaSelecionada, setParcelaSelecionada] = useState<{
    parcela: ParcelaCrediario;
    venda: Venda;
    cliente: Cliente;
  } | null>(null);

  const [valorBaixa, setValorBaixa] = useState('');
  const [formaBaixa, setFormaBaixa] = useState<'dinheiro' | 'pix' | 'cartao_debito'>('pix');
  const [comprovanteBaixa, setComprovanteBaixa] = useState<{
    clienteNome: string;
    valor: number;
    parcelaNum: number;
    totalParc: number;
    data: string;
    forma: string;
  } | null>(null);

  const hoje = new Date().toISOString().split('T')[0];

  // Gather all parcelas from all sales
  const todasParcelas: {
    parcela: ParcelaCrediario;
    venda: Venda;
    cliente: Cliente;
  }[] = [];

  vendas.forEach(venda => {
    if (venda.status === 'finalizada' && venda.parcelas && venda.parcelas.length > 0) {
      const cli = clientes.find(c => c.id === venda.cliente_id) || {
        id: venda.cliente_id || 'unknown',
        nome: venda.cliente_nome,
        whatsapp: venda.cliente_whatsapp || '',
        limite_crediario: 0,
        saldo_devedor: 0,
        criado_em: '',
      };

      venda.parcelas.forEach(p => {
        todasParcelas.push({
          parcela: p,
          venda,
          cliente: cli,
        });
      });
    }
  });

  // Filter parcelas
  const parcelasFiltradas = todasParcelas.filter(item => {
    const { parcela, cliente, venda } = item;

    if (clienteFiltroId !== 'todos' && cliente.id !== clienteFiltroId) return false;

    if (filtroStatus === 'pendentes' && parcela.status === 'pago') return false;
    if (filtroStatus === 'pagas' && parcela.status !== 'pago') return false;
    if (filtroStatus === 'atrasadas') {
      const estaAtrasada = parcela.status !== 'pago' && parcela.data_vencimento < hoje;
      if (!estaAtrasada) return false;
    }

    if (busca) {
      const q = busca.toLowerCase();
      const matchCli = cliente.nome.toLowerCase().includes(q);
      const matchVnd = venda.codigo_venda.toLowerCase().includes(q);
      if (!matchCli && !matchVnd) return false;
    }

    return true;
  });

  // Stats
  const totalAReceber = todasParcelas
    .filter(i => i.parcela.status !== 'pago')
    .reduce((acc, i) => acc + (i.parcela.valor - (i.parcela.valor_pago || 0)), 0);

  const totalVencido = todasParcelas
    .filter(i => i.parcela.status !== 'pago' && i.parcela.data_vencimento < hoje)
    .reduce((acc, i) => acc + (i.parcela.valor - (i.parcela.valor_pago || 0)), 0);

  const totalRecebido = todasParcelas.reduce((acc, i) => acc + (i.parcela.valor_pago || 0), 0);

  const handleOpenBaixa = (item: (typeof todasParcelas)[0]) => {
    const restante = item.parcela.valor - (item.parcela.valor_pago || 0);
    setParcelaSelecionada(item);
    setValorBaixa(restante.toFixed(2));
  };

  const handleConfirmarBaixa = () => {
    if (!parcelaSelecionada) return;
    const val = parseFloat(valorBaixa);
    if (!val || val <= 0) return;

    baixarParcelaCrediario(parcelaSelecionada.parcela.id, val);

    setComprovanteBaixa({
      clienteNome: parcelaSelecionada.cliente.nome,
      valor: val,
      parcelaNum: parcelaSelecionada.parcela.numero_parcela,
      totalParc: parcelaSelecionada.parcela.total_parcelas,
      data: new Date().toISOString(),
      forma: formaBaixa,
    });

    setParcelaSelecionada(null);
  };

  return (
    <div className="space-y-5">
      {/* Topo Limpo: Título da Tela */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-[#280F4D] tracking-tight">Crediário Próprio & Parcelas</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhe os recebimentos de clientes, registre baixas de parcelas e consulte quem está em dia.
          </p>
        </div>
      </div>



      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-900 block">Total a Receber</span>
            <span className="text-2xl font-black text-amber-950">
              {formatCurrency(totalAReceber)}
            </span>
            <span className="text-[11px] text-amber-700 block mt-0.5">Saldo em aberto no carnê</span>
          </div>
          <div className="p-3 bg-amber-200/60 rounded-xl text-amber-800">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-900 block">Em Atraso (Vencido)</span>
            <span className="text-2xl font-black text-rose-950">{formatCurrency(totalVencido)}</span>
            <span className="text-[11px] text-rose-700 block mt-0.5">Cobrança prioritária</span>
          </div>
          <div className="p-3 bg-rose-200/60 rounded-xl text-rose-800">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-900 block">
              Total Já Recebido no Mês
            </span>
            <span className="text-2xl font-black text-emerald-950">
              {formatCurrency(totalRecebido)}
            </span>
            <span className="text-[11px] text-emerald-700 block mt-0.5">
              Liquidações registradas
            </span>
          </div>
          <div className="p-3 bg-emerald-200/60 rounded-xl text-emerald-800">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          {[
            { id: 'todos', label: 'Todas as Parcelas' },
            { id: 'pendentes', label: 'Em Aberto / A Vencer' },
            { id: 'atrasadas', label: 'Vencidas / Em Atraso' },
            { id: 'pagas', label: 'Quitadas' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFiltroStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filtroStatus === tab.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Client Picker */}
        <div className="flex items-center gap-2">
          <select
            value={clienteFiltroId}
            onChange={e => setClienteFiltroId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-hidden"
          >
            <option value="todos">Todos os Clientes</option>
            {clientes.map(cli => (
              <option key={cli.id} value={cli.id}>
                {cli.nome} (Débito: {formatCurrency(cli.saldo_devedor)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Installments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-3">Cliente / Contato</th>
              <th className="p-3">Pedido</th>
              <th className="p-3 text-center">Parcela</th>
              <th className="p-3">Vencimento</th>
              <th className="p-3 text-right">Valor Original</th>
              <th className="p-3 text-right">Valor Pago</th>
              <th className="p-3 text-right">Saldo Devedor</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {parcelasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  Nenhuma parcela encontrada para os filtros selecionados.
                </td>
              </tr>
            ) : (
              parcelasFiltradas.map((item, idx) => {
                const { parcela, cliente, venda } = item;
                const estaAtrasada = parcela.status !== 'pago' && parcela.data_vencimento < hoje;
                const saldoRestante = Math.max(0, parcela.valor - (parcela.valor_pago || 0));

                return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <strong className="text-slate-900 block">{cliente.nome}</strong>
                      <span className="text-[11px] text-slate-500">
                        Whats: {formatWhatsApp(cliente.whatsapp)}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-700">
                      {venda.codigo_venda}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100">
                        {parcela.numero_parcela}ª de {parcela.total_parcelas}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`font-semibold ${
                          estaAtrasada ? 'text-rose-600 font-bold' : 'text-slate-800'
                        }`}
                      >
                        {formatDate(parcela.data_vencimento)}
                      </span>
                      {estaAtrasada && (
                        <span className="block text-[10px] text-rose-500 font-bold">VENCIDA</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-800">
                      {formatCurrency(parcela.valor)}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-600">
                      {parcela.valor_pago > 0 ? formatCurrency(parcela.valor_pago) : '-'}
                    </td>
                    <td className="p-3 text-right font-black text-slate-900">
                      {formatCurrency(saldoRestante)}
                    </td>
                    <td className="p-3 text-center">
                      {parcela.status === 'pago' ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          Quitada
                        </span>
                      ) : estaAtrasada ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800">
                          Atrasada
                        </span>
                      ) : parcela.status === 'parcial' ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">
                          Parcial
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800">
                          A Vencer
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {parcela.status !== 'pago' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenBaixa(item)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                        >
                          Receber / Baixar
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Paga</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Baixa de Parcela */}
      {parcelaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">
                Receber Parcela do Crediário
              </h3>
              <button
                onClick={() => setParcelaSelecionada(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <strong className="text-slate-800">{parcelaSelecionada.cliente.nome}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Parcela:</span>
                <span className="font-semibold text-slate-800">
                  {parcelaSelecionada.parcela.numero_parcela}ª de{' '}
                  {parcelaSelecionada.parcela.total_parcelas} (Venc:{' '}
                  {formatDate(parcelaSelecionada.parcela.data_vencimento)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valor da Parcela:</span>
                <span className="font-bold">{formatCurrency(parcelaSelecionada.parcela.valor)}</span>
              </div>
              {parcelaSelecionada.parcela.valor_pago > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Já Pago Anteriormente:</span>
                  <span>{formatCurrency(parcelaSelecionada.parcela.valor_pago)}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Valor do Pagamento Recebido (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={
                  parcelaSelecionada.parcela.valor -
                  (parcelaSelecionada.parcela.valor_pago || 0)
                }
                value={valorBaixa}
                onChange={e => setValorBaixa(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-black text-emerald-700 outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Você pode registrar pagamento total ou parcial desta parcela.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Forma Recebida
              </label>
              <select
                value={formaBaixa}
                onChange={e => setFormaBaixa(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-hidden"
              >
                <option value="pix">Pix Instantâneo</option>
                <option value="dinheiro">Dinheiro em Espécie</option>
                <option value="cartao_debito">Cartão Débito</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setParcelaSelecionada(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarBaixa}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
              >
                Confirmar Recebimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprovante de Quitação do Crediário */}
      {comprovanteBaixa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="font-bold text-slate-900 text-base">Pagamento Confirmado!</h3>
            <p className="text-xs text-slate-500">
              Recibo emitido com sucesso e saldo devedor recalculado no sistema.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs font-mono space-y-1 text-slate-800">
              <div className="text-center font-bold pb-2 border-b border-dashed border-slate-300">
                RECIBO DE CREDIÁRIO
              </div>
              <div>Cliente: {comprovanteBaixa.clienteNome}</div>
              <div>
                Parcela: {comprovanteBaixa.parcelaNum}ª de {comprovanteBaixa.totalParc}
              </div>
              <div>Valor Pago: {formatCurrency(comprovanteBaixa.valor)}</div>
              <div>Forma: {comprovanteBaixa.forma.toUpperCase()}</div>
              <div>Data: {new Date(comprovanteBaixa.data).toLocaleDateString('pt-BR')}</div>
            </div>

            <div className="flex items-center gap-2 justify-center">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Recibo
              </button>
              <button
                type="button"
                onClick={() => setComprovanteBaixa(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
