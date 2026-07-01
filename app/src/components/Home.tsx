import { Icon, ICON_PATHS } from '../lib/icons';
import { LESSONS, CHALLENGES } from '../lib/data';
import { modeTitle } from '../lib/types';
import type { Session } from '../lib/types';
import {
  activeTab, mode, view, history, completedLessons,
  unlockedLessons, customKeys, pickAndStart, shortcutsHelpOpen,
  primerOpen,
} from '../lib/store';
import { CustomKeysPanel } from './CustomKeysPanel';
import { ProGate } from './ProGate';
import { AuthCard } from './AuthCard';
import { Leaderboard } from './Leaderboard';
import { isSupabaseConfigured } from '../lib/auth';
import { isBillingConfigured } from '../lib/billing';
import { lazyComponent } from './Lazy';
import { escapeHTML, timeAgo } from '../lib/utils';
import { t } from '../lib/i18n';

// Code-split — these load on demand only when the user opens the tab /
// scrolls to the panel. Saves ~60-70 KB on the critical-path bundle.
const AdaptivePanel        = lazyComponent(() => import('./AdaptivePanel').then(m => m.AdaptivePanel));
const Multiplayer          = lazyComponent(() => import('./Multiplayer').then(m => m.Multiplayer));
const PricingPanel         = lazyComponent(() => import('./PricingPanel').then(m => m.PricingPanel));
const CustomParagraphPanel = lazyComponent(() => import('./CustomParagraphPanel').then(m => m.CustomParagraphPanel));
const TeamDashboard        = lazyComponent(() => import('./TeamDashboard').then(m => m.TeamDashboard));

function Hero() {
  const bestWpm = history.value.length ? Math.max(...history.value.map(h => h.wpm)) : 0;
  const done = completedLessons.value.length;
  const pct = Math.round((done / LESSONS.length) * 100);
  const m = mode.value;
  const subtitle = modeTitle(m);

  return (
    <section class="hero">
      <div class="hero-bg" />
      <div class="hero-inner">
        <div class="hero-left">
          <div class="hero-tag">
            <span class="pulse" />{' '}{t('heroTagPrefix')}: {done}/{LESSONS.length} {t('heroChapters')} ({pct}%)
          </div>
          <h1 class="hero-title">
            {t('heroTitleLine1')}<br />
            <span class="grad">{t('heroTitleLine2')}</span>
          </h1>
          <p class="hero-sub">{t('heroSub')}</p>
          <div class="hero-cta">
            <button class="btn primary lg" onClick={() => { view.value = 'practice'; }}>
              <Icon paths={ICON_PATHS.play} size={16} filled /> {t('heroCtaStart')}
            </button>
            <div class="hero-mode-chip">
              <span class="lbl">{t('heroLastSelected')}</span>
              <span class="val">{subtitle}</span>
            </div>
          </div>
        </div>
        <div class="hero-right">
          <div class="hero-orb">
            <div class="orb-ring r1" /><div class="orb-ring r2" /><div class="orb-ring r3" />
            <div class="orb-core">
              <div class="orb-num">{bestWpm || '—'}</div>
              <div class="orb-lbl">{t('statBestWpm')}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ModesNav() {
  const tabs: { id: typeof activeTab.value; label: string }[] = [
    { id: 'lessons',     label: t('tabLessons') },
    { id: 'adaptive',    label: t('tabAdaptive') },
    { id: 'multiplayer', label: t('tabMultiplayer') },
    { id: 'challenges',  label: t('tabChallenges') },
    { id: 'custom',      label: t('tabCustom') },
  ];
  // The Teams tab only appears when a backend is configured — there's nothing
  // it can do without Supabase, so hiding it keeps the open-source/local build
  // uncluttered.
  if (isSupabaseConfigured()) tabs.push({ id: 'teams', label: t('tabTeams') });
  return (
    <nav class="modes-nav" role="tablist" aria-label={t('tabLessons')}>
      {tabs.map(tab => (
        <button
          class={'modes-nav-btn' + (activeTab.value === tab.id ? ' is-active' : '')}
          role="tab"
          aria-selected={activeTab.value === tab.id}
          onClick={() => { activeTab.value = tab.id; }}
        >{tab.label}</button>
      ))}
    </nav>
  );
}

function LessonsGrid() {
  return (
    <div class="tab-content">
      <div class="section-head">
        <h2>{t('lessonsHead')}</h2>
        <p>{t('lessonsSub')}</p>
      </div>
      <div class="modes-grid">
        <button class="ch0-card" onClick={() => { primerOpen.value = true; }}>
          <span class="ch0-badge" aria-hidden="true">🖐️</span>
          <span class="ch0-text">
            <h3>{t('ch0Title')}</h3>
            <p>{t('ch0Sub')}</p>
          </span>
          <span class="ch0-go">{t('ch0Cta')} →</span>
        </button>
        {LESSONS.map((lesson, index) => {
          const isUnlocked = unlockedLessons.value.includes(lesson.id);
          const isCompleted = completedLessons.value.includes(lesson.id);
          const isActive = mode.value.id === lesson.id;
          return (
            <div class="modecard tone-violet" style={{ opacity: isUnlocked ? 1 : 0.45 }}>
              <div class="mc-head" style="margin-bottom:8px">
                <div class="mc-icon">{index + 1}</div>
                <div style="flex:1">
                  <div class="mc-title" style="font-size:15px">{lesson.title}</div>
                  <div class="mc-meta">{lesson.subtitle}</div>
                </div>
                {!isUnlocked
                  ? <span class="lock-badge">{t('badgeLocked')}</span>
                  : isCompleted
                  ? <span class="check-badge">{t('badgeComplete')}</span>
                  : <span class="check-badge" style="background:rgba(139,92,246,0.15);color:var(--violet-2)">{t('badgeUnlocked')}</span>}
              </div>
              <div style="font-size:12px;color:var(--text-2);margin-bottom:12px;line-height:1.5">
                {lesson.instructions.slice(0, 75)}…
              </div>
              <div class="mc-items">
                <button
                  class={'mc-item' + (isActive ? ' is-active' : '')}
                  disabled={!isUnlocked}
                  onClick={() => isUnlocked && pickAndStart(lesson)}
                >
                  <span class="dot" />
                  <span>{isActive ? t('selected') : t('loadChapter')}</span>
                  <Icon paths={ICON_PATHS.chevronRight} size={14} className="arrow" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChallengesGrid() {
  return (
    <div class="tab-content">
      <div class="section-head">
        <h2>{t('challengesHead')}</h2>
        <p>{t('challengesSub')}</p>
      </div>
      <div class="modes-grid">
        {CHALLENGES.map(ch => {
          const isActive = mode.value.id === ch.id;
          return (
            <div class="modecard tone-cyan">
              <div class="mc-head" style="margin-bottom:12px">
                <div class="mc-icon">⚡</div>
                <div><div class="mc-title">{ch.label}</div><div class="mc-meta">Challenge Mode</div></div>
              </div>
              <p style="font-size:12px;color:var(--text-2);margin-bottom:16px;line-height:1.5">{ch.desc}</p>
              <div class="mc-items">
                <button
                  class={'mc-item' + (isActive ? ' is-active' : '')}
                  onClick={() => pickAndStart(ch)}
                >
                  <span class="dot" />
                  <span>{isActive ? t('selected') : t('takeChallenge')}</span>
                  <Icon paths={ICON_PATHS.chevronRight} size={14} className="arrow" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CustomPicker() {
  const isActive = mode.value.id === 'custom-set';
  return (
    <div class="tab-content">
      <div class="section-head">
        <h2>{t('customHead')}</h2>
        <p>{t('customSub')}</p>
      </div>
      <div style="display:grid;grid-template-columns:1.8fr 1fr;gap:22px">
        <div class="modecard tone-amber" style="height:max-content">
          <div class="mc-head">
            <div class="mc-icon">⚒️</div>
            <div>
              <div class="mc-title">{t('customSetTitle')}</div>
            </div>
          </div>
          <p style="font-size:12px;color:var(--text-2);margin-bottom:16px;line-height:1.5">{t('customSetDesc')}</p>
          <button
            class="btn primary"
            style="width:100%;justify-content:center"
            disabled={customKeys.value.size < 2}
            onClick={() => pickAndStart({ id: 'custom-set', label: t('customSetTitle'), keys: '', src: 'custom' })}
          >{isActive ? t('startTraining') : t('loadCustomSet')}</button>
        </div>
        <CustomKeysPanel />
      </div>

      <ProGate feature="Custom paragraph paste">
        <CustomParagraphPanel />
      </ProGate>
    </div>
  );
}

function StatsStrip() {
  const bestWpm = history.value.length ? Math.max(...history.value.map(h => h.wpm)) : 0;
  const avgWpm = history.value.length
    ? Math.round(history.value.reduce((s, h) => s + h.wpm, 0) / history.value.length)
    : 0;
  const totalTime = history.value.reduce((s, h) => s + (h.time || 0), 0);
  const minutes = Math.floor(totalTime / 60);

  return (
    <section class="stats-strip">
      <div class="mini-stat tone-violet">
        <div class="ms-lbl">{t('statBestWpm')}</div>
        <div class="ms-val"><span>{bestWpm}</span></div>
      </div>
      <div class="mini-stat tone-cyan">
        <div class="ms-lbl">{t('statAvgWpm')}</div>
        <div class="ms-val"><span>{avgWpm}</span></div>
      </div>
      <div class="mini-stat tone-magenta">
        <div class="ms-lbl">{t('statTotalTime')}</div>
        <div class="ms-val"><span>{minutes}</span><span class="u">{t('statMin')}</span></div>
      </div>
      <div class="mini-stat tone-lime">
        <div class="ms-lbl">{t('statSessions')}</div>
        <div class="ms-val"><span>{history.value.length}</span><span class="u">/ 20</span></div>
      </div>
    </section>
  );
}

function TrendSVG({ data }: { data: number[] }) {
  if (!data.length) {
    return <div style="color:var(--text-3);font-size:12px;padding:8px 0">No sessions yet.</div>;
  }
  const max = Math.max(...data, 60), min = Math.min(...data, 0);
  const w = 360, ht = 90, pad = 10;
  const stepX = (w - pad * 2) / Math.max(1, data.length - 1);
  const yOf = (v: number) => ht - pad - ((v - min) / Math.max(1, max - min)) * (ht - pad * 2);
  const pts: [number, number][] = data.map((v, i) => [pad + i * stepX, yOf(v)]);
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = path + ` L ${pad + (data.length - 1) * stepX} ${ht - pad} L ${pad} ${ht - pad} Z`;

  return (
    <div style="margin-top:8px">
      <svg width="100%" viewBox={`0 0 ${w} ${ht}`} style="display:block">
        <defs>
          <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#8b5cf6" />
            <stop offset="100%" stop-color="#ec4899" />
          </linearGradient>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(139,92,246,0.35)" />
            <stop offset="100%" stop-color="rgba(139,92,246,0)" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#trendFill)" />
        <path d={path} fill="none" stroke="url(#trendStroke)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" />
        {pts.map((p, i) => (
          <circle
            cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4 : 2.4}
            fill={i === pts.length - 1 ? '#fff' : '#a78bfa'}
            stroke={i === pts.length - 1 ? '#8b5cf6' : 'none'}
            stroke-width="2"
          />
        ))}
      </svg>
      <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10px;color:var(--text-3);margin-top:6px">
        <span>min {min}</span>
        <span>last {data[data.length - 1]} wpm</span>
        <span>best {max}</span>
      </div>
    </div>
  );
}

function TrendCard() {
  const data = history.value.slice(-20).map(h => h.wpm);
  let trendLabel: preact.JSX.Element | null = null;
  if (history.value.length >= 2) {
    const last = history.value[history.value.length - 1].wpm;
    const prev = history.value[history.value.length - 2].wpm;
    trendLabel = last >= prev
      ? <span class="up">{t('trendUp')}</span>
      : <span class="down">{t('trendDown')}</span>;
  }
  return (
    <section class="trend-card">
      <div class="trend-head">
        <div><h3>{t('trendTitle')}</h3><p>{t('trendSub', Math.min(20, history.value.length))}</p></div>
        <div class="trend-pill">{trendLabel}</div>
      </div>
      <TrendSVG data={data} />
    </section>
  );
}

function RecentSessions() {
  const last8 = [...history.value].reverse().slice(0, 8);
  return (
    <section class="recent">
      <div class="section-head">
        <h2>{t('recentTitle')}</h2>
        <p>{t('recentSub', Math.min(8, history.value.length))}</p>
      </div>
      <div class="recent-table">
        <div class="recent-head">
          <div>{t('recentColMode')}</div><div>{t('recentColWpm')}</div><div>{t('recentColAccuracy')}</div><div>{t('recentColTime')}</div><div>{t('recentColWhen')}</div>
        </div>
        {last8.map((s: Session) => {
          const accColor = s.acc >= 95 ? '#4ade80' : s.acc >= 85 ? '#facc15' : '#fb7185';
          return (
            <div class="recent-row">
              <div class="m">{escapeHTML(s.modeLabel || s.modeId)}</div>
              <div class="w" style="color:var(--accent)">{s.wpm}</div>
              <div style={{ color: accColor }}>{s.acc}%</div>
              <div>{s.time}s</div>
              <div class="d">{timeAgo(s.date)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer class="home-foot">
      <span>{t('footerVersion')}</span>
      <span style="cursor:pointer" onClick={() => { shortcutsHelpOpen.value = !shortcutsHelpOpen.value; }}>
        {t('footerShortcuts', '?').split('?')[0]}<kbd>?</kbd>{t('footerShortcuts', '?').split('?')[1] || ''}
      </span>
    </footer>
  );
}

export function Home() {
  const hasHistory = history.value.length > 0;
  return (
    <div class="home">
      <Hero />
      <ModesNav />
      {activeTab.value === 'lessons'     && <LessonsGrid />}
      {activeTab.value === 'adaptive'    && <AdaptivePanel />}
      {activeTab.value === 'multiplayer' && <Multiplayer />}
      {activeTab.value === 'teams'       && <TeamDashboard />}
      {activeTab.value === 'challenges'  && <ChallengesGrid />}
      {activeTab.value === 'custom'      && <CustomPicker />}
      <StatsStrip />
      {hasHistory && <TrendCard />}
      {isSupabaseConfigured() && <AuthCard />}
      {isBillingConfigured() && <PricingPanel />}
      {isSupabaseConfigured() && <Leaderboard />}
      {hasHistory && <RecentSessions />}
      <Footer />
    </div>
  );
}
