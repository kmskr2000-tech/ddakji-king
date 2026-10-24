// 대결 씬: 가위바위보 → 번갈아 치기. 내 차례 = 조준·차지·발사, 상대 차례 = 타이밍 맞춰 버티기.
import { Level, Aim, Charge, rollAimParams, effectiveStats, judge, radii, requiredPower } from './aim.js?v=1792845191';
import { aiStrike, judgeWithBlock, blockGrade } from './ai.js?v=1792845191';
import { OPP_BY_ID, REGIONS, DDAKJI_BY_ID, ITEM_INFO, guardMul } from './data.js?v=1792845191';
import { battleStats, playerGuard, equippedDdakji } from './game.js?v=1792845191';
import { App } from './app.js?v=1792845191';
import { UI, view, ease } from './ui.js?v=1792845191';
import { drawDdakji, drawKid, background, text, rr, itemIcon, star } from './gfx.js?v=1792845191';
import { Sound } from './audio.js?v=1792845191';
import { Haptics, track } from './platform.js?v=1792845191';

export const ME_LOOK = { skin: '#ffd9b8', hair: '#2b1d14', hs: 1, shirt: '#ff6b5b', acc: 'none', age: 'kid' };
const DS = 80;                    // 딱지 반변(px). 판정 원 반경 CFG.ddakjiR(100) 근사
const THROW_T = 0.32;
const RPS = ['✊', '✌', '✋'];

let B = null; // 현재 대결 상태

const auto = () => (typeof window !== 'undefined' && window.__ddakji?.auto);

function newAim() {
  const a = new Aim(rollAimParams(B.stats), { x: B.cx, y: B.cy });
  a.step(Math.random() * 3, false);
  return a;
}

export const BattleScene = {
  ownFx: true,
  enter({ opp, oppObj, item = '' }) {
    const S = App.S;
    const o = oppObj || OPP_BY_ID[opp];
    const R = REGIONS[o.region - 1];
    if (item && (S.items[item] || 0) > 0) { S.items[item]--; App.persist(); } else item = '';
    const stats = battleStats(S, item);
    const cx = view.W / 2, cy = Math.round(view.H * 0.47);
    const tutorial = !S.tutorial && o.n === 0;
    B = {
      o, R, item, stats, cx, cy, tutorial,
      me: { stats, hasTape: item === 'tape', tapeUsed: false },
      ai: { stats: effectiveStats(o.stats, ''), hasTape: false, tapeUsed: false },
      myD: DDAKJI_BY_ID[S.equipped] ? equippedDdakji(S) : DDAKJI_BY_ID.starter,
      oppDk: DDAKJI_BY_ID[o.ddakji],
      oppDef: { x: cx, y: cy, tiltStacks: item === 'fan' ? 1 : 0, guard: guardMul(DDAKJI_BY_ID[o.ddakji].guard) },
      myDef: { x: cx, y: cy, tiltStacks: 0, guard: playerGuard(S) },
      myLives: o.lives, oppLives: o.lives, maxLives: o.lives,
      round: 0, turn: 'me', state: 'intro', t: 0,
      aim: null, charge: new Charge(item === 'ironHand'),
      strike: null, res: null, rps: null,
      flips: 0, crits: 0, perfect: 0, taken: 0,
      wobble: 0, flipAnim: null, block: null, oppShot: null, tapT: null,
      hint: tutorial ? 'press' : null, paused: false, gustT: Math.random() * 10,
      mood: 'normal', moodT: 0,
    };
    B.aim = newAim();
    Sound.playMusic(o.boss ? 'boss' : 'battle');
    track('battle_start', { opp: o.id, item, boss: o.boss });
  },
  exit() { Sound.stopCharge(); },

  setMood(m, t = 1.2) { B.mood = m; B.moodT = t; },

  // ── 입력 ──
  down() {
    if (!B || B.paused) return;
    if (B.state === 'aim' && B.turn === 'me') {
      B.state = 'charge'; B.charge.press(); Sound.startCharge();
      if (B.hint === 'press') B.hint = 'release';
    } else if (B.state === 'oppWind' && B.tapT == null) {
      B.tapT = B.t;
      Sound.play('tap');
    } else if (B.state === 'intro' && B.t > 0.5) B.t = 99;
  },
  up() {
    if (!B || B.state !== 'charge') return;
    const power = B.charge.release();
    Sound.stopCharge();
    B.strike = { x: B.aim.x, y: B.aim.y, power, t: 0 };
    B.state = 'throw'; B.t = 0;
    Sound.play('whoosh');
    if (B.hint === 'release') B.hint = null;
  },
  key(e, isDown) {
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault?.(); if (isDown && !e.repeat) this.down(); else if (!isDown) this.up(); }
    if (e.code === 'Escape' && isDown) B.paused = !B.paused;
  },
  blur() { if (B && !['end'].includes(B.state)) { if (B.state === 'charge') this.up(); B.paused = true; } },

  // ── 진행 ──
  nextTurn() {
    B.turn = B.turn === 'me' ? 'opp' : 'me';
    if (B.turn === B.first) B.round++;
    B.state = 'banner'; B.t = 0; B.res = null;
    Sound.play('turn');
  },
  startTurn() {
    B.t = 0;
    if (B.turn === 'me') {
      B.state = 'aim'; B.aim.charging = false; B.block = null;
    } else {
      const sh = aiStrike(B.tutorial ? 0.05 : B.o.skill, B.myDef.tiltStacks);
      B.oppShot = sh;
      B.windT = 1.15 + Math.random() * 0.55;   // 착탄까지 시간 (매번 달라 외우기 불가)
      B.tapT = null; B.block = null;
      B.state = 'oppWind';
      if (B.tutorial && !B.blockHinted) { B.hint = 'block'; B.blockHinted = true; }
    }
  },
  suddenMul() { return B.round > 6 ? 1 + 0.15 * (B.round - 6) : 1; },

  resolveMine() {
    const d = B.oppDef;
    const g0 = d.guard; d.guard = g0 * this.suddenMul();
    const r = judge(B.strike.x, B.strike.y, B.strike.power, B.me, d);
    d.guard = g0;
    r.power = B.strike.power;
    this.react(r, 'me');
  },
  resolveOpp() {
    const sh = B.oppShot, d = B.myDef;
    const grade = B.tapT == null ? 'fail' : blockGrade(B.tapT - B.windT);
    B.block = grade;
    const g0 = d.guard; d.guard = g0 * this.suddenMul();
    const r = judgeWithBlock(B.cx + sh.dx, B.cy + sh.dy, sh.power, B.ai, d, grade);
    d.guard = g0;
    B.strike = { x: B.cx + sh.dx, y: B.cy + sh.dy, power: sh.power, t: THROW_T };
    if (grade === 'perfect') { App.S.record.perfectBlocks++; B.perfect++; }
    this.react(r, 'opp');
  },
  react(r, who) {
    B.res = r; B.state = 'react'; B.t = 0;
    const fx = App.fx, x = B.strike.x, y = B.strike.y;
    const pw = B.strike.power;
    fx.kick(6 + pw * 10);
    fx.burst(x, y, { n: 10 + pw * 10, colors: ['#d8cbb8', '#a89a88', '#fff'], speed: 160 + pw * 120, life: 0.5, size: 4, grav: 300 });
    Sound.play('hit', { vol: 0.5 + pw * 0.5 });
    B.hitstop = 0.07;
    const mine = who === 'me';
    if (!mine && (r.blocked || B.block === 'perfect')) { Sound.play('blockPerfect'); fx.float('완벽하게 버텼다!', B.cx, B.cy - 150, { color: '#7bd6ff', size: 30 }); fx.burst(B.cx, B.cy, { n: 24, colors: ['#9be8ff', '#fff'], speed: 260, shape: 'star', size: 6, grav: 0 }); Haptics.buzz(20); }
    else if (B.block === 'good' && !mine) { Sound.play('block'); fx.float('버티기!', B.cx, B.cy - 150, { color: '#bfe9ff', size: 26 }); }
    if (r.crit) { B.crits += mine ? 1 : 0; Sound.play('crit'); fx.burst(x, y, { n: 18, colors: ['#ffe066', '#fff'], shape: 'star', size: 7, speed: 300, grav: 100 }); fx.float('크리티컬!', x, y - 50, { color: '#ffe066', size: 30 }); }
    if (r.level === Level.FLIP) {
      B.flipAnim = { t: 0, who };
      Sound.play('flip'); fx.blink('#fff', 0.5); fx.kick(18);
      Haptics.buzz([30, 40, 70]);
      if (mine) { B.flips++; B.oppLives--; this.setMood('sad', 2); }
      else { B.myLives--; this.setMood('happy', 2); }
    } else if (r.level === Level.INNER) {
      B.wobble = 1; Sound.play('inner'); Haptics.buzz(15);
      if (mine && !r.crit) this.setMood('shock');
    } else if (r.level === Level.MISS) { Sound.play('miss'); if (mine) this.setMood('happy', 0.8); }
    else { Sound.play('whiff'); fx.burst(x, y, { n: 8, colors: ['#fff'], speed: 90, life: 0.4, grav: 0 }); if (mine) this.setMood('happy'); }
    if (mine && r.gated) fx.float('파워 부족!', B.cx, B.cy + 140, { color: '#ff8a7a', size: 24 });
  },
  reactDur() {
    const r = B.res;
    return r.level === Level.FLIP ? 2.0 : r.level === Level.INNER ? 1.05 : 0.85;
  },
  afterReact() {
    if (B.oppLives <= 0 || B.myLives <= 0) {
      B.state = 'end'; B.t = 0;
      const win = B.oppLives <= 0;
      B.win = win;
      if (win) { Sound.play('win'); App.fx.confetti(view.W, 90); this.setMood('sad', 9); } else { Sound.play('lose'); this.setMood('happy', 9); }
      return;
    }
    if (B.res.level === Level.FLIP) {
      // 새 딱지 깔기
      if (B.flipAnim.who === 'me') B.oppDef.tiltStacks = 0; else B.myDef.tiltStacks = 0;
      App.fx.float('새 딱지를 깔았다!', B.cx, B.cy - 120, { color: '#fff', size: 22 });
    }
    B.flipAnim = null;
    if (B.turn === 'me') B.aim = newAim();
    this.nextTurn();
  },

  update(dt) {
    if (!B || B.paused) return;
    if (B.hitstop > 0) { B.hitstop -= dt; return; }
    B.t += dt; B.gustT += dt;
    if (B.moodT > 0) { B.moodT -= dt; if (B.moodT <= 0) B.mood = 'normal'; }
    B.wobble = Math.max(0, B.wobble - dt * 1.4);
    const A = auto();
    switch (B.state) {
      case 'intro':
        if (B.t > 2.2) { B.state = 'rps'; B.t = 0; B.rps = null; }
        break;
      case 'rps': {
        if (!B.rps && B.t > 1.1) {
          // 가위바위보: 비기면 다시. 튜토리얼은 내가 선공
          let a, b;
          do { a = (Math.random() * 3) | 0; b = (Math.random() * 3) | 0; } while (a === b);
          let meWin = (a - b + 3) % 3 === 2;
          if (B.tutorial && !meWin) { [a, b] = [b, a]; meWin = true; }
          B.rps = { a, b, meWin, t: B.t };
          B.first = meWin ? 'me' : 'opp';
          Sound.play(meWin ? 'coin' : 'tick');
        }
        if (B.rps && B.t - B.rps.t > 1.3) { B.turn = B.first; B.round = 1; B.state = 'banner'; B.t = 0; Sound.play('turn'); }
        break;
      }
      case 'banner':
        if (B.t > 0.95) this.startTurn();
        break;
      case 'aim': case 'charge': {
        const g = B.R.gust;
        if (g) B.aim.gust = { x: g * (Math.sin(B.gustT * 0.9) * 22 + Math.sin(B.gustT * 2.3) * 8), y: g * Math.cos(B.gustT * 0.7) * 9 };
        B.aim.step(dt, B.state === 'charge');
        B.charge.update(dt);
        if (B.state === 'charge') Sound.setCharge(B.charge.power);
        if (A) {
          const d = Math.hypot(B.aim.x - B.cx, B.aim.y - B.cy);
          if (B.state === 'aim' && B.t > 0.2) this.down();
          else if (B.state === 'charge' && ((B.charge.power >= 0.8 && d < 24) || B.charge.t > 3)) this.up();
        }
        if (g && Math.random() < dt * 6) App.fx.burst(-10, 120 + Math.random() * view.H * 0.6, { n: 1, colors: ['rgba(255,255,255,.7)', '#c8e6a0'], speed: 260 * g, dir: 0, spread: 0.3, grav: 0, life: 2.2, size: 5, shape: 'paper' });
        break;
      }
      case 'throw':
        B.strike.t += dt;
        if (B.strike.t >= THROW_T) this.resolveMine();
        break;
      case 'oppWind':
        if (A && B.tapT == null && B.t >= B.windT - 0.02) this.down();
        if (B.t >= B.windT) this.resolveOpp();
        break;
      case 'react':
        if (B.flipAnim) B.flipAnim.t += dt;
        if (B.t >= this.reactDur()) this.afterReact();
        break;
      case 'end':
        if (B.t > 2.4) {
          App.go('result', { opp: B.o.id, oppObj: B.o.endless ? B.o : undefined, win: B.win, flips: B.flips, crits: B.crits, perfect: B.perfect, item: B.item });
          B.state = 'done';
        }
        break;
    }
  },

  // ── 그리기 ──
  draw(ctx) {
    const { W, H } = view;
    background(ctx, B.R, W, H, view.scale);
    const [ox, oy] = App.fx.offset();
    ctx.save(); ctx.translate(ox, oy);
    this.drawHud(ctx);
    this.drawField(ctx);
    ctx.restore();
    App.fx.draw(ctx);
    this.drawOverlay(ctx);
    App.fx.drawFlash(ctx, W, H);
    // 일시정지 버튼
    if (!B.paused && B.state !== 'end' && B.state !== 'done') UI.button('pause', W - 54, 76, 44, 40, 'Ⅱ', { color: '#ffffff', size: 20, radius: 12, onClick: () => { if (B.state === 'charge') this.up(); B.paused = true; } });
    if (B.paused) this.drawPause(ctx);
  },

  drawHud(ctx) {
    const { W, H } = view;
    // 상대 패널
    const oppTurn = B.turn === 'opp' && ['banner', 'oppWind', 'react'].includes(B.state);
    ctx.fillStyle = 'rgba(20,12,30,.5)'; rr(ctx, 8, 8, W - 16, 64, 16); ctx.fill();
    let bob = 0;
    if (B.state === 'oppWind') { const k = Math.min(1, B.t / B.windT); bob = -Math.sin(k * Math.PI) * 6; }
    drawKid(ctx, B.o.look, 44, 36 + bob, 22, B.mood, App.t);
    text(ctx, B.o.name, 76, 28, { size: 19, align: 'left', color: '#fff', stroke: '#2b1d14', sw: 4, maxW: 200 });
    text(ctx, B.o.endless ? `무한 도장깨기 · ${App.S.endless.streak}연승 중` : B.o.boss ? `★ 보스 · ${B.R.name}` : B.R.name, 76, 52, { size: 13, align: 'left', color: '#ffd9a0' });
    this.drawLives(ctx, W - 22, 40, B.oppLives, B.maxLives, B.oppDk, -1);
    if (oppTurn) { ctx.strokeStyle = '#ff6b5b'; ctx.lineWidth = 3; rr(ctx, 8, 8, W - 16, 64, 16); ctx.stroke(); }
    // 라운드
    if (B.round > 0) {
      text(ctx, `ROUND ${B.round}`, W / 2, 94, { size: 18, color: B.round > 6 ? '#ff6b5b' : '#fff', stroke: '#2b1d14', sw: 4 });
      if (B.round > 6) text(ctx, '결전! 판정 범위 증가', W / 2, 116, { size: 13, color: '#ffd447', stroke: '#2b1d14', sw: 3 });
    }
    if (B.R.gust) { text(ctx, '돌풍 주의 ≋', 14, 94, { size: 15, align: 'left', color: '#bfe9ff', stroke: '#2b1d14', sw: 3 }); }
    // 내 패널
    const py = H - 72;
    const myTurn = B.turn === 'me' && ['banner', 'aim', 'charge', 'throw', 'react'].includes(B.state);
    ctx.fillStyle = 'rgba(20,12,30,.5)'; rr(ctx, 8, py, W - 16, 64, 16); ctx.fill();
    if (myTurn) { ctx.strokeStyle = '#ffd447'; ctx.lineWidth = 3; rr(ctx, 8, py, W - 16, 64, 16); ctx.stroke(); }
    drawKid(ctx, ME_LOOK, 44, py + 28, 22, B.mood === 'happy' ? 'sad' : B.mood === 'sad' ? 'happy' : 'normal', App.t + 3);
    text(ctx, '나', 76, py + 22, { size: 19, align: 'left', color: '#fff', stroke: '#2b1d14', sw: 4 });
    const s = B.stats;
    text(ctx, `힘${s.str} 집중${s.focus} 운${s.luck}`, 76, py + 46, { size: 13, align: 'left', color: '#ffe0b0' });
    if (B.item) { itemIcon(ctx, B.item, 186, py + 32, 13); text(ctx, ITEM_INFO[B.item].name + (B.item === 'tape' && B.me.tapeUsed ? '(사용)' : ''), 202, py + 33, { size: 12, align: 'left', color: '#fff', maxW: 80 }); }
    this.drawLives(ctx, W - 22, py + 32, B.myLives, B.maxLives, B.myD, -1);
  },
  drawLives(ctx, x, y, n, max, d, dir) {
    for (let i = 0; i < max; i++) {
      const lx = x + dir * i * 30;
      drawDdakji(ctx, d, lx, y, 11, { shadow: false, alpha: i < n ? 1 : 0.25, rot: -0.15 });
    }
  },

  activeTarget() {
    // 지금 맞고 있는(또는 다음에 맞을) 딱지
    const mineHit = B.turn === 'me';
    return mineHit ? { d: B.oppDk, def: B.oppDef } : { d: B.myD, def: B.myDef };
  },

  drawField(ctx) {
    const { W, H } = view;
    const { cx, cy } = B;
    const tg = this.activeTarget();
    const showTarget = !['intro', 'rps'].includes(B.state);
    // 대상 딱지
    if (showTarget) {
      let lift = 0, flip = 1, rot = -0.06 + tg.def.tiltStacks * 0.08, x = cx, y = cy, alpha = 1;
      if (B.wobble > 0) rot += Math.sin(B.wobble * 26) * 0.12 * B.wobble;
      if (B.flipAnim) {
        const k = B.flipAnim.t;
        if (k < 0.9) { const e = k / 0.9; lift = Math.sin(e * Math.PI) * 130; flip = Math.cos(e * Math.PI * 3); rot += e * 2.2; }
        else { flip = -1; rot += 2.2; const e = Math.min(1, (k - 1.25) / 0.5); if (e > 0) { y += (B.flipAnim.who === 'me' ? -1 : 1) * ease.inOut(e) * (H * 0.4); alpha = 1 - e * 0.7; } }
        if (k > 0.9 && !B.flipAnim.landed) { B.flipAnim.landed = true; App.fx.burst(cx, cy, { n: 30, colors: ['#ffd447', '#fff', '#ff6b5b'], speed: 340, shape: 'star', size: 7, grav: 200 }); App.fx.kick(10); Sound.play('hit', { vol: 0.6 }); }
      }
      if (B.state === 'banner' && B.t < 0.35) { const e = ease.outBack(B.t / 0.35); alpha = e; lift = (1 - e) * 40; }
      drawDdakji(ctx, tg.d, x, y, DS, { rot, flip, lift, tilt: B.flipAnim ? 0 : tg.def.tiltStacks, alpha, glow: B.flipAnim ? '#ffe066' : null });
      if (tg.def.tiltStacks > 0 && !B.flipAnim) {
        for (let i = 0; i < tg.def.tiltStacks; i++) text(ctx, '들썩', cx + DS + 2, cy - DS + 10 + i * 20, { size: 14, color: '#ffd447', stroke: '#2b1d14', sw: 3, align: 'left' });
      }
    }
    // 판정 가이드 (내 차례 조준 중)
    if (B.turn === 'me' && (B.state === 'aim' || B.state === 'charge')) {
      const pw = B.state === 'charge' ? B.charge.power : 1;
      const r = radii(B.stats, pw, B.oppDef.tiltStacks, B.oppDef.guard * this.suddenMul());
      ctx.save(); ctx.translate(cx, cy);
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,230,102,.95)'; ctx.beginPath(); ctx.arc(0, 0, r.bull, 0, 7); ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(0, 0, r.inner, 0, 7); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
      // 조준점
      const ax = B.aim.x, ay = B.aim.y, ch = B.state === 'charge';
      const col = ch ? (B.charge.power >= requiredPower(B.oppDef.tiltStacks) ? '#ffd447' : '#ff5d5d') : '#ffffff';
      const pulse = ch ? 1 + Math.sin(App.t * 30) * 0.08 : 1;
      ctx.save(); ctx.translate(ax, ay); ctx.scale(pulse, pulse);
      ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 6; this.reticle(ctx);
      ctx.strokeStyle = col; ctx.lineWidth = 3; this.reticle(ctx);
      ctx.restore();
    }
    // 내가 던진 딱지 비행
    if (B.turn === 'me' && (B.state === 'throw' || (B.state === 'react' && B.t < 0.5))) {
      const k = B.state === 'throw' ? B.strike.t / THROW_T : 1;
      const e = ease.out(k);
      const sx = cx, sy = H + 40;
      const x = sx + (B.strike.x - sx) * e, y = sy + (B.strike.y - sy) * e - Math.sin(k * Math.PI) * 90;
      const size = 54 - 22 * e;
      const a = B.state === 'react' ? Math.max(0, 1 - B.t / 0.5) : 1;
      drawDdakji(ctx, B.myD, x, y, size, { rot: k * 9, flip: Math.cos(k * 5), lift: B.state === 'throw' ? (1 - k) * 60 : 0, alpha: a });
    }
    // 상대 차례: 하늘에서 떨어지는 딱지 + 버티기 링
    if (B.turn === 'opp' && B.state === 'oppWind') {
      const k = Math.min(1, B.t / B.windT);
      const tx = cx + B.oppShot.dx, ty = cy + B.oppShot.dy;
      const ringR = DS + (1 - k) * 210;
      const okP = Math.abs(B.t - B.windT) <= 0.16;
      ctx.lineWidth = 6; ctx.strokeStyle = B.tapT != null ? 'rgba(160,160,160,.6)' : okP ? '#7bd6ff' : 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, 7); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(123,214,255,.8)'; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.arc(cx, cy, DS + 4, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      // 떨어지는 상대 딱지 (위에서 아래로)
      const e = ease.inOut(k);
      const fx = cx + (tx - cx) * e, fy = 40 + (ty - 40) * e - Math.sin(k * Math.PI) * 60;
      drawDdakji(ctx, B.oppDk, fx, fy, 50 - 18 * e, { rot: -k * 8, flip: Math.cos(k * 6), alpha: 0.95 });
      if (B.tapT == null) text(ctx, '고리가 겹칠 때 터치! 버티기', cx, cy + DS + 70, { size: 20, color: '#bfe9ff', stroke: '#2b1d14', sw: 4 });
      else text(ctx, '버티는 중…', cx, cy + DS + 70, { size: 20, color: '#ddd', stroke: '#2b1d14', sw: 4 });
    }
    // 차지 게이지 (내 차례)
    if (B.turn === 'me' && ['banner', 'aim', 'charge', 'throw', 'react'].includes(B.state)) this.drawGauge(ctx);
  },
  reticle(ctx) {
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-5, 0); ctx.moveTo(14, 0); ctx.lineTo(5, 0); ctx.moveTo(0, -14); ctx.lineTo(0, -5); ctx.moveTo(0, 14); ctx.lineTo(0, 5); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.stroke();
  },
  drawGauge(ctx) {
    const { W, H } = view;
    const gx = 40, gy = H - 150, gw = W - 80, gh = 24;
    const req = requiredPower(B.oppDef.tiltStacks);
    const p = B.state === 'charge' ? B.charge.power : B.strike && B.state !== 'aim' ? B.strike.power : 0;
    ctx.fillStyle = 'rgba(20,12,30,.75)'; rr(ctx, gx - 4, gy - 4, gw + 8, gh + 8, 14); ctx.fill();
    if (p > 0) {
      const g = ctx.createLinearGradient(gx, 0, gx + gw, 0);
      g.addColorStop(0, '#ff8a5b'); g.addColorStop(req, '#ff5d5d'); g.addColorStop(Math.min(1, req + 0.01), '#ffd447'); g.addColorStop(1, '#fff2a8');
      ctx.fillStyle = g; rr(ctx, gx, gy, Math.max(gh, gw * p), gh, 11); ctx.fill();
      if (p >= 1 && B.state === 'charge') { ctx.globalAlpha = 0.4 + Math.sin(App.t * 20) * 0.3; ctx.fillStyle = '#fff'; rr(ctx, gx, gy, gw, gh, 11); ctx.fill(); ctx.globalAlpha = 1; }
    }
    const mx = gx + gw * req;
    ctx.fillStyle = '#ffd447'; ctx.fillRect(mx - 2, gy - 8, 4, gh + 16);
    ctx.beginPath(); ctx.moveTo(mx, gy + gh + 6); ctx.lineTo(mx - 7, gy + gh + 17); ctx.lineTo(mx + 7, gy + gh + 17); ctx.closePath(); ctx.fill();
    text(ctx, `뒤집기 ${Math.round(req * 100)}%`, Math.min(W - 60, Math.max(60, mx)), gy + gh + 30, { size: 14, color: '#ffd447', stroke: '#2b1d14', sw: 3 });
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; rr(ctx, gx, gy, gw, gh, 11); ctx.stroke();
    const label = B.state === 'charge' ? `파워 ${(p * 100) | 0}%` : B.state === 'aim' ? '꾹 눌러서 힘 모으기 → 손 떼면 발사!' : '';
    if (label) text(ctx, label, W / 2, gy - 22, { size: 18, color: '#fff', stroke: '#2b1d14', sw: 4 });
  },

  drawOverlay(ctx) {
    const { W, H } = view;
    const t = B.t;
    if (B.state === 'intro') {
      const k = Math.min(1, t / 0.5);
      ctx.fillStyle = `rgba(10,6,20,${0.55 * k})`; ctx.fillRect(0, 0, W, H);
      const e = ease.outBack(Math.min(1, t / 0.6));
      // 상대 (위)
      ctx.save(); ctx.translate((1 - e) * W, 0);
      ctx.fillStyle = B.R.accent; ctx.beginPath(); ctx.moveTo(0, H * 0.14); ctx.lineTo(W, H * 0.1); ctx.lineTo(W, H * 0.42); ctx.lineTo(0, H * 0.46); ctx.fill();
      drawKid(ctx, B.o.look, W * 0.72, H * 0.27, 62, 'angry', App.t);
      text(ctx, B.o.name, W * 0.36, H * 0.24, { size: 28, color: '#fff', stroke: '#2b1d14', sw: 6, maxW: W * 0.6 });
      text(ctx, `“${B.o.quote}”`, W * 0.36, H * 0.31, { size: 17, color: '#fff8e0', stroke: '#2b1d14', sw: 4, maxW: W * 0.62 });
      if (B.o.boss) text(ctx, '★ BOSS ★', W * 0.36, H * 0.18, { size: 20, color: '#ffe066', stroke: '#2b1d14', sw: 4 });
      ctx.restore();
      // 나 (아래)
      ctx.save(); ctx.translate(-(1 - e) * W, 0);
      ctx.fillStyle = '#ff6b5b'; ctx.beginPath(); ctx.moveTo(0, H * 0.56); ctx.lineTo(W, H * 0.52); ctx.lineTo(W, H * 0.84); ctx.lineTo(0, H * 0.88); ctx.fill();
      drawKid(ctx, ME_LOOK, W * 0.28, H * 0.69, 62, 'normal', App.t);
      text(ctx, '나', W * 0.64, H * 0.66, { size: 30, color: '#fff', stroke: '#2b1d14', sw: 6 });
      text(ctx, B.myD.name, W * 0.64, H * 0.72, { size: 18, color: '#fff8e0', stroke: '#2b1d14', sw: 4, maxW: W * 0.5 });
      ctx.restore();
      const vs = ease.outBack(Math.max(0, Math.min(1, (t - 0.4) / 0.4)));
      text(ctx, 'VS', W / 2, H * 0.49, { size: 72 * vs, color: '#ffe066', stroke: '#2b1d14', sw: 8 });
      if (B.item) text(ctx, `${ITEM_INFO[B.item].name} 사용!`, W / 2, H * 0.92, { size: 18, color: '#fff', stroke: '#2b1d14', sw: 4 });
      if (B.maxLives > 1) text(ctx, `딱지 ${B.maxLives}장 승부`, W / 2, H * 0.555, { size: 18, color: '#fff', stroke: '#2b1d14', sw: 4 });
    }
    if (B.state === 'rps') {
      ctx.fillStyle = 'rgba(10,6,20,.55)'; ctx.fillRect(0, 0, W, H);
      text(ctx, '가위 바위 보!', W / 2, H * 0.3, { size: 40, color: '#fff', stroke: '#2b1d14', sw: 7 });
      const cyc = (Math.floor(t * 12)) % 3;
      const a = B.rps ? B.rps.a : cyc, b = B.rps ? B.rps.b : (cyc + 1) % 3;
      text(ctx, RPS[b], W / 2, H * 0.42, { size: 80 });
      text(ctx, RPS[a], W / 2, H * 0.6, { size: 80 });
      text(ctx, B.o.name, W / 2, H * 0.36 - 40, { size: 16, color: '#ffd9a0' });
      text(ctx, '나', W / 2, H * 0.67, { size: 18, color: '#ffd9a0' });
      if (B.rps) { const e = ease.outBack(Math.min(1, (t - B.rps.t) / 0.35)); text(ctx, B.rps.meWin ? '내가 먼저!' : '상대가 먼저!', W / 2, H * 0.78, { size: 34 * e, color: B.rps.meWin ? '#ffe066' : '#ff8a7a', stroke: '#2b1d14', sw: 6 }); }
    }
    if (B.state === 'banner') {
      const e = t < 0.25 ? ease.outBack(t / 0.25) : t > 0.75 ? Math.max(0, 1 - (t - 0.75) / 0.2) : 1;
      const mine = B.turn === 'me';
      ctx.globalAlpha = Math.min(1, e);
      ctx.fillStyle = mine ? 'rgba(255,190,40,.92)' : 'rgba(230,70,60,.92)';
      ctx.fillRect(0, H * 0.24, W, 64);
      text(ctx, mine ? '내 차례!' : `${B.o.name}의 차례!`, W / 2, H * 0.24 + 33, { size: 32 * Math.min(1.1, e), color: '#fff', stroke: '#2b1d14', sw: 6, maxW: W - 30 });
      ctx.globalAlpha = 1;
    }
    if (B.state === 'react' && B.res) {
      const r = B.res, mine = B.turn === 'me';
      const e = ease.outBack(Math.min(1, t / 0.3));
      let msg, col;
      if (r.level === Level.FLIP) { msg = mine ? '뒤집었다!' : '뒤집혔다…'; col = mine ? '#ffe066' : '#ff8a7a'; }
      else if (r.level === Level.INNER) { msg = mine ? (r.crit ? '들썩! (크리티컬)' : '들썩! 기울어짐') : '들썩였다!'; col = '#ffb36b'; }
      else if (r.level === Level.MISS) { msg = mine ? '꿈쩍도 안 한다' : '휴, 끄떡없다'; col = '#d0d4e4'; }
      else { msg = mine ? '헛스윙!' : '상대 헛스윙!'; col = '#d0d4e4'; }
      if (r.level === Level.INNER && mine && r.gated) msg = '파워 부족! 들썩만';
      text(ctx, msg, W / 2, H * 0.22, { size: 40 * e, color: col, stroke: '#2b1d14', sw: 7, maxW: W - 20 });
      if (r.level === Level.FLIP && mine && B.oppLives > 0) text(ctx, `딱지 획득! 남은 상대 딱지 ${B.oppLives}장`, W / 2, H * 0.22 + 42, { size: 18, color: '#fff', stroke: '#2b1d14', sw: 4 });
    }
    if (B.state === 'end' || B.state === 'done') {
      const e = ease.outBack(Math.min(1, t / 0.5));
      ctx.fillStyle = `rgba(10,6,20,${Math.min(0.5, t)})`; ctx.fillRect(0, 0, W, H);
      text(ctx, B.win ? '승리!' : '패배…', W / 2, H * 0.42, { size: 84 * e, color: B.win ? '#ffe066' : '#9fb4ff', stroke: '#2b1d14', sw: 10 });
      if (B.win) for (let i = 0; i < 3; i++) { ctx.fillStyle = '#ffe066'; star(ctx, W / 2 + (i - 1) * 70, H * 0.3 - (i === 1 ? 14 : 0), 24 * e); ctx.fill(); ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = 3; ctx.stroke(); }
    }
    // 튜토리얼 힌트
    if (B.tutorial && B.hint) {
      const msgs = {
        press: ['화면을 꾹 누르고 있으면', '힘이 모여요!'],
        release: ['조준점이 노란 원 안에 올 때 손을 떼요!', '게이지가 노란 선을 넘어야 뒤집혀요'],
        block: ['상대 차례! 하얀 고리가', '파란 원에 겹치는 순간 터치해서 버티기!'],
      };
      const show = (B.hint === 'press' && B.state === 'aim') || (B.hint === 'release' && B.state === 'charge') || (B.hint === 'block' && B.state === 'oppWind');
      if (B.hint === 'block' && B.state === 'react') B.hint = null;
      if (show) {
        const [a, b] = msgs[B.hint];
        const y = B.hint === 'block' ? H * 0.17 : H * 0.69;
        UI.panel(24, y - 34, W - 48, 70, { fill: 'rgba(255,248,224,.96)' });
        text(ctx, a, W / 2, y - 12, { size: 18, color: '#3a1f12', maxW: W - 70 });
        text(ctx, b, W / 2, y + 14, { size: 18, color: '#c0392b', maxW: W - 70 });
        if (B.hint === 'press') { const bounce = Math.abs(Math.sin(App.t * 5)) * 10; text(ctx, '👆', W / 2, H * 0.78 + bounce, { size: 40 }); }
      }
    }
  },

  drawPause(ctx) {
    const { W, H } = view;
    UI.modal(0.6);
    UI.panel(50, H * 0.3, W - 100, 250);
    text(ctx, '일시정지', W / 2, H * 0.3 + 44, { size: 30, color: '#3a1f12' });
    UI.button('resume', 80, H * 0.3 + 84, W - 160, 56, '계속하기', { color: '#7bd67b', onClick: () => { B.paused = false; } });
    UI.button('giveup', 80, H * 0.3 + 160, W - 160, 50, '포기하기', { color: '#ff8a7a', size: 20, onClick: () => {
      B.paused = false; B.myLives = 0; B.state = 'end'; B.t = 0; B.win = false; Sound.play('lose');
    } });
  },
  debug() { return B && { state: B.state, turn: B.turn, round: B.round, myLives: B.myLives, oppLives: B.oppLives, flips: B.flips }; },
};
