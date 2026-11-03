import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Mail,
  ShieldAlert,
  CheckCircle2,
  Clock,
  LogIn,
  X,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Person } from '../domain/types';
import { authenticateWithEmailAndPassword } from '../domain/rules';
import { evaluatePinAttemptGuard } from '../utils/backupAndSecurity';

interface LoginModalProps {
  isOpen: boolean;
  isFullPage?: boolean;
  onClose: () => void;
  people: Person[];
  onAuthenticatedPerson: (person: Person, rememberMe: boolean) => void;
  onGoogleLogin: () => Promise<void>;
  logoDataUrl?: string;
  organizationName: string;
}

interface PinChallenge {
  email: string;
  pin: string;
  expiresAt: number;
  person: Person;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  isFullPage = false,
  onClose,
  people,
  onAuthenticatedPerson,
  onGoogleLogin,
  logoDataUrl,
  organizationName,
}) => {
  const [loginMethod, setLoginMethod] = useState<'senha' | 'pin'>('senha');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [challenge, setChallenge] = useState<PinChallenge | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockedUntilMs, setLockedUntilMs] = useState<number | null>(null);

  useEffect(() => {
    if (!challenge) return;
    const timer = setInterval(() => {
      const diff = Math.max(0, Math.floor((challenge.expiresAt - Date.now()) / 1000));
      setRemainingSeconds(diff);
    }, 1000);
    return () => clearInterval(timer);
  }, [challenge]);

  if (!isOpen) return null;

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const guard = evaluatePinAttemptGuard(failedAttempts, lockedUntilMs, Date.now());
    if (guard.blocked) {
      setErrorMessage(guard.message || 'Muitas tentativas. Aguarde alguns minutos.');
      return;
    }

    const result = authenticateWithEmailAndPassword(emailInput, passwordInput, people);
    if (!result.ok || !result.person) {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);
      if (nextFailures >= 5) {
        setLockedUntilMs(Date.now() + 5 * 60 * 1000);
      }
      setErrorMessage(result.error || 'Credenciais inválidas.');
      return;
    }

    setFailedAttempts(0);
    setLockedUntilMs(null);
    setPasswordInput('');
    onAuthenticatedPerson(result.person, rememberMe);
    onClose();
  };

  const handleRequestPin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const guard = evaluatePinAttemptGuard(failedAttempts, lockedUntilMs, Date.now());
    if (guard.blocked) {
      setErrorMessage(guard.message || 'Muitas tentativas. Aguarde alguns minutos.');
      return;
    }

    const raw = emailInput.trim().toLowerCase();
    const normalized =
      raw === 'leandor.dutra@ufms.br' ? 'leandro.dutra@ufms.br' : raw;
    if (!normalized) {
      setErrorMessage('Informe seu e-mail cadastrado.');
      return;
    }

    const found = people.find((p) => p.email.toLowerCase() === normalized);
    if (!found) {
      setErrorMessage('E-mail não localizado no cadastro da Missão EncheiVos.');
      return;
    }

    if (!found.systemAccessAuthorized || !found.systemRole) {
      setErrorMessage(
        'Acesso não autorizado: Este e-mail não possui liberação de acesso ao sistema.'
      );
      return;
    }

    if (!found.active) {
      setErrorMessage('Este cadastro encontra-se inativo.');
      return;
    }

    const generatedPin = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000;
    setChallenge({
      email: found.email,
      pin: generatedPin,
      expiresAt,
      person: found,
    });
    setPinInput(generatedPin);
    setRemainingSeconds(600);
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!challenge) return;

    const guard = evaluatePinAttemptGuard(failedAttempts, lockedUntilMs, Date.now());
    if (guard.blocked) {
      setErrorMessage(guard.message || 'Acesso temporariamente bloqueado.');
      return;
    }

    if (Date.now() > challenge.expiresAt) {
      setErrorMessage('O PIN expirou (validade de 10 minutos). Solicite um novo PIN.');
      return;
    }

    const freshPerson = people.find((p) => p.id === challenge.person.id);
    if (!freshPerson || !freshPerson.systemAccessAuthorized || !freshPerson.systemRole) {
      setErrorMessage('Acesso negado: Usuário sem autorização ativa no cadastro.');
      return;
    }

    if (pinInput.trim() !== challenge.pin) {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);
      if (nextFailures >= 5) {
        setLockedUntilMs(Date.now() + 5 * 60 * 1000);
      }
      setErrorMessage(
        `PIN incorreto (${nextFailures}/5 tentativas). Verifique o código enviado ao seu e-mail.`
      );
      return;
    }

    setFailedAttempts(0);
    setLockedUntilMs(null);
    onAuthenticatedPerson(freshPerson, rememberMe);
    setChallenge(null);
    onClose();
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      className={
        isFullPage
          ? 'min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 p-4'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs'
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                alt={organizationName}
                referrerPolicy="no-referrer"
                className="h-11 w-11 rounded-md object-contain"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-primary)] font-display text-base font-bold text-white">
                EV
              </div>
            )}
            <div>
              <h1
                id="login-modal-title"
                className="font-display text-base font-bold text-slate-900"
              >
                Sistema EncheiVos
              </h1>
              <p className="text-xs text-slate-600">{organizationName}</p>
            </div>
          </div>
          {!isFullPage && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar janela de autenticação"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Seletor de Método: E-mail + Senha (Padrão) ou PIN por E-mail */}
        <div className="mt-4 flex rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setLoginMethod('senha');
              setErrorMessage(null);
            }}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              loginMethod === 'senha'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Usuário e Senha
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod('pin');
              setErrorMessage(null);
            }}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              loginMethod === 'pin'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Código PIN Temporário
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {loginMethod === 'senha' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email-input"
                  className="block text-xs font-semibold text-slate-800"
                >
                  E-mail (Usuário)
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    autoComplete="username"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Digite seu e-mail cadastrado"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password-input"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Senha de Acesso
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-10 pl-9 text-sm text-slate-900 focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute top-2 right-2.5 rounded p-1 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[var(--accent-primary)]"
                />
                Manter conectado neste dispositivo
              </label>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                <LogIn className="h-4 w-4" />
                Entrar no Sistema
              </button>

              <p className="text-center text-[11px] text-slate-500">
                Novos logins são liberados pelos Administradores, Coordenadores Locais ou Supervisores em <strong>Pessoas &amp; Igrejas</strong>.
              </p>
            </form>
          ) : !challenge ? (
            <form onSubmit={handleRequestPin} className="space-y-4">
              <div>
                <label
                  htmlFor="login-pin-email-input"
                  className="block text-xs font-semibold text-slate-800"
                >
                  E-mail cadastrado
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <input
                    id="login-pin-email-input"
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Digite seu e-mail cadastrado"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Gera um código PIN temporário com validade de 10 minutos.
                </p>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                <KeyRound className="h-4 w-4" />
                Gerar PIN de Acesso
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    PIN gerado para {challenge.email}
                  </span>
                  <span className="font-mono-tabular flex items-center gap-1 font-semibold text-emerald-800">
                    <Clock className="h-3.5 w-3.5" />
                    {formatCountdown(remainingSeconds)}
                  </span>
                </div>
                <p className="mt-1.5 text-emerald-800">
                  Código PIN:{' '}
                  <strong className="font-mono-tabular text-sm">{challenge.pin}</strong> (
                  {challenge.person.systemRole})
                </p>
              </div>

              <div>
                <label
                  htmlFor="login-pin-input"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Código PIN de 6 dígitos
                </label>
                <input
                  id="login-pin-input"
                  type="text"
                  maxLength={6}
                  required
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="font-mono-tabular mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-lg font-bold tracking-widest text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChallenge(null)}
                  className="w-1/3 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex w-2/3 items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  <LogIn className="h-4 w-4" />
                  Confirmar PIN
                </button>
              </div>
            </form>
          )}

          <div className="border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={onGoogleLogin}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Conectar Conta Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

