import React, { useState } from 'react';
import { Palette, Upload, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { OrganizationSettings, ThemeId } from '../domain/types';
import { RolePermissions } from '../domain/rules';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeId;
  onSelectTheme: (theme: ThemeId) => void;
  settings: OrganizationSettings;
  onUpdateSettings: (partial: Partial<OrganizationSettings>) => void;
  permissions: RolePermissions;
  currentUserName: string;
}

const THEME_OPTIONS: { id: ThemeId; label: string; description: string; previewHex: string }[] = [
  {
    id: 'azul-claro',
    label: 'Azul Claro',
    description: 'Tema claro e frio com destaque azul celeste institucional (RF-057)',
    previewHex: '#1D63B8',
  },
  {
    id: 'verde-suave',
    label: 'Verde Suave',
    description: 'Tema claro sereno em tons de esmeralda suave e menta fria (RF-057)',
    previewHex: '#176B52',
  },
  {
    id: 'azul-petroleo',
    label: 'Azul-Petróleo',
    description: 'Tema claro e sóbrio com cabeçalho e acentos em azul-petróleo (RF-057)',
    previewHex: '#0E5A7A',
  },
  {
    id: 'cinza-azul',
    label: 'Cinza-Azul',
    description: 'Tema neutro frio de alto contraste em ardósia e cinza-azulado (RF-057)',
    previewHex: '#334E68',
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
  settings,
  onUpdateSettings,
  permissions,
  currentUserName,
}) => {
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // RF-059 / RNF-004: PNG, JPG ou SVG, com tamanho máximo sugerido de 2 MB
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setFeedback({
        type: 'error',
        text: 'Formato inválido. Envie o logo em PNG, JPG ou SVG (RF-059).',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        text: 'O arquivo excede o tamanho máximo sugerido de 2 MB (RF-059).',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateSettings({
          logoDataUrl: reader.result,
          logoFileName: file.name,
        });
        setFeedback({
          type: 'success',
          text: `Logo "${file.name}" atualizado! Exibido na tela de login, cabeçalho, relatórios e certificados (RF-060).`,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-xl rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-2.5">
            <Palette className="h-5 w-5 text-[var(--accent-primary)]" />
            <div>
              <h2
                id="settings-modal-title"
                className="font-display text-lg font-bold text-[var(--text-primary)]"
              >
                Configurações e Identidade Visual (Seção 4.9)
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Preferência individual de tema para: <strong>{currentUserName}</strong> (CA-013)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar configurações"
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-5">
          {feedback && (
            <div
              role="alert"
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium ${
                feedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* RF-056 a RF-058 / CA-013: Tema por usuário */}
          <div>
            <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
              Tema da Interface do Usuário (RF-056 a RF-058)
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              O tema escolhido aplica-se imediatamente aos menus, botões, cabeçalhos e destaques da sua
              conta, sem alterar o tema dos demais usuários (CA-013).
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {THEME_OPTIONS.map((t) => {
                const isSelected = currentTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelectTheme(t.id);
                      setFeedback({
                        type: 'success',
                        text: `Tema "${t.label}" aplicado para ${currentUserName}!`,
                      });
                    }}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]/60'
                        : 'border-[var(--border-subtle)] bg-white hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <span
                      className="mt-0.5 h-5 w-5 shrink-0 rounded-md border border-black/10"
                      style={{ backgroundColor: t.previewHex }}
                    />
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        {t.label} {isSelected && ' (Ativo)'}
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                        {t.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RF-059 e RF-060: Upload de Logo da Organização */}
          <div className="border-t border-[var(--border-subtle)] pt-4">
            <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
              Identidade Visual e Logo da Organização (RF-059 / RF-060)
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Suporta PNG, JPG ou SVG até 2 MB. O logo é exibido na tela de login, cabeçalho/menu e no
              canto superior esquerdo de relatórios e certificados.
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 p-3">
              <div className="flex items-center gap-3">
                {settings.logoDataUrl ? (
                  <img
                    src={settings.logoDataUrl}
                    alt="Logo atual"
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 rounded object-contain"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-primary)] font-display text-xs font-bold text-white">
                    EV
                  </div>
                )}
                <div className="text-xs">
                  <div className="font-semibold text-[var(--text-primary)]">
                    {settings.logoFileName || 'Emblema Padrão Missão EncheiVos'}
                  </div>
                  <div className="text-[var(--text-muted)]">PNG, JPG ou SVG · Máx. 2 MB</div>
                </div>
              </div>

              {permissions.canManageCertificateTemplateAndLogo && (
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]">
                  <Upload className="h-3.5 w-3.5" />
                  Substituir Logo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
