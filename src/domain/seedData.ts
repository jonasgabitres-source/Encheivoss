import {
  AppState,
  Church,
  CourseMeeting,
  FinancialEntry,
  FormationMeeting,
  GeneralTransfer,
  Person,
  Turma,
} from './types';

export const COURSE_THEMES_19: string[] = [
  '1. O Amor de Deus e o Plano da Salvação',
  '2. O Pecado e suas Consequências',
  '3. Jesus Cristo, Salvador e Senhor',
  '4. Conversão e Fé',
  '5. O Perdão e a Reconciliação',
  '6. A Promessa do Pai: O Espírito Santo',
  '7. Efusão do Espírito Santo e Carismas',
  '8. A Palavra de Deus como Fonte de Vida',
  '9. Vida de Oração Pessoal e Litúrgica',
  '10. Os Sacramentos da Igreja',
  '11. Eucaristia: Centro da Vida Cristã',
  '12. Maria, Mãe da Igreja e Discípula Fiel',
  '13. Cura Interior e Libertação',
  '14. Combate Espiritual e Perseverança',
  '15. Vida em Comunidade e Fraternidade',
  '16. Vocação, Família e Testemunho',
  '17. Serviço e Missão na Paróquia',
  '18. Revisão de Vida e Partilha Fraterna',
  '19. Envio Missionário e Celebração de Conclusão',
];

export const FORMATION_THEMES_20: string[] = [
  '1. Identidade e Espiritualidade do Servo EncheiVos',
  '2. Escuta, Acolhimento e Caridade Pastoral',
  '3. Zelar pela Doutrina e Comunhão Eclesial',
  '4. O Ministério da Intercessão no Curso',
  '5. Liderança Cristã e Humildade no Serviço',
  '6. Dinâmica dos Encontros Semanais',
  '7. Acompanhamento Fraterno dos Cursistas',
  '8. Liturgia, Música e Ambientação Espiritual',
  '9. Discernimento dos Dons e Carismas',
  '10. Postura Ética e Sigilo Pastoral',
  '11. Preparação para o Encontro de Efusão',
  '12. Oração por Cura e Aconselhamento',
  '13. Gestão do Tempo e Infraestrutura da Turma',
  '14. Transparência e Zelo Financeiro na Missão',
  '15. Prevenção da Evasão e Resgate de Desistentes',
  '16. Integração dos Concluintes na Paróquia',
  '17. Avaliação Parcial da Caminhada da Turma',
  '18. Preparação da Celebração do 19º Encontro',
  '19. Transição de Novos Servos para o Próximo Semestre',
  '20. Retiro de Encerramento e Ação de Graças da Equipe',
];

function buildCourseMeetings(
  startDateStr: string,
  finalizedUpTo: number,
  activeCursistaIds: string[],
  activeServoIds: string[],
  cursistaFaultsMap: Record<string, number[]>,
  servoFaultsMap: Record<string, number[]>,
  canceledNumbers: number[] = []
): CourseMeeting[] {
  const base = new Date(`${startDateStr}T12:00:00`);
  return COURSE_THEMES_19.map((theme, idx) => {
    const num = idx + 1;
    const d = new Date(base.getTime());
    d.setDate(d.getDate() + idx * 7);
    const dateStr = d.toISOString().slice(0, 10);
    const canceled = canceledNumbers.includes(num);
    const isFinalized = num <= finalizedUpTo;

    const cursistaAttendance: Record<string, 'Presente' | 'Faltou' | 'Abonado'> = {};
    const servoAttendance: Record<string, 'Presente' | 'Faltou' | 'Abonado'> = {};

    if (isFinalized) {
      for (const cId of activeCursistaIds) {
        if (canceled) {
          cursistaAttendance[cId] = 'Abonado';
        } else if ((cursistaFaultsMap[cId] || []).includes(num)) {
          cursistaAttendance[cId] = 'Faltou';
        } else {
          cursistaAttendance[cId] = 'Presente';
        }
      }
      for (const sId of activeServoIds) {
        if (canceled) {
          servoAttendance[sId] = 'Abonado';
        } else if ((servoFaultsMap[sId] || []).includes(num)) {
          servoAttendance[sId] = 'Faltou';
        } else {
          servoAttendance[sId] = 'Presente';
        }
      }
    }

    return {
      number: num,
      date: dateStr,
      theme,
      canceled,
      cursistaAttendance,
      cursistaCallFinalized: isFinalized,
      servoAttendance,
      servoCallFinalized: isFinalized,
    };
  });
}

function buildFormationMeetings(
  startThursdayStr: string,
  finalizedUpTo: number,
  activeServoIds: string[],
  servoFormationFaultsMap: Record<string, number[]>
): FormationMeeting[] {
  const base = new Date(`${startThursdayStr}T12:00:00`);
  return FORMATION_THEMES_20.map((theme, idx) => {
    const num = idx + 1;
    const d = new Date(base.getTime());
    d.setDate(d.getDate() + idx * 7);
    const dateStr = d.toISOString().slice(0, 10);
    const isFinalized = num <= finalizedUpTo;
    const servoAttendance: Record<string, 'Presente' | 'Faltou' | 'Abonado'> = {};

    if (isFinalized) {
      for (const sId of activeServoIds) {
        if ((servoFormationFaultsMap[sId] || []).includes(num)) {
          servoAttendance[sId] = 'Faltou';
        } else {
          servoAttendance[sId] = 'Presente';
        }
      }
    }

    return {
      number: num,
      date: dateStr,
      theme,
      canceled: false,
      servoAttendance,
      callFinalized: isFinalized,
    };
  });
}

export const DEFAULT_TRES_LAGOAS_CHURCHES: Church[] = [
  {
    id: 'church-catedral',
    name: 'Catedral Sagrado Coração de Jesus',
    address: 'Praça Senador Ramez Tebet, Centro, Três Lagoas - MS',
    priestName: 'Pe. Rogério Fernandes',
    active: true,
  },
  {
    id: 'church-santo-antonio',
    name: 'Paróquia Santo Antônio',
    address: 'Av. Antônio Trajano, 580, Centro, Três Lagoas - MS',
    priestName: 'Pe. Marcos Vinícius',
    active: true,
  },
  {
    id: 'church-santa-luzia',
    name: 'Paróquia Santa Luzia',
    address: 'Rua Egídio Thomé, 1420, Jd. Alvorada, Três Lagoas - MS',
    priestName: 'Pe. Cláudio Henrique',
    active: true,
  },
];

export function createInitialSeedState(): AppState {
  const churches: Church[] = DEFAULT_TRES_LAGOAS_CHURCHES.map((c) => ({ ...c }));

  const people: Person[] = [
    {
      id: 'p-admin',
      fullName: 'Leandro Dutra (Administrador)',
      email: 'leandro.dutra@ufms.br',
      password: '123456',
      birthDate: '1988-03-14',
      cpf: '318.450.912-10',
      address: 'Centro, Três Lagoas - MS',
      parish: 'Catedral Sagrado Coração de Jesus',
      active: true,
      systemAccessAuthorized: true,
      authorizedBy: 'Sistema Inicial',
      systemRole: 'Administrador',
      preferredTheme: 'azul-petroleo',
      history: [
        {
          id: 'h-admin-1',
          semesterLabel: '01/2026',
          turmaId: 'turma-catedral-01-2026',
          turmaName: 'Catedral Sagrado Coração de Jesus – 01/2026',
          churchName: 'Catedral Sagrado Coração de Jesus',
          roleType: 'Servo',
          servoFunctions: ['Coordenador Local'],
          finalStatus: 'Atuou como Servo',
          registeredAt: '2026-06-28',
        },
      ],
    },
    {
      id: 'p-admin-jonas',
      fullName: 'Jonas Gabriel (Administrador)',
      email: 'jonasgabitres@gmail.com',
      password: '123456',
      birthDate: '1988-03-14',
      address: 'Centro, Três Lagoas - MS',
      parish: 'Catedral Sagrado Coração de Jesus',
      active: true,
      systemAccessAuthorized: true,
      authorizedBy: 'Sistema Inicial',
      systemRole: 'Administrador',
      preferredTheme: 'azul-petroleo',
      history: [],
    },
    {
      id: 'p-coord',
      fullName: 'Helena Beatriz Almeida',
      email: 'helena.coord@encheivos.org.br',
      birthDate: '1985-07-22',
      cpf: '245.819.301-44',
      address: 'Rua Orestes Prata Tibery, 890, Três Lagoas - MS',
      parish: 'Catedral Sagrado Coração de Jesus',
      active: true,
      systemAccessAuthorized: true,
      authorizedBy: 'Jonas Gabriel (Administrador Geral)',
      systemRole: 'Coordenador Local',
      preferredTheme: 'azul-claro',
      history: [
        {
          id: 'h-coord-1',
          semesterLabel: '01/2026',
          turmaId: 'turma-catedral-01-2026',
          turmaName: 'Catedral Sagrado Coração de Jesus – 01/2026',
          churchName: 'Catedral Sagrado Coração de Jesus',
          roleType: 'Servo',
          servoFunctions: ['Coordenador Local'],
          finalStatus: 'Atuou como Servo',
          registeredAt: '2026-06-28',
        },
      ],
    },
    {
      id: 'p-sup',
      fullName: 'Carlos Eduardo Mendonça',
      email: 'carlos.supervisor@encheivos.org.br',
      birthDate: '1982-11-09',
      cpf: '198.732.654-08',
      address: 'Av. Filinto Müller, 1120, Lapa, Três Lagoas - MS',
      parish: 'Paróquia Santo Antônio',
      active: true,
      systemAccessAuthorized: true,
      authorizedBy: 'Jonas Gabriel (Administrador Geral)',
      systemRole: 'Supervisor',
      preferredTheme: 'verde-suave',
      history: [
        {
          id: 'h-sup-1',
          semesterLabel: '02/2026',
          turmaId: 'turma-catedral-02-2026',
          turmaName: 'Catedral Sagrado Coração de Jesus – 02/2026',
          churchName: 'Catedral Sagrado Coração de Jesus',
          roleType: 'Servo',
          servoFunctions: ['Supervisor'],
          finalStatus: 'Em andamento',
          registeredAt: '2026-07-01',
        },
      ],
    },
    {
      id: 'p-formador',
      fullName: 'Patrícia Nogueira Santos',
      email: 'patricia.formadora@encheivos.org.br',
      birthDate: '1991-04-18',
      cpf: '409.112.876-55',
      address: 'Rua Bruno Garcia, 640, Colinos, Três Lagoas - MS',
      parish: 'Catedral Sagrado Coração de Jesus',
      active: true,
      systemAccessAuthorized: true,
      authorizedBy: 'Helena Beatriz Almeida',
      systemRole: 'Formador',
      preferredTheme: 'azul-petroleo',
      history: [
        {
          id: 'h-form-1',
          semesterLabel: '01/2026',
          turmaId: 'turma-catedral-01-2026',
          turmaName: 'Catedral Sagrado Coração de Jesus – 01/2026',
          churchName: 'Catedral Sagrado Coração de Jesus',
          roleType: 'Servo',
          servoFunctions: ['Servo'],
          finalStatus: 'Atuou como Servo',
          registeredAt: '2026-06-28',
        },
        {
          id: 'h-form-2',
          semesterLabel: '02/2026',
          turmaId: 'turma-catedral-02-2026',
          turmaName: 'Catedral Sagrado Coração de Jesus – 02/2026',
          churchName: 'Catedral Sagrado Coração de Jesus',
          roleType: 'Servo',
          servoFunctions: ['Formador', 'Intercessor do Curso'],
          finalStatus: 'Em andamento',
          registeredAt: '2026-07-01',
        },
      ],
    },
    {
      id: 'p-fin',
      fullName: 'Roberto Tavares Lima',
      email: 'roberto.financeiro@encheivos.org.br',
      birthDate: '1987-09-03',
      cpf: '512.398.741-90',
      address: 'Rua Elmano Soares, 305, Centro, Três Lagoas - MS',
      parish: 'Catedral Sagrado Coração de Jesus',
      active: true,
      systemAccessAuthorized: true,
      authorizedBy: 'Helena Beatriz Almeida',
      systemRole: 'Financeiro',
      preferredTheme: 'cinza-azul',
      history: [
        {
          id: 'h-fin-1',
          semesterLabel: '02/2026',
          turmaId: 'turma-catedral-02-2026',
          turmaName: 'Catedral Sagrado Coração de Jesus – 02/2026',
          churchName: 'Catedral Sagrado Coração de Jesus',
          roleType: 'Servo',
          servoFunctions: ['Financeiro'],
          finalStatus: 'Em andamento',
          registeredAt: '2026-07-01',
        },
      ],
    },
    {
      id: 'p-servo-1',
      fullName: 'Lucas Gabriel Ferreira',
      email: 'lucas.servo@encheivos.org.br',
      birthDate: '1996-01-25',
      cpf: '623.908.114-21',
      address: 'Rua Munir Thomé, 712, Três Lagoas - MS',
      parish: 'Catedral Sagrado Coração de Jesus',
      active: true,
      systemAccessAuthorized: true,
      authorizedBy: 'Carlos Eduardo Mendonça',
      systemRole: 'Servo',
      preferredTheme: 'azul-claro',
      history: [
        {
          id: 'h-s1-0',
          semesterLabel: '01/2026',
          turmaId: 'turma-catedral-01-2026',
          turmaName: 'Catedral Sagrado Coração de Jesus – 01/2026',
          churchName: 'Catedral Sagrado Coração de Jesus',
          roleType: 'Cursista',
          servoFunctions: [],
          finalStatus: 'Concluído',
          registeredAt: '2026-06-28',
          notes: 'RF-003: Atuou como Cursista em 01/2026 e passou a Servo em 02/2026',
        },
        {
          id: 'h-s1-1',
          semesterLabel: '02/2026',
          turmaId: 'turma-catedral-02-2026',
          turmaName: 'Catedral Sagrado Coração de Jesus – 02/2026',
          churchName: 'Catedral Sagrado Coração de Jesus',
          roleType: 'Servo',
          servoFunctions: ['Servo', 'Músico'],
          finalStatus: 'Em andamento',
          registeredAt: '2026-07-01',
        },
      ],
    },
    {
      id: 'p-servo-2',
      fullName: 'Juliana Costa Ribeiro',
      email: 'juliana.auxiliar@encheivos.org.br',
      birthDate: '1998-06-12',
      cpf: '714.205.889-33',
      address: 'Rua João Silva, 118, Interlagos, Três Lagoas - MS',
      parish: 'Catedral Sagrado Coração de Jesus',
      active: true,
      systemAccessAuthorized: true,
      authorizedBy: 'Carlos Eduardo Mendonça',
      systemRole: 'Servo Auxiliar',
      preferredTheme: 'verde-suave',
      history: [
        {
          id: 'h-s2-1',
          semesterLabel: '02/2026',
          turmaId: 'turma-catedral-02-2026',
          turmaName: 'Catedral Sagrado Coração de Jesus – 02/2026',
          churchName: 'Catedral Sagrado Coração de Jesus',
          roleType: 'Servo',
          servoFunctions: ['Servo Auxiliar', 'Intercessão'],
          finalStatus: 'Em andamento',
          registeredAt: '2026-07-01',
        },
      ],
    },
    // Cursistas da Turma Catedral 02/2026 (17 encontros já finalizados — prontos para testar Certificado e 18º/19º encontro!)
    {
      id: 'p-cursista-1',
      fullName: 'Ana Clara Vasconcelos',
      email: 'anaclara.v@email.com',
      birthDate: '1999-02-14',
      cpf: '801.442.190-77',
      address: 'Rua Generoso Siqueira, 240, Centro, Três Lagoas - MS',
      parish: 'Catedral Sagrado Coração de Jesus',
      active: true,
      systemAccessAuthorized: false,
      history: [
        {
          id: 'h-c1-1',
          semesterLabel: '02/2026',
          turmaId: 'turma-catedral-02-2026',
          turmaName: 'Catedral Sagrado Coração de Jesus – 02/2026',
          churchName: 'Catedral Sagrado Coração de Jesus',
          roleType: 'Cursista',
          servoFunctions: [],
          finalStatus: 'Em andamento',
          registeredAt: '2026-07-01',
        },
      ],
    },
    {
      id: 'p-cursista-2',
      fullName: 'Mateus Henrique Silveira',
      email: 'mateus.silveira@email.com',
      birthDate: '1994-08-30',
      cpf: '912.605.331-12',
      address: 'Rua Bom Jesus da Lapa, 510, Três Lagoas - MS',
      parish: 'Catedral Sagrado Coração de Jesus',
      active: true,
      systemAccessAuthorized: false,
      history: [
        {
          id: 'h-c2-1',
          semesterLabel: '02/2026',
          turmaId: 'turma-catedral-02-2026',
          turmaName: 'Catedral Sagrado Coração de Jesus – 02/2026',
          churchName: 'Catedral Sagrado Coração de Jesus',
          roleType: 'Cursista',
          servoFunctions: [],
          finalStatus: 'Em andamento',
          registeredAt: '2026-07-01',
          notes: 'Possui 3 faltas acumuladas (próximo do limite de 4 faltas)',
        },
      ],
    },
    {
      id: 'p-cursista-3',
      fullName: 'Beatriz Moreira Camargo',
      email: 'beatriz.camargo@email.com',
      birthDate: '2001-12-05',
      cpf: '105.783.492-61',
      address: 'Rua Doutor Oscár Guimarães, 900, Três Lagoas - MS',
      parish: 'Catedral Sagrado Coração de Jesus',
      active: true,
      systemAccessAuthorized: false,
      history: [
        {
          id: 'h-c3-1',
          semesterLabel: '02/2026',
          turmaId: 'turma-catedral-02-2026',
          turmaName: 'Catedral Sagrado Coração de Jesus – 02/2026',
          churchName: 'Catedral Sagrado Coração de Jesus',
          roleType: 'Cursista',
          servoFunctions: [],
          finalStatus: 'Em andamento',
          registeredAt: '2026-07-01',
        },
      ],
    },
    {
      id: 'p-cursista-4',
      fullName: 'Rafael Augusto Pereira',
      email: 'rafael.pereira@email.com',
      birthDate: '1992-05-19',
      cpf: '334.910.285-04',
      address: 'Rua David Alexandria, 180, Interlagos, Três Lagoas - MS',
      parish: 'Catedral Sagrado Coração de Jesus',
      active: true,
      systemAccessAuthorized: false,
      history: [
        {
          id: 'h-c4-1',
          semesterLabel: '02/2026',
          turmaId: 'turma-catedral-02-2026',
          turmaName: 'Catedral Sagrado Coração de Jesus – 02/2026',
          churchName: 'Catedral Sagrado Coração de Jesus',
          roleType: 'Cursista',
          servoFunctions: [],
          finalStatus: 'Reprovado por frequência',
          registeredAt: '2026-07-01',
          notes: 'Atingiu 4ª falta no 11º encontro e foi reprovado automaticamente (RN-009)',
        },
      ],
    },
    {
      id: 'p-cursista-5',
      fullName: 'Fernanda Oliveira Martins',
      email: 'fernanda.martins@email.com',
      birthDate: '1995-10-08',
      address: 'Av. Rosário Congro, 1340, Centro, Três Lagoas - MS',
      parish: 'Catedral Sagrado Coração de Jesus',
      active: true,
      systemAccessAuthorized: false,
      history: [
        {
          id: 'h-c5-1',
          semesterLabel: '02/2026',
          turmaId: 'turma-catedral-02-2026',
          turmaName: 'Catedral Sagrado Coração de Jesus – 02/2026',
          churchName: 'Catedral Sagrado Coração de Jesus',
          roleType: 'Cursista',
          servoFunctions: [],
          finalStatus: 'Desistente',
          registeredAt: '2026-07-01',
          notes: 'Desistência registrada por mudança de horário de trabalho (RF-026 / RF-090)',
        },
      ],
    },
    // Participantes da Turma Santo Antônio – 02/2026
    {
      id: 'p-cursista-6',
      fullName: 'Gabriel Victor Santana',
      email: 'gabriel.santana@email.com',
      birthDate: '1997-03-27',
      cpf: '449.201.873-19',
      address: 'Rua Quinze de Junho, 720, Santo Antônio, Três Lagoas - MS',
      parish: 'Paróquia Santo Antônio',
      active: true,
      systemAccessAuthorized: false,
      history: [
        {
          id: 'h-c6-1',
          semesterLabel: '02/2026',
          turmaId: 'turma-santo-antonio-02-2026',
          turmaName: 'Paróquia Santo Antônio – 02/2026',
          churchName: 'Paróquia Santo Antônio',
          roleType: 'Cursista',
          servoFunctions: [],
          finalStatus: 'Em andamento',
          registeredAt: '2026-07-07',
        },
      ],
    },
    {
      id: 'p-cursista-7',
      fullName: 'Camila Rodrigues Souza',
      email: 'camila.souza@email.com',
      birthDate: '2000-07-15',
      cpf: '558.312.904-82',
      address: 'Rua Manoel Pedro de Campos, 455, Três Lagoas - MS',
      parish: 'Paróquia Santa Luzia',
      active: true,
      systemAccessAuthorized: false,
      history: [],
    },
  ];

  // Turma 1: Catedral Sagrado Coração de Jesus – 02/2026 (Ativa, 17 encontros realizados, 18º pronto para chamada!)
  const catedralActiveCursistas = ['p-cursista-1', 'p-cursista-2', 'p-cursista-3', 'p-cursista-4'];
  const catedralActiveServos = ['p-sup', 'p-formador', 'p-fin', 'p-servo-1', 'p-servo-2'];

  const catedralCourseMeetings = buildCourseMeetings(
    '2026-07-06',
    17,
    catedralActiveCursistas,
    catedralActiveServos,
    {
      'p-cursista-1': [4], // 1 falta (Apta para certificado!)
      'p-cursista-2': [3, 9, 14], // 3 faltas (Apto para certificado, mas na 4ª falta reprova!)
      'p-cursista-3': [], // 0 faltas (100% presença!)
      'p-cursista-4': [2, 5, 8, 11], // 4 faltas (Reprovado por frequência!)
    },
    {
      'p-servo-1': [6, 12], // 2 faltas no curso (se faltar mais 1 no curso, atinge 3 faltas e retorna a cursista!)
      'p-servo-2': [10], // 1 falta no curso
    },
    [7] // 7º encontro foi cancelado/abonado (todos receberam Abonado!)
  );

  const catedralFormationMeetings = buildFormationMeetings(
    '2026-07-02',
    17,
    catedralActiveServos,
    {
      'p-servo-1': [5],
      'p-servo-2': [4, 11], // 2 faltas na formação (se faltar mais 1 na formação, atinge 3 faltas!)
    }
  );

  const turmaCatedral02: Turma = {
    id: 'turma-catedral-02-2026',
    churchId: 'church-catedral',
    churchName: 'Catedral Sagrado Coração de Jesus',
    semester: 2,
    year: 2026,
    name: 'Catedral Sagrado Coração de Jesus – 02/2026',
    meetingDay: 'Segunda-feira',
    active: true,
    formationStartDate: '2026-07-02',
    formationEndDate: '2026-11-12',
    participants: [
      {
        personId: 'p-sup',
        role: 'Servo',
        servoFunctions: ['Supervisor'],
        situation: 'Ativo',
        activeInTurma: true,
        joinedAt: '2026-07-01',
      },
      {
        personId: 'p-formador',
        role: 'Servo',
        servoFunctions: ['Formador', 'Intercessor do Curso'],
        situation: 'Ativo',
        activeInTurma: true,
        joinedAt: '2026-07-01',
      },
      {
        personId: 'p-fin',
        role: 'Servo',
        servoFunctions: ['Financeiro'],
        situation: 'Ativo',
        activeInTurma: true,
        joinedAt: '2026-07-01',
      },
      {
        personId: 'p-servo-1',
        role: 'Servo',
        servoFunctions: ['Servo', 'Músico'],
        situation: 'Ativo',
        activeInTurma: true,
        joinedAt: '2026-07-01',
      },
      {
        personId: 'p-servo-2',
        role: 'Servo',
        servoFunctions: ['Servo Auxiliar', 'Intercessão'],
        situation: 'Ativo',
        activeInTurma: true,
        joinedAt: '2026-07-01',
      },
      {
        personId: 'p-cursista-1',
        role: 'Cursista',
        servoFunctions: [],
        situation: 'Ativo',
        activeInTurma: true,
        joinedAt: '2026-07-01',
      },
      {
        personId: 'p-cursista-2',
        role: 'Cursista',
        servoFunctions: [],
        situation: 'Ativo',
        activeInTurma: true,
        joinedAt: '2026-07-01',
      },
      {
        personId: 'p-cursista-3',
        role: 'Cursista',
        servoFunctions: [],
        situation: 'Ativo',
        activeInTurma: true,
        joinedAt: '2026-07-01',
      },
      {
        personId: 'p-cursista-4',
        role: 'Cursista',
        servoFunctions: [],
        situation: 'Reprovado por frequência',
        activeInTurma: false,
        joinedAt: '2026-07-01',
        deactivatedAt: '2026-09-14',
        deactivationReason: 'Atingiu a 4ª falta no 11º encontro (RN-009)',
      },
      {
        personId: 'p-cursista-5',
        role: 'Cursista',
        servoFunctions: [],
        situation: 'Desistente',
        activeInTurma: false,
        joinedAt: '2026-07-01',
        deactivatedAt: '2026-08-10',
        deactivationReason: 'Mudança de escala de trabalho noturno (RF-026)',
      },
    ],
    courseMeetings: catedralCourseMeetings,
    formationMeetings: catedralFormationMeetings,
  };

  // Turma 2: Paróquia Santo Antônio – 02/2026 (Terça-feira, 6 encontros realizados)
  const turmaSantoAntonio02: Turma = {
    id: 'turma-santo-antonio-02-2026',
    churchId: 'church-santo-antonio',
    churchName: 'Paróquia Santo Antônio',
    semester: 2,
    year: 2026,
    name: 'Paróquia Santo Antônio – 02/2026',
    meetingDay: 'Terça-feira',
    active: true,
    formationStartDate: '2026-07-09',
    formationEndDate: '2026-11-19',
    participants: [
      {
        personId: 'p-cursista-6',
        role: 'Cursista',
        servoFunctions: [],
        situation: 'Ativo',
        activeInTurma: true,
        joinedAt: '2026-07-07',
      },
    ],
    courseMeetings: buildCourseMeetings(
      '2026-07-07',
      6,
      ['p-cursista-6'],
      [],
      { 'p-cursista-6': [3] },
      {}
    ),
    formationMeetings: buildFormationMeetings('2026-07-09', 6, [], {}),
  };

  // Turma 3 (Histórica concluída): Catedral Sagrado Coração de Jesus – 01/2026
  const turmaCatedral01: Turma = {
    id: 'turma-catedral-01-2026',
    churchId: 'church-catedral',
    churchName: 'Catedral Sagrado Coração de Jesus',
    semester: 1,
    year: 2026,
    name: 'Catedral Sagrado Coração de Jesus – 01/2026',
    meetingDay: 'Segunda-feira',
    active: false,
    formationStartDate: '2026-02-05',
    formationEndDate: '2026-06-18',
    participants: [
      {
        personId: 'p-servo-1',
        role: 'Cursista',
        servoFunctions: [],
        situation: 'Concluído',
        activeInTurma: true,
        joinedAt: '2026-02-02',
      },
      {
        personId: 'p-formador',
        role: 'Servo',
        servoFunctions: ['Servo'],
        situation: 'Ativo',
        activeInTurma: true,
        joinedAt: '2026-02-02',
      },
    ],
    courseMeetings: buildCourseMeetings(
      '2026-02-02',
      19,
      ['p-servo-1'],
      ['p-formador'],
      { 'p-servo-1': [5, 12] },
      {}
    ),
    formationMeetings: buildFormationMeetings('2026-02-05', 20, ['p-formador'], {}),
  };

  const financialEntries: FinancialEntry[] = [
    {
      id: 'fin-1',
      turmaId: 'turma-catedral-02-2026',
      type: 'Receber',
      totalAmount: 1450.0,
      paymentMethod: 'PIX à vista',
      observation: 'Inscrições e apostilas dos cursistas da Catedral 02/2026',
      createdAt: '2026-07-10',
      createdBy: 'Roberto Tavares Lima',
      installments: [
        {
          id: 'fin-1-inst-1',
          number: 1,
          totalInstallments: 1,
          amount: 1450.0,
          dueDate: '2026-07-10',
          status: 'Pago',
          paidAt: '2026-07-10',
        },
      ],
    },
    {
      id: 'fin-2',
      turmaId: 'turma-catedral-02-2026',
      type: 'Receber',
      totalAmount: 600.0,
      paymentMethod: 'PIX parcelado',
      observation: 'Camisetas do Encontro de Efusão e Confraternização',
      createdAt: '2026-09-02',
      createdBy: 'Roberto Tavares Lima',
      installments: [
        {
          id: 'fin-2-inst-1',
          number: 1,
          totalInstallments: 3,
          amount: 200.0,
          dueDate: '2026-09-02',
          status: 'Pago',
          paidAt: '2026-09-02',
        },
        {
          id: 'fin-2-inst-2',
          number: 2,
          totalInstallments: 3,
          amount: 200.0,
          dueDate: '2026-10-25', // Vencida (referência 29/10/2026) -> aciona RF-076!
          status: 'Em aberto',
        },
        {
          id: 'fin-2-inst-3',
          number: 3,
          totalInstallments: 3,
          amount: 200.0,
          dueDate: '2026-11-02', // Vence em 4 dias (dentro de 7 dias) -> aciona RF-075!
          status: 'Em aberto',
        },
      ],
    },
    {
      id: 'fin-3',
      turmaId: 'turma-catedral-02-2026',
      type: 'Pagar',
      totalAmount: 380.0,
      paymentMethod: 'Cartão à vista',
      observation: 'Impressão gráfica de apostilas e crachás dos participantes',
      createdAt: '2026-07-15',
      createdBy: 'Roberto Tavares Lima',
      installments: [
        {
          id: 'fin-3-inst-1',
          number: 1,
          totalInstallments: 1,
          amount: 380.0,
          dueDate: '2026-07-15',
          status: 'Pago',
          paidAt: '2026-07-15',
        },
      ],
    },
    {
      id: 'fin-4',
      turmaId: 'turma-catedral-02-2026',
      type: 'Pagar',
      totalAmount: 320.0,
      paymentMethod: 'Dinheiro parcelado',
      observation: 'Locação de som e lanche para o Retiro de Efusão',
      createdAt: '2026-10-03',
      createdBy: 'Roberto Tavares Lima',
      installments: [
        {
          id: 'fin-4-inst-1',
          number: 1,
          totalInstallments: 2,
          amount: 160.0,
          dueDate: '2026-10-03',
          status: 'Pago',
          paidAt: '2026-10-03',
        },
        {
          id: 'fin-4-inst-2',
          number: 2,
          totalInstallments: 2,
          amount: 160.0,
          dueDate: '2026-11-03', // Vence em 5 dias -> aciona RF-075!
          status: 'Em aberto',
        },
      ],
    },
    {
      id: 'fin-5',
      turmaId: 'turma-santo-antonio-02-2026',
      type: 'Receber',
      totalAmount: 820.0,
      paymentMethod: 'Dinheiro à vista',
      observation: 'Inscrições iniciais da Turma Santo Antônio 02/2026',
      createdAt: '2026-07-12',
      createdBy: 'Helena Beatriz Almeida',
      installments: [
        {
          id: 'fin-5-inst-1',
          number: 1,
          totalInstallments: 1,
          amount: 820.0,
          dueDate: '2026-07-12',
          status: 'Pago',
          paidAt: '2026-07-12',
        },
      ],
    },
  ];

  const generalTransfers: GeneralTransfer[] = [
    {
      id: 'tr-1',
      turmaId: 'turma-catedral-02-2026',
      turmaName: 'Catedral Sagrado Coração de Jesus – 02/2026',
      churchId: 'church-catedral',
      churchName: 'Catedral Sagrado Coração de Jesus',
      amount: 350.0,
      date: '2026-09-20',
      observation: 'Repasse parcial do saldo excedente de inscrições para a Conta Geral da Missão',
      transferredBy: 'Roberto Tavares Lima',
    },
    {
      id: 'tr-2',
      turmaId: 'turma-santo-antonio-02-2026',
      turmaName: 'Paróquia Santo Antônio – 02/2026',
      churchId: 'church-santo-antonio',
      churchName: 'Paróquia Santo Antônio',
      amount: 220.0,
      date: '2026-10-05',
      observation: 'Transferência para fundo missionário central EncheiVos',
      transferredBy: 'Helena Beatriz Almeida',
    },
  ];

  return {
    people,
    churches,
    turmas: [turmaCatedral02, turmaSantoAntonio02, turmaCatedral01],
    financialEntries,
    generalTransfers,
    certificatesIssued: [
      {
        id: 'cert-hist-1',
        personId: 'p-servo-1',
        personName: 'Lucas Gabriel Ferreira',
        turmaId: 'turma-catedral-01-2026',
        turmaName: 'Catedral Sagrado Coração de Jesus – 01/2026',
        churchName: 'Catedral Sagrado Coração de Jesus',
        conclusionDate: '2026-06-15',
        issuedAt: '2026-06-16',
        issuedBy: 'Jonas Gabriel (Administrador Geral)',
      },
    ],
    settings: {
      organizationName: 'Missão EncheiVos – Três Lagoas',
      city: 'Três Lagoas – MS',
    },
    auditLogs: [
      {
        id: 'aud-1',
        timestamp: '2026-10-20 19:45',
        actorName: 'Patrícia Nogueira Santos',
        actorRole: 'Formador',
        action: 'Finalização de Chamada',
        details: 'Finalizou a chamada do 17º Encontro da turma Catedral Sagrado Coração de Jesus – 02/2026.',
        turmaId: 'turma-catedral-02-2026',
      },
      {
        id: 'aud-2',
        timestamp: '2026-09-20 14:20',
        actorName: 'Roberto Tavares Lima',
        actorRole: 'Financeiro',
        action: 'Transferência para Conta Geral',
        details: 'Transferiu R$ 350,00 da turma Catedral – 02/2026 para a Conta Geral.',
        turmaId: 'turma-catedral-02-2026',
      },
    ],
  };
}

export function createCleanProductionState(adminData: {
  fullName: string;
  email: string;
  birthDate: string;
  cpf?: string;
  address: string;
  parish: string;
  keepChurches?: Church[];
  settings?: AppState['settings'];
}): AppState {
  const leandroAdmin: Person = {
    id: 'p-admin',
    fullName: adminData.fullName.trim() || 'Leandro Dutra',
    email: adminData.email.trim() || 'leandro.dutra@ufms.br',
    password: '123456',
    birthDate: adminData.birthDate || '1988-03-14',
    cpf: adminData.cpf?.trim() || undefined,
    address: adminData.address.trim() || 'Centro, Três Lagoas - MS',
    parish: adminData.parish.trim() || 'Catedral Sagrado Coração de Jesus',
    active: true,
    systemAccessAuthorized: true,
    authorizedBy: 'Configuração Inicial do Sistema',
    systemRole: 'Administrador',
    preferredTheme: 'azul-petroleo',
    history: [],
  };

  const jonasAdmin: Person = {
    id: 'p-admin-jonas',
    fullName: 'Jonas Gabriel',
    email: 'jonasgabitres@gmail.com',
    password: '123456',
    birthDate: '1988-03-14',
    address: 'Centro, Três Lagoas - MS',
    parish: 'Catedral Sagrado Coração de Jesus',
    active: true,
    systemAccessAuthorized: true,
    authorizedBy: 'Configuração Inicial do Sistema',
    systemRole: 'Administrador',
    preferredTheme: 'azul-petroleo',
    history: [],
  };

  const initialPeople =
    leandroAdmin.email.toLowerCase() === jonasAdmin.email.toLowerCase()
      ? [leandroAdmin]
      : [leandroAdmin, jonasAdmin];

  return {
    people: initialPeople,
    churches: adminData.keepChurches || [],
    turmas: [],
    financialEntries: [],
    generalTransfers: [],
    certificatesIssued: [],
    settings: adminData.settings || {
      organizationName: 'Missão EncheiVos – Três Lagoas',
      city: 'Três Lagoas – MS',
    },
    auditLogs: [
      {
        id: `aud-prod-${Date.now()}`,
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        actorName: 'Sistema Inicial',
        actorRole: 'Administrador',
        action: 'Inicialização da Base Oficial com 2 Administradores',
        details: `Administradores iniciais configurados: ${leandroAdmin.email} e ${jonasAdmin.email} (senha inicial padrão: 123456).`,
      },
    ],
  };
}

export function createDefaultDefinitiveState(): AppState {
  return createCleanProductionState({
    fullName: 'Leandro Dutra',
    email: 'leandro.dutra@ufms.br',
    birthDate: '1988-03-14',
    address: 'Centro, Três Lagoas - MS',
    parish: 'Catedral Sagrado Coração de Jesus',
    keepChurches: DEFAULT_TRES_LAGOAS_CHURCHES.map((c) => ({ ...c })),
    settings: {
      organizationName: 'Missão EncheiVos – Três Lagoas',
      city: 'Três Lagoas – MS',
    },
  });
}



