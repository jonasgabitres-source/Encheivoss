import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Lock,
  Plus,
  X,
} from 'lucide-react';
import {
  AppNotification,
  FinancialEntry,
  GeneralTransfer,
  PaymentMethod,
  SystemRole,
  Turma,
} from '../domain/types';
import {
  calculateTurmaBalance,
  RolePermissions,
} from '../domain/rules';

interface FinancialModuleProps {
  turmas: Turma[];
  selectedTurmaId: string;
  onSelectTurmaId: (id: string) => void;
  entries: FinancialEntry[];
  transfers: GeneralTransfer[];
  notifications: AppNotification[];
  permissions: RolePermissions;
  currentRole: SystemRole;
  onCreateFinancialEntry: (payload: {
    turmaId: string;
    type: 'Receber' | 'Pagar';
    totalAmount: number;
    paymentMethod: PaymentMethod;
    installmentsCount: number;
    firstDueDate: string;
    observation: string;
    markPaidImmediately: boolean;
  }) => { ok: boolean; message: string };
  onMarkInstallmentPaid: (
    entryId: string,
    installmentId: string
  ) => { ok: boolean; message: string };
  onTransferToGeneralAccount: (payload: {
    turmaId: string;
    amount: number;
    observation: string;
  }) => { ok: boolean; message: string };
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'Dinheiro à vista',
  'Cartão à vista',
  'PIX à vista',
  'Dinheiro parcelado',
  'PIX parcelado',
];

export const FinancialModule: React.FC<FinancialModuleProps> = ({
  turmas,
  selectedTurmaId,
  onSelectTurmaId,
  entries,
  transfers,
  notifications,
  permissions,
  currentRole,
  onCreateFinancialEntry,
  onMarkInstallmentPaid,
  onTransferToGeneralAccount,
}) => {
  const [finTab, setFinTab] = useState<'turma' | 'conta-geral' | 'notificacoes'>('turma');
  const [activeActionDrawer, setActiveActionDrawer] = useState<'none' | 'entry' | 'transfer'>('none');

  const [entryType, setEntryType] = useState<'Receber' | 'Pagar'>('Receber');
  const [totalAmount, setTotalAmount] = useState('240.00');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX parcelado');
  const [installmentsCount, setInstallmentsCount] = useState<number>(3);
  const [firstDueDate, setFirstDueDate] = useState('2026-11-04');
  const [observation, setObservation] = useState('');
  const [markPaidNow, setMarkPaidNow] = useState(false);

  const [transferAmount, setTransferAmount] = useState('');
  const [transferObs, setTransferObs] = useState(
    'Repasse de saldo da turma para a Conta Geral da Missão EncheiVos'
  );

  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const currentTurma = turmas.find((t) => t.id === selectedTurmaId) || turmas[0];
  const balanceInfo = currentTurma
    ? calculateTurmaBalance(currentTurma.id, entries, transfers)
    : {
        totalReceived: 0,
        totalPaid: 0,
        totalTransferred: 0,
        pendingReceivable: 0,
        pendingPayable: 0,
        availableBalance: 0,
      };

  const turmaEntries = currentTurma
    ? entries.filter((e) => e.turmaId === currentTurma.id)
    : [];

  const totalGeneralAccountBalance = transfers.reduce((acc, tr) => acc + tr.amount, 0);

  const isParceladoMethod =
    paymentMethod === 'Dinheiro parcelado' || paymentMethod === 'PIX parcelado';

  const handleEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTurma) return;
    const res = onCreateFinancialEntry({
      turmaId: currentTurma.id,
      type: entryType,
      totalAmount: Number(totalAmount),
      paymentMethod,
      installmentsCount: isParceladoMethod ? installmentsCount : 1,
      firstDueDate,
      observation: observation.trim() || `Lançamento (${paymentMethod})`,
      markPaidImmediately: markPaidNow,
    });
    setBanner({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
    if (res.ok) {
      setObservation('');
      setActiveActionDrawer('none');
    }
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTurma) return;
    const res = onTransferToGeneralAccount({
      turmaId: currentTurma.id,
      amount: Number(transferAmount),
      observation: transferObs.trim() || 'Transferência para Conta Geral',
    });
    setBanner({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
    if (res.ok) {
      setTransferAmount('');
      setActiveActionDrawer('none');
    }
  };

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-5">
      {/* Cabeçalho Financeiro Limpo */}
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
            Gestão Financeira
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Contas exclusivas por turma, parcelamentos em até 4x e Conta Geral da Missão.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentTurma && (
            <select
              aria-label="Selecionar conta financeira da turma"
              value={currentTurma.id}
              onChange={(e) => onSelectTurmaId(e.target.value)}
              className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
            >
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 rounded-lg bg-[var(--bg-subtle)] p-1">
            <button
              type="button"
              onClick={() => setFinTab('turma')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                finTab === 'turma'
                  ? 'bg-white text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              Conta da Turma
            </button>
            <button
              type="button"
              onClick={() => setFinTab('conta-geral')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                finTab === 'conta-geral'
                  ? 'bg-white text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              Conta Geral
            </button>
            <button
              type="button"
              onClick={() => setFinTab('notificacoes')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                finTab === 'notificacoes'
                  ? 'bg-white text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              Vencimentos ({notifications.length})
            </button>
          </div>
        </div>
      </div>

      {banner && (
        <div
          role="alert"
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-xs font-medium ${
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="underline">
            Fechar
          </button>
        </div>
      )}

      {/* ABA 1: CONTA FINANCEIRA DA TURMA */}
      {finTab === 'turma' && currentTurma && (
        <div className="space-y-5">
          {/* Resumo de Saldo da Turma */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Saldo Disponível na Turma
              </span>
              <p className="font-mono-tabular mt-1 text-2xl font-bold text-[var(--accent-primary)]">
                {formatBRL(balanceInfo.availableBalance)}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Entradas Quitadas
              </span>
              <p className="font-mono-tabular mt-1 text-xl font-bold text-emerald-700">
                {formatBRL(balanceInfo.totalReceived)}
              </p>
              <span className="font-mono-tabular mt-0.5 block text-xs text-[var(--text-muted)]">
                A receber: {formatBRL(balanceInfo.pendingReceivable)}
              </span>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Saídas Quitadas
              </span>
              <p className="font-mono-tabular mt-1 text-xl font-bold text-red-700">
                {formatBRL(balanceInfo.totalPaid)}
              </p>
              <span className="font-mono-tabular mt-0.5 block text-xs text-[var(--text-muted)]">
                A pagar: {formatBRL(balanceInfo.pendingPayable)}
              </span>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Enviado à Conta Geral
              </span>
              <p className="font-mono-tabular mt-1 text-xl font-bold text-[var(--text-primary)]">
                {formatBRL(balanceInfo.totalTransferred)}
              </p>
            </div>
          </div>

          {/* Painel Expansível: Novo Lançamento */}
          {activeActionDrawer === 'entry' && permissions.canManageOwnTurmaFinancial && (
            <form
              onSubmit={handleEntrySubmit}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
                  Novo Lançamento Financeiro — {currentTurma.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveActionDrawer('none')}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label
                    htmlFor="fin-entry-type"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Tipo
                  </label>
                  <select
                    id="fin-entry-type"
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value as 'Receber' | 'Pagar')}
                    className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                  >
                    <option value="Receber">Conta a Receber</option>
                    <option value="Pagar">Conta a Pagar</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="fin-total-amount"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Valor Total (R$) *
                  </label>
                  <input
                    id="fin-total-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="font-mono-tabular mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="fin-payment-method"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Forma de Pagamento
                  </label>
                  <select
                    id="fin-payment-method"
                    value={paymentMethod}
                    onChange={(e) => {
                      const next = e.target.value as PaymentMethod;
                      setPaymentMethod(next);
                      if (next !== 'Dinheiro parcelado' && next !== 'PIX parcelado') {
                        setInstallmentsCount(1);
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="fin-installments-count"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Parcelas (Máx. 4)
                  </label>
                  <select
                    id="fin-installments-count"
                    disabled={!isParceladoMethod}
                    value={isParceladoMethod ? installmentsCount : 1}
                    onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                    className="font-mono-tabular mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs disabled:bg-slate-100"
                  >
                    <option value={1}>1x à vista</option>
                    <option value={2}>2x mensais</option>
                    <option value={3}>3x mensais</option>
                    <option value={4}>4x mensais</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="fin-first-duedate"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    1º Vencimento
                  </label>
                  <input
                    id="fin-first-duedate"
                    type="date"
                    required
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                    className="font-mono-tabular mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <label
                    htmlFor="fin-observation"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Observação *
                  </label>
                  <input
                    id="fin-observation"
                    type="text"
                    required
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Descreva livremente o lançamento..."
                    className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                  />
                </div>

                {!isParceladoMethod && (
                  <label className="flex items-center gap-2 pb-2 text-xs text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={markPaidNow}
                      onChange={(e) => setMarkPaidNow(e.target.checked)}
                    />
                    Já quitado no ato
                  </label>
                )}

                <button
                  type="submit"
                  className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          )}

          {/* Painel Expansível: Transferir Saldo para Conta Geral */}
          {activeActionDrawer === 'transfer' && permissions.canManageOwnTurmaFinancial && (
            <form
              onSubmit={handleTransferSubmit}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
                  Transferir Saldo para a Conta Geral (Disponível: {formatBRL(balanceInfo.availableBalance)})
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveActionDrawer('none')}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="w-full sm:w-48">
                  <label
                    htmlFor="transfer-amount-input"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Valor a Transferir (R$) *
                  </label>
                  <input
                    id="transfer-amount-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Ex.: 150.00"
                    className="font-mono-tabular mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                  />
                </div>

                <div className="flex-1">
                  <label
                    htmlFor="transfer-obs-input"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Observação da Transferência
                  </label>
                  <input
                    id="transfer-obs-input"
                    type="text"
                    value={transferObs}
                    onChange={(e) => setTransferObs(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  Confirmar Transferência
                </button>
              </div>
            </form>
          )}

          {/* Lista de Lançamentos e Parcelas da Turma */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
            <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                Lançamentos de {currentTurma.name}
              </h3>

              {permissions.canManageOwnTurmaFinancial ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveActionDrawer((v) => (v === 'transfer' ? 'none' : 'transfer'))
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Transferir para Conta Geral
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveActionDrawer((v) => (v === 'entry' ? 'none' : 'entry'))
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
                  >
                    <Plus className="h-4 w-4" />
                    Novo Lançamento
                  </button>
                </div>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Lock className="h-3.5 w-3.5" />
                  Visualização somente leitura ({currentRole})
                </span>
              )}
            </div>

            <div className="divide-y divide-[var(--border-subtle)]">
              {turmaEntries.map((entry) => (
                <div key={entry.id} className="py-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      {entry.type === 'Receber' ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-display text-sm font-bold text-[var(--text-primary)]">
                        {entry.observation}
                      </span>
                    </div>
                    <span
                      className={`font-mono-tabular text-sm font-bold ${
                        entry.type === 'Receber' ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {entry.type === 'Receber' ? '+' : '-'} {formatBRL(entry.totalAmount)}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span>{entry.type === 'Receber' ? 'Entrada' : 'Saída'}</span>
                    <span>·</span>
                    <span>{entry.paymentMethod}</span>
                    <span>·</span>
                    <span>Responsável: {entry.createdBy}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {entry.installments.map((inst) => (
                      <div
                        key={inst.id}
                        className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 px-3 py-2 text-xs"
                      >
                        <div>
                          <span className="font-mono-tabular font-semibold text-[var(--text-primary)]">
                            Parcela {inst.number}/{inst.totalInstallments}: {formatBRL(inst.amount)}
                          </span>
                          <span className="font-mono-tabular block text-[11px] text-[var(--text-secondary)]">
                            Venc.: {inst.dueDate.split('-').reverse().join('/')} · {inst.status}
                          </span>
                        </div>

                        {inst.status !== 'Pago' && permissions.canManageOwnTurmaFinancial && (
                          <button
                            type="button"
                            onClick={() => {
                              const res = onMarkInstallmentPaid(entry.id, inst.id);
                              setBanner({
                                type: res.ok ? 'success' : 'error',
                                text: res.message,
                              });
                            }}
                            className="rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CONTA GERAL */}
      {finTab === 'conta-geral' && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          {!permissions.canAccessGeneralAccount ? (
            <div className="py-8 text-center">
              <Lock className="mx-auto h-8 w-8 text-amber-600" />
              <h3 className="mt-2 font-display text-base font-bold text-[var(--text-primary)]">
                Acesso Restrito à Conta Geral
              </h3>
              <p className="mx-auto mt-1 max-w-lg text-xs text-[var(--text-secondary)]">
                A visualização da Conta Geral é restrita a Coordenador Local, Supervisor e
                Administrador do Sistema.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-[var(--text-primary)]">
                    Conta Geral — Missão EncheiVos
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Transferências recebidas das turmas com identificação de origem.
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-4 py-3 text-right">
                  <span className="block text-xs text-[var(--text-secondary)]">
                    Saldo Acumulado na Conta Geral
                  </span>
                  <span className="font-mono-tabular text-2xl font-bold text-[var(--accent-primary)]">
                    {formatBRL(totalGeneralAccountBalance)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                      <th className="py-2.5 pr-4">Data</th>
                      <th className="py-2.5 pr-4">Turma de Origem</th>
                      <th className="py-2.5 pr-4">Igreja</th>
                      <th className="py-2.5 pr-4">Observação</th>
                      <th className="py-2.5 pr-4">Responsável</th>
                      <th className="py-2.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {transfers.map((tr) => (
                      <tr key={tr.id}>
                        <td className="font-mono-tabular py-3 pr-4">
                          {tr.date.split('-').reverse().join('/')}
                        </td>
                        <td className="py-3 pr-4 font-semibold text-[var(--text-primary)]">
                          {tr.turmaName}
                        </td>
                        <td className="py-3 pr-4 text-[var(--text-secondary)]">{tr.churchName}</td>
                        <td className="py-3 pr-4 text-[var(--text-secondary)]">{tr.observation}</td>
                        <td className="py-3 pr-4 text-[var(--text-secondary)]">
                          {tr.transferredBy}
                        </td>
                        <td className="font-mono-tabular py-3 text-right font-bold text-emerald-700">
                          + {formatBRL(tr.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 3: NOTIFICAÇÕES DE VENCIMENTO */}
      {finTab === 'notificacoes' && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
            Acompanhamento de Vencimentos
          </h3>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Lembretes diários ativos a partir de 7 dias antes do vencimento e parcelas vencidas.
          </p>

          <div className="mt-4 space-y-3">
            {notifications.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                Nenhuma parcela vencida ou próxima do vencimento nos próximos 7 dias.
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${
                    n.severity === 'Vencida'
                      ? 'border-red-200 bg-red-50/70'
                      : 'border-amber-200 bg-amber-50/70'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`font-bold ${
                          n.severity === 'Vencida' ? 'text-red-800' : 'text-amber-900'
                        }`}
                      >
                        {n.severity}
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {n.turmaName}
                      </span>
                      <span>·</span>
                      <span className="font-mono-tabular font-semibold">
                        Venc.: {n.dueDate.split('-').reverse().join('/')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-primary)]">{n.message}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono-tabular text-sm font-bold text-[var(--text-primary)]">
                      {formatBRL(n.amount)}
                    </span>
                    {permissions.canManageOwnTurmaFinancial && (
                      <button
                        type="button"
                        onClick={() => {
                          const res = onMarkInstallmentPaid(n.entryId, n.installmentId);
                          setBanner({
                            type: res.ok ? 'success' : 'error',
                            text: res.message,
                          });
                        }}
                        className="rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
