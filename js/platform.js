// 플랫폼 어댑터: 광고·분석·진동·공유. 실제 SDK 연동 지점은 여기 한 곳.
// 광고 SDK(예: AdSense H5 Games Ads, AppLovin, 토스/카카오 게임 SDK)를 붙일 때 Ads.provider만 교체하면 된다.

const dev = {
  // 개발용: 2초 가짜 광고. 실제 SDK는 { ready(): bool, show(): Promise<boolean /*보상 지급 여부*/> }
  ready: () => true,
  show: () => new Promise((res) => setTimeout(() => res(true), 2000)),
};

export const Ads = {
  provider: (typeof window !== 'undefined' && window.DDAKJI_ADS) || dev,
  busy: false,
  get isDev() { return this.provider === dev; },
  canShow() { try { return !this.busy && this.provider.ready(); } catch (e) { return false; } },
  async rewarded(placement) {
    if (!this.canShow()) return false;
    this.busy = true;
    track('ad_rewarded_start', { placement });
    try {
      // SDK가 콜백을 안 주면 30초 뒤 실패 처리 (화면 잠김 방지)
      const ok = await Promise.race([this.provider.show(placement), new Promise((r) => setTimeout(() => r(false), 30000))]);
      track(ok ? 'ad_rewarded_done' : 'ad_rewarded_skip', { placement });
      return !!ok;
    } catch (e) { return false; } finally { this.busy = false; }
  },
};

// 분석: window.dataLayer(GTM/GA4) 와 커스텀 훅 window.DDAKJI_TRACK 으로 전달
export function track(event, props = {}) {
  try {
    if (typeof window === 'undefined') return;
    (window.dataLayer = window.dataLayer || []).push({ event, ...props });
    if (typeof window.DDAKJI_TRACK === 'function') window.DDAKJI_TRACK(event, props);
  } catch (e) { /* 분석 실패는 게임에 영향 없음 */ }
}

let vibOn = true;
export const Haptics = {
  set(on) { vibOn = on; },
  buzz(pattern) {
    try { if (vibOn && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* 무시 */ }
  },
};

export async function share(text) {
  const url = typeof location !== 'undefined' ? location.href.split('?')[0] : '';
  try {
    if (navigator.share) { await navigator.share({ title: '딱지왕 키우기', text, url }); return 'shared'; }
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch (e) { return 'fail'; }
}
