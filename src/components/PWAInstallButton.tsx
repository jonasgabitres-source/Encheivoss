import React, { useState } from 'react';
import { Check, Copy, Download, ExternalLink, Smartphone, X } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

export const OFFICIAL_SITE_URL =
  'https://ais-pre-d62md7twnelcxspl3sucuk-719019698170.us-west2.run.app';

export const PWAInstallButton: React.FC<{ variant?: 'sidebar' | 'header' | 'card' }> = ({
  variant = 'sidebar',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;
  const resolvedSiteUrl =
    typeof window !== 'undefined' &&
    window.location.origin &&
    !window.location.origin.includes('localhost')
      ? window.location.origin
      : OFFICIAL_SITE_URL;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(OFFICIAL_SITE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleInstallClick = async () => {
    if (isInstallable && !isInsideIframe) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'sidebar' && (
        <div className="space-y-1.5">
          <a
            href={resolvedSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span>Abrir Site no Chrome (Tela Cheia)</span>
          </a>

          {!isInstalled && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span>Como Instalar como App</span>
            </button>
          )}
        </div>
      )}

      {variant === 'header' && (
        <div className="flex items-center gap-2">
          <a
            href={resolvedSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 whitespace-nowrap shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5 text-emerald-700" />
            <span>Abrir no Chrome</span>
          </a>

          {!isInstalled && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="hidden md:flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] whitespace-nowrap shrink-0"
            >
              <Smartphone className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              <span>Instalar App</span>
            </button>
          )}
        </div>
      )}

      {variant === 'card' && (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={resolvedSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>1. Abrir Site Oficial em Nova Guia do Chrome</span>
          </a>
          <button
            type="button"
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Link Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                <span>Copiar Link Oficial</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          >
            <Smartphone className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
            <span>2. Instalar Aplicativo (PWA)</span>
          </button>
        </div>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-[var(--border-subtle)] bg-white p-6 text-slate-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-[var(--accent-primary)]" />
                <h3 id="pwa-install-title" className="font-display text-base font-bold">
                  Abrir no Chrome e Instalar Aplicativo Oficial
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-700">
              {/* Passo 1: Abrir fora do painel em uma guia própria do Chrome */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-950">
                <p className="font-bold">
                  Passo 1 — Abrir o Site Oficial em uma Guia Própria do Chrome:
                </p>
                <p className="mt-1 text-emerald-900">
                  O navegador só libera o botão de instalar aplicativo quando o site está aberto em uma aba própria (fora desta janela de edição).
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <a
                    href={resolvedSiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir Agora em Nova Guia do Chrome
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-700" />
                        Link Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copiar Link p/ Enviar ao Leandro
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-2 rounded bg-white/80 px-2.5 py-1.5 font-mono-tabular text-[11px] text-emerald-950 select-all break-all border border-emerald-200">
                  {OFFICIAL_SITE_URL}
                </div>
              </div>

              {isIOS ? (
                <div className="rounded-lg bg-slate-50 p-3.5">
                  <p className="font-semibold text-slate-900">
                    Passo 2 — No iPhone ou iPad (Safari):
                  </p>
                  <ol className="mt-1.5 list-decimal space-y-1 pl-4">
                    <li>
                      Com o link aberto no Safari, toque no botão <strong>Compartilhar</strong> na barra inferior.
                    </li>
                    <li>
                      Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.
                    </li>
                    <li>
                      Confirme em <strong>Adicionar</strong> no canto superior direito.
                    </li>
                  </ol>
                </div>
              ) : (
                <>
                  <div className="rounded-lg bg-slate-50 p-3.5">
                    <p className="font-semibold text-slate-900">
                      Passo 2 (No Computador — Google Chrome / Edge):
                    </p>
                    <ol className="mt-1.5 list-decimal space-y-1 pl-4">
                      <li>
                        Na nova guia aberta no Chrome, olhe para o canto direito da{' '}
                        <strong>barra de endereço</strong> (ao lado da estrela de favoritos).
                      </li>
                      <li>
                        Clique no ícone de computador com uma seta{' '}
                        <strong>(Instalar Sistema EncheiVos)</strong> ou clique em{' '}
                        <strong>Instalar App</strong> no topo do site.
                      </li>
                    </ol>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3.5">
                    <p className="font-semibold text-slate-900">
                      Passo 2 (No Celular Android — Chrome):
                    </p>
                    <ol className="mt-1.5 list-decimal space-y-1 pl-4">
                      <li>
                        Abra o link no Chrome do celular e toque no menu{' '}
                        <strong>⋮ (três pontos)</strong> no canto superior direito.
                      </li>
                      <li>
                        Toque em <strong>Instalar aplicativo</strong> ou{' '}
                        <strong>Adicionar à tela inicial</strong>.
                      </li>
                    </ol>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="mt-5 w-full rounded-lg bg-[var(--accent-primary)] py-2.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      Modo Offline — Os dados estão sendo salvos no dispositivo e sincronizarão ao reconectar.
    </div>
  );
};

