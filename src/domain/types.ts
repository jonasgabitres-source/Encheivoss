export type SystemRole =
  | 'Administrador'
  | 'Coordenador Local'
  | 'Supervisor'
  | 'Formador'
  | 'Servo'
  | 'Servo Auxiliar'
  | 'Financeiro';

export type ServoFunction =
  | 'Coordenador Local'
  | 'Supervisor'
  | 'Formador'
  | 'Servo'
  | 'Servo Auxiliar'
  | 'Músico'
  | 'Intercessão'
  | 'Intercessor do Curso'
  | 'Infraestrutura'
  | 'Financeiro';

export const ALL_SERVO_FUNCTIONS: ServoFunction[] = [
  'Coordenador Local',
  'Supervisor',
  'Formador',
  'Servo',
  'Servo Auxiliar',
  'Músico',
  'Intercessão',
  'Intercessor do Curso',
  'Infraestrutura',
  'Financeiro',
];

export const ALL_SYSTEM_ROLES: SystemRole[] = [
  'Administrador',
  'Coordenador Local',
  'Supervisor',
  'Formador',
  'Servo',
  'Servo Auxiliar',
  'Financeiro',
];

export type ThemeId = 'azul-claro' | 'verde-suave' | 'azul-petroleo' | 'cinza-azul';

export interface PersonHistoryEntry {
  id: string;
  semesterLabel: string; // e.g. "01/2026"
  turmaId: string;
  turmaName: string;
  churchName: string;
  roleType: 'Cursista' | 'Servo';
  servoFunctions: ServoFunction[];
  finalStatus:
    | 'Em andamento'
    | 'Concluído'
    | 'Reprovado por frequência'
    | 'Desistente'
    | 'Retornou a Cursista'
    | 'Atuou como Servo';
  registeredAt: string;
  notes?: string;
}

export interface Person {
  id: string;
  fullName: string;
  email: string;
  password?: string; // Senha de acesso ao sistema (padrão inicial: 123456)
  birthDate: string;
  cpf?: string; // RF-002: opcional
  address: string;
  parish: string; // Paróquia frequentada
  active: boolean; // RF-006: desativação sem exclusão definitiva
  systemAccessAuthorized: boolean; // RF-019 / 3.3
  authorizedBy?: string;
  systemRole?: SystemRole;
  preferredTheme?: ThemeId;
  history: PersonHistoryEntry[];
}

export interface Church {
  id: string;
  name: string;
  address: string;
  priestName: string; // Pároco
  active: boolean;
}

export type ParticipantSituation =
  | 'Ativo'
  | 'Concluído'
  | 'Reprovado por frequência'
  | 'Desistente'
  | 'Convertido para Cursista';

export interface TurmaParticipant {
  personId: string;
  role: 'Cursista' | 'Servo';
  servoFunctions: ServoFunction[]; // RF-019: uma ou mais funções na turma/semestre
  situation: ParticipantSituation;
  activeInTurma: boolean;
  joinedAt: string;
  deactivatedAt?: string;
  deactivationReason?: string;
  convertedFromServoAt?: string;
}

export type AttendanceStatus = 'Presente' | 'Faltou' | 'Abonado';

export interface CourseMeeting {
  number: number; // 1 a 19
  date: string; // YYYY-MM-DD
  theme: string;
  canceled: boolean; // RF-031: cancelado/abonado
  cursistaAttendance: Record<string, AttendanceStatus>;
  cursistaCallFinalized: boolean;
  cursistaReopenedBy?: string;
  servoAttendance: Record<string, AttendanceStatus>;
  servoCallFinalized: boolean;
  servoReopenedBy?: string;
}

export interface FormationMeeting {
  number: number; // 1 a 20 (quintas-feiras)
  date: string; // YYYY-MM-DD
  theme: string;
  canceled: boolean;
  servoAttendance: Record<string, AttendanceStatus>;
  callFinalized: boolean;
  reopenedBy?: string;
}

export type PaymentMethod =
  | 'Dinheiro à vista'
  | 'Cartão à vista'
  | 'PIX à vista'
  | 'Dinheiro parcelado'
  | 'PIX parcelado';

export type InstallmentStatus = 'Em aberto' | 'Pago' | 'Vencido';

export interface FinancialInstallment {
  id: string;
  number: number; // 1 a 4
  totalInstallments: number;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: InstallmentStatus;
  paidAt?: string;
}

export interface FinancialEntry {
  id: string;
  turmaId: string;
  type: 'Receber' | 'Pagar';
  totalAmount: number;
  paymentMethod: PaymentMethod;
  observation: string; // RF-066: sem categorias fixas
  createdAt: string;
  createdBy: string;
  installments: FinancialInstallment[];
}

export interface GeneralTransfer {
  id: string;
  turmaId: string;
  turmaName: string;
  churchId: string;
  churchName: string;
  amount: number;
  date: string;
  observation: string;
  transferredBy: string;
}

export interface Turma {
  id: string;
  churchId: string;
  churchName: string;
  semester: 1 | 2;
  year: number;
  name: string; // RF-024: "Nome da Igreja – 01/AAAA"
  meetingDay: 'Segunda-feira' | 'Terça-feira'; // RF-029
  active: boolean; // RF-027
  formationStartDate: string; // RF-043
  formationEndDate: string;
  participants: TurmaParticipant[];
  courseMeetings: CourseMeeting[]; // 19 encontros
  formationMeetings: FormationMeeting[]; // 20 encontros às quintas-feiras
}

export interface CertificateIssued {
  id: string;
  personId: string;
  personName: string;
  turmaId: string;
  turmaName: string;
  churchName: string;
  conclusionDate: string;
  issuedAt: string;
  issuedBy: string;
}

export interface OrganizationSettings {
  organizationName: string;
  city: string;
  logoDataUrl?: string; // PNG, JPG, SVG up to 2MB
  logoFileName?: string;
  certificateTemplatePdfBase64?: string;
  certificateTemplateFileName?: string;
}

export interface AppNotification {
  id: string;
  turmaId: string;
  turmaName: string;
  entryId: string;
  installmentId: string;
  installmentNumber: number;
  totalInstallments: number;
  entryType: 'Receber' | 'Pagar';
  observation: string;
  amount: number;
  dueDate: string;
  severity: 'Vencida' | 'Próxima do vencimento';
  daysUntilDue: number;
  message: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: SystemRole;
  action: string;
  details: string;
  turmaId?: string;
}

export interface AppState {
  people: Person[];
  churches: Church[];
  turmas: Turma[];
  financialEntries: FinancialEntry[];
  generalTransfers: GeneralTransfer[];
  certificatesIssued: CertificateIssued[];
  settings: OrganizationSettings;
  auditLogs: AuditLogEntry[];
}
