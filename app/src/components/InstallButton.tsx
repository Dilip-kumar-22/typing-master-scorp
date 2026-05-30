import { isInstallable, triggerInstall } from '../hooks/useInstallPrompt';
import { showToast } from '../hooks/useToast';

export function InstallButton() {
  if (!isInstallable.value) return null;

  async function onClick() {
    const outcome = await triggerInstall();
    if (outcome === 'accepted') showToast('Installed — find it on your home screen ✨');
    else if (outcome === 'dismissed') showToast('Install dismissed');
  }

  return (
    <button class="install-btn" onClick={onClick} title="Install Typing Master as an app">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>Install</span>
    </button>
  );
}
