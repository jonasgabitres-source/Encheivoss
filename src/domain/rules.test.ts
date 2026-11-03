import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCanceledMeetingAttendance,
  calculateTurmaBalance,
  canEmitCertificateForCursista,
  canFinalizeAttendanceCall,
  canPermanentlyDeletePerson,
  computeFinancialNotifications,
  evaluateCursistaSituation,
  evaluateServoLimitExceeded,
  generateFinancialInstallments,
  generateTurmaName,
  getPermissionsForRole,
  validateNonNegativeTurmaBalance,
  validateParticipantSemesterUniqueness,
} from './rules';
import { Person, Turma, TurmaParticipant } from './types';

test('CA-003 / RN-005: generateTurmaName formats "Nome da Igreja – 01/AAAA" and "02/AAAA"', () => {
  assert.equal(
    generateTurmaName('Catedral Sagrado Coração de Jesus', 1, 2026),
    'Catedral Sagrado Coração de Jesus – 01/2026'
  );
  assert.equal(
    generateTurmaName('Paróquia Santo Antônio', 2, 2026),
    'Paróquia Santo Antônio – 02/2026'
  );
});

test('CA-001 / RN-001: validateParticipantSemesterUniqueness blocks linking person already in another turma in same semester', () => {
  const sampleTurma: Turma = {
    id: 't1',
    churchId: 'c1',
    churchName: 'Paróquia Santo Antônio',
    semester: 2,
    year: 2026,
    name: 'Paróquia Santo Antônio – 02/2026',
    meetingDay: 'Segunda-feira',
    active: true,
    formationStartDate: '2026-07-02',
    formationEndDate: '2026-11-19',
    participants: [
      {
        personId: 'p1',
        role: 'Cursista',
        servoFunctions: [],
        situation: 'Ativo',
        activeInTurma: true,
        joinedAt: '2026-07-01',
      },
    ],
    courseMeetings: [],
    formationMeetings: [],
  };

  // Same semester (02/2026) in a different turma -> blocked
  const conflict = validateParticipantSemesterUniqueness('p1', 't2', 2, 2026, [sampleTurma]);
  assert.equal(conflict.valid, false);
  assert.ok(conflict.message?.includes('Paróquia Santo Antônio – 02/2026'));

  // Different semester (01/2027) -> allowed (RN-002)
  const diffSemester = validateParticipantSemesterUniqueness('p1', 't2', 1, 2027, [sampleTurma]);
  assert.equal(diffSemester.valid, true);
});

test('CA-002 / RN-003: canPermanentlyDeletePerson blocks deletion when person has history', () => {
  const personWithHistory: Person = {
    id: 'p1',
    fullName: 'Maria Helena',
    email: 'maria@exemplo.com',
    birthDate: '1990-05-10',
    address: 'Rua A, 100',
    parish: 'Santa Luzia',
    active: true,
    systemAccessAuthorized: false,
    history: [
      {
        id: 'h1',
        semesterLabel: '01/2026',
        turmaId: 't0',
        turmaName: 'Santa Luzia – 01/2026',
        churchName: 'Santa Luzia',
        roleType: 'Cursista',
        servoFunctions: [],
        finalStatus: 'Concluído',
        registeredAt: '2026-06-30',
      },
    ],
  };

  const res = canPermanentlyDeletePerson(personWithHistory, []);
  assert.equal(res.allowed, false);
});

test('CA-004 / RN-007: buildCanceledMeetingAttendance assigns Abonado (presence) to all active participants', () => {
  const participants: TurmaParticipant[] = [
    {
      personId: 'p1',
      role: 'Cursista',
      servoFunctions: [],
      situation: 'Ativo',
      activeInTurma: true,
      joinedAt: '2026-07-01',
    },
    {
      personId: 'p2',
      role: 'Cursista',
      servoFunctions: [],
      situation: 'Reprovado por frequência',
      activeInTurma: false,
      joinedAt: '2026-07-01',
    },
  ];
  const map = buildCanceledMeetingAttendance(participants, 'Cursista');
  assert.equal(map['p1'], 'Abonado');
  assert.equal(map['p2'], undefined);
});

test('CA-005: canFinalizeAttendanceCall requires all active participants to have status filled', () => {
  assert.equal(canFinalizeAttendanceCall(['p1', 'p2'], { p1: 'Presente' }), false);
  assert.equal(canFinalizeAttendanceCall(['p1', 'p2'], { p1: 'Presente', p2: 'Faltou' }), true);
});

test('CA-006 & CA-007: evaluateCursistaSituation marks Reprovado on 4th absence and Concluído at 19th meeting with <=3 absences', () => {
  const reprovado = evaluateCursistaSituation(4, 8, 'Ativo');
  assert.equal(reprovado.situation, 'Reprovado por frequência');
  assert.equal(reprovado.activeInTurma, false);

  const concluido = evaluateCursistaSituation(3, 19, 'Ativo');
  assert.equal(concluido.situation, 'Concluído');
  assert.equal(concluido.activeInTurma, true);
});

test('CA-010 / RN-013: evaluateServoLimitExceeded tracks course and formation absences separately', () => {
  assert.equal(evaluateServoLimitExceeded(2, 2).exceeded, false);
  const hitCourse = evaluateServoLimitExceeded(3, 1);
  assert.equal(hitCourse.exceeded, true);
  assert.equal(hitCourse.modality, 'Curso');

  const hitFormation = evaluateServoLimitExceeded(1, 3);
  assert.equal(hitFormation.exceeded, true);
  assert.equal(hitFormation.modality, 'Formação');
});

test('CA-011 & CA-012 / RN-014: canEmitCertificateForCursista allows after 17th meeting only if <4 absences', () => {
  const cursista: TurmaParticipant = {
    personId: 'p1',
    role: 'Cursista',
    servoFunctions: [],
    situation: 'Ativo',
    activeInTurma: true,
    joinedAt: '2026-07-01',
  };

  assert.equal(canEmitCertificateForCursista(cursista, 2, 16).eligible, false);
  assert.equal(canEmitCertificateForCursista(cursista, 3, 17).eligible, true);
  assert.equal(canEmitCertificateForCursista(cursista, 4, 18).eligible, false);
});

test('CA-014 & CA-015: financial installments max 4 monthly and non-negative turma balance', () => {
  const tooMany = generateFinancialInstallments(
    'e1',
    400,
    'PIX parcelado',
    5,
    '2026-11-05'
  );
  assert.equal(tooMany.valid, false);

  const validFour = generateFinancialInstallments(
    'e1',
    100,
    'PIX parcelado',
    4,
    '2026-10-10'
  );
  assert.equal(validFour.valid, true);
  assert.equal(validFour.installments.length, 4);
  assert.equal(validFour.installments[0].dueDate, '2026-10-10');
  assert.equal(validFour.installments[1].dueDate, '2026-11-10');

  assert.equal(validateNonNegativeTurmaBalance(250, 300).allowed, false);
  assert.equal(validateNonNegativeTurmaBalance(250, 250).allowed, true);
});

test('CA-017 / RN-018: computeFinancialNotifications alerts 7 days before due date and overdue installments', () => {
  const validTwo = generateFinancialInstallments(
    'e2',
    200,
    'Dinheiro parcelado',
    2,
    '2026-10-25'
  );
  const entry = {
    id: 'e2',
    turmaId: 't1',
    type: 'Receber' as const,
    totalAmount: 200,
    paymentMethod: 'Dinheiro parcelado' as const,
    observation: 'Taxa de camiseta e apostila',
    createdAt: '2026-10-01',
    createdBy: 'Financeiro',
    installments: [
      { ...validTwo.installments[0], dueDate: '2026-10-25' }, // overdue relative to 2026-10-29
      { ...validTwo.installments[1], dueDate: '2026-11-03' }, // 5 days after 2026-10-29 (within 7 days)
    ],
  };

  const notifs = computeFinancialNotifications([entry], [], '2026-10-29');
  assert.equal(notifs.length, 2);
  assert.equal(notifs[0].severity, 'Vencida');
  assert.equal(notifs[1].severity, 'Próxima do vencimento');
});

test('CA-019 & RN-020: getPermissionsForRole enforces matrix and restricts CPF/address for Financeiro', () => {
  const adminPerms = getPermissionsForRole('Administrador');
  assert.equal(adminPerms.canViewAllTurmas, true);
  assert.equal(adminPerms.canViewSensitiveData, true);

  const finPerms = getPermissionsForRole('Financeiro');
  assert.equal(finPerms.canViewAllTurmas, false);
  assert.equal(finPerms.canManageOwnTurmaFinancial, true);
  assert.equal(finPerms.canAccessGeneralAccount, false);
  assert.equal(finPerms.canViewSensitiveData, false);
});

import {
  createSystemBackupPayload,
  evaluatePinAttemptGuard,
  maskCpf,
  validateAndParseBackupPayload,
} from '../utils/backupAndSecurity';
import { createInitialSeedState } from './seedData';

test('RT-004 & RT-005: backup generation and checksum validation accept valid backups and reject tampered data', () => {
  const seed = createInitialSeedState();
  const backup = createSystemBackupPayload(seed, '2026-10-29T15:00:00.000Z');
  const jsonStr = JSON.stringify(backup);

  const validCheck = validateAndParseBackupPayload(jsonStr);
  assert.equal(validCheck.valid, true);
  assert.equal(validCheck.envelope?.counts.people, seed.people.length);

  // Tamper with the payload without updating checksum
  const tampered = { ...backup, checksum: 'deadbeef' };
  const invalidCheck = validateAndParseBackupPayload(JSON.stringify(tampered));
  assert.equal(invalidCheck.valid, false);
});

test('RT-003 & RT-006: CPF masking and PIN brute-force rate limit guard work accurately', () => {
  assert.equal(maskCpf('318.450.912-10', false), '***.450.912-**');
  assert.equal(maskCpf('318.450.912-10', true), '318.450.912-10');

  assert.equal(evaluatePinAttemptGuard(2, null, 1000).blocked, false);
  assert.equal(evaluatePinAttemptGuard(5, null, 1000).blocked, true);
});

import {
  authenticateWithEmailAndPassword,
  getAssignableRolesForHierarchy,
} from './rules';
import { createDefaultDefinitiveState } from './seedData';

test('Autenticação por E-mail e Senha: jonasgabitres@gmail.com e leandro.dutra@ufms.br entram com senha inicial 123456 e bloqueia senha incorreta', () => {
  const defState = createDefaultDefinitiveState();

  const loginJonas = authenticateWithEmailAndPassword(
    'jonasgabitres@gmail.com',
    '123456',
    defState.people
  );
  assert.equal(loginJonas.ok, true);
  assert.equal(loginJonas.person?.systemRole, 'Administrador');

  const loginLeandro = authenticateWithEmailAndPassword(
    'leandro.dutra@ufms.br',
    '123456',
    defState.people
  );
  assert.equal(loginLeandro.ok, true);
  assert.equal(loginLeandro.person?.systemRole, 'Administrador');

  const loginLeandroAlias = authenticateWithEmailAndPassword(
    'leandor.dutra@ufms.br',
    '123456',
    defState.people
  );
  assert.equal(loginLeandroAlias.ok, true);

  const wrongPass = authenticateWithEmailAndPassword(
    'leandro.dutra@ufms.br',
    '000000',
    defState.people
  );
  assert.equal(wrongPass.ok, false);
});

test('Hierarquia de Logins: Administrador delega qualquer perfil, Coordenador Local delega da sua paróquia abaixo, Supervisor delega equipe', () => {
  assert.equal(getAssignableRolesForHierarchy('Administrador').includes('Administrador'), true);
  assert.equal(
    getAssignableRolesForHierarchy('Coordenador Local').includes('Administrador'),
    false
  );
  assert.equal(
    getAssignableRolesForHierarchy('Coordenador Local').includes('Supervisor'),
    true
  );
  assert.equal(getAssignableRolesForHierarchy('Supervisor').includes('Formador'), true);
  assert.equal(getAssignableRolesForHierarchy('Servo').length, 0);
});


