// 게임 데이터: 지역·상대·딱지·아이템·강화 비용. 순수 데이터 + 결정적 생성 (DOM 의존 없음).

export const RARITY = {
  N: { name: '보통', color: '#9aa0b4' },
  R: { name: '희귀', color: '#4aa3ff' },
  SR: { name: '영웅', color: '#c06bff' },
  SSR: { name: '전설', color: '#ffb800' },
};

// 딱지: a/b = 두 장의 종이 색, pat = 앞면 무늬, guard = 방어(상대 판정 반경 -6%/pt), bonus = 기본 스탯 가산
const D = (id, name, a, b, pat, rarity, guard, bonus = {}, src = 'opp') => ({ id, name, a, b, pat, rarity, guard, bonus, src });

export const DDAKJI = [
  D('starter', '공책 딱지', '#e9e2cf', '#7fa7d9', 'lines', 'N', 0, {}, 'start'),
  // 1 골목
  D('o1', '신문지 딱지', '#d9d4c7', '#8d8a82', 'news', 'N', 0),
  D('o2', '도화지 딱지', '#f2efe6', '#e66b5b', 'plain', 'N', 0),
  D('o3', '분홍 색종이 딱지', '#ff9fb8', '#ffe1ea', 'dots', 'N', 0),
  D('o4', '전단지 딱지', '#ffd86b', '#e85d3a', 'stripe', 'N', 0.5),
  D('o5', '대장 딱지', '#c73a2b', '#2b2b2b', 'star', 'R', 1, { str: 1 }),
  // 2 운동장
  D('o6', '운동회 딱지', '#4fb06d', '#ffffff', 'stripe', 'N', 0.5),
  D('o7', '줄무늬 딱지', '#7c5cff', '#ffd447', 'stripe', 'N', 0.5),
  D('o8', '반장 딱지', '#2c6bd6', '#f0f0f0', 'check', 'R', 1, { focus: 1 }),
  D('o9', '체육복 딱지', '#2346a8', '#ffffff', 'lines', 'N', 1),
  D('o10', '강철 딱지', '#7d8796', '#3d4450', 'rivet', 'SR', 2, { str: 1 }),
  // 3 문방구
  D('o11', '뽑기 딱지', '#ff6fb1', '#6fd6ff', 'dots', 'R', 1, { luck: 1 }),
  D('o12', '쫀드기 딱지', '#e8a24a', '#7b4a1e', 'plain', 'N', 1),
  D('o13', '만화책 딱지', '#ffffff', '#1d1d1d', 'comic', 'R', 1, { focus: 1 }),
  D('o14', '스티커 딱지', '#ffe24a', '#ff5f8a', 'star', 'R', 1.5),
  D('o15', '부자 딱지', '#1f7a4d', '#e6c35c', 'won', 'SR', 2, { luck: 1 }),
  // 4 옥상
  D('o16', '연 딱지', '#e8473b', '#2a62c9', 'taegeuk', 'R', 1.5),
  D('o17', '바람개비 딱지', '#4ec3e0', '#ffef7a', 'pinwheel', 'R', 1.5, { focus: 1 }),
  D('o18', '방수 딱지', '#5a6b7c', '#b9c7d4', 'check', 'R', 2),
  D('o19', '구름 딱지', '#bfe3ff', '#ffffff', 'cloud', 'R', 2, { luck: 1 }),
  D('o20', '회오리 딱지', '#4b2a8a', '#9be8ff', 'swirl', 'SR', 2.5, { focus: 1 }),
  // 5 시장
  D('o21', '떡볶이 딱지', '#e2382a', '#ff9b3d', 'dots', 'R', 2),
  D('o22', '비늘 딱지', '#3b7fb8', '#c7e2f2', 'scale', 'R', 2),
  D('o23', '뻥튀기 딱지', '#f4e3b5', '#c99a4a', 'dots', 'R', 2.5),
  D('o24', '보자기 딱지', '#d23c6b', '#3cb08a', 'check', 'SR', 2.5, { luck: 1 }),
  D('o25', '왕눈이 딱지', '#2b2b2b', '#ffd447', 'eye', 'SR', 3, { str: 1, focus: 1 }),
  // 6 전국 대회
  D('o26', '갈매기 딱지', '#ffffff', '#2d8fd6', 'wave', 'SR', 3),
  D('o27', '무등산 딱지', '#3e8f4f', '#a7d36b', 'mount', 'SR', 3, { focus: 1 }),
  D('o28', '사과 딱지', '#d6283b', '#79c14b', 'apple', 'SR', 3, { luck: 1 }),
  D('o29', '남산 딱지', '#1b2a4a', '#ffcf5a', 'star', 'SR', 3.5, { str: 1 }),
  D('o30', '딱지왕의 황금 딱지', '#ffcc33', '#b8860b', 'crown', 'SSR', 4, { str: 1, focus: 1, luck: 1 }),
  // 문방구 뽑기 전용
  D('g1', '우유팩 딱지', '#ffffff', '#3d8fe0', 'milk', 'N', 1.5, {}, 'gacha'),
  D('g2', '골판지 딱지', '#c49a6c', '#8a6640', 'lines', 'N', 2, {}, 'gacha'),
  D('g3', '달력 딱지', '#ffffff', '#d63a3a', 'calendar', 'N', 1, { focus: 1 }, 'gacha'),
  D('g4', '은박 딱지', '#d7dde4', '#9aa6b2', 'shine', 'R', 2, { luck: 1 }, 'gacha'),
  D('g5', '한지 딱지', '#f3ead2', '#b5452f', 'hanji', 'R', 2.5, { focus: 1 }, 'gacha'),
  D('g6', '무지개 딱지', '#ff6b6b', '#6bc5ff', 'rainbow', 'R', 2, { luck: 2 }, 'gacha'),
  D('g7', '태극 딱지', '#ffffff', '#1f4fa8', 'taegeuk', 'SR', 3, { str: 1, focus: 1 }, 'gacha'),
  D('g8', '별빛 딱지', '#1a1446', '#ffe66b', 'stars', 'SR', 3, { luck: 2 }, 'gacha'),
  D('g9', '호랑이 딱지', '#ff9a1f', '#2b1a0f', 'tiger', 'SR', 3.5, { str: 2 }, 'gacha'),
  D('g10', '청룡 딱지', '#1e8f7a', '#9cf0d8', 'dragon', 'SSR', 4.5, { str: 1, focus: 2 }, 'gacha'),
  D('g11', '봉황 딱지', '#d4252a', '#ffcf40', 'phoenix', 'SSR', 4.5, { str: 2, luck: 1 }, 'gacha'),
];
export const DDAKJI_BY_ID = Object.fromEntries(DDAKJI.map((d) => [d.id, d]));
export const guardMul = (guard) => 1 - 0.06 * guard;

// 지역. gust = 돌풍 세기(0 없음), sky/ground = 배경 팔레트
export const REGIONS = [
  { id: 1, name: '우리 동네 골목', sub: '딱지치기의 시작', reward: 40, gust: 0, theme: 'alley', sky: ['#ffcf8a', '#ffe7c2'], ground: '#8f8478', accent: '#c9734a' },
  { id: 2, name: '초등학교 운동장', sub: '쉬는 시간 10분의 승부', reward: 70, gust: 0, theme: 'school', sky: ['#8fd3ff', '#d9f1ff'], ground: '#c9a26b', accent: '#4fb06d' },
  { id: 3, name: '문방구 앞', sub: '불량식품과 뽑기의 성지', reward: 110, gust: 0, theme: 'shop', sky: ['#ffb3c7', '#ffe3ea'], ground: '#9c8f86', accent: '#ff6fb1' },
  { id: 4, name: '아파트 옥상', sub: '바람이 딱지를 흔든다', reward: 160, gust: 1, theme: 'roof', sky: ['#6fa8ff', '#cfe3ff'], ground: '#7f8a94', accent: '#4ec3e0' },
  { id: 5, name: '재래시장 골목', sub: '고수들이 숨어 있다', reward: 230, gust: 0, theme: 'market', sky: ['#ff9a5a', '#ffd49a'], ground: '#7a6a5c', accent: '#e2382a' },
  { id: 6, name: '전국 딱지 대회', sub: '딱지왕의 자리를 걸고', reward: 330, gust: 0.6, theme: 'arena', sky: ['#3b2a7a', '#8a5ad6'], ground: '#5a4a6a', accent: '#ffcc33' },
];

// 외형: skin/hair/shirt 색, hs = 머리 모양(0~5), acc = 장신구, age = kid|adult|old
const L = (skin, hair, hs, shirt, acc = 'none', age = 'kid') => ({ skin, hair, hs, shirt, acc, age });
const OPP_DEFS = [
  ['코흘리개 민수', '아직 코를 훌쩍인다', L('#ffd9b8', '#2b1d14', 0, '#ffd447', 'snot')],
  ['깍두기 지훈', '형들 틈에 끼고 싶다', L('#f6cfa8', '#3a2516', 1, '#7fc66b')],
  ['울보 서연', '지면 운다… 조심!', L('#ffe0c7', '#4a2c1c', 3, '#ff9fb8', 'bow')],
  ['장난꾸러기 동현', '반창고는 훈장이다', L('#e9b98f', '#1d140e', 2, '#4aa3ff', 'band')],
  ['골목대장 덕구', '이 골목은 내 구역!', L('#e2a77a', '#141010', 4, '#c73a2b', 'cap')],
  ['달리기왕 하준', '손도 발도 빠르다', L('#f2c69c', '#2b1d14', 2, '#ffffff', 'headband')],
  ['줄넘기 소녀 지아', '리듬감이 남다르다', L('#ffe0c7', '#3a2516', 5, '#7c5cff', 'bow')],
  ['반장 예준', '계산된 한 방', L('#ffd9b8', '#1d140e', 1, '#2c6bd6', 'glasses')],
  ['체육부장 태호', '힘으로 밀어붙인다', L('#dba57a', '#141010', 0, '#2346a8')],
  ['운동장 지배자 강철', '강철 같은 손목', L('#c98f63', '#141010', 4, '#3d4450', 'cap')],
  ['뽑기 마니아 유나', '운이 좋은 편', L('#ffe0c7', '#5a3220', 3, '#6fd6ff', 'bow')],
  ['쫀드기 도윤', '쫀득하게 붙는 딱지', L('#f2c69c', '#2b1d14', 2, '#e8a24a')],
  ['만화광 시우', '필살기를 외친다', L('#ffd9b8', '#1d140e', 1, '#ffffff', 'glasses')],
  ['문방구 단골 은비', '스티커 부자', L('#ffe7d1', '#2b1d14', 5, '#ffe24a', 'bow')],
  ['문방구집 아들 부자왕', '딱지만 300장', L('#f6cfa8', '#141010', 4, '#1f7a4d', 'crownlet')],
  ['연날리기 준서', '바람을 읽는다', L('#e9b98f', '#2b1d14', 0, '#e8473b')],
  ['바람개비 하린', '빙글빙글 정신없다', L('#ffe0c7', '#3a2516', 3, '#4ec3e0', 'bow')],
  ['옥상 지킴이 건우', '여긴 아무나 못 온다', L('#c98f63', '#141010', 2, '#5a6b7c', 'cap')],
  ['구름 소년 로운', '멍하다가 갑자기 강하다', L('#ffd9b8', '#e8e8e8', 1, '#bfe3ff')],
  ['바람술사 휘몰이', '바람이 그의 편이다', L('#e2a77a', '#4b2a8a', 4, '#4b2a8a', 'headband')],
  ['떡볶이집 손녀 다은', '매운맛 승부', L('#ffe0c7', '#2b1d14', 5, '#e2382a', 'bow')],
  ['생선가게 형 민재', '손목 스냅이 예술', L('#d9a070', '#141010', 0, '#3b7fb8', 'band', 'adult')],
  ['뻥튀기 아저씨', '뻥! 하는 순간을 노린다', L('#e2a77a', '#3a2516', 2, '#f4e3b5', 'mustache', 'adult')],
  ['순자 할매', '60년 내공', L('#e9b98f', '#d9d9d9', 3, '#d23c6b', 'none', 'old')],
  ['시장통 전설 왕눈이', '눈빛만으로 딱지가 뒤집힌다', L('#d9a070', '#f2f2f2', 1, '#2b2b2b', 'glasses', 'old')],
  ['부산 대표 갈매기', '파도처럼 몰아친다', L('#d9a070', '#141010', 2, '#2d8fd6', 'cap')],
  ['광주 대표 무등', '흔들림 없는 집중', L('#f2c69c', '#1d140e', 1, '#3e8f4f', 'headband')],
  ['대구 대표 사과', '뜨거운 승부욕', L('#ffd9b8', '#3a2516', 5, '#d6283b', 'bow')],
  ['서울 대표 남산', '도시의 정밀 타격', L('#ffd9b8', '#141010', 4, '#1b2a4a', 'glasses')],
  ['딱지왕', '전설의 그 이름', L('#e2a77a', '#141010', 4, '#ffcc33', 'crown')],
];

// 상대 스탯 곡선: 지역 r(1~6), 지역 내 순번 i(0~4, 4=보스)
export const OPPONENTS = OPP_DEFS.map(([name, quote, look], n) => {
  const r = Math.floor(n / 5) + 1, i = n % 5, boss = i === 4;
  const lv = (r - 1) + i * 0.25;
  const stat = (k) => Math.min(6, Math.round(lv * 1.05 + k));
  return {
    id: 'p' + (n + 1), n, name, quote, look, region: r, idx: i, boss,
    stats: { str: stat(boss ? 0.6 : 0), focus: stat(boss ? 0.4 : -0.3), luck: stat(-0.6) },
    skill: Math.min(0.97, 0.2 + 0.15 * (r - 1) + 0.03 * i + (boss ? 0.06 : 0)),
    ddakji: 'o' + (n + 1),
    lives: (boss ? 2 : 1) + (r >= 3 ? 1 : 0),
    reward: Math.round(REGIONS[r - 1].reward * (1 + 0.12 * i) * (boss ? 1.8 : 1)),
  };
});
export const OPP_BY_ID = Object.fromEntries(OPPONENTS.map((o) => [o.id, o]));

// 아이템 (1판 1개 장착, 소모품)
export const ITEM_INFO = {
  lead: { name: '납덩이', desc: '힘 +2, 집중 -1', price: 90, color: '#7d8796' },
  tape: { name: '양면테이프', desc: '헛스윙 1회를 이너링으로', price: 60, color: '#ffe9a8' },
  fan: { name: '부채', desc: '상대 딱지가 기울어진 채 시작', price: 80, color: '#ff8fa3' },
  coin500: { name: '500원 동전', desc: '운 +2', price: 50, color: '#e6c35c' },
  ironHand: { name: '무쇠손 장갑', desc: '풀차지 시간 절반', price: 120, color: '#5a6b7c' },
};
export const ITEM_ORDER = ['lead', 'tape', 'fan', 'coin500', 'ironHand'];

// 스탯 강화 비용: 현재 레벨 → 다음 레벨
export const STAT_COST = [60, 150, 320, 600, 1000, 1600];
export const STAT_INFO = {
  str: { name: '힘', desc: '판정 범위가 넓어진다', color: '#ff6b5b' },
  focus: { name: '집중', desc: '조준 흔들림이 줄어든다', color: '#4aa3ff' },
  luck: { name: '운', desc: '크리티컬 확률 +3%', color: '#ffcc33' },
};

// 문방구 뽑기
export const GACHA = { price: 300, rates: { N: 0.55, R: 0.32, SR: 0.11, SSR: 0.02 }, dupRefund: { N: 60, R: 120, SR: 300, SSR: 800 } };
export const GACHA_POOL = DDAKJI.filter((d) => d.src === 'gacha');

// 출석 보상 (7일 순환), 마지막 날은 무료 뽑기권
export const DAILY = [100, 150, 200, 250, 300, 400, 'ticket'];

// 칭호: 최고 클리어 지역 기준
export const TITLES = ['동네 꼬마', '골목대장', '운동장 스타', '문방구 VIP', '옥상의 승부사', '시장통 고수', '딱지왕'];

// 도전과제: stat(S) ≥ n 이면 수령 가능. 보상은 코인(+뽑기권)
export const ACHIEVEMENTS = [
  { id: 'win1', name: '첫 승리', desc: '대결에서 1번 이기기', stat: 'wins', n: 1, coins: 100 },
  { id: 'win10', name: '동네 승부사', desc: '대결에서 10번 이기기', stat: 'wins', n: 10, coins: 300 },
  { id: 'win50', name: '백전노장', desc: '대결에서 50번 이기기', stat: 'wins', n: 50, coins: 1000, tickets: 1 },
  { id: 'flip20', name: '뒤집기 장인', desc: '딱지 20장 뒤집기', stat: 'flips', n: 20, coins: 300 },
  { id: 'flip100', name: '뒤집기 달인', desc: '딱지 100장 뒤집기', stat: 'flips', n: 100, coins: 1000, tickets: 1 },
  { id: 'crit10', name: '번개 손목', desc: '크리티컬 10번', stat: 'crits', n: 10, coins: 300 },
  { id: 'block10', name: '철벽 수비', desc: '완벽하게 버티기 10번', stat: 'perfectBlocks', n: 10, coins: 300 },
  { id: 'block50', name: '움직이지 않는 산', desc: '완벽하게 버티기 50번', stat: 'perfectBlocks', n: 50, coins: 800 },
  { id: 'col10', name: '꼬마 수집가', desc: '딱지 10종 모으기', stat: 'collection', n: 10, coins: 300 },
  { id: 'col25', name: '딱지 박사', desc: '딱지 25종 모으기', stat: 'collection', n: 25, coins: 800, tickets: 1 },
  { id: 'colAll', name: '딱지 대백과', desc: '모든 딱지 모으기', stat: 'collection', n: 42, coins: 5000, tickets: 3 },
  { id: 'pull10', name: '뽑기 마니아', desc: '문방구 뽑기 10번', stat: 'pulls', n: 10, coins: 300 },
  { id: 'max', name: '만렙 손목', desc: '스탯 하나를 6레벨로', stat: 'maxStat', n: 6, coins: 500 },
  { id: 'reg1', name: '골목 정복', desc: '1지역 보스 이기기', stat: 'regions', n: 1, coins: 200 },
  { id: 'reg2', name: '운동장 정복', desc: '2지역 보스 이기기', stat: 'regions', n: 2, coins: 300 },
  { id: 'reg3', name: '문방구 정복', desc: '3지역 보스 이기기', stat: 'regions', n: 3, coins: 500, tickets: 1 },
  { id: 'reg4', name: '옥상 정복', desc: '4지역 보스 이기기', stat: 'regions', n: 4, coins: 700 },
  { id: 'reg5', name: '시장 정복', desc: '5지역 보스 이기기', stat: 'regions', n: 5, coins: 900, tickets: 1 },
  { id: 'reg6', name: '전국 딱지왕', desc: '딱지왕 이기기', stat: 'regions', n: 6, coins: 2000, tickets: 2 },
  { id: 'end5', name: '도장깨기 5연승', desc: '무한 도장깨기 5연승', stat: 'endlessBest', n: 5, coins: 1000 },
  { id: 'end20', name: '도장깨기 20연승', desc: '무한 도장깨기 20연승', stat: 'endlessBest', n: 20, coins: 3000, tickets: 2 },
];
