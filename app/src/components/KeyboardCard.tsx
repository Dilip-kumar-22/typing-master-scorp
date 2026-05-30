import { KB_ROWS } from '../lib/data';
import { KB_LAYOUTS } from '../lib/layouts';
import type { KeyDef } from '../lib/types';
import {
  targetKeys, heatMap, activeKeys, kbView, bestStreak, settings,
} from '../lib/store';
import { t } from '../lib/i18n';

function Key({ def }: { def: KeyDef }) {
  const tk = targetKeys.value;
  const hm = heatMap.value;
  const ak = activeKeys.value;

  let label = '', sub = '', char = '', w = '';
  if (Array.isArray(def)) { [char, sub] = def; label = char; w = ''; }
  else { label = def.label; sub = ''; char = def.code; w = def.w || ''; }

  const lower = (Array.isArray(def) ? def[0] : '').toLowerCase();
  const isTarget = tk.has(lower);
  const isDown = ak.has(lower) || ak.has(char);
  const heatLvl = hm[lower] || 0;
  const heatClass = heatLvl > 0 ? ' h-' + heatLvl : '';
  const cls = 'key ' + w + heatClass + (isTarget ? ' is-target' : '') + (isDown ? ' is-down' : '');

  return (
    <div class={cls} data-key={lower || char}>
      <span class="legend">
        {sub && <span class="sub">{sub}</span>}
        {label}
      </span>
    </div>
  );
}

export function KeyboardCard() {
  const tk = targetKeys.value;
  const layoutId = settings.value.kbLayout || 'qwerty';
  const rows = (KB_LAYOUTS[layoutId] || KB_LAYOUTS.qwerty).rows || KB_ROWS;
  return (
    <div class="kb-card">
      <div class="kb-head">
        <h4>
          {kbView.value === 'errors' ? t('heatmapErrors') : t('heatmapFrequency')} ·{' '}
          <span style="color:var(--text-3);margin-left:6px">
            {tk.size > 0 ? t('heatmapTargetKeysGlowing', tk.size) : t('heatmapLiveTracking')}
          </span>
        </h4>
        <div class="kb-toggle">
          <button class={kbView.value === 'frequency' ? 'on' : ''} onClick={() => { kbView.value = 'frequency'; }}>{t('heatmapToggleFrequency')}</button>
          <button class={kbView.value === 'errors' ? 'on' : ''} onClick={() => { kbView.value = 'errors'; }}>{t('heatmapToggleErrors')}</button>
        </div>
      </div>
      <div class="kb-stage">
        <div class="kb" id="keyboard">
          {rows.map((row, ri) => (
            <div class="kb-row" key={ri}>
              {row.map((def, ki) => <Key key={ki} def={def} />)}
            </div>
          ))}
        </div>
      </div>
      <div class="kb-legend">
        <span>{t('heatmapScale')}</span>
        <div class="scale"><div class="s" style="background:rgba(255,255,255,0.04)" /><span>{t('heatmapNone')}</span></div>
        <div class="scale"><div class="s" style="background:hsl(50 90% 62%)" /><span>{t('heatmapLow')}</span></div>
        <div class="scale"><div class="s" style="background:hsl(32 95% 58%)" /><span>{t('heatmapMed')}</span></div>
        <div class="scale"><div class="s" style="background:hsl(12 92% 54%)" /><span>{t('heatmapHigh')}</span></div>
        <div class="scale"><div class="s" style="background:hsl(320 92% 56%)" /><span>{t('heatmapPeak')}</span></div>
        <span style="margin-left:auto;color:var(--text-3)">
          {t('bestStreak')} <strong style="color:var(--lime);font-family:var(--font-mono)">{bestStreak.value}</strong>
        </span>
      </div>
    </div>
  );
}
