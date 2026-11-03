import React, { useState } from 'react';
import {
  Award,
  FileDown,
  Printer,
  Upload,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import {
  AppNotification,
  CertificateIssued,
  Church,
  FinancialEntry,
  GeneralTransfer,
  OrganizationSettings,
  Person,
  SystemRole,
  Turma,
} from '../domain/types';
import {
  calculateTurmaBalance,
  canEmitCertificateForCursista,
  countCourseAbsencesForPerson,
  countFormationAbsencesForServo,
  RolePermissions,
} from '../domain/rules';
import { downloadCertificatePdf } from '../utils/pdfCertificate';

interface CertificatesAndReportsModuleProps {
  mode: 'certificados' | 'relatorios';
  turmas: Turma[];
  churches: Church[];
  people: Person[];
  entries: FinancialEntry[];
  transfers: GeneralTransfer[];
  notifications: AppNotification[];
  certificatesIssued: CertificateIssued[];
  settings: OrganizationSettings;
  selectedTurmaId: string;
  onSelectTurmaId: (id: string) => void;
  permissions: RolePermissions;
  currentRole: SystemRole;
  currentActorName: string;
  onRecordCertificateIssued: (cert: Omit<CertificateIssued, 'id'>) => void;
  onUpdateSettings: (partial: Partial<OrganizationSettings>) => void;
}

type ReportId =
  | 'RF-077'
  | 'RF-078'
  | 'RF-079'
  | 'RF-080'
  | 'RF-081'
  | 'RF-082'
  | 'RF-083'
  | 'RF-084'
  | 'RF-085'
  | 'RF-086'
  | 'RF-087';

const REPORTS_CATALOG: { id: ReportId; title: string; description: string }[] = [
  {
    id: 'RF-077',
    title: '01. Balancete Financeiro por Turma e Igreja',
    description: 'Consolidado de receitas, despesas, transferências e saldo por turma e igreja.',
  },
  {
    id: 'RF-078',
    title: '02. Contas a Pagar e a Receber',
    description: 'Relação detalhada de todos os lançamentos financeiros e formas de pagamento.',
  },
  {
    id: 'RF-079',
    title: '03. Parcelas Vencidas e Próximas do Vencimento',
    description: 'Monitoramento de parcelas em atraso e com vencimento nos próximos 7 dias.',
  },
  {
    id: 'RF-080',
    title: '04. Saldo por Turma e por Igreja',
    description: 'Posição de caixa disponível de cada turma e acumulado por paróquia.',
  },
  {
    id: 'RF-081',
    title: '05. Frequência por Turma e por Cursista',
    description: 'Presenças, faltas nos 19 encontros do curso e situação atual de cada cursista.',
  },
  {
    id: 'RF-082',
    title: '06. Frequência dos Servos (Curso vs. Formação)',
    description: 'Controle separado de faltas nos 19 encontros do curso e nos 20 encontros de formação.',
  },
  {
    id: 'RF-083',
    title: '07. Desistentes no Semestre (Para Novo Convite)',
    description: 'Relação de cursistas desistentes no semestre com motivo registrado para convite futuro.',
  },
  {
    id: 'RF-084',
    title: '08. Conclusão do Curso',
    description: 'Cursistas aptos/concluintes vs. reprovados por frequência na turma.',
  },
  {
    id: 'RF-085',
    title: '09. Histórico Completo do Cursista por Semestre',
    description: 'Trajetória completa com igreja/capela, semestre e situação final.',
  },
  {
    id: 'RF-086',
    title: '10. Histórico de Funções Exercidas por Servo',
    description: 'Registro histórico das funções desempenhadas por cada servo por turma e semestre.',
  },
  {
    id: 'RF-087',
    title: '11. Certificados Emitidos',
    description: 'Relação nominal de todos os certificados individuais em PDF gerados.',
  },
];

export const CertificatesAndReportsModule: React.FC<CertificatesAndReportsModuleProps> = ({
  mode,
  turmas,
  churches,
  people,
  entries,
  transfers,
  notifications,
  certificatesIssued,
  settings,
  selectedTurmaId,
  onSelectTurmaId,
  permissions,
  currentRole,
  currentActorName,
  onRecordCertificateIssued,
  onUpdateSettings,
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportId>('RF-077');
  const [conclusionDateInput, setConclusionDateInput] = useState('2026-11-16');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const currentTurma = turmas.find((t) => t.id === selectedTurmaId) || turmas[0];
  const personMap = new Map(people.map((p) => [p.id, p]));

  const finalizedCourseMeetingsCount = currentTurma
    ? currentTurma.courseMeetings.filter((m) => m.cursistaCallFinalized).length
    : 0;

  const handleTemplatePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setStatusMessage('Envie um arquivo em formato PDF válido para o modelo de certificado (RF-049).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateSettings({
          certificateTemplatePdfBase64: reader.result,
          certificateTemplateFileName: file.name,
        });
        setStatusMessage(`Modelo de certificado PDF "${file.name}" carregado com sucesso!`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEmitCertificate = async (person: Person) => {
    if (!currentTurma) return;
    await downloadCertificatePdf({
      cursistaName: person.fullName,
      churchName: currentTurma.churchName,
      turmaName: currentTurma.name,
      conclusionDate: conclusionDateInput,
      settings,
    });
    onRecordCertificateIssued({
      personId: person.id,
      personName: person.fullName,
      turmaId: currentTurma.id,
      turmaName: currentTurma.name,
      churchName: currentTurma.churchName,
      conclusionDate: conclusionDateInput,
      issuedAt: new Date().toISOString().slice(0, 10),
      issuedBy: currentActorName,
    });
    setStatusMessage(
      `Certificado PDF individual gerado para ${person.fullName} (${currentTurma.name})!`
    );
  };

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Escopo de turmas visíveis nos relatórios (Seção 4.13 / CA-019 / CA-020):
  // Supervisor, Coordenador Local e Administrador podem ver todas as turmas ou selecionar uma;
  // Formador, Servo, Servo Auxiliar e Financeiro acessam somente a própria turma.
  const scopedTurmas = permissions.canViewAllTurmas
    ? turmas
    : currentTurma
    ? [currentTurma]
    : [];

  if (mode === 'certificados') {
    if (!permissions.canAccessCertificates) {
      return (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
          <Lock className="mx-auto h-8 w-8 text-amber-600" />
          <h3 className="mt-2 font-display text-base font-bold text-[var(--text-primary)]">
            Acesso a Certificados Não Habilitado para {currentRole}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            A emissão de certificados é permitida para Servo, Servo Auxiliar,
            Formador, Supervisor, Coordenador Local e Administrador.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
              Certificados Individuais em PDF
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Liberado após o 17º encontro finalizado para cursistas aptos (menos de 4 faltas). Preenche automaticamente nome, igreja, data e logo no canto superior esquerdo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {currentTurma && (
              <select
                aria-label="Selecionar turma para emissão de certificados"
                value={currentTurma.id}
                onChange={(e) => onSelectTurmaId(e.target.value)}
                className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs font-semibold"
              >
                {scopedTurmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-2">
              <label htmlFor="cert-conclusion-date" className="text-xs font-semibold">
                Data de Conclusão:
              </label>
              <input
                id="cert-conclusion-date"
                type="date"
                value={conclusionDateInput}
                onChange={(e) => setConclusionDateInput(e.target.value)}
                className="font-mono-tabular rounded-lg border border-[var(--border-subtle)] bg-white px-2.5 py-1.5 text-xs"
              />
            </div>
          </div>
        </div>

        {statusMessage && (
          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {statusMessage}
            </span>
            <button type="button" onClick={() => setStatusMessage(null)} className="underline">
              Fechar
            </button>
          </div>
        )}

        {/* Upload de Modelo de Certificado em PDF pelo Administrador */}
        {permissions.canManageCertificateTemplateAndLogo && (
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
                Modelo de Certificado em PDF (Administrador)
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Modelo atual:{' '}
                <strong>
                  {settings.certificateTemplateFileName ||
                    'Moldura Institucional Padrão Missão EncheiVos (A4 Paisagem)'}
                </strong>
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]">
              <Upload className="h-4 w-4" />
              Enviar Modelo PDF de Fundo
              <input
                type="file"
                accept="application/pdf"
                onChange={handleTemplatePdfUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Lista de Cursistas da Turma e Elegibilidade de Certificado */}
        {currentTurma && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                Cursistas de {currentTurma.name} — Encontros Finalizados:{' '}
                <span className="font-mono-tabular">{finalizedCourseMeetingsCount}/19</span>
              </h3>
              <span className="text-xs text-[var(--text-secondary)]">
                Requisito mínimo: 17º encontro finalizado e &lt; 4 faltas
              </span>
            </div>

            <div className="divide-y divide-[var(--border-subtle)]">
              {currentTurma.participants
                .filter((p) => p.role === 'Cursista')
                .map((part) => {
                  const person = personMap.get(part.personId);
                  if (!person) return null;
                  const absences = countCourseAbsencesForPerson(
                    part.personId,
                    currentTurma.courseMeetings,
                    'Cursista'
                  );
                  const eligibility = canEmitCertificateForCursista(
                    part,
                    absences,
                    finalizedCourseMeetingsCount
                  );

                  return (
                    <div
                      key={part.personId}
                      className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <span className="font-display text-sm font-bold text-[var(--text-primary)]">
                          {person.fullName}
                        </span>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <span className="font-mono-tabular font-semibold">
                            Faltas: {absences}/4
                          </span>
                          <span>·</span>
                          <span>Situação: {part.situation}</span>
                          <span>·</span>
                          <span
                            className={
                              eligibility.eligible
                                ? 'font-semibold text-emerald-700'
                                : 'text-red-700'
                            }
                          >
                            {eligibility.eligible
                              ? 'Apto para Certificado'
                              : eligibility.reason}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!eligibility.eligible}
                        onClick={() => handleEmitCertificate(person)}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                          eligibility.eligible
                            ? 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]'
                            : 'cursor-not-allowed bg-slate-200 text-slate-500'
                        }`}
                      >
                        <FileDown className="h-4 w-4" />
                        Gerar Certificado PDF
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // MODO RELATÓRIOS
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
            Central de Relatórios
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Relatórios operacionais, históricos e financeiros filtrados conforme o escopo do perfil atual (
            <strong>{currentRole}</strong>).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          >
            <Printer className="h-4 w-4" />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* Catálogo dos 11 Relatórios */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 lg:col-span-4">
          <h3 className="mb-2 font-display text-xs font-bold tracking-wide text-[var(--text-secondary)]">
            Catálogo de Relatórios
          </h3>
          {REPORTS_CATALOG.map((rep) => (
            <button
              key={rep.id}
              type="button"
              onClick={() => setSelectedReport(rep.id)}
              className={`w-full rounded-lg px-3 py-2.5 text-left text-xs transition-colors ${
                selectedReport === rep.id
                  ? 'bg-[var(--accent-primary)] font-semibold text-white'
                  : 'text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <div>{rep.title}</div>
            </button>
          ))}
        </div>

        {/* Visualização do Relatório Selecionado com Logo no Canto Superior Esquerdo (RF-060) */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 lg:col-span-8">
          <div className="mb-5 flex items-start justify-between border-b border-[var(--border-subtle)] pb-4">
            <div className="flex items-center gap-3">
              {settings.logoDataUrl ? (
                <img
                  src={settings.logoDataUrl}
                  alt={settings.organizationName}
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded object-contain"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-primary)] font-display text-xs font-bold text-white">
                  EV
                </div>
              )}
              <div>
                <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                  {REPORTS_CATALOG.find((r) => r.id === selectedReport)?.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {settings.organizationName} · Escopo:{' '}
                  {permissions.canViewAllTurmas
                    ? 'Todas as Turmas e Igrejas'
                    : `Turma: ${currentTurma?.name}`}
                </p>
              </div>
            </div>
          </div>

          {/* Conteúdo Dinâmico de cada Relatório */}
          {(selectedReport === 'RF-077' || selectedReport === 'RF-080') && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    <th className="py-2 pr-3">Turma</th>
                    <th className="py-2 pr-3">Igreja</th>
                    <th className="py-2 pr-3 text-right">Recebido</th>
                    <th className="py-2 pr-3 text-right">Pago</th>
                    <th className="py-2 pr-3 text-right">Repasse C. Geral</th>
                    <th className="py-2 text-right">Saldo Disponível</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {scopedTurmas.map((t) => {
                    const b = calculateTurmaBalance(t.id, entries, transfers);
                    return (
                      <tr key={t.id}>
                        <td className="py-2.5 pr-3 font-semibold">{t.name}</td>
                        <td className="py-2.5 pr-3 text-[var(--text-secondary)]">{t.churchName}</td>
                        <td className="font-mono-tabular py-2.5 pr-3 text-right text-emerald-700">
                          {formatBRL(b.totalReceived)}
                        </td>
                        <td className="font-mono-tabular py-2.5 pr-3 text-right text-red-700">
                          {formatBRL(b.totalPaid)}
                        </td>
                        <td className="font-mono-tabular py-2.5 pr-3 text-right">
                          {formatBRL(b.totalTransferred)}
                        </td>
                        <td className="font-mono-tabular py-2.5 text-right font-bold text-[var(--accent-primary)]">
                          {formatBRL(b.availableBalance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {selectedReport === 'RF-078' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    <th className="py-2 pr-3">Turma</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Observação</th>
                    <th className="py-2 pr-3">Forma</th>
                    <th className="py-2 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {entries
                    .filter((e) => scopedTurmas.some((t) => t.id === e.turmaId))
                    .map((e) => {
                      const tName = turmas.find((t) => t.id === e.turmaId)?.name || e.turmaId;
                      return (
                        <tr key={e.id}>
                          <td className="py-2.5 pr-3 font-medium">{tName}</td>
                          <td className="py-2.5 pr-3">{e.type}</td>
                          <td className="py-2.5 pr-3">{e.observation}</td>
                          <td className="py-2.5 pr-3">{e.paymentMethod}</td>
                          <td className="font-mono-tabular py-2.5 text-right font-semibold">
                            {formatBRL(e.totalAmount)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {selectedReport === 'RF-079' && (
            <div className="space-y-2">
              {notifications
                .filter((n) => scopedTurmas.some((t) => t.id === n.turmaId))
                .map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between rounded border border-[var(--border-subtle)] p-3 text-xs"
                  >
                    <div>
                      <span className="font-bold">[{n.severity}]</span> {n.turmaName} —{' '}
                      {n.observation} (Parcela {n.installmentNumber}/{n.totalInstallments})
                    </div>
                    <span className="font-mono-tabular font-bold">
                      {n.dueDate.split('-').reverse().join('/')} · {formatBRL(n.amount)}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {(selectedReport === 'RF-081' || selectedReport === 'RF-084') && currentTurma && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    <th className="py-2 pr-3">Cursista</th>
                    <th className="py-2 pr-3">Turma</th>
                    <th className="py-2 pr-3 text-right">Faltas Acumuladas</th>
                    <th className="py-2 text-right">Situação Final / Atual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {currentTurma.participants
                    .filter((p) => p.role === 'Cursista')
                    .map((p) => {
                      const person = personMap.get(p.personId);
                      const faults = countCourseAbsencesForPerson(
                        p.personId,
                        currentTurma.courseMeetings,
                        'Cursista'
                      );
                      return (
                        <tr key={p.personId}>
                          <td className="py-2.5 pr-3 font-semibold">{person?.fullName}</td>
                          <td className="py-2.5 pr-3">{currentTurma.name}</td>
                          <td className="font-mono-tabular py-2.5 pr-3 text-right">{faults}/4</td>
                          <td className="py-2.5 text-right font-semibold">{p.situation}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {selectedReport === 'RF-082' && currentTurma && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    <th className="py-2 pr-3">Servo</th>
                    <th className="py-2 pr-3">Funções</th>
                    <th className="py-2 pr-3 text-right">Faltas no Curso (19)</th>
                    <th className="py-2 text-right">Faltas na Formação (20)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {currentTurma.participants
                    .filter((p) => p.role === 'Servo')
                    .map((p) => {
                      const person = personMap.get(p.personId);
                      const cFaults = countCourseAbsencesForPerson(
                        p.personId,
                        currentTurma.courseMeetings,
                        'Servo'
                      );
                      const fFaults = countFormationAbsencesForServo(
                        p.personId,
                        currentTurma.formationMeetings
                      );
                      return (
                        <tr key={p.personId}>
                          <td className="py-2.5 pr-3 font-semibold">{person?.fullName}</td>
                          <td className="py-2.5 pr-3">{p.servoFunctions.join(', ')}</td>
                          <td className="font-mono-tabular py-2.5 pr-3 text-right">{cFaults}/3</td>
                          <td className="font-mono-tabular py-2.5 text-right">{fFaults}/3</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {selectedReport === 'RF-083' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    <th className="py-2 pr-3">Cursista Desistente</th>
                    <th className="py-2 pr-3">E-mail / Contato</th>
                    <th className="py-2 pr-3">Turma / Semestre</th>
                    <th className="py-2">Motivo Registrado (RF-090)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {scopedTurmas.flatMap((t) =>
                    t.participants
                      .filter((p) => p.situation === 'Desistente')
                      .map((p) => {
                        const person = personMap.get(p.personId);
                        return (
                          <tr key={`${t.id}-${p.personId}`}>
                            <td className="py-2.5 pr-3 font-semibold">{person?.fullName}</td>
                            <td className="py-2.5 pr-3">{person?.email}</td>
                            <td className="py-2.5 pr-3">{t.name}</td>
                            <td className="py-2.5">{p.deactivationReason || 'Desistência'}</td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {(selectedReport === 'RF-085' || selectedReport === 'RF-086') && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    <th className="py-2 pr-3">Pessoa</th>
                    <th className="py-2 pr-3">Semestre</th>
                    <th className="py-2 pr-3">Igreja / Turma</th>
                    <th className="py-2 pr-3">Papel / Funções</th>
                    <th className="py-2 text-right">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {people.flatMap((person) =>
                    person.history
                      .filter((h) =>
                        selectedReport === 'RF-086' ? h.roleType === 'Servo' : true
                      )
                      .map((h) => (
                        <tr key={h.id}>
                          <td className="py-2.5 pr-3 font-semibold">{person.fullName}</td>
                          <td className="font-mono-tabular py-2.5 pr-3">{h.semesterLabel}</td>
                          <td className="py-2.5 pr-3">{h.turmaName}</td>
                          <td className="py-2.5 pr-3">
                            {h.roleType}
                            {h.servoFunctions.length > 0 && ` (${h.servoFunctions.join(', ')})`}
                          </td>
                          <td className="py-2.5 text-right">{h.finalStatus}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {selectedReport === 'RF-087' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    <th className="py-2 pr-3">Cursista</th>
                    <th className="py-2 pr-3">Turma / Igreja</th>
                    <th className="py-2 pr-3">Data de Conclusão</th>
                    <th className="py-2 text-right">Emitido por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {certificatesIssued.map((cert) => (
                    <tr key={cert.id}>
                      <td className="py-2.5 pr-3 font-semibold">{cert.personName}</td>
                      <td className="py-2.5 pr-3">{cert.turmaName}</td>
                      <td className="font-mono-tabular py-2.5 pr-3">
                        {cert.conclusionDate.split('-').reverse().join('/')}
                      </td>
                      <td className="py-2.5 text-right">{cert.issuedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
