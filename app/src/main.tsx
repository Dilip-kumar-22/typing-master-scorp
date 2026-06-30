import { render } from 'preact';
import { App } from './App';
import { initPwa } from './lib/pwa';
import './styles.css';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app mount point in index.html');
render(<App />, root);
// Hide the SEO landing content the moment the SPA has mounted.
document.body.classList.add('app-ready');
// Register the service worker + wire the "new version available" prompt.
initPwa();
