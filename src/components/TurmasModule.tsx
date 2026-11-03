import React, { useState } from 'react';
import {
  Plus,
  UserPlus,
  UserMinus,
  AlertCircle,
  CheckCircle2,
  Power,
  Edit3,
  X,
} from 'lucide-react';
import {
  ALL_SERVO_FUNCTIONS,
  Church,
  Person,
  ServoFunction,
  Turma,
} from '../domain/types';
import {
  generateTurmaName,
  RolePermissions,
  validateParticipantSemesterUniqueness,
} from '../domain/rules';

interface TurmasModuleProps {
  turmas: Turma[];
  churches: Church[];
  people: Person[];
  selectedTurmaId: string;
  onSelectTurmaId: (id: string) => void;
  permissions: RolePermissions;
  onCreateTurma: (payload: {
    churchId: string;
    semester: 1 | 2;
    year: number;
    meetingDay: 'Segunda-feira' | 'Terça-feira';
    courseStartDate: string;
    formationStartDate: string;
    formationEndDate: string;
  }) => { ok: boolean; message: string; newTurmaId?: string };
  onToggleTurmaActive: (turmaId: string) => void;
  onAddParticipantToTurma: (
    turmaId: string,
    personId: string,
    role: 'Cursista' | 'Servo',
    servoFunctions: ServoFunction[]
  ) => { ok: boolean; message: string };
  onRegisterCursistaDropOut: (turmaId: string, personId: string, reason: string) => void;
  onUpdateServoFunctions: (
    turmaId: string,
    personId: string,
    servoFunctions: ServoFunction[]
  ) => void;
  onUpdateMeetingInfo: (
    turmaId: string,
    modality: 'Curso' | 'Formação',
    meetingNumber: number,
    date: string,
    theme: string
  ) => void;
  onOpenAttendanceShortcut: (turmaId: string) => void;
}

export const TurmasModule: React.FC<TurmasModuleProps> = ({
  turmas,
  churches,
  people,
  selectedTurmaId,
  onSelectTurmaId,
  permissions,
  onCreateTurma,
  onToggleTurmaActive,
  onAddParticipantToTurma,
  onRegisterCursistaDropOut,
  onUpdateMeetingInfo,
  onOpenAttendanceShortcut,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [detailTab, setDetailTab] = useState<'participantes' | 'encontros'>('participantes');

  const [churchId, setChurchId] = useState(churches[0]?.id || '');
  const [semester, setSemester] = useState<1 | 2>(2);
  const [year, setYear] = useState<number>(2026);
  const [meetingDay, setMeetingDay] = useState<'Segunda-feira' | 'Terça-feira'>('Segunda-feira');
  const [courseStartDate, setCourseStartDate] = useState('2026-07-06');
  const [formationStartDate, setFormationStartDate] = useState('2026-07-02');
  const [formationEndDate, setFormationEndDate] = useState('2026-11-12');

  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [participantRole, setParticipantRole] = useState<'Cursista' | 'Servo'>('Cursista');
  const [selectedFunctions, setSelectedFunctions] = useState<ServoFunction[]>(['Servo']);
  const [dropOutReason, setDropOutReason] = useState('Mudança de horário / motivos pessoais');

  const [editingMeetingModality, setEditingMeetingModality] = useState<'Curso' | 'Formação'>('Curso');
  const [editingMeetingNum, setEditingMeetingNum] = useState<number>(1);
  const [editingMeetingDate, setEditingMeetingDate] = useState('');
  const [editingMeetingTheme, setEditingMeetingTheme] = useState('');

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const currentTurma = turmas.find((t) => t.id === selectedTurmaId) || turmas[0];
  const selectedChurchObj = churches.find((c) => c.id === churchId) || churches[0];
  const previewName = selectedChurchObj
    ? generateTurmaName(selectedChurchObj.name, semester, year)
    : '';

  const personMap = new Map(people.map((p) => [p.id, p]));

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onCreateTurma({
      churchId: selectedChurchObj?.id || churchId,
      semester,
      year,
      meetingDay,
      courseStartDate,
      formationStartDate,
      formationEndDate,
    });
    if (res.ok) {
      setStatusMessage({ type: 'success', text: res.message });
      setShowCreateForm(false);
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  const handleLinkParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTurma || !selectedPersonId) {
      setStatusMessage({
        type: 'error',
        text: 'Selecione uma pessoa cadastrada para vincular à turma.',
      });
      return;
    }

    const res = onAddParticipantToTurma(
      currentTurma.id,
      selectedPersonId,
      participantRole,
      participantRole === 'Servo' ? selectedFunctions : []
    );
    setStatusMessage({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
    if (res.ok) {
      setSelectedPersonId('');
      setShowLinkForm(false);
    }
  };

  const toggleServoFunctionSelection = (fn: ServoFunction) => {
    setSelectedFunctions((prev) =>
      prev.includes(fn) ? prev.filter((item) => item !== fn) : [...prev, fn]
    );
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho Limpo */}
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
            Turmas e Encontros
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Administre turmas por paróquia e semestre, participantes vinculados e o cronograma dos encontros.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentTurma && (
            <button
              type="button"
              onClick={() => onOpenAttendanceShortcut(currentTurma.id)}
              className="rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            >
              Ir para Chamada
            </button>
          )}
          {permissions.canManageTurmas && (
            <button
              type="button"
              onClick={() => setShowCreateForm((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              <Plus className="h-4 w-4" />
              {showCreateForm ? 'Fechar Formulário' : 'Nova Turma'}
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div
          role="alert"
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          <span className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            )}
            {statusMessage.text}
          </span>
          <button type="button" onClick={() => setStatusMessage(null)} className="underline">
            Fechar
          </button>
        </div>
      )}

      {/* Formulário de Criação de Turma */}
      {showCreateForm && permissions.canManageTurmas && (
        <form
          onSubmit={handleCreateSubmit}
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
        >
          <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
            Cadastrar Nova Turma
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="new-turma-church"
                className="block text-xs font-semibold text-[var(--text-primary)]"
              >
                Igreja Vinculada
              </label>
              <select
                id="new-turma-church"
                value={churchId}
                onChange={(e) => setChurchId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
              >
                {churches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="new-turma-semester"
                className="block text-xs font-semibold text-[var(--text-primary)]"
              >
                Semestre
              </label>
              <select
                id="new-turma-semester"
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value) as 1 | 2)}
                className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
              >
                <option value={1}>1º Semestre (01)</option>
                <option value={2}>2º Semestre (02)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="new-turma-year"
                className="block text-xs font-semibold text-[var(--text-primary)]"
              >
                Ano
              </label>
              <input
                id="new-turma-year"
                type="number"
                min={2024}
                max={2035}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="font-mono-tabular mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="new-turma-weekday"
                className="block text-xs font-semibold text-[var(--text-primary)]"
              >
                Dia dos Encontros
              </label>
              <select
                id="new-turma-weekday"
                value={meetingDay}
                onChange={(e) =>
                  setMeetingDay(e.target.value as 'Segunda-feira' | 'Terça-feira')
                }
                className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
              >
                <option value="Segunda-feira">Segunda-feira</option>
                <option value="Terça-feira">Terça-feira</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="new-turma-course-start"
                className="block text-xs font-semibold text-[var(--text-primary)]"
              >
                1º Encontro do Curso
              </label>
              <input
                id="new-turma-course-start"
                type="date"
                value={courseStartDate}
                onChange={(e) => setCourseStartDate(e.target.value)}
                className="font-mono-tabular mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="new-turma-form-start"
                className="block text-xs font-semibold text-[var(--text-primary)]"
              >
                Início da Formação (Quinta)
              </label>
              <input
                id="new-turma-form-start"
                type="date"
                value={formationStartDate}
                onChange={(e) => setFormationStartDate(e.target.value)}
                className="font-mono-tabular mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="new-turma-form-end"
                className="block text-xs font-semibold text-[var(--text-primary)]"
              >
                Fim da Formação
              </label>
              <input
                id="new-turma-form-end"
                type="date"
                value={formationEndDate}
                onChange={(e) => setFormationEndDate(e.target.value)}
                className="font-mono-tabular mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
              />
            </div>

            <div className="flex flex-col justify-end">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Nome Gerado:
              </span>
              <div className="mt-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-bold text-[var(--text-primary)]">
                {previewName}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              Salvar Turma
            </button>
          </div>
        </form>
      )}

      {/* Lista de Turmas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {turmas.map((t) => {
          const isSelected = currentTurma?.id === t.id;
          const cursistasCount = t.participants.filter((p) => p.role === 'Cursista').length;
          const servosCount = t.participants.filter((p) => p.role === 'Servo').length;

          return (
            <div
              key={t.id}
              onClick={() => onSelectTurmaId(t.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelectTurmaId(t.id);
              }}
              className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                isSelected
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]/50'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
                  {t.name}
                </h3>
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  {t.active ? 'Ativa' : 'Histórico'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span>{t.meetingDay}</span>
                <span>·</span>
                <span className="font-mono-tabular">{cursistasCount} cursistas</span>
                <span>·</span>
                <span className="font-mono-tabular">{servosCount} servos</span>
              </div>
              {permissions.canManageTurmas && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTurmaActive(t.id);
                    }}
                    className="flex items-center gap-1 rounded border border-[var(--border-subtle)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Power className="h-3 w-3" />
                    {t.active ? 'Desativar' : 'Reativar'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detalhes da Turma Selecionada com Abas Limpas */}
      {currentTurma && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-subtle)] p-1">
              <button
                type="button"
                onClick={() => setDetailTab('participantes')}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${
                  detailTab === 'participantes'
                    ? 'bg-white text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Participantes ({currentTurma.participants.length})
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('encontros')}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${
                  detailTab === 'encontros'
                    ? 'bg-white text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Cronograma de Encontros (19 Curso / 20 Formação)
              </button>
            </div>

            {detailTab === 'participantes' && (
              <button
                type="button"
                onClick={() => setShowLinkForm((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                <UserPlus className="h-4 w-4" />
                {showLinkForm ? 'Fechar Vínculo' : 'Vincular Participante'}
              </button>
            )}
          </div>

          {detailTab === 'participantes' ? (
            <div className="mt-4 space-y-5">
              {showLinkForm && (
                <form
                  onSubmit={handleLinkParticipant}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-xs font-bold text-[var(--text-primary)]">
                      Vincular Pessoa à Turma {currentTurma.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowLinkForm(false)}
                      className="text-[var(--text-muted)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="link-person-select"
                        className="block text-xs font-semibold text-[var(--text-primary)]"
                      >
                        Pessoa Cadastrada
                      </label>
                      <select
                        id="link-person-select"
                        value={selectedPersonId}
                        onChange={(e) => setSelectedPersonId(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                      >
                        <option value="">-- Escolha uma pessoa --</option>
                        {people
                          .filter((p) => p.active)
                          .map((p) => {
                            const uniqueness = validateParticipantSemesterUniqueness(
                              p.id,
                              currentTurma.id,
                              currentTurma.semester,
                              currentTurma.year,
                              turmas
                            );
                            const alreadyHere = currentTurma.participants.some(
                              (part) => part.personId === p.id && part.activeInTurma
                            );
                            return (
                              <option key={p.id} value={p.id}>
                                {p.fullName}{' '}
                                {alreadyHere
                                  ? '(Já nesta turma)'
                                  : !uniqueness.valid
                                  ? `(Em outra turma 0${currentTurma.semester}/${currentTurma.year})`
                                  : ''}
                              </option>
                            );
                          })}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="link-role-select"
                        className="block text-xs font-semibold text-[var(--text-primary)]"
                      >
                        Papel na Turma
                      </label>
                      <select
                        id="link-role-select"
                        value={participantRole}
                        onChange={(e) =>
                          setParticipantRole(e.target.value as 'Cursista' | 'Servo')
                        }
                        className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                      >
                        <option value="Cursista">Cursista</option>
                        <option value="Servo">Servo</option>
                      </select>
                    </div>
                  </div>

                  {participantRole === 'Servo' && (
                    <div>
                      <span className="block text-xs font-semibold text-[var(--text-primary)]">
                        Funções do Servo:
                      </span>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {ALL_SERVO_FUNCTIONS.map((fn) => {
                          const active = selectedFunctions.includes(fn);
                          return (
                            <button
                              key={fn}
                              type="button"
                              onClick={() => toggleServoFunctionSelection(fn)}
                              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                                active
                                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white'
                                  : 'border-[var(--border-subtle)] bg-white text-[var(--text-secondary)]'
                              }`}
                            >
                              {fn}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
                    >
                      Confirmar Vínculo
                    </button>
                  </div>
                </form>
              )}

              <div className="divide-y divide-[var(--border-subtle)]">
                {currentTurma.participants.map((p) => {
                  const person = personMap.get(p.personId);
                  if (!person) return null;
                  return (
                    <div
                      key={p.personId}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {person.fullName}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">
                            · {p.role}
                            {p.servoFunctions.length > 0 && ` (${p.servoFunctions.join(', ')})`}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          Situação: <strong>{p.situation}</strong>
                          {p.deactivationReason && ` — ${p.deactivationReason}`}
                        </div>
                      </div>

                      {p.role === 'Cursista' && p.activeInTurma && (
                        <button
                          type="button"
                          onClick={() =>
                            onRegisterCursistaDropOut(
                              currentTurma.id,
                              p.personId,
                              dropOutReason
                            )
                          }
                          className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          Registrar Desistência
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-3 lg:col-span-5">
                <h4 className="font-display text-sm font-bold text-[var(--text-primary)]">
                  Ajustar Data ou Tema de Encontro
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="edit-meeting-modality"
                      className="block text-xs font-semibold text-[var(--text-primary)]"
                    >
                      Modalidade
                    </label>
                    <select
                      id="edit-meeting-modality"
                      value={editingMeetingModality}
                      onChange={(e) => {
                        setEditingMeetingModality(e.target.value as 'Curso' | 'Formação');
                        setEditingMeetingNum(1);
                      }}
                      className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-2.5 py-1.5 text-xs"
                    >
                      <option value="Curso">Curso (19 Encontros)</option>
                      <option value="Formação">Formação (20 Encontros)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="edit-meeting-number"
                      className="block text-xs font-semibold text-[var(--text-primary)]"
                    >
                      Encontro
                    </label>
                    <select
                      id="edit-meeting-number"
                      value={editingMeetingNum}
                      onChange={(e) => {
                        const num = Number(e.target.value);
                        setEditingMeetingNum(num);
                        const list =
                          editingMeetingModality === 'Curso'
                            ? currentTurma.courseMeetings
                            : currentTurma.formationMeetings;
                        const found = list.find((m) => m.number === num);
                        if (found) {
                          setEditingMeetingDate(found.date);
                          setEditingMeetingTheme(found.theme);
                        }
                      }}
                      className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-2.5 py-1.5 text-xs"
                    >
                      {(editingMeetingModality === 'Curso'
                        ? currentTurma.courseMeetings
                        : currentTurma.formationMeetings
                      ).map((m) => (
                        <option key={m.number} value={m.number}>
                          #{m.number} ({m.date.split('-').reverse().join('/')})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="edit-meeting-date"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Data
                  </label>
                  <input
                    id="edit-meeting-date"
                    type="date"
                    value={editingMeetingDate}
                    onChange={(e) => setEditingMeetingDate(e.target.value)}
                    className="font-mono-tabular mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-meeting-theme"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Tema
                  </label>
                  <input
                    id="edit-meeting-theme"
                    type="text"
                    value={editingMeetingTheme}
                    onChange={(e) => setEditingMeetingTheme(e.target.value)}
                    placeholder="Informe o tema do encontro"
                    className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!editingMeetingDate && !editingMeetingTheme) return;
                    const list =
                      editingMeetingModality === 'Curso'
                        ? currentTurma.courseMeetings
                        : currentTurma.formationMeetings;
                    const current = list.find((m) => m.number === editingMeetingNum);
                    onUpdateMeetingInfo(
                      currentTurma.id,
                      editingMeetingModality,
                      editingMeetingNum,
                      editingMeetingDate || current?.date || '2026-10-29',
                      editingMeetingTheme || current?.theme || `Encontro #${editingMeetingNum}`
                    );
                    setStatusMessage({
                      type: 'success',
                      text: `${editingMeetingModality} #${editingMeetingNum} atualizado com sucesso!`,
                    });
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Salvar Alteração
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-1.5 text-xs lg:col-span-7">
                {(editingMeetingModality === 'Curso'
                  ? currentTurma.courseMeetings
                  : currentTurma.formationMeetings
                ).map((m) => (
                  <div
                    key={m.number}
                    className="flex items-center justify-between rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 px-3 py-2"
                  >
                    <span className="truncate font-medium text-[var(--text-primary)]">
                      {m.theme}
                    </span>
                    <span className="font-mono-tabular ml-2 shrink-0 text-[var(--text-secondary)]">
                      {m.date.split('-').reverse().join('/')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
