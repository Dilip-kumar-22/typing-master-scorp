import { describe, it, expect } from 'vitest';
import { render } from 'preact';
import { lazyComponent } from '../src/components/Lazy';

// Verifies the Phase-10 code-splitting mechanism actually works at runtime:
// a lazyComponent should show its placeholder first, then render the resolved
// child after the dynamic import + effect resolve. Guards against the lazy
// helper silently breaking (which would blank out whole Home tabs).

// Wait for the dynamic-import microtask + effect + forced re-render to settle.
// Several awaits because the chain is: effect runs → loader promise resolves →
// force() schedules a re-render → Preact flushes. Each is a separate microtask.
async function settle() {
  for (let i = 0; i < 5; i++) await new Promise<void>(r => setTimeout(r, 0));
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

    await settle();

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
    await settle();
    expect(host.querySelector('.n')?.textContent).toBe('42');
    render(null, host);
    host.remove();
  });
});
