import { useRef } from 'preact/hooks';
import { Icon, ICON_PATHS } from '../lib/icons';
import { shortcutsHelpOpen } from '../lib/store';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { t } from '../lib/i18n';

export function ShortcutsModal() {
  if (!shortcutsHelpOpen.value) return null;
  const close = () => { shortcutsHelpOpen.value = false; };
  const cardRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(cardRef, shortcutsHelpOpen.value);

  const shortcuts = [
    { label: t('shortcutRestart'),    keys: 'Tab' },
    { label: t('shortcutReset'),      keys: 'Esc' },
    { label: t('shortcutZen'),        keys: 'Ctrl + Z' },
    { label: t('shortcutSettings'),   keys: 'Ctrl + Shift + S' },
    { label: t('shortcutToggleHelp'), keys: '?' },
  ];

  return (
    <div
      class="results-overlay"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        class="results-card"
        ref={cardRef}
        style="max-width:480px;padding:28px;transform-style:preserve-3d"
        onClick={(e: Event) => e.stopPropagation()}
      >
        <div class="results-head" style="margin-bottom:18px">
          <h2 id="shortcuts-title">{t('shortcutsTitle')}</h2>
          <button class="close" onClick={close} aria-label={t('shortcutsClose')}>
            <Icon paths={ICON_PATHS.close} />
          </button>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;font-size:14px;color:var(--text-1)">
          {shortcuts.map(s => (
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px dashed var(--hairline)">
              <span>{s.label}</span>
              <kbd style="background:rgba(255,255,255,0.06);border:1px solid var(--hairline-strong);border-bottom-width:2px;padding:3px 8px;border-radius:6px;font-family:var(--font-mono);font-size:11px;color:#fff">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
        <div style="margin-top:24px;display:flex;justify-content:flex-end">
          <button class="btn primary" style="padding:8px 22px" onClick={close}>{t('shortcutsGotIt')}</button>
        </div>
      </div>
    </div>
  );
}
