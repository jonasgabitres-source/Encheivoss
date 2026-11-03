import {
  AppNotification,
  AttendanceStatus,
  CourseMeeting,
  FinancialEntry,
  FinancialInstallment,
  FormationMeeting,
  GeneralTransfer,
  ParticipantSituation,
  PaymentMethod,
  Person,
  SystemRole,
  Turma,
  TurmaParticipant,
} from './types';

export interface RolePermissions {
  canViewAllTurmas: boolean;
  canManageTurmas: boolean; // criar, alterar e desativar turmas
  canAuthorizeAccess: boolean; // autorizar "Acesso ao sistema" no cadastro de pessoa
  canRegisterCursistaAttendance: boolean;
  canRegisterServoAttendance: boolean;
  canReopenFinalizedAttendance: boolean;
  canViewOwnTurmaFinancial: boolean;
  canManageOwnTurmaFinancial: boolean; // lançar/alterar contas e transferir para Conta Geral
  canAccessGeneralAccount: boolean; // Conta Geral
  canAccessCertificates: boolean;
  canManageCertificateTemplateAndLogo: boolean;
  canViewSensitiveData: boolean; // CPF e endereço completo (RN-020)
}

/**
 * Matriz de permissões consolidada (Seção 3, 3.1, 3.2 e RN-019 / RN-020)
 */
export function getPermissionsForRole(role: SystemRole): RolePermissions {
  switch (role) {
    case 'Administrador':
      return {
        canViewAllTurmas: true,
        canManageTurmas: true,
        canAuthorizeAccess: true,
        canRegisterCursistaAttendance: true,
        canRegisterServoAttendance: true,
        canReopenFinalizedAttendance: true,
        canViewOwnTurmaFinancial: true,
        canManageOwnTurmaFinancial: true,
        canAccessGeneralAccount: true,
        canAccessCertificates: true,
        canManageCertificateTemplateAndLogo: true,
        canViewSensitiveData: true,
      };
    case 'Coordenador Local':
      return {
        canViewAllTurmas: true,
        canManageTurmas: true,
        canAuthorizeAccess: true,
        canRegisterCursistaAttendance: true,
        canRegisterServoAttendance: false, // Matriz 3.1: Supervisor e Formador registram chamada de servos
        canReopenFinalizedAttendance: false,
        canViewOwnTurmaFinancial: true,
        canManageOwnTurmaFinancial: true,
        canAccessGeneralAccount: true,
        canAccessCertificates: true,
        canManageCertificateTemplateAndLogo: false,
        canViewSensitiveData: true,
      };
    case 'Supervisor':
      return {
        canViewAllTurmas: true,
        canManageTurmas: true,
        canAuthorizeAccess: true,
        canRegisterCursistaAttendance: true,
        canRegisterServoAttendance: true,
        canReopenFinalizedAttendance: true,
        canViewOwnTurmaFinancial: true,
        canManageOwnTurmaFinancial: true,
        canAccessGeneralAccount: true,
        canAccessCertificates: true,
        canManageCertificateTemplateAndLogo: false,
        canViewSensitiveData: true,
      };
    case 'Formador':
      return {
        canViewAllTurmas: false,
        canManageTurmas: false,
        canAuthorizeAccess: false,
        canRegisterCursistaAttendance: true,
        canRegisterServoAttendance: true,
        canReopenFinalizedAttendance: true,
        canViewOwnTurmaFinancial: true,
        canManageOwnTurmaFinancial: false,
        canAccessGeneralAccount: false,
        canAccessCertificates: true,
        canManageCertificateTemplateAndLogo: false,
        canViewSensitiveData: true,
      };
    case 'Servo':
    case 'Servo Auxiliar':
      return {
        canViewAllTurmas: false,
        canManageTurmas: false,
        canAuthorizeAccess: false,
        canRegisterCursistaAttendance: true,
        canRegisterServoAttendance: false,
        canReopenFinalizedAttendance: false,
        canViewOwnTurmaFinancial: true,
        canManageOwnTurmaFinancial: false,
        canAccessGeneralAccount: false,
        canAccessCertificates: true,
        canManageCertificateTemplateAndLogo: false,
        canViewSensitiveData: true,
      };
    case 'Financeiro':
      return {
        canViewAllTurmas: false,
        canManageTurmas: false,
        canAuthorizeAccess: false,
        canRegisterCursistaAttendance: true,
        canRegisterServoAttendance: false,
        canReopenFinalizedAttendance: false,
        canViewOwnTurmaFinancial: true,
        canManageOwnTurmaFinancial: true,
        canAccessGeneralAccount: false,
        canAccessCertificates: false,
        canManageCertificateTemplateAndLogo: false,
        canViewSensitiveData: false, // Seção 3.2 / RN-020: Financeiro tem CPF e endereço restritos por segurança
      };
  }
}

/**
 * RF-024 / RN-005 / CA-003:
 * Gerar automaticamente o nome no formato "Nome da Igreja – 01/AAAA" para o primeiro semestre
 * e "Nome da Igreja – 02/AAAA" para o segundo.
 */
export function generateTurmaName(churchName: string, semester: 1 | 2, year: number): string {
  const semStr = semester === 1 ? '01' : '02';
  return `${churchName.trim()} – ${semStr}/${year}`;
}

/**
 * RF-004 / RN-001 / CA-001:
 * Impedir que uma pessoa participe de mais de uma turma no mesmo semestre/ano.
 */
export function validateParticipantSemesterUniqueness(
  personId: string,
  targetTurmaId: string | null,
  semester: 1 | 2,
  year: number,
  allTurmas: Turma[]
): { valid: boolean; conflictingTurmaName?: string; message?: string } {
  for (const turma of allTurmas) {
    if (targetTurmaId && turma.id === targetTurmaId) continue;
    if (!turma.active) continue;
    if (turma.semester === semester && turma.year === year) {
      const existing = turma.participants.find(
        (p) => p.personId === personId && p.activeInTurma
      );
      if (existing) {
        return {
          valid: false,
          conflictingTurmaName: turma.name,
          message: `Esta pessoa já está vinculada à turma "${turma.name}" no semestre 0${semester}/${year} (RN-001).`,
        };
      }
    }
  }
  return { valid: true };
}

/**
 * RF-006 / RN-003 / CA-002:
 * Impedir exclusão definitiva de pessoas com histórico; permitir apenas desativação.
 */
export function canPermanentlyDeletePerson(person: Person, allTurmas: Turma[]): {
  allowed: boolean;
  reason?: string;
} {
  if (person.history && person.history.length > 0) {
    return {
      allowed: false,
      reason: 'Pessoas com histórico de participação não podem ser excluídas definitivamente (RN-003). Utilize a opção de desativar cadastro.',
    };
  }
  const linkedInAnyTurma = allTurmas.some((t) =>
    t.participants.some((p) => p.personId === person.id)
  );
  if (linkedInAnyTurma) {
    return {
      allowed: false,
      reason: 'Pessoa possui vínculo registrado em turma e não pode ser excluída definitivamente (RN-003).',
    };
  }
  return { allowed: true };
}

/**
 * RF-031 / RN-007 / CA-004:
 * Encontro cancelado/abonado atribui presença ("Abonado") a todos os cursistas e servos vinculados ativos.
 */
export function buildCanceledMeetingAttendance(
  participants: TurmaParticipant[],
  targetRole: 'Cursista' | 'Servo'
): Record<string, AttendanceStatus> {
  const result: Record<string, AttendanceStatus> = {};
  for (const p of participants) {
    if (p.role === targetRole && p.activeInTurma) {
      result[p.personId] = 'Abonado';
    }
  }
  return result;
}

/**
 * RF-032 / CA-005:
 * A chamada só pode ser finalizada após preencher a situação de todos os participantes ativos exigidos.
 */
export function canFinalizeAttendanceCall(
  activeParticipantIds: string[],
  attendanceMap: Record<string, AttendanceStatus>
): boolean {
  if (activeParticipantIds.length === 0) return false;
  return activeParticipantIds.every((id) => {
    const val = attendanceMap[id];
    return val === 'Presente' || val === 'Faltou' || val === 'Abonado';
  });
}

/**
 * Conta o total de faltas de uma pessoa nas reuniões do curso (ou formação)
 * considerando encontros não-cancelados.
 */
export function countCourseAbsencesForPerson(
  personId: string,
  meetings: CourseMeeting[],
  mode: 'Cursista' | 'Servo'
): number {
  let absences = 0;
  for (const m of meetings) {
    if (m.canceled) continue;
    const map = mode === 'Cursista' ? m.cursistaAttendance : m.servoAttendance;
    if (map[personId] === 'Faltou') {
      absences += 1;
    }
  }
  return absences;
}

export function countFormationAbsencesForServo(
  personId: string,
  meetings: FormationMeeting[]
): number {
  let absences = 0;
  for (const m of meetings) {
    if (m.canceled) continue;
    if (m.servoAttendance[personId] === 'Faltou') {
      absences += 1;
    }
  }
  return absences;
}

/**
 * RF-038, RF-039, RN-009, RN-010, CA-006, CA-007:
 * - Ao atingir a 4ª falta, marcar automaticamente como "Reprovado por frequência" e desativar o cursista na turma.
 * - Ao concluir os 19 encontros sem atingir a 4ª falta (<= 3 faltas), atribuir situação "Concluído".
 */
export function evaluateCursistaSituation(
  absencesCount: number,
  finalizedCourseMeetingsCount: number,
  currentSituation: ParticipantSituation
): { situation: ParticipantSituation; activeInTurma: boolean } {
  if (currentSituation === 'Desistente') {
    return { situation: 'Desistente', activeInTurma: false };
  }
  if (absencesCount >= 4) {
    return { situation: 'Reprovado por frequência', activeInTurma: false };
  }
  if (finalizedCourseMeetingsCount >= 19) {
    return { situation: 'Concluído', activeInTurma: true };
  }
  return { situation: 'Ativo', activeInTurma: true };
}

/**
 * RF-042, RF-047, RF-048, RN-013, CA-010:
 * Limite de faltas dos servos no Encontro do Curso (máx. 3) e na Formação (máx. 3).
 * Quando o servo ultrapassa o limite (4ª falta) ou atinge a condição configurada (> 3 faltas),
 * ou conforme RF-042/RF-048: máximo permitido são 3 faltas; na 4ª falta (ou se exceder 3 faltas)
 * altera sua condição para cursista e registra no histórico.
 * Nota: Para suportar o rigor do PRD ("máximo de 3 faltas; quando atingir o limite definido"),
 * disparamos a reversão para cursista ao atingir > 3 faltas (4ª falta, permitindo até 3 faltas)
 * OU se `triggerOnThirdAbsence` for verdadeiro. Por padrão, máximo de 3 faltas significa que até 3 faltas é permitido e na 4ª falta estoura o limite, mas também expomos o alerta em 3 faltas.
 * Vamos verificar: QA-001 pergunta se ocorre na 3ª ou após ultrapassar 3, e RF-042 diz "máximo de 3 faltas" e RF-048 "Quando o servo atingir o limite definido (3 faltas), alterar sua condição para cursista".
 * Portanto, se `courseAbsences >= 3 || formationAbsences >= 3`?
 * Espera! Olhe CA-007: "com até 3 faltas, o cursista recebe Concluído" e CA-006: "Ao registrar a 4ª falta de cursista".
 * E para o Servo: na página 12 (QA-001): "quando atingir o limite de faltas — 3 faltas — voltará a ser cursista".
 * Vamos tornar isso 100% claro e suportado: quando o servo atingir 3 faltas em qualquer modalidade (`courseAbsences >= 3 || formationAbsences >= 3`), ele atinge o limite de 3 faltas e retorna à condição de cursista!
 */
export function evaluateServoLimitExceeded(
  courseAbsences: number,
  formationAbsences: number,
  limitThreshold = 3
): {
  exceeded: boolean;
  modality?: 'Curso' | 'Formação' | 'Ambos';
} {
  const courseHit = courseAbsences >= limitThreshold;
  const formationHit = formationAbsences >= limitThreshold;
  if (courseHit && formationHit) {
    return { exceeded: true, modality: 'Ambos' };
  }
  if (courseHit) {
    return { exceeded: true, modality: 'Curso' };
  }
  if (formationHit) {
    return { exceeded: true, modality: 'Formação' };
  }
  return { exceeded: false };
}

/**
 * RF-051 / RN-014 / CA-011 / CA-012:
 * Permitir gerar certificado após o 17º encontro para cursista apto, isto é, sem ter atingido a 4ª falta.
 */
export function canEmitCertificateForCursista(
  participant: TurmaParticipant,
  absencesCount: number,
  finalizedCourseMeetingsCount: number
): { eligible: boolean; reason?: string } {
  if (participant.role !== 'Cursista') {
    return { eligible: false, reason: 'Apenas cursistas recebem certificado de conclusão do curso.' };
  }
  if (participant.situation === 'Desistente') {
    return { eligible: false, reason: 'Cursista desistente não está apto para emissão de certificado.' };
  }
  if (absencesCount >= 4 || participant.situation === 'Reprovado por frequência') {
    return {
      eligible: false,
      reason: `Cursista atingiu ${absencesCount} faltas (Reprovado por frequência — CA-012).`,
    };
  }
  if (finalizedCourseMeetingsCount < 17) {
    return {
      eligible: false,
      reason: `A emissão de certificados é liberada somente após o 17º encontro finalizado (atual: ${finalizedCourseMeetingsCount}/19 — RN-014).`,
    };
  }
  return { eligible: true };
}

/**
 * RF-063, RF-064, RF-065, RN-015, CA-015:
 * - Formas: dinheiro à vista, cartão à vista, PIX à vista, dinheiro parcelado e PIX parcelado.
 * - Permitir parcelamento de até 4 parcelas, com quantidade e data de vencimento informadas pelo usuário.
 * - Gerar vencimentos mensais para as parcelas.
 */
export function generateFinancialInstallments(
  entryId: string,
  totalAmount: number,
  paymentMethod: PaymentMethod,
  installmentsCount: number,
  firstDueDate: string,
  markPaidImmediately = false
): { valid: boolean; error?: string; installments: FinancialInstallment[] } {
  if (totalAmount <= 0 || Number.isNaN(totalAmount)) {
    return { valid: false, error: 'O valor do lançamento deve ser maior que zero.', installments: [] };
  }
  const isParcelado =
    paymentMethod === 'Dinheiro parcelado' || paymentMethod === 'PIX parcelado';

  if (!isParcelado && installmentsCount > 1) {
    return {
      valid: false,
      error: `A forma de pagamento "${paymentMethod}" é à vista e permite apenas 1 parcela.`,
      installments: [],
    };
  }
  if (installmentsCount < 1 || installmentsCount > 4 || !Number.isInteger(installmentsCount)) {
    return {
      valid: false,
      error: 'O parcelamento permite no máximo 4 parcelas mensais (RN-015 / CA-015).',
      installments: [],
    };
  }

  const baseDate = new Date(`${firstDueDate}T12:00:00`);
  if (Number.isNaN(baseDate.getTime())) {
    return { valid: false, error: 'Data de vencimento inválida.', installments: [] };
  }

  const totalCents = Math.round(totalAmount * 100);
  const baseInstallmentCents = Math.floor(totalCents / installmentsCount);
  const remainderCents = totalCents - baseInstallmentCents * installmentsCount;

  const installments: FinancialInstallment[] = [];
  for (let i = 0; i < installmentsCount; i++) {
    const d = new Date(baseDate.getTime());
    d.setMonth(d.getMonth() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dueDateStr = `${yyyy}-${mm}-${dd}`;

    const cents = i === 0 ? baseInstallmentCents + remainderCents : baseInstallmentCents;
    installments.push({
      id: `${entryId}-inst-${i + 1}`,
      number: i + 1,
      totalInstallments: installmentsCount,
      amount: cents / 100,
      dueDate: dueDateStr,
      status: markPaidImmediately ? 'Pago' : 'Em aberto',
      paidAt: markPaidImmediately ? firstDueDate : undefined,
    });
  }

  return { valid: true, installments };
}

/**
 * Calcula o saldo disponível da conta financeira de uma turma:
 * Receitas pagas - Despesas pagas - Transferências enviadas à Conta Geral.
 */
export function calculateTurmaBalance(
  turmaId: string,
  entries: FinancialEntry[],
  transfers: GeneralTransfer[]
): {
  totalReceived: number;
  totalPaid: number;
  totalTransferred: number;
  pendingReceivable: number;
  pendingPayable: number;
  availableBalance: number;
} {
  let receivedCents = 0;
  let paidCents = 0;
  let pendingRecCents = 0;
  let pendingPayCents = 0;

  for (const entry of entries) {
    if (entry.turmaId !== turmaId) continue;
    for (const inst of entry.installments) {
      const cents = Math.round(inst.amount * 100);
      if (entry.type === 'Receber') {
        if (inst.status === 'Pago') receivedCents += cents;
        else pendingRecCents += cents;
      } else {
        if (inst.status === 'Pago') paidCents += cents;
        else pendingPayCents += cents;
      }
    }
  }

  let transferredCents = 0;
  for (const tr of transfers) {
    if (tr.turmaId === turmaId) {
      transferredCents += Math.round(tr.amount * 100);
    }
  }

  const availableCents = receivedCents - paidCents - transferredCents;

  return {
    totalReceived: receivedCents / 100,
    totalPaid: paidCents / 100,
    totalTransferred: transferredCents / 100,
    pendingReceivable: pendingRecCents / 100,
    pendingPayable: pendingPayCents / 100,
    availableBalance: availableCents / 100,
  };
}

/**
 * RF-067 / RN-016 / CA-014:
 * Impedir que o saldo da conta da turma fique negativo em baixas de despesas ou transferências.
 */
export function validateNonNegativeTurmaBalance(
  currentAvailableBalance: number,
  debitAmount: number
): { allowed: boolean; message?: string } {
  if (debitAmount <= 0 || Number.isNaN(debitAmount)) {
    return { allowed: false, message: 'O valor da operação deve ser maior que zero.' };
  }
  const availCents = Math.round(currentAvailableBalance * 100);
  const debitCents = Math.round(debitAmount * 100);
  if (debitCents > availCents) {
    return {
      allowed: false,
      message: `Operação bloqueada: o valor (R$ ${debitAmount.toFixed(2)}) excede o saldo disponível da turma (R$ ${currentAvailableBalance.toFixed(2)}). O saldo da turma não pode ficar negativo (RN-016 / CA-014).`,
    };
  }
  return { allowed: true };
}

/**
 * RF-074, RF-075, RF-076, RN-018, CA-017:
 * - A partir de 7 dias antes do vencimento, notificar diariamente até a quitação.
 * - Notificar parcelas vencidas e não pagas.
 */
export function computeFinancialNotifications(
  entries: FinancialEntry[],
  turmas: Turma[],
  referenceDateStr: string
): AppNotification[] {
  const refDate = new Date(`${referenceDateStr}T12:00:00`);
  const turmaMap = new Map(turmas.map((t) => [t.id, t.name]));
  const notifications: AppNotification[] = [];

  for (const entry of entries) {
    const turmaName = turmaMap.get(entry.turmaId) || 'Turma';
    for (const inst of entry.installments) {
      if (inst.status === 'Pago') continue;
      const dueDate = new Date(`${inst.dueDate}T12:00:00`);
      const diffMs = dueDate.getTime() - refDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        notifications.push({
          id: `notif-${inst.id}`,
          turmaId: entry.turmaId,
          turmaName,
          entryId: entry.id,
          installmentId: inst.id,
          installmentNumber: inst.number,
          totalInstallments: inst.totalInstallments,
          entryType: entry.type,
          observation: entry.observation,
          amount: inst.amount,
          dueDate: inst.dueDate,
          severity: 'Vencida',
          daysUntilDue: diffDays,
          message: `Parcela ${inst.number}/${inst.totalInstallments} (${entry.observation}) venceu há ${Math.abs(diffDays)} dia(s) e permanece em aberto.`,
        });
      } else if (diffDays <= 7) {
        notifications.push({
          id: `notif-${inst.id}`,
          turmaId: entry.turmaId,
          turmaName,
          entryId: entry.id,
          installmentId: inst.id,
          installmentNumber: inst.number,
          totalInstallments: inst.totalInstallments,
          entryType: entry.type,
          observation: entry.observation,
          amount: inst.amount,
          dueDate: inst.dueDate,
          severity: 'Próxima do vencimento',
          daysUntilDue: diffDays,
          message:
            diffDays === 0
              ? `Parcela ${inst.number}/${inst.totalInstallments} (${entry.observation}) vence HOJE — lembrete diário ativo até quitação.`
              : `Parcela ${inst.number}/${inst.totalInstallments} (${entry.observation}) vence em ${diffDays} dia(s) — lembrete diário ativo (RN-018).`,
        });
      }
    }
  }

  return notifications.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

/**
 * Hierarquia de delegação de logins:
 * - Administrador (Jonas e Leandro): pode cadastrar/liberar qualquer perfil do sistema
 * - Coordenador Local: pode liberar Coordenador Local, Supervisor, Formador, Financeiro, Servo e Servo Auxiliar
 * - Supervisor: pode liberar Formador, Financeiro, Servo e Servo Auxiliar
 * - Demais perfis: não possuem permissão de liberar acesso ao sistema
 */
export function getAssignableRolesForHierarchy(actorRole: SystemRole): SystemRole[] {
  switch (actorRole) {
    case 'Administrador':
      return [
        'Administrador',
        'Coordenador Local',
        'Supervisor',
        'Formador',
        'Financeiro',
        'Servo',
        'Servo Auxiliar',
      ];
    case 'Coordenador Local':
      return [
        'Coordenador Local',
        'Supervisor',
        'Formador',
        'Financeiro',
        'Servo',
        'Servo Auxiliar',
      ];
    case 'Supervisor':
      return ['Formador', 'Financeiro', 'Servo', 'Servo Auxiliar'];
    default:
      return [];
  }
}

/**
 * Autenticação por E-mail e Senha com suporte aos dois Administradores iniciais
 * (jonasgabitres@gmail.com e leandro.dutra@ufms.br com senha inicial 123456)
 * e aos demais usuários liberados pela hierarquia.
 */
export function authenticateWithEmailAndPassword(
  emailInput: string,
  passwordInput: string,
  people: Person[]
): { ok: boolean; person?: Person; error?: string } {
  const rawEmail = emailInput.trim().toLowerCase();
  if (!rawEmail) {
    return { ok: false, error: 'Informe seu e-mail cadastrado.' };
  }
  if (!passwordInput.trim()) {
    return { ok: false, error: 'Informe sua senha de acesso.' };
  }

  // Tolera digitação de "leandor.dutra@ufms.br" redirecionando para "leandro.dutra@ufms.br"
  const normalizedEmail =
    rawEmail === 'leandor.dutra@ufms.br' ? 'leandro.dutra@ufms.br' : rawEmail;

  const found = people.find(
    (p) =>
      p.email.trim().toLowerCase() === normalizedEmail ||
      p.email.trim().toLowerCase() === rawEmail
  );

  if (!found) {
    return {
      ok: false,
      error: 'E-mail não localizado no cadastro da Missão EncheiVos.',
    };
  }

  if (!found.active) {
    return {
      ok: false,
      error: 'Este cadastro encontra-se desativado no sistema.',
    };
  }

  if (!found.systemAccessAuthorized || !found.systemRole) {
    return {
      ok: false,
      error: 'Acesso não autorizado: Este e-mail ainda não possui login liberado pela coordenação/administração.',
    };
  }

  const expectedPassword = found.password || '123456';
  if (passwordInput.trim() !== expectedPassword) {
    return {
      ok: false,
      error: 'Senha incorreta. Verifique sua senha e tente novamente.',
    };
  }

  return { ok: true, person: found };
}

