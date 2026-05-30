import { useEffect, useRef } from 'preact/hooks';
import { Icon, ICON_PATHS } from '../lib/icons';
import { escapeHTML } from '../lib/utils';
import { LESSONS, CHALLENGES } from '../lib/data';
import { isLesson, modeTitle } from '../lib/types';
import type { Mode } from '../lib/types';
import {
  mode, refresherActive, unlockedLessons,
  modePopoverOpen, goHome, restart, pickMode,
} from '../lib/store';
import { t } from '../lib/i18n';

export function PracticeHead() {
  const ref = useRef<HTMLDivElement | null>(null);
  const m = mode.value;
  const categoryLabel = refresherActive.value
    ? t('modePickerAdaptiveCategory')
    : (isLesson(m) ? t('modePickerLessonCategory') : t('modePickerChallengeCategory'));
  const titleNow = modeTitle(m);

  // Close popover when clicking outside.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!modePopoverOpen.value) return;
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t)) modePopoverOpen.value = false;
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  function selectMode(item: Mode) {
    pickMode(item);
    modePopoverOpen.value = false;
  }

  return (
    <div class="practice-head">
      <button class="back-btn" onClick={goHome}>
        <Icon paths={ICON_PATHS.back} size={14} /> {t('back')}
      </button>
      <div class="practice-mode-pick" ref={ref}>
        <span class="group">{categoryLabel}</span>
        <span class="sep">·</span>
        <button class="picker" onClick={() => { modePopoverOpen.value = !modePopoverOpen.value; }}>
          {titleNow}
          <Icon
            paths={ICON_PATHS.chevronDown}
            size={12}
            className={modePopoverOpen.value ? 'rot-180' : ''}
          />
        </button>
        {modePopoverOpen.value && (
          <div class="mode-popover" onClick={e => e.stopPropagation()}>
            <div class="grp">
              <div class="grp-lbl">{t('popLessonsGroup')}</div>
              {LESSONS.filter(l => unlockedLessons.value.includes(l.id)).map(l => (
                <button
                  class={'pop-item' + (m.id === l.id && !refresherActive.value ? ' on' : '')}
                  onClick={() => selectMode(l)}
                >{escapeHTML(l.title.split(':')[0])}</button>
              ))}
            </div>
            <div class="grp">
              <div class="grp-lbl">{t('popChallengesGroup')}</div>
              {CHALLENGES.map(c => (
                <button
                  class={'pop-item' + (m.id === c.id && !refresherActive.value ? ' on' : '')}
                  onClick={() => selectMode(c)}
                >{escapeHTML(c.label)}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" onClick={restart}>
          <Icon paths={ICON_PATHS.refresh} size={14} /> {t('restart')}
        </button>
      </div>
    </div>
  );
}
