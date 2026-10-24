// 전역 앱 컨텍스트: 세이브, 씬 전환, 사운드·진동 설정 반영. 씬 모듈들이 공유한다.
import { load, save, wipe, defaults } from './save.js?v=1792845490';
import { Sound } from './audio.js?v=1792845490';
import { Haptics, track } from './platform.js?v=1792845490';
import { FX } from './gfx.js?v=1792845490';

export const App = {
  S: load(),
  scenes: {},
  scene: null,
  sceneName: '',
  next: null,          // 전환 대기 {name, params}
  fade: 0,             // 0~1 (1 = 완전 암전)
  fadeDir: 0,
  fx: new FX(),
  t: 0,
  persist() { save(this.S); },
  applySettings() {
    const st = this.S.settings;
    Sound.setSfx(st.sfx); Sound.setMusic(st.music); Haptics.set(st.vib);
  },
  go(name, params = {}) {
    if (this.fadeDir === 1) return;
    this.next = { name, params };
    if (!this.scene) { this.fade = 1; this.fadeDir = -1; this._enter(); return; }
    this.fadeDir = 1;
  },
  _enter() {
    const { name, params } = this.next; this.next = null;
    this.scene?.exit?.();
    this.scene = this.scenes[name]; this.sceneName = name;
    this.fx = new FX();
    this.scene.enter?.(params);
    track('screen', { name });
  },
  updateFade(dt) {
    if (this.fadeDir === 1) { this.fade = Math.min(1, this.fade + dt * 5); if (this.fade >= 1) { this._enter(); this.fadeDir = -1; } }
    else if (this.fadeDir === -1) { this.fade = Math.max(0, this.fade - dt * 4); if (this.fade <= 0) this.fadeDir = 0; }
  },
  resetAll() { wipe(); this.S = defaults(); this.persist(); this.applySettings(); },
};
