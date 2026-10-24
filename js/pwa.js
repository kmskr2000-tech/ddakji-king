// PWA 보조: 서비스워커 등록 + 설치 프롬프트 캡처. 의존성 없음.
export function registerSW() {
  try {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    const ok = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!ok) return Promise.resolve(null);
    return navigator.serviceWorker.register('./sw.js').catch(() => null);
  } catch (_) {
    return Promise.resolve(null);
  }
}

export function setupInstallPrompt() {
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
  });
  window.addEventListener('appinstalled', () => { deferred = null; });
  return {
    canInstall() { return !!deferred; },
    async prompt() {
      if (!deferred) return false;
      const ev = deferred;
      deferred = null;
      try {
        await ev.prompt();
        const choice = await ev.userChoice;
        return !!choice && choice.outcome === 'accepted';
      } catch (_) {
        return false;
      }
    },
  };
}
