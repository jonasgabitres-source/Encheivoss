import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  History,
  ShieldCheck,
  Power,
  Trash2,
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Plus,
  Pencil,
} from 'lucide-react';
import {
  ALL_SYSTEM_ROLES,
  Church,
  Person,
  SystemRole,
  Turma,
} from '../domain/types';
import {
  canPermanentlyDeletePerson,
  getAssignableRolesForHierarchy,
  RolePermissions,
} from '../domain/rules';
import { maskCpf } from '../utils/backupAndSecurity';

interface PeopleAndChurchesModuleProps {
  people: Person[];
  churches: Church[];
  turmas: Turma[];
  permissions: RolePermissions;
  currentRole: SystemRole;
  currentActorName: string;
  onCreatePerson: (person: Omit<Person, 'id' | 'history'>) => void;
  onUpdatePerson: (
    personId: string,
    updated: {
      fullName: string;
      email: string;
      password?: string;
      birthDate: string;
      cpf?: string;
      address: string;
      parish: string;
      systemAccessAuthorized: boolean;
      systemRole?: SystemRole;
    }
  ) => void;
  onTogglePersonActive: (personId: string) => void;
  onDeletePersonIfNoHistory: (personId: string) => { ok: boolean; message: string };
  onUpdatePersonSystemAccess: (
    personId: string,
    authorized: boolean,
    role?: SystemRole,
    password?: string
  ) => void;
  onCreateChurch: (church: Omit<Church, 'id'>) => void;
  onUpdateChurch: (
    churchId: string,
    updated: { name: string; address: string; priestName: string; active: boolean }
  ) => void;
}

export const PeopleAndChurchesModule: React.FC<PeopleAndChurchesModuleProps> = ({
  people,
  churches,
  turmas,
  permissions,
  currentRole,
  currentActorName,
  onCreatePerson,
  onUpdatePerson,
  onTogglePersonActive,
  onDeletePersonIfNoHistory,
  onUpdatePersonSystemAccess,
  onCreateChurch,
  onUpdateChurch,
}) => {
  const [subTab, setSubTab] = useState<'pessoas' | 'igrejas'>('pessoas');
  const [searchQuery, setSearchQuery] = useState('');
  const [revealSensitive, setRevealSensitive] = useState(false);
  const [selectedHistoryPersonId, setSelectedHistoryPersonId] = useState<string | null>(
    people[0]?.id || null
  );

  const assignableRoles = getAssignableRolesForHierarchy(currentRole);

  const [showPersonForm, setShowPersonForm] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [passwordInput, setPasswordInput] = useState('123456');
  const [birthDate, setBirthDate] = useState('1995-05-15');
  const [cpf, setCpf] = useState('');
  const [address, setAddress] = useState('');
  const [parish, setParish] = useState(churches[0]?.name || 'Catedral Sagrado Coração de Jesus');
  const [authorizeAccess, setAuthorizeAccess] = useState(false);
  const [systemRole, setSystemRole] = useState<SystemRole>(
    assignableRoles.includes('Coordenador Local') ? 'Coordenador Local' : 'Servo'
  );

  const [showChurchForm, setShowChurchForm] = useState(false);
  const [editingChurchId, setEditingChurchId] = useState<string | null>(null);
  const [churchName, setChurchName] = useState('');
  const [churchAddress, setChurchAddress] = useState('');
  const [priestName, setPriestName] = useState('');
  const [churchActive, setChurchActive] = useState(true);

  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const filteredPeople = people.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.parish.toLowerCase().includes(q)
    );
  });

  const selectedPersonForHistory =
    people.find((p) => p.id === selectedHistoryPersonId) || filteredPeople[0];

  const openNewPersonForm = () => {
    setEditingPersonId(null);
    setFullName('');
    setEmail('');
    setPasswordInput('123456');
    setBirthDate('1995-05-15');
    setCpf('');
    setAddress('');
    setParish(churches[0]?.name || 'Catedral Sagrado Coração de Jesus');
    setAuthorizeAccess(false);
    setSystemRole(assignableRoles[0] || 'Servo');
    setShowPersonForm(true);
  };

  const openEditPersonForm = (person: Person) => {
    setEditingPersonId(person.id);
    setFullName(person.fullName);
    setEmail(person.email);
    setPasswordInput(person.password || '123456');
    setBirthDate(person.birthDate);
    setCpf(person.cpf || '');
    setAddress(person.address);
    setParish(person.parish);
    setAuthorizeAccess(person.systemAccessAuthorized);
    setSystemRole(person.systemRole || assignableRoles[0] || 'Servo');
    setShowPersonForm(true);
  };

  const openNewChurchForm = () => {
    setEditingChurchId(null);
    setChurchName('');
    setChurchAddress('');
    setPriestName('');
    setChurchActive(true);
    setShowChurchForm(true);
  };

  const openEditChurchForm = (church: Church) => {
    setEditingChurchId(church.id);
    setChurchName(church.name);
    setChurchAddress(church.address);
    setPriestName(church.priestName);
    setChurchActive(church.active);
    setShowChurchForm(true);
  };

  const handlePersonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !address.trim()) {
      setBanner({
        type: 'error',
        text: 'Preencha nome completo, e-mail e endereço completo.',
      });
      return;
    }

    const effectivePassword = passwordInput.trim() || '123456';

    if (editingPersonId) {
      onUpdatePerson(editingPersonId, {
        fullName: fullName.trim(),
        email: email.trim(),
        password:
          permissions.canAuthorizeAccess && authorizeAccess ? effectivePassword : undefined,
        birthDate,
        cpf: cpf.trim() || undefined,
        address: address.trim(),
        parish: parish.trim(),
        systemAccessAuthorized: permissions.canAuthorizeAccess ? authorizeAccess : false,
        systemRole:
          permissions.canAuthorizeAccess && authorizeAccess ? systemRole : undefined,
      });
      setShowPersonForm(false);
      setEditingPersonId(null);
      setBanner({
        type: 'success',
        text: `Dados de "${fullName.trim()}" atualizados com sucesso (histórico preservado)!`,
      });
      return;
    }

    onCreatePerson({
      fullName: fullName.trim(),
      email: email.trim(),
      password:
        permissions.canAuthorizeAccess && authorizeAccess ? effectivePassword : '123456',
      birthDate,
      cpf: cpf.trim() || undefined,
      address: address.trim(),
      parish: parish.trim(),
      active: true,
      systemAccessAuthorized: permissions.canAuthorizeAccess ? authorizeAccess : false,
      authorizedBy:
        permissions.canAuthorizeAccess && authorizeAccess ? currentActorName : undefined,
      systemRole:
        permissions.canAuthorizeAccess && authorizeAccess ? systemRole : undefined,
    });

    setFullName('');
    setEmail('');
    setPasswordInput('123456');
    setCpf('');
    setAddress('');
    setShowPersonForm(false);
    setBanner({
      type: 'success',
      text: authorizeAccess
        ? `Pessoa cadastrada com login liberado (${systemRole}) e senha inicial "${effectivePassword}"!`
        : 'Pessoa cadastrada com sucesso!',
    });
  };

  const handleChurchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchName.trim() || !churchAddress.trim() || !priestName.trim()) {
      setBanner({
        type: 'error',
        text: 'Informe nome da igreja, endereço e nome do pároco.',
      });
      return;
    }

    if (editingChurchId) {
      onUpdateChurch(editingChurchId, {
        name: churchName.trim(),
        address: churchAddress.trim(),
        priestName: priestName.trim(),
        active: churchActive,
      });
      setShowChurchForm(false);
      setEditingChurchId(null);
      setBanner({
        type: 'success',
        text: `Igreja "${churchName.trim()}" atualizada com sucesso!`,
      });
      return;
    }

    onCreateChurch({
      name: churchName.trim(),
      address: churchAddress.trim(),
      priestName: priestName.trim(),
      active: true,
    });
    setChurchName('');
    setChurchAddress('');
    setPriestName('');
    setShowChurchForm(false);
    setBanner({
      type: 'success',
      text: 'Igreja cadastrada com sucesso!',
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
            Pessoas e Igrejas
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Cadastro único editável com histórico preservado por semestre e controle de acesso.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-[var(--bg-subtle)] p-1">
            <button
              type="button"
              onClick={() => setSubTab('pessoas')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                subTab === 'pessoas'
                  ? 'bg-white text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              Pessoas ({people.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('igrejas')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                subTab === 'igrejas'
                  ? 'bg-white text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              Igrejas ({churches.length})
            </button>
          </div>

          {permissions.canManageTurmas &&
            (subTab === 'pessoas' ? (
              <button
                type="button"
                onClick={() => {
                  if (showPersonForm) {
                    setShowPersonForm(false);
                    setEditingPersonId(null);
                  } else {
                    openNewPersonForm();
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                <UserPlus className="h-4 w-4" />
                {showPersonForm ? 'Fechar Formulário' : 'Nova Pessoa'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (showChurchForm) {
                    setShowChurchForm(false);
                    setEditingChurchId(null);
                  } else {
                    openNewChurchForm();
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                <Plus className="h-4 w-4" />
                {showChurchForm ? 'Fechar Formulário' : 'Nova Igreja'}
              </button>
            ))}
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
          <span className="flex items-center gap-2">
            {banner.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            {banner.text}
          </span>
          <button type="button" onClick={() => setBanner(null)} className="underline">
            Fechar
          </button>
        </div>
      )}

      {subTab === 'pessoas' ? (
        <div className="space-y-5">
          {showPersonForm && (
            <form
              onSubmit={handlePersonSubmit}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                  {editingPersonId
                    ? 'Editar Cadastro de Pessoa'
                    : 'Cadastrar Nova Pessoa'}
                </h3>
                {editingPersonId && (
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    O histórico de participações em semestres anteriores será mantido.
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label
                    htmlFor="person-fullname"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Nome Completo *
                  </label>
                  <input
                    id="person-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex.: Mariana Alves Costa"
                    className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="person-email"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    E-mail *
                  </label>
                  <input
                    id="person-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="mariana@email.com"
                    className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="person-birthdate"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Data de Nascimento *
                  </label>
                  <input
                    id="person-birthdate"
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="font-mono-tabular mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="person-cpf"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    CPF (Opcional)
                  </label>
                  <input
                    id="person-cpf"
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="font-mono-tabular mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="person-address"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Endereço Completo *
                  </label>
                  <input
                    id="person-address"
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, Número, Bairro, Três Lagoas - MS"
                    className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="person-parish"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Paróquia Frequentada *
                  </label>
                  <input
                    id="person-parish"
                    type="text"
                    required
                    value={parish}
                    onChange={(e) => setParish(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {permissions.canAuthorizeAccess && assignableRoles.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={authorizeAccess}
                      onChange={(e) => setAuthorizeAccess(e.target.checked)}
                    />
                    Liberar Login / &ldquo;Acesso ao sistema&rdquo;
                  </label>

                  {authorizeAccess && (
                    <>
                      <div className="flex items-center gap-2">
                        <label htmlFor="new-person-role" className="text-xs font-medium">
                          Perfil na Hierarquia:
                        </label>
                        <select
                          id="new-person-role"
                          value={systemRole}
                          onChange={(e) => setSystemRole(e.target.value as SystemRole)}
                          className="rounded border border-[var(--border-subtle)] bg-white px-2.5 py-1.5 text-xs font-semibold"
                        >
                          {assignableRoles.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <label htmlFor="new-person-password" className="text-xs font-medium">
                          Senha Inicial:
                        </label>
                        <input
                          id="new-person-password"
                          type="text"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="123456"
                          className="font-mono-tabular w-32 rounded border border-[var(--border-subtle)] bg-white px-2.5 py-1 text-xs font-semibold"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPersonForm(false);
                    setEditingPersonId(null);
                  }}
                  className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  {editingPersonId ? 'Salvar Alterações' : 'Salvar Cadastro'}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:col-span-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="search"
                    aria-label="Buscar pessoa por nome, e-mail ou paróquia"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar pessoa por nome, e-mail ou paróquia..."
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-white py-2 pr-3 pl-9 text-xs text-[var(--text-primary)]"
                  />
                </div>

                {permissions.canViewSensitiveData ? (
                  <button
                    type="button"
                    onClick={() => setRevealSensitive((v) => !v)}
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {revealSensitive ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        Ocultar CPF
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        Revelar CPF
                      </>
                    )}
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-amber-800">
                    <Lock className="h-3.5 w-3.5" />
                    CPF/Endereço restritos
                  </span>
                )}
              </div>

              <div className="mt-4 divide-y divide-[var(--border-subtle)]">
                {filteredPeople.map((p) => {
                  const delCheck = canPermanentlyDeletePerson(p, turmas);
                  return (
                    <div
                      key={p.id}
                      className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-sm font-bold text-[var(--text-primary)]">
                            {p.fullName}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">
                            · {p.active ? 'Ativo' : 'Desativado'}
                          </span>
                          {p.systemAccessAuthorized && p.systemRole && (
                            <span className="text-xs font-semibold text-[var(--accent-primary)]">
                              · Login: {p.systemRole}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <span>{p.email}</span>
                          <span>·</span>
                          <span>{p.parish}</span>
                          {permissions.canViewSensitiveData && (
                            <>
                              <span>·</span>
                              <span className="font-mono-tabular">
                                CPF: {maskCpf(p.cpf, revealSensitive)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {permissions.canManageTurmas && (
                          <button
                            type="button"
                            onClick={() => openEditPersonForm(p)}
                            className="flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedHistoryPersonId(p.id)}
                          className="flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                        >
                          <History className="h-3.5 w-3.5" />
                          Histórico ({p.history.length})
                        </button>

                        {permissions.canAuthorizeAccess && assignableRoles.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdatePersonSystemAccess(
                                p.id,
                                !p.systemAccessAuthorized,
                                p.systemRole || assignableRoles[0] || 'Servo',
                                p.password || '123456'
                              )
                            }
                            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                              p.systemAccessAuthorized
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                : 'border-[var(--border-subtle)] bg-white text-[var(--text-secondary)]'
                            }`}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {p.systemAccessAuthorized ? 'Login Ativo' : 'Liberar Login'}
                          </button>
                        )}

                        {permissions.canManageTurmas && (
                          <button
                            type="button"
                            onClick={() => onTogglePersonActive(p.id)}
                            className="flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            <Power className="h-3.5 w-3.5" />
                            {p.active ? 'Desativar' : 'Reativar'}
                          </button>
                        )}

                        {permissions.canManageTurmas && (
                          <button
                            type="button"
                            onClick={() => {
                              const res = onDeletePersonIfNoHistory(p.id);
                              setBanner({
                                type: res.ok ? 'success' : 'error',
                                text: res.message,
                              });
                            }}
                            title={
                              delCheck.allowed
                                ? 'Excluir cadastro sem histórico'
                                : delCheck.reason
                            }
                            aria-label={`Excluir ${p.fullName}`}
                            className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Painel de Histórico */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:col-span-4">
              {selectedPersonForHistory ? (
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
                      Ficha e Histórico
                    </h3>
                    {permissions.canManageTurmas && (
                      <button
                        type="button"
                        onClick={() => openEditPersonForm(selectedPersonForHistory)}
                        className="flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                      >
                        <Pencil className="h-3 w-3" />
                        Editar / Senha
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[var(--accent-primary)]">
                    {selectedPersonForHistory.fullName}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    E-mail: {selectedPersonForHistory.email} · Nascimento:{' '}
                    {selectedPersonForHistory.birthDate.split('-').reverse().join('/')}
                  </p>
                  {permissions.canViewSensitiveData && (
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Endereço: {selectedPersonForHistory.address}
                    </p>
                  )}

                  {permissions.canAuthorizeAccess && assignableRoles.length > 0 && (
                    <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 space-y-2">
                      <label
                        htmlFor="detail-role-select"
                        className="block text-xs font-semibold text-[var(--text-primary)]"
                      >
                        Perfil de Login (Hierarquia):
                      </label>
                      <select
                        id="detail-role-select"
                        value={selectedPersonForHistory.systemRole || assignableRoles[0] || 'Servo'}
                        onChange={(e) =>
                          onUpdatePersonSystemAccess(
                            selectedPersonForHistory.id,
                            true,
                            e.target.value as SystemRole,
                            selectedPersonForHistory.password || '123456'
                          )
                        }
                        className="w-full rounded border border-[var(--border-subtle)] bg-white px-2.5 py-1.5 text-xs font-semibold"
                      >
                        {assignableRoles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Senha atual configurada:{' '}
                        <strong className="font-mono-tabular text-[var(--text-primary)]">
                          {selectedPersonForHistory.password || '123456'}
                        </strong>
                      </p>
                    </div>
                  )}

                  <div className="mt-4 space-y-2.5">
                    {selectedPersonForHistory.history.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)]">
                        Nenhum histórico anterior registrado.
                      </p>
                    ) : (
                      selectedPersonForHistory.history.map((h) => (
                        <div
                          key={h.id}
                          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 p-3 text-xs"
                        >
                          <div className="flex items-center justify-between font-semibold text-[var(--text-primary)]">
                            <span>Semestre {h.semesterLabel}</span>
                            <span>{h.roleType}</span>
                          </div>
                          <p className="mt-1 text-[var(--text-secondary)]">{h.turmaName}</p>
                          {h.servoFunctions.length > 0 && (
                            <p className="mt-0.5 text-[var(--text-secondary)]">
                              Funções: {h.servoFunctions.join(', ')}
                            </p>
                          )}
                          <p className="mt-1 font-semibold text-[var(--text-primary)]">
                            {h.finalStatus}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        /* Aba de Igrejas */
        <div className="space-y-5">
          {showChurchForm && (
            <form
              onSubmit={handleChurchSubmit}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
                  {editingChurchId
                    ? 'Editar Igreja / Paróquia'
                    : 'Cadastrar Igreja / Paróquia'}
                </h3>
                {editingChurchId && (
                  <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={churchActive}
                      onChange={(e) => setChurchActive(e.target.checked)}
                    />
                    Igreja Ativa
                  </label>
                )}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="church-name-input"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Nome da Igreja *
                  </label>
                  <input
                    id="church-name-input"
                    type="text"
                    required
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                    placeholder="Ex.: Paróquia Nossa Senhora Aparecida"
                    className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="church-address-input"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Endereço *
                  </label>
                  <input
                    id="church-address-input"
                    type="text"
                    required
                    value={churchAddress}
                    onChange={(e) => setChurchAddress(e.target.value)}
                    placeholder="Rua, Número, Bairro"
                    className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="church-priest-input"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Pároco *
                  </label>
                  <input
                    id="church-priest-input"
                    type="text"
                    required
                    value={priestName}
                    onChange={(e) => setPriestName(e.target.value)}
                    placeholder="Ex.: Pe. Antônio Carlos"
                    className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowChurchForm(false);
                    setEditingChurchId(null);
                  }}
                  className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  {editingChurchId ? 'Salvar Alterações' : 'Salvar Igreja'}
                </button>
              </div>
            </form>
          )}

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
            <div className="divide-y divide-[var(--border-subtle)]">
              {churches.map((c) => {
                const churchTurmas = turmas.filter((t) => t.churchId === c.id);
                return (
                  <div
                    key={c.id}
                    className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-bold text-[var(--text-primary)]">
                          {c.name}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          · {c.active ? 'Ativa' : 'Inativa'}
                        </span>
                        <span className="text-xs font-semibold text-[var(--accent-primary)]">
                          · {churchTurmas.length} turma(s)
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        Pároco: {c.priestName} · {c.address}
                      </p>
                    </div>

                    {permissions.canManageTurmas && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditChurchForm(c)}
                          className="flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar Igreja
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateChurch(c.id, {
                              name: c.name,
                              address: c.address,
                              priestName: c.priestName,
                              active: !c.active,
                            })
                          }
                          className="flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          <Power className="h-3.5 w-3.5" />
                          {c.active ? 'Desativar' : 'Reativar'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

