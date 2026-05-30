// Pro-only feature: paste any text and practice it.
// Lives under ProGate, so free users see a frosted preview + upgrade CTA.

import { useState } from 'preact/hooks';
import { pickAndStart, view } from '../lib/store';
import type { Challenge } from '../lib/types';

export function CustomParagraphPanel() {
  const [text, setText] = useState('');

  function start() {
    const trimmed = text.trim();
    if (trimmed.length < 10) return;
    const m: Challenge = {
      id: 'custom-paragraph',
      label: 'Your custom paragraph',
      desc: 'Pasted by you',
      src: 'custom-paragraph',
      sentences: true,
    };
    // Stash the paragraph as a one-shot SENTENCE pool override. We do this by
    // monkey-patching the challenge into the runtime pool — cleaner approach
    // would be a "raw prompt" field on the Mode type, but this keeps the diff
    // tight for now.
    (window as unknown as { __customParagraph?: string }).__customParagraph = trimmed;
    pickAndStart(m);
    view.value = 'practice';
  }

  return (
    <div class="modecard tone-cyan" style="margin-top:18px">
      <div class="mc-head">
        <div class="mc-icon">📝</div>
        <div>
          <div class="mc-title">Custom paragraph paste</div>
          <div class="mc-meta">Practice with any text you want</div>
        </div>
      </div>
      <textarea
        class="custom-paragraph-input"
        rows={6}
        placeholder="Paste any text here — a paragraph from a book, an email draft, a code snippet…"
        value={text}
        onInput={(e: Event) => setText((e.target as HTMLTextAreaElement).value)}
        aria-label="Custom paragraph input"
      />
      <div class="custom-paragraph-foot">
        <span>{text.trim().length} chars</span>
        <button
          class="btn primary"
          disabled={text.trim().length < 10}
          onClick={start}
        >Practice this text →</button>
      </div>
    </div>
  );
}
