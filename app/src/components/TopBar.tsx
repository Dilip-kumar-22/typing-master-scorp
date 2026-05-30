import { Icon, ICON_PATHS } from '../lib/icons';
import { settings, drawerOpen, updateSetting, goHome } from '../lib/store';
import { UserMenu } from './UserMenu';
import { InstallButton } from './InstallButton';
import { t } from '../lib/i18n';

export function TopBar() {
  const s = settings.value;
  return (
    <header class="topbar" role="banner">
      <button
        class="brand"
        onClick={goHome}
        aria-label={t('goHome')}
      >
        <div class="brand-mark" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="6" width="20" height="14" rx="3" />
            <line x1="6" y1="10" x2="6" y2="10" /><line x1="10" y1="10" x2="10" y2="10" />
            <line x1="14" y1="10" x2="14" y2="10" /><line x1="18" y1="10" x2="18" y2="10" />
            <line x1="7" y1="15" x2="17" y2="15" />
          </svg>
        </div>
        <div class="brand-title">
          <div class="t1">{t('brandName')}</div>
          <div class="t2">{t('brandTag')}</div>
        </div>
      </button>
      <div class="topbar-actions" role="toolbar" aria-label={t('settingsTitle')}>
        <div class="theme-toggle" role="group" aria-label={t('settingTheme')}>
          <button
            class={s.theme === 'light' ? 'on' : ''}
            aria-label={t('themeLight')}
            aria-pressed={s.theme === 'light'}
            onClick={() => updateSetting('theme', 'light')}
          >
            <Icon paths={ICON_PATHS.sun} size={14} />
          </button>
          <button
            class={s.theme === 'dark' ? 'on' : ''}
            aria-label={t('themeDark')}
            aria-pressed={s.theme === 'dark'}
            onClick={() => updateSetting('theme', 'dark')}
          >
            <Icon paths={ICON_PATHS.moon} size={14} />
          </button>
        </div>
        <InstallButton />
        <UserMenu />
        <button
          class={'icon-btn' + (drawerOpen.value ? ' is-active' : '')}
          aria-label={t('openSettings')}
          aria-expanded={drawerOpen.value}
          aria-controls="settings-drawer"
          onClick={() => { drawerOpen.value = true; }}
        >
          <Icon paths={ICON_PATHS.gear} />
        </button>
      </div>
    </header>
  );
}
