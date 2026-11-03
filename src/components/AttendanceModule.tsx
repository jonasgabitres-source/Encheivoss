import React, { useState } from 'react';
import {
  Check,
  X,
  RotateCcw,
  Lock,
  Ban,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Grid,
} from 'lucide-react';
import {
  AttendanceStatus,
  Person,
  SystemRole,
  Turma,
} from '../domain/types';
import {
  canFinalizeAttendanceCall,
  countCourseAbsencesForPerson,
  countFormationAbsencesForServo,
  RolePermissions,
} from '../domain/rules';

interface AttendanceModuleProps {
  turmas: Turma[];
  selectedTurmaId: string;
  onSelectTurmaId: (id: string) => void;
  people: Person[];
  permissions: RolePermissions;
  currentRole: SystemRole;
  onMarkCursistaAttendance: (
    turmaId: string,
    meetingNumber: number,
    personId: string,
    status: AttendanceStatus
  ) => void;
  onFinalizeCursistaCall: (turmaId: string, meetingNumber: number) => void;
  onReopenCursistaCall: (turmaId: string, meetingNumber: number) => void;
  onToggleCancelCourseMeeting: (turmaId: string, meetingNumber: number) => void;
  onMarkServoCourseAttendance: (
    turmaId: string,
    meetingNumber: number,
    personId: string,
    status: AttendanceStatus
  ) => void;
  onFinalizeServoCourseCall: (turmaId: string, meetingNumber: number) => void;
  onReopenServoCourseCall: (turmaId: string, meetingNumber: number) => void;
  onMarkServoFormationAttendance: (
    turmaId: string,
    meetingNumber: number,
    personId: string,
    status: AttendanceStatus
  ) => void;
  onFinalizeServoFormationCall: (turmaId: string, meetingNumber: number) => void;
  onReopenServoFormationCall: (turmaId: string, meetingNumber: number) => void;
}

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({
  turmas,
  selectedTurmaId,
  onSelectTurmaId,
  people,
  permissions,
  currentRole,
  onMarkCursistaAttendance,
  onFinalizeCursistaCall,
  onReopenCursistaCall,
  onToggleCancelCourseMeeting,
  onMarkServoCourseAttendance,
  onFinalizeServoCourseCall,
  onReopenServoCourseCall,
  onMarkServoFormationAttendance,
  onFinalizeServoFormationCall,
  onReopenServoFormationCall,
}) => {
  const [callTab, setCallTab] = useState<'cursistas' | 'servos-curso' | 'servos-formacao'>(
    'cursistas'
  );
  const [selectedCourseMeetingNum, setSelectedCourseMeetingNum] = useState<number>(18);
  const [selectedFormationMeetingNum, setSelectedFormationMeetingNum] = useState<number>(18);
  const [showMeetingGrid, setShowMeetingGrid] = useState<boolean>(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const currentTurma = turmas.find((t) => t.id === selectedTurmaId) || turmas[0];
  if (!currentTurma) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          Nenhuma turma disponível para registro de chamada.
        </p>
      </div>
    );
  }

  const personMap = new Map(people.map((p) => [p.id, p]));

  const courseMeeting =
    currentTurma.courseMeetings.find((m) => m.number === selectedCourseMeetingNum) ||
    currentTurma.courseMeetings[0];

  const formationMeeting =
    currentTurma.formationMeetings.find((m) => m.number === selectedFormationMeetingNum) ||
    currentTurma.formationMeetings[0];

  const allCursistas = currentTurma.participants.filter((p) => p.role === 'Cursista');
  const activeCursistas = allCursistas.filter((p) => p.activeInTurma);

  const allServos = currentTurma.participants.filter((p) => p.role === 'Servo');
  const activeServos = allServos.filter((p) => p.activeInTurma);

  const canFinalizeCursistas = courseMeeting
    ? canFinalizeAttendanceCall(
        activeCursistas.map((c) => c.personId),
        courseMeeting.cursistaAttendance
      )
    : false;

  const canFinalizeServosCourse = courseMeeting
    ? canFinalizeAttendanceCall(
        activeServos.map((s) => s.personId),
        courseMeeting.servoAttendance
      )
    : false;

  const canFinalizeServosFormation = formationMeeting
    ? canFinalizeAttendanceCall(
        activeServos.map((s) => s.personId),
        formationMeeting.servoAttendance
      )
    : false;

  const handleMarkAllPresentCursistas = () => {
    if (!courseMeeting || courseMeeting.cursistaCallFinalized) return;
    for (const c of activeCursistas) {
      onMarkCursistaAttendance(currentTurma.id, courseMeeting.number, c.personId, 'Presente');
    }
    setFeedbackBanner(
      'Todos os cursistas ativos foram marcados como Presente. Revise e clique em "Finalizar chamada".'
    );
  };

  return (
    <div className="space-y-5">
      {/* Barra Superior de Contexto: Turma + Modalidade da Chamada */}
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span>{currentTurma.churchName}</span>
            <span aria-hidden="true">·</span>
            <span>Semestre 0{currentTurma.semester}/{currentTurma.year}</span>
            <span aria-hidden="true">·</span>
            <span>{currentTurma.meetingDay}</span>
          </div>
          <h2 className="mt-1 font-display text-lg font-bold text-[var(--text-primary)]">
            Chamada — {currentTurma.name}
          </h2>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <label htmlFor="attendance-turma-select" className="sr-only">
            Selecionar Turma
          </label>
          <select
            id="attendance-turma-select"
            value={currentTurma.id}
            onChange={(e) => onSelectTurmaId(e.target.value)}
            className="w-full max-w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs font-medium text-[var(--text-primary)] sm:w-auto"
          >
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.active ? '(Ativa)' : '(Histórico)'}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-1 gap-1 rounded-lg bg-[var(--bg-subtle)] p-1 sm:flex sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={() => setCallTab('cursistas')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                callTab === 'cursistas'
                  ? 'bg-white text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Cursistas (19 Encontros)
            </button>
            <button
              type="button"
              onClick={() => setCallTab('servos-curso')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                callTab === 'servos-curso'
                  ? 'bg-white text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Servos no Curso (19)
            </button>
            <button
              type="button"
              onClick={() => setCallTab('servos-formacao')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                callTab === 'servos-formacao'
                  ? 'bg-white text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Formação de Servos (20)
            </button>
          </div>
        </div>
      </div>

      {feedbackBanner && (
        <div className="flex items-center justify-between rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-medium text-sky-900">
          <span>{feedbackBanner}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-sky-700 underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* ABA 1: CHAMADA DE CURSISTAS */}
      {callTab === 'cursistas' && courseMeeting && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          {/* Seletor Compacto de Encontro */}
          <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={courseMeeting.number <= 1}
                onClick={() => setSelectedCourseMeetingNum(Math.max(1, courseMeeting.number - 1))}
                aria-label="Encontro anterior"
                className="rounded-lg border border-[var(--border-subtle)] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <select
                aria-label="Selecionar encontro do curso"
                value={courseMeeting.number}
                onChange={(e) => setSelectedCourseMeetingNum(Number(e.target.value))}
                className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs font-bold text-[var(--text-primary)]"
              >
                {currentTurma.courseMeetings.map((m) => (
                  <option key={m.number} value={m.number}>
                    Encontro #{m.number} — {m.theme} ({m.date.split('-').reverse().join('/')})
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={courseMeeting.number >= 19}
                onClick={() => setSelectedCourseMeetingNum(Math.min(19, courseMeeting.number + 1))}
                aria-label="Próximo encontro"
                className="rounded-lg border border-[var(--border-subtle)] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowMeetingGrid((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/60 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Grid className="h-3.5 w-3.5" />
                {showMeetingGrid ? 'Ocultar grade' : 'Ver os 19 encontros'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!courseMeeting.cursistaCallFinalized && permissions.canRegisterCursistaAttendance && (
                <button
                  type="button"
                  onClick={handleMarkAllPresentCursistas}
                  className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                >
                  Marcar Todos Presentes
                </button>
              )}

              {permissions.canRegisterCursistaAttendance && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleCancelCourseMeeting(currentTurma.id, courseMeeting.number);
                    setFeedbackBanner(
                      courseMeeting.canceled
                        ? `Encontro #${courseMeeting.number} reativado.`
                        : `Encontro #${courseMeeting.number} abonado: todos os participantes ativos receberam presença.`
                    );
                  }}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    courseMeeting.canceled
                      ? 'border-amber-300 bg-amber-100 text-amber-900'
                      : 'border-[var(--border-subtle)] bg-white text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <Ban className="h-3.5 w-3.5" />
                  {courseMeeting.canceled ? 'Encontro Abonado' : 'Abonar Encontro'}
                </button>
              )}

              {courseMeeting.cursistaCallFinalized ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <Lock className="h-3.5 w-3.5" />
                    Finalizada
                  </span>
                  {permissions.canReopenFinalizedAttendance && (
                    <button
                      type="button"
                      onClick={() => {
                        onReopenCursistaCall(currentTurma.id, courseMeeting.number);
                        setFeedbackBanner(`Chamada do Encontro #${courseMeeting.number} reaberta.`);
                      }}
                      className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reabrir Chamada
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canFinalizeCursistas || !permissions.canRegisterCursistaAttendance}
                  onClick={() => {
                    onFinalizeCursistaCall(currentTurma.id, courseMeeting.number);
                    setFeedbackBanner(
                      `Chamada do Encontro #${courseMeeting.number} finalizada com sucesso!`
                    );
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                    canFinalizeCursistas && permissions.canRegisterCursistaAttendance
                      ? 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]'
                      : 'cursor-not-allowed bg-slate-200 text-slate-500'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Finalizar chamada
                </button>
              )}
            </div>
          </div>

          {/* Grade expansível sob demanda */}
          {showMeetingGrid && (
            <div className="mt-4 grid grid-cols-5 gap-1.5 border-b border-[var(--border-subtle)] pb-4 sm:grid-cols-10 lg:grid-cols-19">
              {currentTurma.courseMeetings.map((m) => {
                const isSelected = m.number === courseMeeting.number;
                return (
                  <button
                    key={m.number}
                    type="button"
                    onClick={() => setSelectedCourseMeetingNum(m.number)}
                    aria-label={`Selecionar Encontro ${m.number}`}
                    className={`font-mono-tabular flex flex-col items-center justify-center rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white'
                        : m.canceled
                        ? 'border-amber-300 bg-amber-50 text-amber-900'
                        : m.cursistaCallFinalized
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-[var(--border-subtle)] bg-white text-[var(--text-secondary)]'
                    }`}
                  >
                    <span>#{m.number}</span>
                    <span className="text-[10px] font-normal">
                      {m.canceled ? 'Abono' : m.cursistaCallFinalized ? 'Final.' : 'Aberta'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Lista de Cursistas */}
          <div className="mt-2 divide-y divide-[var(--border-subtle)]">
            {allCursistas.map((participant) => {
              const person = personMap.get(participant.personId);
              if (!person) return null;

              const totalAbsences = countCourseAbsencesForPerson(
                participant.personId,
                currentTurma.courseMeetings,
                'Cursista'
              );
              const statusInMeeting = courseMeeting.cursistaAttendance[participant.personId];
              const isLocked =
                courseMeeting.cursistaCallFinalized ||
                !participant.activeInTurma ||
                !permissions.canRegisterCursistaAttendance;

              return (
                <div
                  key={participant.personId}
                  className={`flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
                    !participant.activeInTurma ? 'opacity-60' : ''
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-sm font-bold text-[var(--text-primary)]">
                        {person.fullName}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        ·{' '}
                        <strong
                          className={
                            participant.situation === 'Reprovado por frequência'
                              ? 'text-red-700'
                              : participant.situation === 'Desistente'
                              ? 'text-amber-800'
                              : participant.situation === 'Concluído'
                              ? 'text-emerald-700'
                              : 'text-[var(--text-secondary)]'
                          }
                        >
                          {participant.situation}
                        </strong>
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                      <span className="font-mono-tabular font-semibold">
                        Faltas: {totalAbsences}/4
                      </span>
                      {totalAbsences === 3 && participant.activeInTurma && (
                        <span className="flex items-center gap-1 font-semibold text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Limite de atenção (3 faltas)
                        </span>
                      )}
                      {participant.deactivationReason && (
                        <span className="text-red-700">· {participant.deactivationReason}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {courseMeeting.canceled ? (
                      <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                        Abonado
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() =>
                            onMarkCursistaAttendance(
                              currentTurma.id,
                              courseMeeting.number,
                              participant.personId,
                              'Presente'
                            )
                          }
                          aria-label={`Marcar Presente para ${person.fullName}`}
                          className={`flex min-h-[44px] min-w-[112px] items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
                            statusInMeeting === 'Presente'
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-[var(--border-subtle)] bg-white text-[var(--text-primary)] hover:bg-emerald-50'
                          } ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          <Check className="h-4 w-4" />
                          Presente
                        </button>

                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() =>
                            onMarkCursistaAttendance(
                              currentTurma.id,
                              courseMeeting.number,
                              participant.personId,
                              'Faltou'
                            )
                          }
                          aria-label={`Marcar Faltou para ${person.fullName}`}
                          className={`flex min-h-[44px] min-w-[112px] items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
                            statusInMeeting === 'Faltou'
                              ? 'border-red-600 bg-red-600 text-white'
                              : 'border-[var(--border-subtle)] bg-white text-[var(--text-primary)] hover:bg-red-50'
                          } ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          <X className="h-4 w-4" />
                          Faltou
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA 2: CHAMADA DOS SERVOS NO CURSO */}
      {callTab === 'servos-curso' && courseMeeting && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <div className="mb-4 flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                Chamada de Servos no Curso — Encontro #{courseMeeting.number}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Registro restrito a Supervisor e Formador. Limite máximo de 3 faltas no curso.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="Selecionar encontro do curso para chamada de servos"
                value={courseMeeting.number}
                onChange={(e) => setSelectedCourseMeetingNum(Number(e.target.value))}
                className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs font-semibold"
              >
                {currentTurma.courseMeetings.map((m) => (
                  <option key={m.number} value={m.number}>
                    Encontro #{m.number} ({m.date.split('-').reverse().join('/')})
                  </option>
                ))}
              </select>

              {courseMeeting.servoCallFinalized ? (
                permissions.canReopenFinalizedAttendance && (
                  <button
                    type="button"
                    onClick={() => onReopenServoCourseCall(currentTurma.id, courseMeeting.number)}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reabrir
                  </button>
                )
              ) : (
                <button
                  type="button"
                  disabled={!canFinalizeServosCourse || !permissions.canRegisterServoAttendance}
                  onClick={() => {
                    onFinalizeServoCourseCall(currentTurma.id, courseMeeting.number);
                    setFeedbackBanner(
                      `Chamada de Servos (Curso #${courseMeeting.number}) finalizada.`
                    );
                  }}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold ${
                    canFinalizeServosCourse && permissions.canRegisterServoAttendance
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'cursor-not-allowed bg-slate-200 text-slate-500'
                  }`}
                >
                  Finalizar Chamada
                </button>
              )}
            </div>
          </div>

          {!permissions.canRegisterServoAttendance && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Visualização somente leitura para o perfil <strong>{currentRole}</strong>.
            </div>
          )}

          <div className="divide-y divide-[var(--border-subtle)]">
            {allServos.map((servo) => {
              const person = personMap.get(servo.personId);
              if (!person) return null;
              const courseFaults = countCourseAbsencesForPerson(
                servo.personId,
                currentTurma.courseMeetings,
                'Servo'
              );
              const formationFaults = countFormationAbsencesForServo(
                servo.personId,
                currentTurma.formationMeetings
              );
              const status = courseMeeting.servoAttendance[servo.personId];
              const isLocked =
                courseMeeting.servoCallFinalized ||
                !servo.activeInTurma ||
                !permissions.canRegisterServoAttendance;

              return (
                <div
                  key={servo.personId}
                  className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-sm font-bold text-[var(--text-primary)]">
                        {person.fullName}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        · {servo.servoFunctions.join(', ') || 'Servo'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                      <span className="font-mono-tabular font-semibold">
                        Faltas no Curso: {courseFaults}/3
                      </span>
                      <span>·</span>
                      <span className="font-mono-tabular">
                        Faltas na Formação: {formationFaults}/3
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() =>
                        onMarkServoCourseAttendance(
                          currentTurma.id,
                          courseMeeting.number,
                          servo.personId,
                          'Presente'
                        )
                      }
                      className={`min-h-[42px] min-w-[105px] rounded-lg border px-3 py-2 text-xs font-semibold ${
                        status === 'Presente'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-[var(--border-subtle)] bg-white text-[var(--text-primary)]'
                      } ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      Presente
                    </button>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() =>
                        onMarkServoCourseAttendance(
                          currentTurma.id,
                          courseMeeting.number,
                          servo.personId,
                          'Faltou'
                        )
                      }
                      className={`min-h-[42px] min-w-[105px] rounded-lg border px-3 py-2 text-xs font-semibold ${
                        status === 'Faltou'
                          ? 'border-red-600 bg-red-600 text-white'
                          : 'border-[var(--border-subtle)] bg-white text-[var(--text-primary)]'
                      } ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      Faltou
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA 3: CHAMADA DE FORMAÇÃO DOS SERVOS */}
      {callTab === 'servos-formacao' && formationMeeting && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <div className="mb-4 flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  Período: {currentTurma.formationStartDate.split('-').reverse().join('/')} a{' '}
                  {currentTurma.formationEndDate.split('-').reverse().join('/')} · Quintas-feiras
                </span>
              </div>
              <h3 className="mt-1 font-display text-base font-bold text-[var(--text-primary)]">
                Formação #{formationMeeting.number}/20 — {formationMeeting.theme}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="Selecionar encontro de formação de servos"
                value={formationMeeting.number}
                onChange={(e) => setSelectedFormationMeetingNum(Number(e.target.value))}
                className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs font-semibold"
              >
                {currentTurma.formationMeetings.map((m) => (
                  <option key={m.number} value={m.number}>
                    Formação #{m.number} ({m.date.split('-').reverse().join('/')})
                  </option>
                ))}
              </select>

              {formationMeeting.callFinalized ? (
                permissions.canReopenFinalizedAttendance && (
                  <button
                    type="button"
                    onClick={() =>
                      onReopenServoFormationCall(currentTurma.id, formationMeeting.number)
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reabrir
                  </button>
                )
              ) : (
                <button
                  type="button"
                  disabled={!canFinalizeServosFormation || !permissions.canRegisterServoAttendance}
                  onClick={() => {
                    onFinalizeServoFormationCall(currentTurma.id, formationMeeting.number);
                    setFeedbackBanner(
                      `Chamada da Formação #${formationMeeting.number} finalizada!`
                    );
                  }}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold ${
                    canFinalizeServosFormation && permissions.canRegisterServoAttendance
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'cursor-not-allowed bg-slate-200 text-slate-500'
                  }`}
                >
                  Finalizar Formação
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {allServos.map((servo) => {
              const person = personMap.get(servo.personId);
              if (!person) return null;
              const formationFaults = countFormationAbsencesForServo(
                servo.personId,
                currentTurma.formationMeetings
              );
              const courseFaults = countCourseAbsencesForPerson(
                servo.personId,
                currentTurma.courseMeetings,
                'Servo'
              );
              const status = formationMeeting.servoAttendance[servo.personId];
              const isLocked =
                formationMeeting.callFinalized ||
                !servo.activeInTurma ||
                !permissions.canRegisterServoAttendance;

              return (
                <div
                  key={servo.personId}
                  className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <span className="font-display text-sm font-bold text-[var(--text-primary)]">
                      {person.fullName}
                    </span>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                      <span className="font-mono-tabular font-semibold">
                        Faltas na Formação: {formationFaults}/3
                      </span>
                      <span>·</span>
                      <span className="font-mono-tabular">
                        Faltas no Curso: {courseFaults}/3
                      </span>
                      <span>·</span>
                      <span>{servo.servoFunctions.join(', ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() =>
                        onMarkServoFormationAttendance(
                          currentTurma.id,
                          formationMeeting.number,
                          servo.personId,
                          'Presente'
                        )
                      }
                      className={`min-h-[42px] min-w-[105px] rounded-lg border px-3 py-2 text-xs font-semibold ${
                        status === 'Presente'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-[var(--border-subtle)] bg-white text-[var(--text-primary)]'
                      } ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      Presente
                    </button>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() =>
                        onMarkServoFormationAttendance(
                          currentTurma.id,
                          formationMeeting.number,
                          servo.personId,
                          'Faltou'
                        )
                      }
                      className={`min-h-[42px] min-w-[105px] rounded-lg border px-3 py-2 text-xs font-semibold ${
                        status === 'Faltou'
                          ? 'border-red-600 bg-red-600 text-white'
                          : 'border-[var(--border-subtle)] bg-white text-[var(--text-primary)]'
                      } ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      Faltou
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
