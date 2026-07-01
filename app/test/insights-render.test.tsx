import { describe, it, expect } from 'vitest';
import { render } from 'preact';
import { history, keyStats } from '../src/lib/store';
import { InsightsPanel } from '../src/components/InsightsPanel';

describe('InsightsPanel renders with data', () => {
  it('renders KPIs, weak keys, fingers, and a recommendation', () => {
    history.value = [
      {date:1,modeId:'lesson-1',modeLabel:'C1',wpm:38,acc:91,time:40},
      {date:2,modeId:'lesson-2',modeLabel:'C2',wpm:53,acc:96,time:34},
    ];
    keyStats.value = {
      k:{presses:120,errors:14}, ';':{presses:40,errors:12}, f:{presses:210,errors:3},
    };
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(<InsightsPanel />, host);
    const html = host.innerHTML;
    expect(host.querySelector('.insights')).not.toBeNull();
    expect(host.querySelectorAll('.ins-kpi').length).toBe(5);
    expect(host.querySelector('.ins-reco p')?.textContent?.length).toBeGreaterThan(10);
    expect(host.querySelectorAll('.ins-key').length).toBeGreaterThan(0); // weak keys listed
    expect(host.querySelectorAll('.ins-finger').length).toBeGreaterThan(0); // fingers listed
    render(null, host); host.remove();
  });

  it('renders nothing when there is no history', () => {
    history.value = [];
    keyStats.value = {};
    const host = document.createElement('div');
    render(<InsightsPanel />, host);
    expect(host.querySelector('.insights')).toBeNull();
    render(null, host);
  });
});
