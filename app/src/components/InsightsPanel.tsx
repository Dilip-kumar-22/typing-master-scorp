import { computed } from '@preact/signals';
import {
  history, keyStats, customKeys, activeTab, pickAndStart,
  practiceDays, completedLessons, localToday,
} from '../lib/store';
import { computeInsights } from '../lib/insights';
import { computeAchievements } from '../lib/achievements';
import { LESSONS } from '../lib/data';
import { t } from '../lib/i18n';
import type { StringKeys } from '../lib/locales/en';

// Badge title/desc are computed i18n keys (`ach_<id>_t`/`_d`) — all declared in
// en.ts, so this cast is safe. A tiny wrapper keeps the call sites clean.
const tk = (key: string, ...a: (string | number)[]) => t(key as StringKeys, ...a);

// Derived once, reactively — recomputes whenever a session lands.
const insights = computed(() => computeInsights(history.value, keyStats.value));
const achievements = computed(() => computeAchievements({
  history: history.value,
  keyStats: keyStats.value,
  completedLessons: completedLessons.value,
  practiceDays: practiceDays.value,
  totalChapters: LESSONS.length,
  today: localToday(),
}));

/** A small horizontal accuracy bar (green→amber→red by value). */
function AccBar({ value }: { value: number }) {
  const hue = value >= 95 ? 145 : value >= 88 ? 45 : 8; // green / amber / red
  return (
    <div class="ins-bar">
      <div class="ins-bar-fill" style={`width:${value}%;background:hsl(${hue} 85% 55%)`} />
    </div>
  );
}

/** Drill the current weakest keys via the existing custom-set mode. */
function drillWeakKeys(keys: string[]): void {
  const letters = keys
    .map(k => k.toLowerCase())
    .filter(k => /^[a-z0-9;',./\[\]\\=-]$/.test(k));
  if (letters.length < 2) return;
  customKeys.value = new Set(letters);
  pickAndStart({ id: 'custom-set', label: t('insDrillWeak'), keys: '', src: 'custom' });
}

export function InsightsPanel() {
  const i = insights.value;
  if (i.totalSessions === 0) return null;
  const { streak, badges } = achievements.value;
  const unlockedCount = badges.filter(b => b.unlocked).length;

  const deltaStr = i.wpmDelta == null ? null
    : (i.wpmDelta >= 0 ? `▲ +${i.wpmDelta}` : `▼ ${i.wpmDelta}`);
  const drillable = i.weakestKeys
    .filter(k => /^[A-Z0-9;',./\[\]\\=-]$/i.test(k.key))
    .slice(0, 5)
    .map(k => k.raw);

  return (
    <section class="insights" aria-labelledby="insights-title">
      <div class="section-head">
        <h2 id="insights-title">{t('insTitle')}</h2>
        <p>{t('insSub')}</p>
      </div>

      {/* Streak + recommendation, side by side */}
      <div class="ins-top">
        <div class="ins-streak" title={t('insStreakLongest', streak.longest)}>
          <div class="ins-streak-flame" data-lit={streak.current > 0}>🔥</div>
          <div class="ins-streak-body">
            <div class="ins-streak-num">{streak.current}</div>
            <div class="ins-streak-lbl">{t('insDayStreak')}</div>
          </div>
          <div class="ins-streak-meta">
            <span>{t('insBest')}: <strong>{streak.longest}</strong></span>
            <span>{t('insDaysTotal')}: <strong>{streak.daysTotal}</strong></span>
          </div>
        </div>
        <div class="ins-reco">
          <span class="ins-reco-icon" aria-hidden="true">💡</span>
          <p>{i.recommendation}</p>
        </div>
      </div>

      {/* Achievements */}
      <div class="ins-ach">
        <div class="ins-card-head">
          <h3>{t('insAchievements')}</h3>
          <span class="ins-ach-count">{unlockedCount} / {badges.length}</span>
        </div>
        <div class="ins-badges">
          {badges.map(b => (
            <div class={'ins-badge' + (b.unlocked ? ' on' : '')} key={b.id}
                 title={tk(b.desc) + ' · ' + b.progressLabel}>
              <span class="ins-badge-icon" aria-hidden="true">{b.icon}</span>
              <span class="ins-badge-title">{tk(b.title)}</span>
              {!b.unlocked && (
                <span class="ins-badge-bar"><span style={`width:${Math.round(b.progress * 100)}%`} /></span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Top-line numbers */}
      <div class="ins-kpis">
        <div class="ins-kpi">
          <div class="ins-kpi-val">{i.bestWpm}</div>
          <div class="ins-kpi-lbl">{t('insBestWpm')}</div>
        </div>
        <div class="ins-kpi">
          <div class="ins-kpi-val">{i.avgWpm}{deltaStr && <span class={'ins-delta ' + (i.wpmDelta! >= 0 ? 'up' : 'down')}>{deltaStr}</span>}</div>
          <div class="ins-kpi-lbl">{t('insAvgWpm')}</div>
        </div>
        <div class="ins-kpi">
          <div class="ins-kpi-val">{i.avgAccuracy}%</div>
          <div class="ins-kpi-lbl">{t('insAvgAcc')}</div>
        </div>
        <div class="ins-kpi">
          <div class="ins-kpi-val">{i.consistency == null ? '—' : i.consistency}</div>
          <div class="ins-kpi-lbl">{t('insConsistency')}</div>
        </div>
        <div class="ins-kpi">
          <div class="ins-kpi-val">{i.totalKeystrokes.toLocaleString()}</div>
          <div class="ins-kpi-lbl">{t('insKeystrokes')}</div>
        </div>
      </div>

      <div class="ins-grid">
        {/* Weakest keys */}
        <div class="ins-card">
          <div class="ins-card-head">
            <h3>{t('insWeakKeys')}</h3>
            {drillable.length >= 2 && (
              <button class="ins-drill-btn" onClick={() => drillWeakKeys(drillable)}>
                {t('insDrillWeak')} →
              </button>
            )}
          </div>
          {i.weakestKeys.length === 0 ? (
            <p class="ins-empty">{t('insMoreData')}</p>
          ) : (
            <ul class="ins-keylist">
              {i.weakestKeys.map(k => (
                <li key={k.raw}>
                  <span class="ins-key">{k.key}</span>
                  <AccBar value={k.accuracy} />
                  <span class="ins-key-acc">{k.accuracy}%</span>
                  <span class="ins-key-n">{k.errors}/{k.presses}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Per-finger accuracy */}
        <div class="ins-card">
          <div class="ins-card-head"><h3>{t('insFingers')}</h3></div>
          {i.fingers.length === 0 ? (
            <p class="ins-empty">{t('insMoreData')}</p>
          ) : (
            <ul class="ins-keylist">
              {i.fingers.map(f => (
                <li key={f.finger}>
                  <span class="ins-finger">{f.finger}</span>
                  <AccBar value={f.accuracy} />
                  <span class="ins-key-acc">{f.accuracy}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <button class="ins-jump" onClick={() => { activeTab.value = 'custom'; }}>
        {t('insBuildDrill')} →
      </button>
    </section>
  );
}
