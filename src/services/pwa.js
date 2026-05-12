export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    const swUrl = new URL('sw.js', window.location.href);
    const scope = new URL('./', window.location.href);
    navigator.serviceWorker.register(swUrl, { scope }).catch(() => {});
  });
}

export function isMobileDevice() {
  return window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
}

export function isStandaloneApp() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    localStorage.getItem('ad-suzano-pwa-installed') === 'true'
  );
}
