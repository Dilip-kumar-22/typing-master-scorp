import { describe, it, expect } from 'vitest';
import { render } from 'preact';
import { lazyComponent } from '../src/components/Lazy';

// Verifies the Phase-10 code-splitting mechanism actually works at runtime:
// a lazyComponent should show its placeholder first, then render the resolved
// child after the dynamic import + effect resolve. Guards against the lazy
// helper silently breaking (which would blank out whole Home tabs).

// Poll until `cond()` is truthy (or we hit the timeout). This is more robust
// than a fixed number of ticks: Preact flushes useEffect asynchronously, so the
// number of macrotasks needed varies with system load — a fixed loop was flaky
// (~1 in 3 full-suite runs) when the resolved node hadn't painted yet. Polling
// waits exactly as long as needed and no longer.
async function waitFor(cond: () => boolean, { tries = 50, gap = 5 } = {}): Promise<void> {
  for (let i = 0; i < tries; i++) {
    if (cond()) return;
    await new Promise<void>(r => setTimeout(r, gap));
  }
  if (!cond()) throw new Error('waitFor: condition not met within timeout');
}

describe('lazyComponent — Phase 10 code-splitting', () => {
  it('resolves the dynamic import and renders the component', async () => {
    const Resolved = (props: { label: string }) => <div class="resolved">{props.label}</div>;
    const Lazy = lazyComponent<{ label: string }>(() => Promise.resolve(Resolved));

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(<Lazy label="hello-lazy" />, host);

    // Before settle: the placeholder spinner is shown (not the child).
    expect(host.querySelector('.resolved')).toBeNull();

    await waitFor(() => host.querySelector('.resolved') != null);

    // After settle: the real component has rendered.
    expect(host.querySelector('.resolved')?.textContent).toBe('hello-lazy');
    render(null, host);
    host.remove();
  });

  it('passes props through to the resolved component', async () => {
    const Resolved = (props: { n: number }) => <span class="n">{props.n * 2}</span>;
    const Lazy = lazyComponent<{ n: number }>(() => Promise.resolve(Resolved));

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(<Lazy n={21} />, host);
    await waitFor(() => host.querySelector('.n') != null);
    expect(host.querySelector('.n')?.textContent).toBe('42');
    render(null, host);
    host.remove();
  });
});
