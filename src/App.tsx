import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  BookOpen,
  Wallet,
  Award,
  FileBarChart2,
  Settings,
  KeyRound,
  Bell,
  CloudCheck,
  Menu,
  X,
  ArrowRight,
  AlertTriangle,
  FileText,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  signInWithPopup,
} from './firebase';
import {
  AppState,
  AttendanceStatus,
  CertificateIssued,
  Church,
  OrganizationSettings,
  PaymentMethod,
  Person,
  ServoFunction,
  SystemRole,
  ThemeId,
} from './domain/types';
import {
  buildCanceledMeetingAttendance,
  calculateTurmaBalance,
  canPermanentlyDeletePerson,
  computeFinancialNotifications,
  countCourseAbsencesForPerson,
  countFormationAbsencesForServo,
  evaluateCursistaSituation,
  evaluateServoLimitExceeded,
  generateFinancialInstallments,
  generateTurmaName,
  getPermissionsForRole,
  validateNonNegativeTurmaBalance,
  validateParticipantSemesterUniqueness,
} from './domain/rules';
import {
  COURSE_THEMES_19,
  createCleanProductionState,
  createDefaultDefinitiveState,
  createInitialSeedState,
  FORMATION_THEMES_20,
} from './domain/seedData';
import { AttendanceModule } from './components/AttendanceModule';
import { TurmasModule } from './components/TurmasModule';
import { PeopleAndChurchesModule } from './components/PeopleAndChurchesModule';
import { FinancialModule } from './components/FinancialModule';
import { CertificatesAndReportsModule } from './components/CertificatesAndReportsModule';
import { SecurityAndDatabaseModule } from './components/SecurityAndDatabaseModule';
import { SettingsModal } from './components/SettingsModal';
import { LoginModal } from './components/LoginModal';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';

type ActiveModule =
  | 'painel'
  | 'chamada'
  | 'turmas'
  | 'cadastros'
  | 'financeiro'
  | 'certificados'
  | 'relatorios'
  | 'seguranca';

const STORAGE_KEY = 'encheivos_app_state_definitivo_v3';
const ACTIVE_PERSON_KEY = 'encheivos_active_person_id_v3';
const REMEMBERED_SESSION_KEY = 'encheivos_remembered_session_v3';
const REQUIRE_LOGIN_KEY = 'encheivos_require_login_v3';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as AppState;
      }
    } catch {
      // ignore local storage parse error
    }
    return createDefaultDefinitiveState();
  });

  const [activePersonId, setActivePersonId] = useState<string>(() => {
    try {
      return localStorage.getItem(ACTIVE_PERSON_KEY) || 'p-admin';
    } catch {
      return 'p-admin';
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return true;
      }
      return localStorage.getItem(REMEMBERED_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [requireLoginScreen, setRequireLoginScreen] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem(REQUIRE_LOGIN_KEY);
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  });
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);

  const [activeModule, setActiveModule] = useState<ActiveModule>('painel');
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(
    'turma-catedral-02-2026'
  );
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [cloudSynced, setCloudSynced] = useState<boolean>(false);

  // Persist state locally
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch {
      // ignore quota errors
    }
  }, [appState]);

  const authorizedPeople = useMemo(
    () => appState.people.filter((p) => p.systemAccessAuthorized && p.systemRole && p.active),
    [appState.people]
  );

  const currentPerson = useMemo(
    () =>
      authorizedPeople.find((p) => p.id === activePersonId) ||
      authorizedPeople[0] ||
      appState.people[0],
    [authorizedPeople, activePersonId, appState.people]
  );

  const currentRole: SystemRole = currentPerson?.systemRole || 'Administrador';
  const currentTheme: ThemeId = currentPerson?.preferredTheme || 'azul-petroleo';
  const permissions = useMemo(() => getPermissionsForRole(currentRole), [currentRole]);

  // Apply user's individual theme to root document (RF-056 a RF-058 / CA-013)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  // Firebase Auth listener & Cloud Firestore Sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const wsPath = `workspaces/${user.uid}`;
        try {
          const snap = await getDoc(doc(db, 'workspaces', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (typeof data.payloadJson === 'string') {
              const parsed = JSON.parse(data.payloadJson) as AppState;
              setAppState(parsed);
            }
          } else {
            await setDoc(doc(db, 'workspaces', user.uid), {
              ownerId: user.uid,
              organizationName: appState.settings.organizationName.slice(0, 200),
              payloadJson: JSON.stringify(appState).slice(0, 890000),
              version: 1,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          setCloudSynced(true);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, wsPath);
        }
      }
    });
    return () => unsub();
  }, []);

  const syncToFirestoreIfSignedIn = async (nextState: AppState) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const wsPath = `workspaces/${uid}`;
    try {
      await setDoc(
        doc(db, 'workspaces', uid),
        {
          ownerId: uid,
          organizationName: nextState.settings.organizationName.slice(0, 200),
          payloadJson: JSON.stringify(nextState).slice(0, 890000),
          version: Date.now(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setCloudSynced(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, wsPath);
    }
  };

  // Escopo de turmas visíveis para o usuário atual (Matriz 3.1 / CA-019)
  const visibleTurmas = useMemo(() => {
    if (permissions.canViewAllTurmas) {
      return appState.turmas;
    }
    // Perfis restritos à própria turma (Formador, Servo, Servo Auxiliar, Financeiro)
    const ownTurmas = appState.turmas.filter((t) =>
      t.participants.some((p) => p.personId === currentPerson.id)
    );
    return ownTurmas.length > 0 ? ownTurmas : [appState.turmas[0]].filter(Boolean);
  }, [appState.turmas, permissions.canViewAllTurmas, currentPerson.id]);

  // Notificações financeiras consolidadas (referência 29/10/2026 — RF-074 a RF-076)
  const allNotifications = useMemo(
    () =>
      computeFinancialNotifications(
        appState.financialEntries.filter((e) =>
          visibleTurmas.some((t) => t.id === e.turmaId)
        ),
        visibleTurmas,
        '2026-10-29'
      ),
    [appState.financialEntries, visibleTurmas]
  );

  const appendAudit = (
    state: AppState,
    action: string,
    details: string,
    turmaId?: string
  ): AppState['auditLogs'] => [
    {
      id: `aud-${Date.now()}`,
      timestamp: '2026-10-29 15:00',
      actorName: currentPerson.fullName,
      actorRole: currentRole,
      action,
      details,
      turmaId,
    },
    ...state.auditLogs.slice(0, 49),
  ];

  // Handlers de Chamada de Cursistas (RF-034 a RF-039)
  const handleMarkCursistaAttendance = (
    turmaId: string,
    meetingNumber: number,
    personId: string,
    status: AttendanceStatus
  ) => {
    setAppState((prev) => {
      const nextTurmas = prev.turmas.map((t) => {
        if (t.id !== turmaId) return t;
        const nextMeetings = t.courseMeetings.map((m) => {
          if (m.number !== meetingNumber || m.cursistaCallFinalized) return m;
          return {
            ...m,
            cursistaAttendance: {
              ...m.cursistaAttendance,
              [personId]: status,
            },
          };
        });
        return { ...t, courseMeetings: nextMeetings };
      });
      const next = { ...prev, turmas: nextTurmas };
      syncToFirestoreIfSignedIn(next);
      return next;
    });
  };

  const handleFinalizeCursistaCall = (turmaId: string, meetingNumber: number) => {
    setAppState((prev) => {
      let updatedPeople = [...prev.people];

      const nextTurmas = prev.turmas.map((t) => {
        if (t.id !== turmaId) return t;

        const nextMeetings = t.courseMeetings.map((m) =>
          m.number === meetingNumber ? { ...m, cursistaCallFinalized: true } : m
        );

        const finalizedCount = nextMeetings.filter((m) => m.cursistaCallFinalized).length;

        const nextParticipants = t.participants.map((p) => {
          if (p.role !== 'Cursista') return p;
          const faults = countCourseAbsencesForPerson(p.personId, nextMeetings, 'Cursista');
          const evaluated = evaluateCursistaSituation(faults, finalizedCount, p.situation);

          if (
            evaluated.situation === 'Reprovado por frequência' &&
            p.situation !== 'Reprovado por frequência'
          ) {
            updatedPeople = updatedPeople.map((person) =>
              person.id === p.personId
                ? {
                    ...person,
                    history: person.history.map((h) =>
                      h.turmaId === t.id
                        ? { ...h, finalStatus: 'Reprovado por frequência' }
                        : h
                    ),
                  }
                : person
            );
            return {
              ...p,
              situation: 'Reprovado por frequência' as const,
              activeInTurma: false,
              deactivatedAt: '2026-10-29',
              deactivationReason: `Atingiu a 4ª falta no ${meetingNumber}º encontro (RN-009)`,
            };
          }

          if (evaluated.situation === 'Concluído' && p.situation !== 'Concluído') {
            updatedPeople = updatedPeople.map((person) =>
              person.id === p.personId
                ? {
                    ...person,
                    history: person.history.map((h) =>
                      h.turmaId === t.id ? { ...h, finalStatus: 'Concluído' } : h
                    ),
                  }
                : person
            );
            return {
              ...p,
              situation: 'Concluído' as const,
              activeInTurma: true,
            };
          }

          return p;
        });

        return {
          ...t,
          courseMeetings: nextMeetings,
          participants: nextParticipants,
        };
      });

      const next: AppState = {
        ...prev,
        turmas: nextTurmas,
        people: updatedPeople,
        auditLogs: appendAudit(
          prev,
          'Finalização de Chamada de Cursistas',
          `Finalizou a chamada do Encontro #${meetingNumber} (${turmaId}).`,
          turmaId
        ),
      };
      syncToFirestoreIfSignedIn(next);
      return next;
    });
  };

  const handleReopenCursistaCall = (turmaId: string, meetingNumber: number) => {
    if (!permissions.canReopenFinalizedAttendance) return;
    setAppState((prev) => {
      const nextTurmas = prev.turmas.map((t) => {
        if (t.id !== turmaId) return t;
        return {
          ...t,
          courseMeetings: t.courseMeetings.map((m) =>
            m.number === meetingNumber
              ? {
                  ...m,
                  cursistaCallFinalized: false,
                  cursistaReopenedBy: currentPerson.fullName,
                }
              : m
          ),
        };
      });
      return {
        ...prev,
        turmas: nextTurmas,
        auditLogs: appendAudit(
          prev,
          'Reabertura de Chamada',
          `Reabriu a chamada de cursistas do Encontro #${meetingNumber}.`,
          turmaId
        ),
      };
    });
  };

  const handleToggleCancelCourseMeeting = (turmaId: string, meetingNumber: number) => {
    setAppState((prev) => {
      const nextTurmas = prev.turmas.map((t) => {
        if (t.id !== turmaId) return t;
        const nextMeetings = t.courseMeetings.map((m) => {
          if (m.number !== meetingNumber) return m;
          const nextCanceled = !m.canceled;
          if (nextCanceled) {
            return {
              ...m,
              canceled: true,
              cursistaAttendance: buildCanceledMeetingAttendance(t.participants, 'Cursista'),
              servoAttendance: buildCanceledMeetingAttendance(t.participants, 'Servo'),
              cursistaCallFinalized: true,
              servoCallFinalized: true,
            };
          }
          return {
            ...m,
            canceled: false,
            cursistaCallFinalized: false,
            servoCallFinalized: false,
          };
        });
        return { ...t, courseMeetings: nextMeetings };
      });
      return {
        ...prev,
        turmas: nextTurmas,
        auditLogs: appendAudit(
          prev,
          'Cancelamento / Abono de Encontro',
          `Alterou situação de cancelamento/abono do Encontro #${meetingNumber} (RF-031).`,
          turmaId
        ),
      };
    });
  };

  // Handlers de Chamada de Servos no Curso e na Formação (RF-040 a RF-048)
  const handleMarkServoCourseAttendance = (
    turmaId: string,
    meetingNumber: number,
    personId: string,
    status: AttendanceStatus
  ) => {
    setAppState((prev) => ({
      ...prev,
      turmas: prev.turmas.map((t) =>
        t.id !== turmaId
          ? t
          : {
              ...t,
              courseMeetings: t.courseMeetings.map((m) =>
                m.number !== meetingNumber || m.servoCallFinalized
                  ? m
                  : {
                      ...m,
                      servoAttendance: { ...m.servoAttendance, [personId]: status },
                    }
              ),
            }
      ),
    }));
  };

  const applyServoLimitReversion = (state: AppState, turmaId: string): AppState => {
    let updatedPeople = [...state.people];
    const nextTurmas = state.turmas.map((t) => {
      if (t.id !== turmaId) return t;
      const nextParticipants = t.participants.map((p) => {
        if (p.role !== 'Servo' || !p.activeInTurma) return p;
        const cFaults = countCourseAbsencesForPerson(p.personId, t.courseMeetings, 'Servo');
        const fFaults = countFormationAbsencesForServo(p.personId, t.formationMeetings);
        const check = evaluateServoLimitExceeded(cFaults, fFaults);
        if (check.exceeded) {
          // RF-048 / RN-013: Retorna à condição de cursista e registra no histórico
          updatedPeople = updatedPeople.map((person) =>
            person.id === p.personId
              ? {
                  ...person,
                  history: [
                    ...person.history,
                    {
                      id: `hist-rev-${Date.now()}`,
                      semesterLabel: `0${t.semester}/${t.year}`,
                      turmaId: t.id,
                      turmaName: t.name,
                      churchName: t.churchName,
                      roleType: 'Cursista',
                      servoFunctions: p.servoFunctions,
                      finalStatus: 'Retornou a Cursista',
                      registeredAt: '2026-10-29',
                      notes: `Atingiu o limite de 3 faltas em ${check.modality} e retornou à condição de Cursista (RF-048 / RN-013).`,
                    },
                  ],
                }
              : person
          );
          return {
            ...p,
            role: 'Cursista' as const,
            situation: 'Ativo' as const,
            convertedFromServoAt: '2026-10-29',
            deactivationReason: `Retornou de Servo para Cursista por atingir 3 faltas (${check.modality} — RN-013)`,
          };
        }
        return p;
      });
      return { ...t, participants: nextParticipants };
    });
    return { ...state, turmas: nextTurmas, people: updatedPeople };
  };

  const handleFinalizeServoCourseCall = (turmaId: string, meetingNumber: number) => {
    setAppState((prev) => {
      const finalizedState: AppState = {
        ...prev,
        turmas: prev.turmas.map((t) =>
          t.id !== turmaId
            ? t
            : {
                ...t,
                courseMeetings: t.courseMeetings.map((m) =>
                  m.number === meetingNumber ? { ...m, servoCallFinalized: true } : m
                ),
              }
        ),
      };
      return applyServoLimitReversion(finalizedState, turmaId);
    });
  };

  const handleReopenServoCourseCall = (turmaId: string, meetingNumber: number) => {
    if (!permissions.canReopenFinalizedAttendance) return;
    setAppState((prev) => ({
      ...prev,
      turmas: prev.turmas.map((t) =>
        t.id !== turmaId
          ? t
          : {
              ...t,
              courseMeetings: t.courseMeetings.map((m) =>
                m.number === meetingNumber ? { ...m, servoCallFinalized: false } : m
              ),
            }
      ),
    }));
  };

  const handleMarkServoFormationAttendance = (
    turmaId: string,
    meetingNumber: number,
    personId: string,
    status: AttendanceStatus
  ) => {
    setAppState((prev) => ({
      ...prev,
      turmas: prev.turmas.map((t) =>
        t.id !== turmaId
          ? t
          : {
              ...t,
              formationMeetings: t.formationMeetings.map((m) =>
                m.number !== meetingNumber || m.callFinalized
                  ? m
                  : {
                      ...m,
                      servoAttendance: { ...m.servoAttendance, [personId]: status },
                    }
              ),
            }
      ),
    }));
  };

  const handleFinalizeServoFormationCall = (turmaId: string, meetingNumber: number) => {
    setAppState((prev) => {
      const finalizedState: AppState = {
        ...prev,
        turmas: prev.turmas.map((t) =>
          t.id !== turmaId
            ? t
            : {
                ...t,
                formationMeetings: t.formationMeetings.map((m) =>
                  m.number === meetingNumber ? { ...m, callFinalized: true } : m
                ),
              }
        ),
      };
      return applyServoLimitReversion(finalizedState, turmaId);
    });
  };

  const handleReopenServoFormationCall = (turmaId: string, meetingNumber: number) => {
    if (!permissions.canReopenFinalizedAttendance) return;
    setAppState((prev) => ({
      ...prev,
      turmas: prev.turmas.map((t) =>
        t.id !== turmaId
          ? t
          : {
              ...t,
              formationMeetings: t.formationMeetings.map((m) =>
                m.number === meetingNumber ? { ...m, callFinalized: false } : m
              ),
            }
      ),
    }));
  };

  // Handlers de Turmas (RF-023 a RF-027)
  const handleCreateTurma = (payload: {
    churchId: string;
    semester: 1 | 2;
    year: number;
    meetingDay: 'Segunda-feira' | 'Terça-feira';
    courseStartDate: string;
    formationStartDate: string;
    formationEndDate: string;
  }) => {
    const church = appState.churches.find((c) => c.id === payload.churchId);
    if (!church) {
      return { ok: false, message: 'Selecione uma igreja válida.' };
    }
    const generatedName = generateTurmaName(church.name, payload.semester, payload.year);
    const newId = `turma-${Date.now()}`;

    const baseCourseDate = new Date(`${payload.courseStartDate}T12:00:00`);
    const courseMeetings = COURSE_THEMES_19.map((theme, idx) => {
      const d = new Date(baseCourseDate.getTime());
      d.setDate(d.getDate() + idx * 7);
      return {
        number: idx + 1,
        date: d.toISOString().slice(0, 10),
        theme,
        canceled: false,
        cursistaAttendance: {},
        cursistaCallFinalized: false,
        servoAttendance: {},
        servoCallFinalized: false,
      };
    });

    const baseFormDate = new Date(`${payload.formationStartDate}T12:00:00`);
    const formationMeetings = FORMATION_THEMES_20.map((theme, idx) => {
      const d = new Date(baseFormDate.getTime());
      d.setDate(d.getDate() + idx * 7);
      return {
        number: idx + 1,
        date: d.toISOString().slice(0, 10),
        theme,
        canceled: false,
        servoAttendance: {},
        callFinalized: false,
      };
    });

    const newTurma = {
      id: newId,
      churchId: church.id,
      churchName: church.name,
      semester: payload.semester,
      year: payload.year,
      name: generatedName,
      meetingDay: payload.meetingDay,
      active: true,
      formationStartDate: payload.formationStartDate,
      formationEndDate: payload.formationEndDate,
      participants: [],
      courseMeetings,
      formationMeetings,
    };

    setAppState((prev) => ({
      ...prev,
      turmas: [newTurma, ...prev.turmas],
      auditLogs: appendAudit(
        prev,
        'Criação de Turma e Conta Financeira',
        `Criou a turma "${generatedName}" com conta financeira exclusiva e 19 encontros (CA-003).`,
        newId
      ),
    }));
    setSelectedTurmaId(newId);

    return {
      ok: true,
      newTurmaId: newId,
      message: `Turma "${generatedName}" criada com sucesso! Conta financeira exclusiva inicializada automaticamente (RF-061 / CA-003).`,
    };
  };

  const handleAddParticipantToTurma = (
    turmaId: string,
    personId: string,
    role: 'Cursista' | 'Servo',
    servoFunctions: ServoFunction[]
  ) => {
    const turma = appState.turmas.find((t) => t.id === turmaId);
    const person = appState.people.find((p) => p.id === personId);
    if (!turma || !person) {
      return { ok: false, message: 'Turma ou pessoa não encontrada.' };
    }

    if (turma.participants.some((p) => p.personId === personId && p.activeInTurma)) {
      return {
        ok: false,
        message: `${person.fullName} já está vinculado(a) ativamente nesta turma.`,
      };
    }

    const uniqueness = validateParticipantSemesterUniqueness(
      personId,
      turma.id,
      turma.semester,
      turma.year,
      appState.turmas
    );
    if (!uniqueness.valid) {
      return {
        ok: false,
        message: uniqueness.message || 'Pessoa já vinculada em outra turma no mesmo semestre.',
      };
    }

    setAppState((prev) => ({
      ...prev,
      turmas: prev.turmas.map((t) =>
        t.id !== turmaId
          ? t
          : {
              ...t,
              participants: [
                ...t.participants,
                {
                  personId,
                  role,
                  servoFunctions,
                  situation: 'Ativo',
                  activeInTurma: true,
                  joinedAt: '2026-10-29',
                },
              ],
            }
      ),
      people: prev.people.map((p) =>
        p.id !== personId
          ? p
          : {
              ...p,
              history: [
                ...p.history,
                {
                  id: `hist-${Date.now()}`,
                  semesterLabel: `0${turma.semester}/${turma.year}`,
                  turmaId: turma.id,
                  turmaName: turma.name,
                  churchName: turma.churchName,
                  roleType: role,
                  servoFunctions,
                  finalStatus: 'Em andamento',
                  registeredAt: '2026-10-29',
                },
              ],
            }
      ),
    }));

    return {
      ok: true,
      message: `${person.fullName} vinculado(a) como ${role} na turma "${turma.name}"!`,
    };
  };

  const handleRegisterCursistaDropOut = (
    turmaId: string,
    personId: string,
    reason: string
  ) => {
    setAppState((prev) => ({
      ...prev,
      turmas: prev.turmas.map((t) =>
        t.id !== turmaId
          ? t
          : {
              ...t,
              participants: t.participants.map((p) =>
                p.personId !== personId
                  ? p
                  : {
                      ...p,
                      situation: 'Desistente',
                      activeInTurma: false,
                      deactivatedAt: '2026-10-29',
                      deactivationReason: reason,
                    }
              ),
            }
      ),
      people: prev.people.map((p) =>
        p.id !== personId
          ? p
          : {
              ...p,
              history: p.history.map((h) =>
                h.turmaId === turmaId
                  ? { ...h, finalStatus: 'Desistente', notes: reason }
                  : h
              ),
            }
      ),
    }));
  };

  // Handlers de Financeiro (RF-061 a RF-073)
  const handleCreateFinancialEntry = (payload: {
    turmaId: string;
    type: 'Receber' | 'Pagar';
    totalAmount: number;
    paymentMethod: PaymentMethod;
    installmentsCount: number;
    firstDueDate: string;
    observation: string;
    markPaidImmediately: boolean;
  }) => {
    if (payload.type === 'Pagar' && payload.markPaidImmediately) {
      const bal = calculateTurmaBalance(
        payload.turmaId,
        appState.financialEntries,
        appState.generalTransfers
      );
      const check = validateNonNegativeTurmaBalance(bal.availableBalance, payload.totalAmount);
      if (!check.allowed) {
        return { ok: false, message: check.message || 'Saldo insuficiente.' };
      }
    }

    const entryId = `fin-${Date.now()}`;
    const gen = generateFinancialInstallments(
      entryId,
      payload.totalAmount,
      payload.paymentMethod,
      payload.installmentsCount,
      payload.firstDueDate,
      payload.markPaidImmediately
    );
    if (!gen.valid) {
      return { ok: false, message: gen.error || 'Erro ao gerar parcelas.' };
    }

    const newEntry = {
      id: entryId,
      turmaId: payload.turmaId,
      type: payload.type,
      totalAmount: payload.totalAmount,
      paymentMethod: payload.paymentMethod,
      observation: payload.observation,
      createdAt: '2026-10-29',
      createdBy: currentPerson.fullName,
      installments: gen.installments,
    };

    setAppState((prev) => ({
      ...prev,
      financialEntries: [newEntry, ...prev.financialEntries],
    }));

    return {
      ok: true,
      message: `Lançamento "${payload.observation}" registrado com ${gen.installments.length} parcela(s)!`,
    };
  };

  const handleMarkInstallmentPaid = (entryId: string, installmentId: string) => {
    const entry = appState.financialEntries.find((e) => e.id === entryId);
    const inst = entry?.installments.find((i) => i.id === installmentId);
    if (!entry || !inst) {
      return { ok: false, message: 'Parcela não localizada.' };
    }

    if (entry.type === 'Pagar') {
      const bal = calculateTurmaBalance(
        entry.turmaId,
        appState.financialEntries,
        appState.generalTransfers
      );
      const check = validateNonNegativeTurmaBalance(bal.availableBalance, inst.amount);
      if (!check.allowed) {
        return { ok: false, message: check.message || 'Saldo insuficiente na turma.' };
      }
    }

    setAppState((prev) => ({
      ...prev,
      financialEntries: prev.financialEntries.map((e) =>
        e.id !== entryId
          ? e
          : {
              ...e,
              installments: e.installments.map((i) =>
                i.id !== installmentId
                  ? i
                  : { ...i, status: 'Pago', paidAt: '2026-10-29' }
              ),
            }
      ),
    }));

    return {
      ok: true,
      message: `Parcela ${inst.number}/${inst.totalInstallments} quitada com sucesso!`,
    };
  };

  const handleTransferToGeneralAccount = (payload: {
    turmaId: string;
    amount: number;
    observation: string;
  }) => {
    const turma = appState.turmas.find((t) => t.id === payload.turmaId);
    if (!turma) return { ok: false, message: 'Turma não encontrada.' };

    const bal = calculateTurmaBalance(
      turma.id,
      appState.financialEntries,
      appState.generalTransfers
    );
    const check = validateNonNegativeTurmaBalance(bal.availableBalance, payload.amount);
    if (!check.allowed) {
      return { ok: false, message: check.message || 'Saldo insuficiente.' };
    }

    const newTransfer = {
      id: `tr-${Date.now()}`,
      turmaId: turma.id,
      turmaName: turma.name,
      churchId: turma.churchId,
      churchName: turma.churchName,
      amount: payload.amount,
      date: '2026-10-29',
      observation: payload.observation,
      transferredBy: currentPerson.fullName,
    };

    setAppState((prev) => ({
      ...prev,
      generalTransfers: [newTransfer, ...prev.generalTransfers],
      auditLogs: appendAudit(
        prev,
        'Transferência à Conta Geral',
        `Transferiu R$ ${payload.amount.toFixed(2)} da turma ${turma.name} (${turma.churchName}) para a Conta Geral (CA-016).`,
        turma.id
      ),
    }));

    return {
      ok: true,
      message: `Transferência de R$ ${payload.amount.toFixed(2)} registrada imediatamente na Conta Geral identificando a turma "${turma.name}" e a igreja "${turma.churchName}" (sem necessidade de confirmação posterior — RF-073 / CA-016).`,
    };
  };

  const navItems: { id: ActiveModule; label: string; icon: React.ReactNode }[] = [
    { id: 'painel', label: 'Painel Geral', icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
    { id: 'chamada', label: 'Chamadas & Frequência', icon: <ClipboardCheck className="h-4 w-4 shrink-0" /> },
    { id: 'turmas', label: 'Turmas & Encontros', icon: <BookOpen className="h-4 w-4 shrink-0" /> },
    { id: 'cadastros', label: 'Pessoas & Igrejas', icon: <Users className="h-4 w-4 shrink-0" /> },
    { id: 'financeiro', label: 'Financeiro & Conta Geral', icon: <Wallet className="h-4 w-4 shrink-0" /> },
    { id: 'certificados', label: 'Certificados PDF', icon: <Award className="h-4 w-4 shrink-0" /> },
    { id: 'relatorios', label: 'Relatórios', icon: <FileBarChart2 className="h-4 w-4 shrink-0" /> },
    { id: 'seguranca', label: 'Segurança, Backup & Base', icon: <ShieldCheck className="h-4 w-4 shrink-0" /> },
  ];

  const totalGeneralAccount = appState.generalTransfers.reduce((s, t) => s + t.amount, 0);

  const handleLogoutSession = () => {
    setIsAuthenticated(false);
    setIsSessionLocked(false);
    setIsLoginModalOpen(false);
    try {
      localStorage.removeItem(REMEMBERED_SESSION_KEY);
    } catch {
      // ignore
    }
  };

  // Quando o usuário não está autenticado, exibe obrigatoriamente a Tela de Login de Página Inteira
  if (!isAuthenticated || isSessionLocked) {
    return (
      <>
        <LoginModal
          isOpen={true}
          isFullPage={true}
          onClose={() => {}}
          people={appState.people}
          onAuthenticatedPerson={(person, remember) => {
            setActivePersonId(person.id);
            setIsAuthenticated(true);
            setIsSessionLocked(false);
            try {
              localStorage.setItem(ACTIVE_PERSON_KEY, person.id);
              if (remember) {
                localStorage.setItem(REMEMBERED_SESSION_KEY, 'true');
              } else {
                localStorage.removeItem(REMEMBERED_SESSION_KEY);
              }
            } catch {
              // ignore
            }
          }}
          onGoogleLogin={async () => {
            await signInWithPopup(auth, googleProvider);
            setIsAuthenticated(true);
            setIsSessionLocked(false);
          }}
          logoDataUrl={appState.settings.logoDataUrl}
          organizationName={appState.settings.organizationName}
        />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-x-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Desktop / Drawer Mobile */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 w-64 shrink-0 flex-col justify-between bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] lg:static lg:flex ${
          isMobileSidebarOpen ? 'flex' : 'hidden'
        }`}
      >
        <div className="p-5">
          {/* Logo e Identificação da Missão EncheiVos */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              {appState.settings.logoDataUrl ? (
                <img
                  src={appState.settings.logoDataUrl}
                  alt={appState.settings.organizationName}
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 rounded bg-white p-0.5 object-contain"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 font-display text-sm font-bold text-white">
                  EV
                </div>
              )}
              <div>
                <div className="font-display text-base font-bold tracking-tight text-white">
                  Sistema EncheiVos
                </div>
                <div className="text-[11px] text-[var(--sidebar-muted)]">
                  Missão EncheiVos · Três Lagoas
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Fechar menu lateral"
              className="rounded p-1 text-white/70 hover:text-white lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navegação Principal */}
          <nav className="mt-4 space-y-1" aria-label="Menu principal do Sistema EncheiVos">
            {navItems.map((item) => {
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveModule(item.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-[var(--sidebar-active)] text-white'
                      : 'text-[var(--sidebar-muted)] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Rodapé da Sidebar: Conta Logada, Configurações e Sair */}
        <div className="border-t border-white/10 p-4 space-y-3">
          <PWAInstallButton variant="sidebar" />

          <div className="rounded-lg bg-black/20 p-3 text-xs text-white">
            <div className="text-[11px] text-[var(--sidebar-muted)]">Conectado como:</div>
            <div className="mt-0.5 font-bold truncate">{currentPerson.fullName}</div>
            <div className="text-[11px] text-emerald-300 font-semibold">
              {currentRole} · {currentPerson.email}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              <Settings className="h-3.5 w-3.5" />
              Temas & Logo
            </button>
            <button
              type="button"
              onClick={handleLogoutSession}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/15 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500/30"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract (3 zonas: Contexto, Links rápidos, Ação primária) */}
        <header className="no-print flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-3.5">
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Abrir menu de navegação"
              className="rounded-lg border border-[var(--border-subtle)] p-2 text-[var(--text-primary)] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-display text-sm font-bold text-[var(--text-primary)] whitespace-nowrap">
              {appState.settings.organizationName}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-4 text-xs font-medium text-[var(--text-secondary)]">
            <span className="whitespace-nowrap">
              Usuário: <strong className="text-[var(--text-primary)]">{currentPerson.fullName}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap">
              Perfil: <strong className="text-[var(--accent-primary)]">{currentRole}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                setActiveModule('financeiro');
              }}
              className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap"
            >
              <Bell className="h-3.5 w-3.5 text-amber-600" />
              <span>{allNotifications.length} alertas</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveModule('chamada')}
              className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] whitespace-nowrap"
            >
              Registrar Chamada
            </button>
            <button
              type="button"
              onClick={handleLogoutSession}
              className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] whitespace-nowrap"
            >
              Sair
            </button>
          </div>
        </header>

        {/* Conteúdo da Tela Ativa */}
        <main className="flex-1 p-5 lg:p-7 max-w-[1360px] w-full mx-auto">
          {activeModule === 'painel' && (
            <div className="space-y-6">
              {/* Banner Contextual e Atalhos */}
              <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span>Semestre Vigente: 02/2026</span>
                    <span>·</span>
                    <span>Três Lagoas – MS</span>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setActiveModule('seguranca')}
                      className="font-semibold text-[var(--accent-primary)] hover:underline"
                    >
                      {firebaseUser
                        ? 'Cloud Firestore Sincronizado'
                        : 'Base Local + Cloud Firestore (Gerenciar Backup)'}
                    </button>
                  </div>
                  <h1 className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">
                    Painel Operacional
                  </h1>
                  <p className="mt-1 max-w-2xl text-xs text-[var(--text-secondary)]">
                    Gestão integrada de turmas por semestre, chamadas do curso (19 encontros) e da formação de servos (20 encontros), certificados individuais em PDF e finanças.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <PWAInstallButton variant="card" />
                </div>
              </div>

              {/* Indicadores de Acompanhamento */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Turmas no Escopo
                  </span>
                  <p className="font-mono-tabular mt-1 text-2xl font-bold text-[var(--text-primary)]">
                    {visibleTurmas.length}
                  </p>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    {appState.churches.length} igrejas cadastradas em Três Lagoas
                  </span>
                </div>

                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Pessoas Cadastradas
                  </span>
                  <p className="font-mono-tabular mt-1 text-2xl font-bold text-[var(--text-primary)]">
                    {appState.people.length}
                  </p>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    Administrador: {currentPerson.fullName}
                  </span>
                </div>

                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    {visibleTurmas[0]
                      ? `Chamadas (${visibleTurmas[0].name})`
                      : 'Chamadas do Semestre'}
                  </span>
                  <p className="font-mono-tabular mt-1 text-2xl font-bold text-emerald-700">
                    {visibleTurmas[0]
                      ? `${visibleTurmas[0].courseMeetings.filter((m) => m.cursistaCallFinalized).length} / 19`
                      : '0 / 19'}
                  </p>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    {visibleTurmas[0]
                      ? 'Encontros do curso finalizados'
                      : 'Crie a primeira turma em Turmas & Encontros'}
                  </span>
                </div>

                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    {permissions.canAccessGeneralAccount
                      ? 'Saldo na Conta Geral'
                      : 'Alertas de Vencimento Ativos'}
                  </span>
                  <p className="font-mono-tabular mt-1 text-2xl font-bold text-[var(--accent-primary)]">
                    {permissions.canAccessGeneralAccount
                      ? totalGeneralAccount.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })
                      : `${allNotifications.length} parcela(s)`}
                  </p>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    {allNotifications.length} notificações de vencimento
                  </span>
                </div>
              </div>

              {/* Visão de Turmas + Notificações de Parcelas */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:col-span-7">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                    <h2 className="font-display text-base font-bold text-[var(--text-primary)]">
                      Turmas e Situação Financeira
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveModule('turmas')}
                      className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                    >
                      Gerenciar Turmas
                    </button>
                  </div>

                  {visibleTurmas.length === 0 ? (
                    <div className="py-6 space-y-4">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950">
                        <div className="font-bold text-sm text-emerald-900">
                          Base Oficial Definitiva Pronta para Uso!
                        </div>
                        <p className="mt-1 text-emerald-800">
                          Todos os dados fictícios foram removidos. O sistema está limpo com{' '}
                          <strong>{currentPerson.fullName}</strong> como Administrador Geral e as{' '}
                          <strong>{appState.churches.length} igrejas de Três Lagoas</strong> prontas para uso.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => setActiveModule('cadastros')}
                          className="rounded-lg border border-[var(--border-subtle)] bg-white p-3.5 text-left hover:bg-[var(--bg-subtle)]"
                        >
                          <div className="text-xs font-bold text-[var(--text-primary)]">
                            1. Pessoas & Igrejas
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                            Cadastre a equipe de servos, cursistas ou edite paróquias e párocos.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveModule('turmas')}
                          className="rounded-lg border border-[var(--border-subtle)] bg-white p-3.5 text-left hover:bg-[var(--bg-subtle)]"
                        >
                          <div className="text-xs font-bold text-[var(--accent-primary)]">
                            2. Criar 1ª Turma Oficial
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                            Gera automaticamente os 19 encontros do curso, 20 da formação e a conta da turma.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveModule('seguranca')}
                          className="rounded-lg border border-[var(--border-subtle)] bg-white p-3.5 text-left hover:bg-[var(--bg-subtle)]"
                        >
                          <div className="text-xs font-bold text-[var(--text-primary)]">
                            3. Titular & Segurança
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                            Atualize o e-mail oficial do Leandro ou faça backup em nuvem/JSON.
                          </p>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 divide-y divide-[var(--border-subtle)]">
                      {visibleTurmas.map((t) => {
                        const bal = calculateTurmaBalance(
                          t.id,
                          appState.financialEntries,
                          appState.generalTransfers
                        );
                        const finalizedCalls = t.courseMeetings.filter(
                          (m) => m.cursistaCallFinalized
                        ).length;
                        return (
                          <div
                            key={t.id}
                            className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <div className="font-display text-sm font-bold text-[var(--text-primary)]">
                                {t.name}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                                <span>{t.meetingDay}</span>
                                <span>·</span>
                                <span className="font-mono-tabular">
                                  Encontros finalizados: {finalizedCalls}/19
                                </span>
                                <span>·</span>
                                <span className="font-mono-tabular">
                                  Saldo:{' '}
                                  {bal.availableBalance.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  })}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTurmaId(t.id);
                                  setActiveModule('chamada');
                                }}
                                className="rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-primary)] hover:text-white"
                              >
                                Fazer Chamada
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTurmaId(t.id);
                                  setActiveModule('financeiro');
                                }}
                                className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                              >
                                Conta da Turma
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Notificações Internas de Vencimento */}
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:col-span-5">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                    <h2 className="font-display text-base font-bold text-[var(--text-primary)]">
                      Alertas de Vencimento
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveModule('financeiro')}
                      className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                    >
                      Ver Financeiro
                    </button>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    {allNotifications.length === 0 ? (
                      <p className="py-6 text-center text-xs text-[var(--text-muted)]">
                        Nenhuma parcela pendente próxima do vencimento.
                      </p>
                    ) : (
                      allNotifications.map((n) => (
                        <div
                          key={n.id}
                          className={`rounded-lg border p-3 text-xs ${
                            n.severity === 'Vencida'
                              ? 'border-red-200 bg-red-50 text-red-900'
                              : 'border-amber-200 bg-amber-50 text-amber-900'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span>{n.severity}</span>
                            <span className="font-mono-tabular">
                              Venc.: {n.dueDate.split('-').reverse().join('/')} ·{' '}
                              {n.amount.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </span>
                          </div>
                          <p className="mt-1">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeModule === 'chamada' && (
            <AttendanceModule
              turmas={visibleTurmas}
              selectedTurmaId={selectedTurmaId}
              onSelectTurmaId={setSelectedTurmaId}
              people={appState.people}
              permissions={permissions}
              currentRole={currentRole}
              onMarkCursistaAttendance={handleMarkCursistaAttendance}
              onFinalizeCursistaCall={handleFinalizeCursistaCall}
              onReopenCursistaCall={handleReopenCursistaCall}
              onToggleCancelCourseMeeting={handleToggleCancelCourseMeeting}
              onMarkServoCourseAttendance={handleMarkServoCourseAttendance}
              onFinalizeServoCourseCall={handleFinalizeServoCourseCall}
              onReopenServoCourseCall={handleReopenServoCourseCall}
              onMarkServoFormationAttendance={handleMarkServoFormationAttendance}
              onFinalizeServoFormationCall={handleFinalizeServoFormationCall}
              onReopenServoFormationCall={handleReopenServoFormationCall}
            />
          )}

          {activeModule === 'turmas' && (
            <TurmasModule
              turmas={visibleTurmas}
              churches={appState.churches}
              people={appState.people}
              selectedTurmaId={selectedTurmaId}
              onSelectTurmaId={setSelectedTurmaId}
              permissions={permissions}
              onCreateTurma={handleCreateTurma}
              onToggleTurmaActive={(turmaId) =>
                setAppState((prev) => ({
                  ...prev,
                  turmas: prev.turmas.map((t) =>
                    t.id === turmaId ? { ...t, active: !t.active } : t
                  ),
                }))
              }
              onAddParticipantToTurma={handleAddParticipantToTurma}
              onRegisterCursistaDropOut={handleRegisterCursistaDropOut}
              onUpdateServoFunctions={(turmaId, personId, servoFunctions) =>
                setAppState((prev) => ({
                  ...prev,
                  turmas: prev.turmas.map((t) =>
                    t.id !== turmaId
                      ? t
                      : {
                          ...t,
                          participants: t.participants.map((p) =>
                            p.personId === personId ? { ...p, servoFunctions } : p
                          ),
                        }
                  ),
                }))
              }
              onUpdateMeetingInfo={(turmaId, modality, meetingNumber, date, theme) =>
                setAppState((prev) => ({
                  ...prev,
                  turmas: prev.turmas.map((t) => {
                    if (t.id !== turmaId) return t;
                    if (modality === 'Curso') {
                      return {
                        ...t,
                        courseMeetings: t.courseMeetings.map((m) =>
                          m.number === meetingNumber ? { ...m, date, theme } : m
                        ),
                      };
                    }
                    return {
                      ...t,
                      formationMeetings: t.formationMeetings.map((m) =>
                        m.number === meetingNumber ? { ...m, date, theme } : m
                      ),
                    };
                  }),
                }))
              }
              onOpenAttendanceShortcut={(turmaId) => {
                setSelectedTurmaId(turmaId);
                setActiveModule('chamada');
              }}
            />
          )}

          {activeModule === 'cadastros' && (
            <PeopleAndChurchesModule
              people={appState.people}
              churches={appState.churches}
              turmas={appState.turmas}
              permissions={permissions}
              currentRole={currentRole}
              currentActorName={currentPerson.fullName}
              onCreatePerson={(newPersonData) =>
                setAppState((prev) => {
                  const next: AppState = {
                    ...prev,
                    people: [
                      {
                        ...newPersonData,
                        id: `person-${Date.now()}`,
                        history: [],
                      },
                      ...prev.people,
                    ],
                  };
                  syncToFirestoreIfSignedIn(next);
                  return next;
                })
              }
              onUpdatePerson={(personId, updated) =>
                setAppState((prev) => {
                  const next: AppState = {
                    ...prev,
                    people: prev.people.map((p) =>
                      p.id === personId
                        ? {
                            ...p,
                            fullName: updated.fullName,
                            email: updated.email,
                            password: updated.password || p.password || '123456',
                            birthDate: updated.birthDate,
                            cpf: updated.cpf,
                            address: updated.address,
                            parish: updated.parish,
                            systemAccessAuthorized: updated.systemAccessAuthorized,
                            authorizedBy: updated.systemAccessAuthorized
                              ? p.authorizedBy || currentPerson.fullName
                              : undefined,
                            systemRole: updated.systemAccessAuthorized
                              ? updated.systemRole || p.systemRole || 'Servo'
                              : undefined,
                          }
                        : p
                    ),
                    auditLogs: appendAudit(
                      prev,
                      'Edição de Cadastro de Pessoa',
                      `Atualizou os dados cadastrais de "${updated.fullName}" (histórico preservado).`
                    ),
                  };
                  syncToFirestoreIfSignedIn(next);
                  return next;
                })
              }
              onTogglePersonActive={(personId) =>
                setAppState((prev) => {
                  const next: AppState = {
                    ...prev,
                    people: prev.people.map((p) =>
                      p.id === personId ? { ...p, active: !p.active } : p
                    ),
                  };
                  syncToFirestoreIfSignedIn(next);
                  return next;
                })
              }
              onDeletePersonIfNoHistory={(personId) => {
                const target = appState.people.find((p) => p.id === personId);
                if (!target) return { ok: false, message: 'Pessoa não encontrada.' };
                const check = canPermanentlyDeletePerson(target, appState.turmas);
                if (!check.allowed) {
                  return { ok: false, message: check.reason || 'Exclusão bloqueada.' };
                }
                setAppState((prev) => {
                  const next: AppState = {
                    ...prev,
                    people: prev.people.filter((p) => p.id !== personId),
                  };
                  syncToFirestoreIfSignedIn(next);
                  return next;
                });
                return {
                  ok: true,
                  message: `Cadastro de "${target.fullName}" (sem histórico) removido.`,
                };
              }}
              onUpdatePersonSystemAccess={(personId, authorized, role, password) =>
                setAppState((prev) => {
                  const next: AppState = {
                    ...prev,
                    people: prev.people.map((p) =>
                      p.id === personId
                        ? {
                            ...p,
                            systemAccessAuthorized: authorized,
                            authorizedBy: authorized ? currentPerson.fullName : undefined,
                            systemRole: authorized ? role || p.systemRole || 'Servo' : undefined,
                            password: password || p.password || '123456',
                          }
                        : p
                    ),
                  };
                  syncToFirestoreIfSignedIn(next);
                  return next;
                })
              }
              onCreateChurch={(newChurch) =>
                setAppState((prev) => {
                  const next: AppState = {
                    ...prev,
                    churches: [
                      ...prev.churches,
                      { ...newChurch, id: `church-${Date.now()}` },
                    ],
                  };
                  syncToFirestoreIfSignedIn(next);
                  return next;
                })
              }
              onUpdateChurch={(churchId, updated) =>
                setAppState((prev) => {
                  const next: AppState = {
                    ...prev,
                    churches: prev.churches.map((c) =>
                      c.id === churchId ? { ...c, ...updated } : c
                    ),
                    turmas: prev.turmas.map((t) =>
                      t.churchId === churchId
                        ? {
                            ...t,
                            churchName: updated.name,
                            name: generateTurmaName(updated.name, t.semester, t.year),
                          }
                        : t
                    ),
                    auditLogs: appendAudit(
                      prev,
                      'Edição de Igreja / Paróquia',
                      `Atualizou o cadastro da igreja "${updated.name}" (Pároco: ${updated.priestName}).`
                    ),
                  };
                  syncToFirestoreIfSignedIn(next);
                  return next;
                })
              }
            />
          )}

          {activeModule === 'financeiro' && (
            <FinancialModule
              turmas={visibleTurmas}
              selectedTurmaId={selectedTurmaId}
              onSelectTurmaId={setSelectedTurmaId}
              entries={appState.financialEntries}
              transfers={appState.generalTransfers}
              notifications={allNotifications}
              permissions={permissions}
              currentRole={currentRole}
              onCreateFinancialEntry={handleCreateFinancialEntry}
              onMarkInstallmentPaid={handleMarkInstallmentPaid}
              onTransferToGeneralAccount={handleTransferToGeneralAccount}
            />
          )}

          {(activeModule === 'certificados' || activeModule === 'relatorios') && (
            <CertificatesAndReportsModule
              mode={activeModule}
              turmas={visibleTurmas}
              churches={appState.churches}
              people={appState.people}
              entries={appState.financialEntries}
              transfers={appState.generalTransfers}
              notifications={allNotifications}
              certificatesIssued={appState.certificatesIssued}
              settings={appState.settings}
              selectedTurmaId={selectedTurmaId}
              onSelectTurmaId={setSelectedTurmaId}
              permissions={permissions}
              currentRole={currentRole}
              currentActorName={currentPerson.fullName}
              onRecordCertificateIssued={(cert: Omit<CertificateIssued, 'id'>) =>
                setAppState((prev) => ({
                  ...prev,
                  certificatesIssued: [
                    { ...cert, id: `cert-${Date.now()}` },
                    ...prev.certificatesIssued,
                  ],
                }))
              }
              onUpdateSettings={(partial: Partial<OrganizationSettings>) =>
                setAppState((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, ...partial },
                }))
              }
            />
          )}

          {activeModule === 'seguranca' && (
            <SecurityAndDatabaseModule
              appState={appState}
              currentActorName={currentPerson.fullName}
              currentRole={currentRole}
              permissions={permissions}
              firebaseUserEmail={firebaseUser?.email || null}
              cloudSynced={cloudSynced}
              requireLoginScreen={requireLoginScreen}
              onToggleRequireLoginScreen={(val) => {
                setRequireLoginScreen(val);
                localStorage.setItem(REQUIRE_LOGIN_KEY, String(val));
              }}
              onLockSessionNow={() => {
                setIsSessionLocked(true);
                setIsLoginModalOpen(true);
              }}
              onManualCloudSync={async () => {
                if (!firebaseUser) {
                  setIsLoginModalOpen(true);
                  return;
                }
                await syncToFirestoreIfSignedIn(appState);
              }}
              onRestoreBackupState={(restored) => {
                const next: AppState = {
                  ...restored,
                  auditLogs: appendAudit(
                    restored,
                    'Restauração de Backup Verificado',
                    'Base de dados restaurada a partir de arquivo JSON com verificação de integridade (Checksum FNV-1a).'
                  ),
                };
                setAppState(next);
                syncToFirestoreIfSignedIn(next);
              }}
              onResetToSeedData={() => {
                const fresh = createInitialSeedState();
                setAppState(fresh);
                syncToFirestoreIfSignedIn(fresh);
              }}
              onUpdatePrimaryAdmin={(adminData) => {
                setAppState((prev) => {
                  const targetAdminId =
                    prev.people.find((p) => p.id === 'p-admin')?.id ||
                    prev.people.find((p) => p.systemRole === 'Administrador')?.id ||
                    prev.people[0]?.id;

                  const nextPeople = prev.people.map((p) =>
                    p.id === targetAdminId
                      ? {
                          ...p,
                          fullName: adminData.fullName,
                          email: adminData.email,
                          birthDate: adminData.birthDate,
                          cpf: adminData.cpf,
                          address: adminData.address,
                          parish: adminData.parish,
                          active: true,
                          systemAccessAuthorized: true,
                          systemRole: 'Administrador' as const,
                        }
                      : p
                  );
                  const next: AppState = {
                    ...prev,
                    people: nextPeople,
                    auditLogs: appendAudit(
                      prev,
                      'Transferência de Administrador Geral',
                      `Administrador Geral definido como "${adminData.fullName}" (${adminData.email}).`
                    ),
                  };
                  syncToFirestoreIfSignedIn(next);
                  return next;
                });
              }}
              onInitializeCleanProduction={(adminData) => {
                const cleanState = createCleanProductionState({
                  ...adminData,
                  keepChurches: adminData.keepChurches ? appState.churches : [],
                  settings: appState.settings,
                });
                setAppState(cleanState);
                setActivePersonId('p-admin');
                localStorage.setItem(ACTIVE_PERSON_KEY, 'p-admin');
                syncToFirestoreIfSignedIn(cleanState);
              }}
              onOpenGoogleAuth={() => setIsLoginModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Modal de Login por E-mail + PIN (Seção 3.3) */}
      <LoginModal
        isOpen={isLoginModalOpen || isSessionLocked}
        onClose={() => {
          setIsLoginModalOpen(false);
          setIsSessionLocked(false);
        }}
        people={appState.people}
        onAuthenticatedPerson={(person, remember) => {
          setActivePersonId(person.id);
          setIsSessionLocked(false);
          if (remember) {
            localStorage.setItem(ACTIVE_PERSON_KEY, person.id);
          }
        }}
        onGoogleLogin={async () => {
          await signInWithPopup(auth, googleProvider);
          setIsLoginModalOpen(false);
          setIsSessionLocked(false);
        }}
        logoDataUrl={appState.settings.logoDataUrl}
        organizationName={appState.settings.organizationName}
      />

      {/* Modal de Configurações e Temas por Usuário (Seção 4.9 / CA-013) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentTheme={currentTheme}
        onSelectTheme={(theme) => {
          setAppState((prev) => ({
            ...prev,
            people: prev.people.map((p) =>
              p.id === currentPerson.id ? { ...p, preferredTheme: theme } : p
            ),
          }));
        }}
        settings={appState.settings}
        onUpdateSettings={(partial) =>
          setAppState((prev) => ({
            ...prev,
            settings: { ...prev.settings, ...partial },
          }))
        }
        permissions={permissions}
        currentUserName={currentPerson.fullName}
      />

      <OfflineIndicator />
    </div>
  );
}
