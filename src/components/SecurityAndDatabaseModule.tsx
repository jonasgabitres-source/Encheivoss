import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  ShieldCheck,
  History,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lock,
  FileSpreadsheet,
  UserCheck,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { AppState, SystemRole } from '../domain/types';
import { RolePermissions } from '../domain/rules';
import {
  createSystemBackupPayload,
  validateAndParseBackupPayload,
} from '../utils/backupAndSecurity';

interface SecurityAndDatabaseModuleProps {
  appState: AppState;
  currentActorName: string;
  permissions: RolePermissions;
  currentRole: SystemRole;
  firebaseUserEmail: string | null;
  cloudSynced: boolean;
  requireLoginScreen: boolean;
  onToggleRequireLoginScreen: (requireLogin: boolean) => void;
  onLockSessionNow: () => void;
  onManualCloudSync: () => Promise<void>;
  onRestoreBackupState: (restored: AppState) => void;
  onResetToSeedData: () => void;
  onUpdatePrimaryAdmin: (adminData: {
    fullName: string;
    email: string;
    birthDate: string;
    cpf?: string;
    address: string;
    parish: string;
  }) => void;
  onInitializeCleanProduction: (adminData: {
    fullName: string;
    email: string;
    birthDate: string;
    cpf?: string;
    address: string;
    parish: string;
    keepChurches: boolean;
  }) => void;
  onOpenGoogleAuth: () => void;
}

export const SecurityAndDatabaseModule: React.FC<SecurityAndDatabaseModuleProps> = ({
  appState,
  permissions,
  firebaseUserEmail,
  requireLoginScreen,
  onToggleRequireLoginScreen,
  onLockSessionNow,
  onManualCloudSync,
  onRestoreBackupState,
  onResetToSeedData,
  onUpdatePrimaryAdmin,
  onInitializeCleanProduction,
  onOpenGoogleAuth,
}) => {
  const [subTab, setSubTab] = useState<
    | 'administrador-producao'
    | 'github-dominio'
    | 'banco-backup'
    | 'seguranca-lgpd'
    | 'auditoria'
  >('administrador-producao');
  const [auditSearch, setAuditSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmCleanProd, setConfirmCleanProd] = useState(false);

  const currentPrimaryAdmin =
    appState.people.find((p) => p.id === 'p-admin') ||
    appState.people.find((p) => p.systemRole === 'Administrador') ||
    appState.people[0];

  const [adminName, setAdminName] = useState(
    currentPrimaryAdmin?.fullName || 'Leandro Dutra'
  );
  const [adminEmail, setAdminEmail] = useState(
    currentPrimaryAdmin?.email || 'leandro.dutra@ufms.br'
  );
  const [adminBirthDate, setAdminBirthDate] = useState(
    currentPrimaryAdmin?.birthDate || '1988-03-14'
  );
  const [adminCpf, setAdminCpf] = useState(currentPrimaryAdmin?.cpf || '');
  const [adminAddress, setAdminAddress] = useState(
    currentPrimaryAdmin?.address || 'Centro, Três Lagoas - MS'
  );
  const [adminParish, setAdminParish] = useState(
    currentPrimaryAdmin?.parish || 'Catedral Sagrado Coração de Jesus'
  );
  const [keepChurchesOnClean, setKeepChurchesOnClean] = useState(true);

  const totalMeetingsCount = appState.turmas.reduce(
    (acc, t) => acc + t.courseMeetings.length + t.formationMeetings.length,
    0
  );

  const handleSavePrimaryAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim()) {
      setFeedback({
        type: 'error',
        text: 'Informe o nome completo e o e-mail do Administrador Geral.',
      });
      return;
    }
    onUpdatePrimaryAdmin({
      fullName: adminName.trim(),
      email: adminEmail.trim(),
      birthDate: adminBirthDate,
      cpf: adminCpf.trim() || undefined,
      address: adminAddress.trim() || 'Três Lagoas - MS',
      parish: adminParish.trim() || 'Catedral Sagrado Coração de Jesus',
    });
    setFeedback({
      type: 'success',
      text: `Administrador Geral atualizado para "${adminName.trim()}" (${adminEmail.trim()}) com sucesso!`,
    });
  };

  const handleDownloadBackupJson = () => {
    const envelope = createSystemBackupPayload(appState);
    const blob = new Blob([JSON.stringify(envelope, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateTag = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `backup_encheivos_${dateTag}_${envelope.checksum}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setFeedback({
      type: 'success',
      text: `Backup completo gerado com código de integridade #${envelope.checksum}. Guarde este arquivo em local seguro.`,
    });
  };

  const handleExportPeopleCsv = () => {
    const headers = ['Nome Completo', 'Email', 'Data Nascimento', 'Paroquia', 'Situacao', 'Perfil'];
    const rows = appState.people.map((p) => [
      `"${p.fullName.replace(/"/g, '""')}"`,
      `"${p.email}"`,
      p.birthDate,
      `"${p.parish.replace(/"/g, '""')}"`,
      p.active ? 'Ativo' : 'Inativo',
      p.systemRole || 'Participante',
    ]);
    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pessoas_encheivos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setFeedback({
      type: 'success',
      text: 'Planilha CSV de pessoas exportada com sucesso.',
    });
  };

  const handleRestoreFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        text: 'O arquivo de backup excede o limite de segurança de 10 MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const result = validateAndParseBackupPayload(reader.result);
      if (!result.valid || !result.envelope) {
        setFeedback({
          type: 'error',
          text: result.error || 'Arquivo de backup inválido.',
        });
        return;
      }
      onRestoreBackupState(result.envelope.data);
      setFeedback({
        type: 'success',
        text: `Backup restaurado com sucesso! (${result.envelope.counts.people} pessoas, ${result.envelope.counts.turmas} turmas, código #${result.envelope.checksum} verificado).`,
      });
    };
    reader.readAsText(file);
  };

  const filteredLogs = appState.auditLogs.filter((log) => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      log.actorName.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho Limpo */}
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
            Administração Geral, Base de Dados e Segurança
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Transfira o Administrador Geral para o Leandro, limpe os dados de teste para produção ou gerencie backups.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[var(--bg-subtle)] p-1">
          <button
            type="button"
            onClick={() => setSubTab('administrador-producao')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              subTab === 'administrador-producao'
                ? 'bg-white text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Administrador & Produção
          </button>
          <button
            type="button"
            onClick={() => setSubTab('github-dominio')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              subTab === 'github-dominio'
                ? 'bg-white text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            GitHub & Domínio
          </button>
          <button
            type="button"
            onClick={() => setSubTab('banco-backup')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              subTab === 'banco-backup'
                ? 'bg-white text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Base & Backup
          </button>
          <button
            type="button"
            onClick={() => setSubTab('seguranca-lgpd')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              subTab === 'seguranca-lgpd'
                ? 'bg-white text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Segurança & LGPD
          </button>
          <button
            type="button"
            onClick={() => setSubTab('auditoria')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              subTab === 'auditoria'
                ? 'bg-white text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Auditoria ({appState.auditLogs.length})
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-xs font-medium ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          <span className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            )}
            {feedback.text}
          </span>
          <button type="button" onClick={() => setFeedback(null)} className="underline">
            Fechar
          </button>
        </div>
      )}

      {/* ABA 0: ADMINISTRADOR GERAL (LEANDRO) & MODO PRODUÇÃO */}
      {subTab === 'administrador-producao' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Definir Administrador Geral */}
          <form
            onSubmit={handleSavePrimaryAdmin}
            className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:col-span-7"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-primary)]">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
                    Definir Administrador Geral do Sistema (Titular)
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Atual titular ativo: <strong>{currentPrimaryAdmin?.fullName}</strong> (
                    {currentPrimaryAdmin?.email})
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="primary-admin-name"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Nome do Administrador Geral *
                </label>
                <input
                  id="primary-admin-name"
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Ex.: Leandro Silva"
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="primary-admin-email"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  E-mail do Administrador (Para Login PIN) *
                </label>
                <input
                  id="primary-admin-email"
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="leandro@email.com"
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="primary-admin-birth"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Data de Nascimento
                </label>
                <input
                  id="primary-admin-birth"
                  type="date"
                  value={adminBirthDate}
                  onChange={(e) => setAdminBirthDate(e.target.value)}
                  className="font-mono-tabular mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="primary-admin-cpf"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  CPF (Opcional)
                </label>
                <input
                  id="primary-admin-cpf"
                  type="text"
                  value={adminCpf}
                  onChange={(e) => setAdminCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="font-mono-tabular mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="primary-admin-address"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Endereço Completo
                </label>
                <input
                  id="primary-admin-address"
                  type="text"
                  value={adminAddress}
                  onChange={(e) => setAdminAddress(e.target.value)}
                  placeholder="Rua, Número, Bairro, Três Lagoas - MS"
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="primary-admin-parish"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Paróquia Frequentada
                </label>
                <input
                  id="primary-admin-parish"
                  type="text"
                  value={adminParish}
                  onChange={(e) => setAdminParish(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                Salvar Novo Administrador Geral
              </button>
            </div>
          </form>

          {/* Modo Produção (Limpar Dados Fictícios + Tela de Login na Entrada) */}
          <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:col-span-5">
            <div className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] pb-3">
              <Sparkles className="h-5 w-5 text-[var(--accent-primary)]" />
              <div>
                <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
                  Preparar para Entrega (Modo Produção)
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Remova os cadastros fictícios de teste e ative a tela de login na entrada.
                </p>
              </div>
            </div>

            {/* Controle de Tela de Login Obrigatória */}
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 p-3.5 space-y-2.5">
              <label className="flex cursor-pointer items-start gap-2.5 text-xs">
                <input
                  type="checkbox"
                  checked={requireLoginScreen}
                  onChange={(e) => onToggleRequireLoginScreen(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <strong className="text-[var(--text-primary)]">
                    Modo Site Oficial (Exigir Login ao Abrir)
                  </strong>
                  <span className="mt-0.5 block text-[var(--text-secondary)]">
                    Oculta o seletor de simulação de perfis na barra lateral e exige autenticação por E-mail + PIN ao abrir o sistema.
                  </span>
                </span>
              </label>

              <button
                type="button"
                onClick={onLockSessionNow}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair / Testar Tela de Entrada (Login) Agora
              </button>
            </div>

            {/* Zerar Dados Fictícios para Entregar ao Leandro */}
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 p-3.5 space-y-3">
              <div className="text-xs">
                <strong className="text-[var(--text-primary)]">
                  Iniciar Base Limpa para o Leandro
                </strong>
                <p className="mt-0.5 text-[var(--text-secondary)]">
                  Apaga todas as pessoas fictícias, turmas de teste e lançamentos de exemplo, mantendo apenas o Administrador Geral configurado ao lado (<strong>{adminName}</strong>).
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={keepChurchesOnClean}
                  onChange={(e) => setKeepChurchesOnClean(e.target.checked)}
                />
                Manter as igrejas de Três Lagoas cadastradas
              </label>

              {!confirmCleanProd ? (
                <button
                  type="button"
                  onClick={() => setConfirmCleanProd(true)}
                  className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  Limpar Dados Fictícios e Iniciar Base Oficial
                </button>
              ) : (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-950 space-y-2">
                  <p className="font-semibold">
                    Confirmar limpeza dos dados fictícios? O sistema ficará limpo com &ldquo;{adminName}&rdquo; como Administrador Geral.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onInitializeCleanProduction({
                          fullName: adminName.trim(),
                          email: adminEmail.trim(),
                          birthDate: adminBirthDate,
                          cpf: adminCpf.trim() || undefined,
                          address: adminAddress.trim() || 'Três Lagoas - MS',
                          parish: adminParish.trim() || 'Catedral Sagrado Coração de Jesus',
                          keepChurches: keepChurchesOnClean,
                        });
                        setConfirmCleanProd(false);
                        setFeedback({
                          type: 'success',
                          text: `Base oficial limpa iniciada! "${adminName.trim()}" (${adminEmail.trim()}) é agora o Administrador Geral único e todos os dados fictícios foram removidos.`,
                        });
                      }}
                      className="rounded-lg bg-emerald-800 px-3 py-1.5 font-semibold text-white"
                    >
                      Sim, Iniciar Base Limpa
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCleanProd(false)}
                      className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 font-semibold"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA GITHUB & DOMÍNIO PERSONALIZADO */}
      {subTab === 'github-dominio' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:col-span-6">
            <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
              1. Como Exportar o Código Completo para o GitHub
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              O projeto já possui estrutura completa React + TypeScript + Vite + PWA + Firebase (`package.json`, `.gitignore`, `firestore.rules`, `src/`). Para enviar ao seu GitHub:
            </p>
            <ol className="list-decimal space-y-2 pl-4 text-xs text-[var(--text-secondary)]">
              <li>
                <strong>Direto pelo Google AI Studio (1 Clique):</strong> Olhe para a barra superior do Google AI Studio (acima desta janela do aplicativo) e clique no ícone do <strong>GitHub (&ldquo;Export to GitHub&rdquo;)</strong> ou no menu de três pontos / Download ZIP.
              </li>
              <li>
                Autorize sua conta do GitHub e escolha o nome do repositório, por exemplo: <code className="font-mono-tabular font-semibold text-[var(--text-primary)]">sistema-encheivos-tl</code>.
              </li>
              <li>
                <strong>Ou via Terminal Local (se baixar o ZIP):</strong>
                <pre className="mt-1.5 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono-tabular text-[11px] text-slate-100">
{`git init
git add .
git commit -m "Versão Oficial Sistema EncheiVos"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/sistema-encheivos-tl.git
git push -u origin main`}
                </pre>
              </li>
            </ol>
          </div>

          <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:col-span-6">
            <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
              2. Como Ligar o GitHub ao Domínio missaoencheivostl.com.br
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Depois que o código estiver no seu GitHub, você pode publicar gratuitamente com domínio próprio na <strong>Vercel</strong> ou <strong>Cloudflare Pages</strong>:
            </p>
            <ol className="list-decimal space-y-2 pl-4 text-xs text-[var(--text-secondary)]">
              <li>
                Registre <code className="font-mono-tabular font-semibold text-[var(--text-primary)]">missaoencheivostl.com.br</code> no site oficial <strong>registro.br</strong> (R$ 40/ano).
              </li>
              <li>
                Crie uma conta gratuita na <strong>Vercel (vercel.com)</strong> ou <strong>Cloudflare Pages</strong>, clique em <strong>Add New Project</strong> e selecione o repositório <code className="font-mono-tabular">sistema-encheivos-tl</code> do seu GitHub.
              </li>
              <li>
                Em <strong>Settings &rarr; Domains</strong> na Vercel, digite <code className="font-mono-tabular font-semibold text-[var(--text-primary)]">missaoencheivostl.com.br</code>.
              </li>
              <li>
                Copie o registro <strong>A</strong> (`76.76.21.21`) e <strong>CNAME</strong> (`cname.vercel-dns.com`) que a Vercel mostrar e cole na tela de DNS do <strong>Registro.br</strong>. Em poucos minutos o site estará no ar com HTTPS automático!
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* ABA 1: BASE DE DADOS & BACKUP */}
      {subTab === 'banco-backup' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Status da Base de Dados Cloud Firestore + Cache Offline */}
          <div className="space-y-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:col-span-7">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-primary)]">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
                    Arquitetura da Base de Dados (Firebase Cloud Firestore)
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Projeto provisionado: <span className="font-mono-tabular">pure-scene-13kqt</span> ·{' '}
                    {firebaseUserEmail
                      ? `Sincronizado (${firebaseUserEmail})`
                      : 'Modo resiliente local + pronto para sincronizar em nuvem'}
                  </p>
                </div>
              </div>

              {firebaseUserEmail ? (
                <button
                  type="button"
                  onClick={async () => {
                    await onManualCloudSync();
                    setFeedback({
                      type: 'success',
                      text: 'Dados sincronizados manualmente com o banco de dados Cloud Firestore.',
                    });
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sincronizar Agora
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenGoogleAuth}
                  className="rounded-lg bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  Conectar Conta p/ Backup em Nuvem
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-3">
                <span className="text-xs text-[var(--text-secondary)]">Pessoas & Históricos</span>
                <p className="font-mono-tabular mt-1 text-lg font-bold text-[var(--text-primary)]">
                  {appState.people.length}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-3">
                <span className="text-xs text-[var(--text-secondary)]">Igrejas / Paróquias</span>
                <p className="font-mono-tabular mt-1 text-lg font-bold text-[var(--text-primary)]">
                  {appState.churches.length}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-3">
                <span className="text-xs text-[var(--text-secondary)]">Turmas Cadastradas</span>
                <p className="font-mono-tabular mt-1 text-lg font-bold text-[var(--text-primary)]">
                  {appState.turmas.length}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-3">
                <span className="text-xs text-[var(--text-secondary)]">Encontros (Curso + Form.)</span>
                <p className="font-mono-tabular mt-1 text-lg font-bold text-[var(--text-primary)]">
                  {totalMeetingsCount}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-3">
                <span className="text-xs text-[var(--text-secondary)]">Lançamentos Financeiros</span>
                <p className="font-mono-tabular mt-1 text-lg font-bold text-[var(--text-primary)]">
                  {appState.financialEntries.length}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-3">
                <span className="text-xs text-[var(--text-secondary)]">Certificados Emitidos</span>
                <p className="font-mono-tabular mt-1 text-lg font-bold text-[var(--text-primary)]">
                  {appState.certificatesIssued.length}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 p-4 text-xs text-[var(--text-secondary)] space-y-1.5">
              <div className="font-semibold text-[var(--text-primary)]">
                Como funciona a persistência e proteção contra perda de dados:
              </div>
              <p>
                1. <strong>Persistência Imediata Durante os Encontros:</strong> Cada presença marcada na chamada ou lançamento financeiro é gravado instantaneamente no armazenamento local do dispositivo e enviado ao banco Cloud Firestore quando autenticado.
              </p>
              <p>
                2. <strong>Preservação Histórica Obrigatória:</strong> Nenhuma pessoa com histórico ou turma de semestres anteriores pode ser apagada definitivamente pelo sistema — apenas desativada, garantindo consulta perpétua.
              </p>
            </div>
          </div>

          {/* Central de Backup e Restauração */}
          <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:col-span-5">
            <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
              Rotina de Backup e Restauração
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Exporte cópias completas da base de dados com código verificador de integridade (checksum) ou restaure um ponto anterior.
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleDownloadBackupJson}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                <Download className="h-4 w-4" />
                Baixar Backup Completo (.JSON Verificado)
              </button>

              <button
                type="button"
                onClick={handleExportPeopleCsv}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-white px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Exportar Cadastro de Pessoas (.CSV / Excel)
              </button>

              {permissions.canManageTurmas && (
                <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-white px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]">
                  <Upload className="h-4 w-4" />
                  Restaurar Base a partir de Arquivo de Backup (.JSON)
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={handleRestoreFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {permissions.canManageTurmas && (
              <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="text-xs font-medium text-[var(--text-muted)] hover:text-red-700 underline"
                  >
                    Restaurar dados de demonstração padrão
                  </button>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <p className="font-semibold">
                      Confirmar restauração para a base inicial de demonstração?
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onResetToSeedData();
                          setConfirmReset(false);
                          setFeedback({
                            type: 'success',
                            text: 'Base de dados restaurada para o estado inicial de demonstração.',
                          });
                        }}
                        className="rounded bg-amber-800 px-3 py-1 font-semibold text-white"
                      >
                        Confirmar Restauração
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="rounded border border-amber-300 bg-white px-3 py-1 font-semibold"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: SEGURANÇA & LGPD */}
      {subTab === 'seguranca-lgpd' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
                Regras Zero-Trust no Banco de Dados (Firestore Rules)
              </h3>
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              O banco de dados Cloud Firestore opera com bloqueio padrão (<em>Default Deny</em>), validação estrita de campos permitidos, bloqueio de adulteração de <code>ownerId</code> e <code>createdAt</code>, e exigência de e-mail verificado em todas as gravações.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
            <div className="flex items-center gap-2.5">
              <Lock className="h-5 w-5 text-[var(--accent-primary)]" />
              <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
                Proteção de Dados Pessoais e LGPD (CPF e Endereço)
              </h3>
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              O CPF é mascarado visualmente por padrão (<code>***.450.912-**</code>) para evitar exposição em telas compartilhadas durante os encontros, e seu acesso completo é bloqueado para perfis não habilitados (como Financeiro).
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-[var(--accent-primary)]" />
              <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
                Proteção contra Força Bruta no PIN e Autorização Prévia
              </h3>
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              O PIN enviado por e-mail expira em 10 minutos, possui limite de 5 tentativas antes de bloqueio temporário, e exige que o usuário tenha a flag <em>&ldquo;Acesso ao sistema&rdquo;</em> previamente habilitada por Administrador, Supervisor ou Coordenador Local.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
            <div className="flex items-center gap-2.5">
              <History className="h-5 w-5 text-emerald-600" />
              <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
                Consistência Financeira e Trava de Saldo Negativo
              </h3>
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              Toda saída financeira ou repasse para a Conta Geral valida previamente o saldo disponível da turma, impedindo saldo negativo ou transferências sem identificação da turma e igreja de origem.
            </p>
          </div>
        </div>
      )}

      {/* ABA 3: TRILHA DE AUDITORIA */}
      {subTab === 'auditoria' && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
                Trilha de Auditoria de Operações
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Registro cronológico com data, hora, responsável, perfil e detalhes da operação.
              </p>
            </div>
            <input
              type="search"
              aria-label="Filtrar trilha de auditoria"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Filtrar por usuário ou ação..."
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-xs sm:w-64"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                  <th className="py-2.5 pr-4">Data / Hora</th>
                  <th className="py-2.5 pr-4">Responsável</th>
                  <th className="py-2.5 pr-4">Perfil</th>
                  <th className="py-2.5 pr-4">Ação</th>
                  <th className="py-2.5">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono-tabular py-3 pr-4 whitespace-nowrap text-[var(--text-secondary)]">
                      {log.timestamp}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-[var(--text-primary)]">
                      {log.actorName}
                    </td>
                    <td className="py-3 pr-4 text-[var(--text-secondary)]">{log.actorRole}</td>
                    <td className="py-3 pr-4 font-medium text-[var(--accent-primary)]">
                      {log.action}
                    </td>
                    <td className="py-3 text-[var(--text-secondary)]">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
