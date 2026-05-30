import { Icon, ICON_PATHS } from '../lib/icons';
import {
  stats, history, mode, errorCount, streak, elapsed,
  zen, settings, restart,
} from '../lib/store';
import { t } from '../lib/i18n';

function getTimeDisplayVal(): number {
  if (zen.value) return 0;
  const tm = settings.value.timer;
  if (tm !== 'off' && tm !== 'count-up') {
    return Math.max(0, parseInt(tm, 10) - Math.floor(elapsed.value));
  }
  return Math.floor(elapsed.value);
}

export function StatsBar() {
  const s = stats.value;
  const prevSession = history.value.filter(h => h.modeId === mode.value.id).slice(-2)[0];
  const wpmDelta = prevSession ? s.wpm - prevSession.wpm : null;
  const tm = settings.value.timer;
  const isCountdown = tm !== 'off' && tm !== 'count-up';
  const limit = isCountdown ? parseInt(tm, 10) : 0;
  const timeProgress = isCountdown ? (elapsed.value / limit) * 100 : s.progress * 100;

  return (
    <div class="stats-bar">
      <div class="stat wpm">
        <div class="lbl">{t('statLabelWpm')}</div>
        <div class="val">
          <span>{zen.value ? 0 : s.wpm}</span>
          <span class="unit">{t('statLabelRaw')} <span>{zen.value ? 0 : s.rawWpm}</span></span>
        </div>
        {wpmDelta != null && (
          <div class={'delta ' + (wpmDelta >= 0 ? 'up' : 'down')}>
            {wpmDelta >= 0 ? '↑' : '↓'} {Math.abs(wpmDelta)}
          </div>
        )}
        <div class="bar"><span style={{ width: Math.min(100, s.wpm) + '%' }} /></div>
      </div>
      <div class="stat acc">
        <div class="lbl">{t('statLabelAccuracy')}</div>
        <div class="val"><span>{zen.value ? 100 : s.acc}</span><span class="unit">%</span></div>
      </div>
      <div class="stat err">
        <div class="lbl">{t('statLabelErrors')}</div>
        <div class="val"><span>{zen.value ? 0 : errorCount.value}</span></div>
      </div>
      <div class="stat streak">
        <div class="lbl">{t('statLabelStreak')}</div>
        <div class="val"><span>{zen.value ? 0 : streak.value}</span><span class="unit">{t('statLabelStreakUnit')}</span></div>
      </div>
      <div class="stat time">
        <div class="lbl">{t('statLabelTime')}</div>
        <div class="val"><span>{getTimeDisplayVal()}</span><span class="unit">{t('statLabelTimeUnit')}</span></div>
        <div class="bar"><span style={{ width: timeProgress + '%' }} /></div>
      </div>
      <div class="controls">
        <button class={'btn ' + (zen.value ? 'primary' : 'ghost')} onClick={() => { zen.value = !zen.value; }}>
          <Icon paths={ICON_PATHS.zen} size={14} /> {t('zen')}
        </button>
        <button class="btn" onClick={restart}>{t('newText')}</button>
        <button class="btn primary" onClick={restart}>
          <Icon paths={ICON_PATHS.refresh} size={14} /> {t('restart')}
        </button>
      </div>
    </div>
  );
}
