import { useRef } from 'preact/hooks';
import { Icon, ICON_PATHS } from '../lib/icons';
import { ACCENTS } from '../lib/data';
import type { Settings, Accent, Theme, Cursor, FontFamily, SoundPack, TimerMode } from '../lib/types';
import {
  settings, drawerOpen, history,
  updateSetting, resetProgress,
} from '../lib/store';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { LOCALES, locale, t, type LocaleCode } from '../lib/i18n';
import { KB_LAYOUT_LIST, type KbLayoutId } from '../lib/layouts';
import { lazyComponent } from './Lazy';

// Billing UI loads only when the drawer is opened.
const BillingPanel = lazyComponent(() => import('./BillingPanel').then(m => m.BillingPanel));

function Trend({ data }: { data: number[] }) {
  if (!data.length) return <div style="color:var(--text-3);font-size:12px;padding:8px 0">No sessions yet.</div>;
  const max = Math.max(...data, 60), min = Math.min(...data, 0);
  const w = 360, ht = 90, pad = 10;
  const stepX = (w - pad * 2) / Math.max(1, data.length - 1);
  const yOf = (v: number) => ht - pad - ((v - min) / Math.max(1, max - min)) * (ht - pad * 2);
  const pts = data.map((v, i): [number, number] => [pad + i * stepX, yOf(v)]);
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = path + ` L ${pad + (data.length - 1) * stepX} ${ht - pad} L ${pad} ${ht - pad} Z`;
  return (
    <div style="margin-top:8px">
      <svg width="100%" viewBox={`0 0 ${w} ${ht}`} style="display:block">
        <defs>
          <linearGradient id="dwTrendStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#8b5cf6" />
            <stop offset="100%" stop-color="#ec4899" />
          </linearGradient>
          <linearGradient id="dwTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(139,92,246,0.35)" />
            <stop offset="100%" stop-color="rgba(139,92,246,0)" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#dwTrendFill)" />
        <path d={path} fill="none" stroke="url(#dwTrendStroke)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" />
      </svg>
    </div>
  );
}

export function SettingsDrawer() {
  if (!drawerOpen.value) return null;
  const s = settings.value;
  const close = () => { drawerOpen.value = false; };
  const ref = useRef<HTMLDivElement | null>(null);
  useFocusTrap(ref, drawerOpen.value);

  return (
    <>
      <div class="drawer-scrim" onClick={close} aria-hidden="true" />
      <div
        class="drawer"
        id="settings-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-drawer-title"
        ref={ref}
      >
        <div class="drawer-head">
          <h3 id="settings-drawer-title">{t('settingsTitle')}</h3>
          <button class="icon-btn" onClick={close} aria-label={t('closeSettings')}>
            <Icon paths={ICON_PATHS.close} />
          </button>
        </div>
        <div class="drawer-body">
          {/* Language — top of the drawer so users can find it instantly */}
          <Row label={t('settingLanguage')} value={LOCALES.find(l => l.code === locale.value)?.name || 'English'}>
            <select
              class="lb-filter-select"
              style="width:100%"
              value={locale.value}
              onChange={(e: Event) => updateSetting('locale', (e.target as HTMLSelectElement).value as LocaleCode)}
              aria-label={t('settingLanguage')}
            >
              {LOCALES.map(l => (
                <option value={l.code}>{l.flag} {l.name} ({l.englishName})</option>
              ))}
            </select>
          </Row>

          <Row label={t('settingKbLayout')} value={(s.kbLayout || 'qwerty').toUpperCase()}>
            <select
              class="lb-filter-select"
              style="width:100%"
              value={s.kbLayout || 'qwerty'}
              onChange={(e: Event) => updateSetting('kbLayout', (e.target as HTMLSelectElement).value as KbLayoutId)}
              aria-label={t('settingKbLayout')}
            >
              {KB_LAYOUT_LIST.map(l => (
                <option value={l.id}>{l.name} — {l.description}</option>
              ))}
            </select>
          </Row>

          <Row label={t('settingTheme')} value={s.theme}>
            <Seg<Theme> value={s.theme} options={['light', 'dark', 'auto']} onChange={v => updateSetting('theme', v)} />
          </Row>

          <Row label={t('settingAccent')}>
            <div class="swatch-row" role="radiogroup" aria-label={t('settingAccent')}>
              {ACCENTS.map(a => (
                <button
                  type="button"
                  class={'swatch' + (s.accent === a.id ? ' on' : '')}
                  style={{ background: a.c }}
                  role="radio"
                  aria-checked={s.accent === a.id}
                  aria-label={a.id}
                  onClick={() => updateSetting('accent', a.id as Accent)}
                />
              ))}
            </div>
          </Row>

          <Row label={t('settingFont')} value={s.font}>
            <Seg<FontFamily>
              value={s.font}
              options={['JetBrains Mono', 'Fira Code', 'Courier']}
              onChange={v => updateSetting('font', v)}
              renderLabel={v => v.split(' ')[0]}
              fontSize="11px"
            />
          </Row>

          <Row label={t('settingFontSize')} value={s.fontSize + 'px'}>
            <input class="range" type="range" min="20" max="40" step="1"
              value={s.fontSize}
              aria-label={`${t('settingFontSize')} (${s.fontSize}px)`}
              onInput={(e: Event) => updateSetting('fontSize', +(e.target as HTMLInputElement).value)} />
          </Row>

          <Row label={t('settingCursor')} value={s.cursor}>
            <Seg<Cursor>
              value={s.cursor}
              options={['line', 'block', 'underline']}
              onChange={v => updateSetting('cursor', v)}
            />
          </Row>

          <Row label={t('settingSound')}>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
              <Switch on={s.sound} onToggle={() => updateSetting('sound', !s.sound)} label={t('settingSound')} />
              <input
                class="range" type="range" min="0" max="100" step="1"
                value={s.volume * 100}
                disabled={!s.sound}
                aria-label={`${t('settingSound')} volume (${Math.round(s.volume * 100)}%)`}
                style={{ flex: 1, marginLeft: 12, opacity: s.sound ? 1 : 0.4 }}
                onInput={(e: Event) => updateSetting('volume', +(e.target as HTMLInputElement).value / 100)}
              />
            </div>
          </Row>

          <Row label={t('settingSoundPack')} value={s.soundPack}>
            <Seg<SoundPack>
              value={s.soundPack}
              options={['mechanical', 'soft', 'typewriter']}
              onChange={v => updateSetting('soundPack', v)}
              fontSize="11px"
            />
          </Row>

          <Row label={t('settingPromptLength')} value={t('settingPromptWords', s.promptLength)}>
            <Seg<number>
              value={s.promptLength}
              options={[10, 20, 40, 60, 80]}
              onChange={v => updateSetting('promptLength', v)}
            />
          </Row>

          <Row label={t('settingTimer')} value={s.timer}>
            <Seg<TimerMode>
              value={s.timer}
              options={['off', 'count-up', '30s', '60s', '120s']}
              onChange={v => updateSetting('timer', v)}
              fontSize="11px"
            />
          </Row>

          <Row label={t('settingHlKeys')}>
            <Switch on={s.hlKeys} onToggle={() => updateSetting('hlKeys', !s.hlKeys)} label={t('settingHlKeys')} />
          </Row>
          <Row label={t('settingNextPreview')}>
            <Switch on={s.nextPreview} onToggle={() => updateSetting('nextPreview', !s.nextPreview)} label={t('settingNextPreview')} />
          </Row>
          <Row label={t('settingAutoAdvance')}>
            <Switch on={s.autoAdvance} onToggle={() => updateSetting('autoAdvance', !s.autoAdvance)} label={t('settingAutoAdvance')} />
          </Row>

          <Row label={t('settingHistory')} value={t('settingHistoryCount', history.value.length)}>
            <Trend data={history.value.slice(-20).map(h => h.wpm)} />
          </Row>

          <BillingPanel />

          <div class="setting-row">
            <button
              class="btn"
              style="background:rgba(244,63,94,0.12);border-color:rgba(244,63,94,0.35);color:#fb7185;width:100%;justify-content:center"
              onClick={resetProgress}
            >{t('settingResetProgress')}</button>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: preact.ComponentChildren }) {
  return (
    <div class="setting-row">
      <div class="lbl">
        <span class="name">{label}</span>
        {value != null && <span class="v">{value}</span>}
      </div>
      {children}
    </div>
  );
}

/**
 * Accessible on/off toggle. Replaces the old click-only <div class="switch">,
 * which was invisible to keyboards and screen readers. Renders the SAME visual
 * (.switch / .switch.on) but with role="switch", aria-checked, focusability,
 * and Space/Enter activation. `label` becomes the accessible name.
 */
function Switch({ on, onToggle, label }: { on: boolean; onToggle(): void; label: string }) {
  return (
    <div
      class={'switch' + (on ? ' on' : '')}
      role="switch"
      aria-checked={on}
      aria-label={label}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(); }
      }}
    />
  );
}

interface SegProps<T extends string | number> {
  value: T;
  options: readonly T[];
  onChange(v: T): void;
  renderLabel?(v: T): string;
  fontSize?: string;
}
function Seg<T extends string | number>({ value, options, onChange, renderLabel, fontSize }: SegProps<T>) {
  return (
    <div class="seg">
      {options.map(opt => (
        <button
          class={value === opt ? 'on' : ''}
          style={fontSize ? { fontSize } : undefined}
          onClick={() => onChange(opt)}
        >{renderLabel ? renderLabel(opt) : String(opt)}</button>
      ))}
    </div>
  );
}
