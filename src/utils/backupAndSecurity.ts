import { AppState } from '../domain/types';

export interface BackupEnvelope {
  system: 'Sistema EncheiVos';
  organization: string;
  exportedAt: string;
  schemaVersion: number;
  checksum: string;
  counts: {
    people: number;
    churches: number;
    turmas: number;
    financialEntries: number;
    generalTransfers: number;
    certificatesIssued: number;
  };
  data: AppState;
}

/**
 * Gera um hash simples e determinístico (FNV-1a 32-bit hex) para validar integridade do arquivo de backup (RT-004 / RT-005).
 */
export function computeSimpleChecksum(raw: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Cria o envelope de backup completo do Sistema EncheiVos (RT-004).
 */
export function createSystemBackupPayload(
  state: AppState,
  exportedAtIso = new Date().toISOString()
): BackupEnvelope {
  const serializedData = JSON.stringify(state);
  const checksum = computeSimpleChecksum(serializedData);
  return {
    system: 'Sistema EncheiVos',
    organization: state.settings.organizationName || 'Missão EncheiVos – Três Lagoas',
    exportedAt: exportedAtIso,
    schemaVersion: 1,
    checksum,
    counts: {
      people: state.people.length,
      churches: state.churches.length,
      turmas: state.turmas.length,
      financialEntries: state.financialEntries.length,
      generalTransfers: state.generalTransfers.length,
      certificatesIssued: state.certificatesIssued.length,
    },
    data: state,
  };
}

/**
 * Valida a estrutura e integridade de um arquivo de backup antes da restauração (RT-004 / RT-005).
 */
export function validateAndParseBackupPayload(jsonText: string): {
  valid: boolean;
  error?: string;
  envelope?: BackupEnvelope;
} {
  try {
    const parsed = JSON.parse(jsonText) as Partial<BackupEnvelope>;
    if (!parsed || parsed.system !== 'Sistema EncheiVos' || !parsed.data) {
      return {
        valid: false,
        error: 'Arquivo inválido: não é um pacote de backup oficial do Sistema EncheiVos.',
      };
    }

    const d = parsed.data;
    if (
      !Array.isArray(d.people) ||
      !Array.isArray(d.churches) ||
      !Array.isArray(d.turmas) ||
      !Array.isArray(d.financialEntries) ||
      !Array.isArray(d.generalTransfers)
    ) {
      return {
        valid: false,
        error: 'Estrutura de dados corrompida ou incompleta no arquivo de backup.',
      };
    }

    const expectedChecksum = computeSimpleChecksum(JSON.stringify(d));
    if (parsed.checksum && parsed.checksum !== expectedChecksum) {
      return {
        valid: false,
        error: 'Falha de integridade: o conteúdo do arquivo foi modificado externamente (checksum inválido).',
      };
    }

    return {
      valid: true,
      envelope: parsed as BackupEnvelope,
    };
  } catch {
    return {
      valid: false,
      error: 'Não foi possível ler o arquivo JSON. Verifique se o formato está íntegro.',
    };
  }
}

/**
 * Mascaramento de CPF para proteção visual padrão (LGPD / RT-003 / RN-020).
 */
export function maskCpf(cpf?: string, reveal = false): string {
  if (!cpf) return 'Não informado';
  if (reveal) return cpf;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length === 11) {
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  }
  return '***.***.***-**';
}

/**
 * Proteção contra tentativas excessivas de PIN (RT-006):
 * Bloqueia temporariamente após 5 tentativas inválidas dentro da janela de 10 minutos.
 */
export function evaluatePinAttemptGuard(
  failedAttempts: number,
  lockedUntilMs: number | null,
  nowMs: number
): { blocked: boolean; remainingLockSeconds: number; message?: string } {
  if (lockedUntilMs && nowMs < lockedUntilMs) {
    const secs = Math.ceil((lockedUntilMs - nowMs) / 1000);
    return {
      blocked: true,
      remainingLockSeconds: secs,
      message: `Muitas tentativas incorretas de PIN. Aguarde ${secs}s antes de tentar novamente.`,
    };
  }
  if (failedAttempts >= 5) {
    return {
      blocked: true,
      remainingLockSeconds: 300,
      message: 'Limite de 5 tentativas excedido. Acesso temporariamente bloqueado por 5 minutos.',
    };
  }
  return { blocked: false, remainingLockSeconds: 0 };
}
