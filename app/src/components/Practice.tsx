import { mode, tutorialActive } from '../lib/store';
import { PracticeHead } from './PracticeHead';
import { StatsBar } from './StatsBar';
import { TypingCard } from './TypingCard';
import { KeyboardCard } from './KeyboardCard';
import { CustomKeysPanel } from './CustomKeysPanel';
import { TutorialCard } from './TutorialCard';
import { useMobileInput } from '../hooks/useMobileInput';
import { isCompactViewport } from '../lib/device';

export function Practice() {
  const mobileInput = useMobileInput();
  // On compact viewports the 3D heatmap drops below the typing card; on very
  // small viewports we hide it entirely to give the typing area room to breathe.
  return (
    <div class="practice">
      <PracticeHead />
      <StatsBar />
      {tutorialActive.value ? <TutorialCard /> : (
        <>
          {mobileInput}
          <TypingCard />
          {mode.value.id === 'custom-set' && <CustomKeysPanel />}
          {!isCompactViewport.value && <KeyboardCard />}
        </>
      )}
    </div>
  );
}
