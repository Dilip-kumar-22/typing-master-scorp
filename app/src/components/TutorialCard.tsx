import { useState } from 'preact/hooks';
import { mode, targetKeys, tutorialActive, dismissGuideForever } from '../lib/store';
import { isLesson } from '../lib/types';
import { t } from '../lib/i18n';

export function TutorialCard() {
  const m = mode.value;
  if (!isLesson(m)) return null;

  const [skipForever, setSkipForever] = useState(false);

  function start() {
    if (skipForever) dismissGuideForever(m.id);
    tutorialActive.value = false;
  }

  const keysPreview = targetKeys.value.size > 0
    ? [...targetKeys.value]
        .map(c => c === ' ' ? '␣' : c === '\t' ? '⇥' : c === '\n' ? '⏎' : c === '\b' ? '⌫' : c)
        .join(' ').toUpperCase()
    : t('tutorialAllKeys');

  // Prefer the rich multi-paragraph `guide` if provided, otherwise fall back
  // to the one-line `instructions` so older lessons keep working.
  const paragraphs = (m.guide && m.guide.length > 0) ? m.guide : [m.instructions];

  return (
    <div class="lesson-card">
      <div class="lesson-title-tag">{t('tutorialTag')} · {m.subtitle}</div>
      <h2>{m.title}</h2>

      <div style="padding:14px 18px;border:1px solid var(--hairline);border-radius:12px;background:rgba(0,0,0,0.15);margin:14px 0 6px;font-family:var(--font-mono);font-size:12px;color:var(--text-3)">
        <span style="color:var(--accent)">{t('tutorialActiveKeys')}:</span> {keysPreview}
      </div>

      <div class="lesson-guide">
        {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        {m.tip && (
          <div class="lesson-guide-tip">
            <strong>{t('tutorialProTip')}</strong>
            {m.tip}
          </div>
        )}
      </div>

      <label class="lesson-guide-toggle">
        <input
          type="checkbox"
          checked={skipForever}
          onChange={(e: Event) => setSkipForever((e.target as HTMLInputElement).checked)}
        />
        {t('tutorialSkipForever')}
      </label>

      <div class="lesson-guide-actions">
        <button class="btn ghost" onClick={() => { tutorialActive.value = false; }}>
          {t('tutorialSkipNow')}
        </button>
        <button class="btn primary lg" onClick={start}>
          {t('tutorialStart')}
        </button>
      </div>
    </div>
  );
}
