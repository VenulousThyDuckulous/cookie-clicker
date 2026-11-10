/* Cookie Clicker — client-side only. Progress is saved to localStorage. */
(() => {
  'use strict';

  const SAVE_KEY = 'cookie-clicker-save-v1';
  const COST_GROWTH = 1.15;
  const OFFLINE_RATE = 0.5;        // you keep half of your production while away
  const OFFLINE_CAP = 8 * 3600;    // ...for at most 8 hours

  /* ------------------------------------------------------------------ *
   * Content
   * ------------------------------------------------------------------ */

  const BUILDINGS = [
    { id: 'cursor',  name: 'Cursor',       icon: '👆', cost: 15,        cps: 0.1,   blurb: 'Autoclicks once every 10 seconds.' },
    { id: 'grandma', name: 'Grandma',      icon: '👵', cost: 100,       cps: 1,     blurb: 'A nice grandma to bake more cookies.' },
    { id: 'farm',    name: 'Cookie farm',  icon: '🌾', cost: 1.1e3,     cps: 8,     blurb: 'Grows cookie plants from cookie seeds.' },
    { id: 'mine',    name: 'Cookie mine',  icon: '⛏️', cost: 1.2e4,    cps: 47,    blurb: 'Mines out cookie dough and chocolate chips.' },
    { id: 'factory', name: 'Factory',      icon: '🏭', cost: 1.3e5,     cps: 260,   blurb: 'Produces large quantities of cookies.' },
    { id: 'bank',    name: 'Bank',         icon: '🏦', cost: 1.4e6,     cps: 1400,  blurb: 'Generates cookies from interest.' },
    { id: 'temple',  name: 'Temple',       icon: '⛪', cost: 2e7,       cps: 7800,  blurb: 'Full of precious, ancient chocolate.' },
    { id: 'tower',   name: 'Wizard tower', icon: '🧙', cost: 3.3e8,     cps: 44000, blurb: 'Summons cookies with magical spells.' },
  ];

  const BOOST_NAMES = {
    cursor:  ['Ergonomic mouse', 'Laser-guided clicking'],
    grandma: ['Steel-plated rolling pins', 'Lubricated dentures'],
    farm:    ['Irrigation channels', 'Fertilised soil'],
    mine:    ['Deeper mine shaft', 'Cave-in insurance'],
    factory: ['Improved conveyor belts', 'Assembly line robots'],
    bank:    ['Investment portfolio', 'Offshore accounts'],
    temple:  ['Ritual candles', 'Ancient altar'],
    tower:   ['Arcane spell books', 'Ley line flux'],
  };

  const UPGRADES = [
    { id: 'reinforced',     name: 'Reinforced index finger', desc: 'Clicking is twice as powerful.',            cost: 100,  req: s => s.clicks >= 1,             clickMult: 2 },
    { id: 'carpal',         name: 'Carpal tunnel cream',     desc: 'Clicking is twice as powerful.',            cost: 1e3,  req: s => s.baked >= 500,            clickMult: 2 },
    { id: 'fingers',        name: 'Thousand fingers',        desc: 'Each cursor adds +0.1 to your clicks.',     cost: 1e4,  req: s => s.buildings.cursor >= 5,   fingers: 0.1 },
    { id: 'ambidextrous',   name: 'Ambidextrous',            desc: 'Clicking is twice as powerful.',            cost: 5e4,  req: s => s.clicks >= 100,           clickMult: 2 },
    { id: 'millionFingers', name: 'Million fingers',         desc: 'Each cursor adds another +0.2 to clicks.',  cost: 1e6,  req: s => s.buildings.cursor >= 20,  fingers: 0.2 },
    { id: 'rainbowClicks',  name: 'Rainbow cookies',         desc: 'Clicking is twice as powerful.',            cost: 5e7,  req: s => s.clicks >= 500,           clickMult: 2 },
    { id: 'sugarRush',      name: 'Sugar rush',              desc: 'All production +10%.',                      cost: 2e5,  req: s => s.baked >= 5e4,            cpsMult: 1.1 },
    { id: 'chocAlloy',      name: 'Chocolate alloy',         desc: 'All production +10%.',                      cost: 8e6,  req: s => s.baked >= 2e6,            cpsMult: 1.1 },
    { id: 'quantum',        name: 'Quantum baking',          desc: 'All production +15%.',                      cost: 5e8,  req: s => s.baked >= 1e8,            cpsMult: 1.15 },
  ];

  for (const b of BUILDINGS) {
    [1, 10].forEach((ownedReq, tier) => {
      UPGRADES.push({
        id: `${b.id}-boost-${tier}`,
        name: BOOST_NAMES[b.id][tier],
        desc: `${b.name}s produce twice as many cookies.`,
        cost: Math.round(b.cost * (tier === 0 ? 12 : 120)),
        req: s => s.buildings[b.id] >= ownedReq,
        building: { id: b.id, mult: 2 },
      });
    });
  }

  const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

  const ACHIEVEMENTS = [
    { id: 'first',      icon: '🍪', name: 'First batch',       desc: 'Bake your first cookie.',              test: s => s.baked >= 1 },
    { id: 'click100',   icon: '👆', name: 'Clicker',           desc: 'Click the cookie 100 times.',          test: s => s.clicks >= 100 },
    { id: 'click1000',  icon: '💪', name: 'Carpal tunnel',     desc: 'Click the cookie 1,000 times.',        test: s => s.clicks >= 1000 },
    { id: 'bake1k',     icon: '🎂', name: 'Bakery',            desc: 'Bake 1,000 cookies.',                  test: s => s.baked >= 1e3 },
    { id: 'bake100k',   icon: '🏬', name: 'Cookie tycoon',     desc: 'Bake 100,000 cookies.',                test: s => s.baked >= 1e5 },
    { id: 'bake1m',     icon: '🏭', name: 'Mass production',   desc: 'Bake 1,000,000 cookies.',              test: s => s.baked >= 1e6 },
    { id: 'bake1b',     icon: '🌍', name: 'Global bakery',     desc: 'Bake 1 billion cookies.',              test: s => s.baked >= 1e9 },
    { id: 'cursors10',  icon: '🖱️', name: 'Helping hands',     desc: 'Own 10 cursors.',                      test: s => s.buildings.cursor >= 10 },
    { id: 'grandma10',  icon: '👵', name: 'Grandma squad',     desc: 'Own 10 grandmas.',                     test: s => s.buildings.grandma >= 10 },
    { id: 'tower1',     icon: '🧙', name: 'It is magic',       desc: 'Own a wizard tower.',                  test: s => s.buildings.tower >= 1 },
    { id: 'upgrades10', icon: '⭐', name: 'Upgrader',          desc: 'Buy 10 upgrades.',                     test: s => s.upgrades.length >= 10 },
    { id: 'golden1',    icon: '✨', name: 'Shiny!',            desc: 'Click a golden cookie.',               test: s => s.golden >= 1 },
    { id: 'golden7',    icon: '🌟', name: 'Golden collector',  desc: 'Click 7 golden cookies.',              test: s => s.golden >= 7 },
    { id: 'cps1000',    icon: '⚡', name: 'Cookie machine',    desc: 'Produce 1,000 cookies per second.',    test: () => totalCps() >= 1000 },
  ];

  const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */

  const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

  function fmt(n) {
    if (!Number.isFinite(n)) return '∞';
    const v = Math.floor(n);
    if (v < 1000) return String(v);
    let tier = Math.floor(Math.log10(v) / 3);
    tier = Math.min(tier, UNITS.length - 1);
    const scaled = v / Math.pow(1000, tier);
    return scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + UNITS[tier];
  }

  function fmtRate(n) {
    if (!Number.isFinite(n)) return '∞';
    if (n < 10) return (Math.round(n * 10) / 10).toFixed(1);
    if (n < 1000) return String(Math.round(n));
    return fmt(n);
  }

  function formatDuration(seconds) {
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  }

  const $ = id => document.getElementById(id);

  /* ------------------------------------------------------------------ *
   * State
   * ------------------------------------------------------------------ */

  function freshState() {
    const buildings = {};
    for (const b of BUILDINGS) buildings[b.id] = 0;
    return {
      cookies: 0,
      baked: 0,
      handmade: 0,
      clicks: 0,
      golden: 0,
      buildings,
      upgrades: [],
      achievements: [],
      buffs: [],
      started: Date.now(),
      lastSeen: Date.now(),
      buyAmount: 1,
      sound: false,
    };
  }

  function loadState() {
    const base = freshState();
    let saved;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return base;
      saved = JSON.parse(raw);
    } catch {
      return base;
    }
    if (!saved || typeof saved !== 'object') return base;

    const state = { ...base, ...saved };
    state.buildings = { ...base.buildings, ...(saved.buildings || {}) };

    for (const b of BUILDINGS) {
      const v = Number(state.buildings[b.id]);
      state.buildings[b.id] = Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
    }
    for (const key of ['cookies', 'baked', 'handmade', 'clicks', 'golden']) {
      const v = Number(state[key]);
      state[key] = Number.isFinite(v) && v > 0 ? v : 0;
    }

    state.upgrades = Array.isArray(saved.upgrades) ? saved.upgrades.filter(id => UPGRADE_BY_ID[id]) : [];
    state.achievements = Array.isArray(saved.achievements) ? saved.achievements.filter(id => ACH_BY_ID[id]) : [];
    state.buffs = [];
    state.buyAmount = [1, 10, 100].includes(saved.buyAmount) ? saved.buyAmount : 1;
    state.sound = saved.sound === true;
    state.started = Number.isFinite(saved.started) ? saved.started : Date.now();
    state.lastSeen = Number.isFinite(saved.lastSeen) ? saved.lastSeen : Date.now();
    return state;
  }

  const state = loadState();

  /* ------------------------------------------------------------------ *
   * Production maths
   * ------------------------------------------------------------------ */

  function purchasedEffects() {
    const out = [];
    for (const id of state.upgrades) {
      const u = UPGRADE_BY_ID[id];
      if (u) out.push(u);
    }
    return out;
  }

  function activeBuffs() {
    const now = Date.now();
    return state.buffs.filter(b => b.until > now);
  }

  function globalMultiplier(ups) {
    let m = 1;
    for (const u of ups) if (u.cpsMult) m *= u.cpsMult;
    for (const b of activeBuffs()) m *= b.mult;
    return m;
  }

  function totalCps() {
    const ups = purchasedEffects();
    const global = globalMultiplier(ups);
    let total = 0;
    for (const b of BUILDINGS) {
      const owned = state.buildings[b.id];
      if (!owned) continue;
      let m = 1;
      for (const u of ups) if (u.building && u.building.id === b.id) m *= u.building.mult;
      total += b.cps * owned * m;
    }
    return total * global;
  }

  function clickPower() {
    const ups = purchasedEffects();
    let mult = 1;
    let bonus = 0;
    for (const u of ups) {
      if (u.clickMult) mult *= u.clickMult;
      if (u.fingers) bonus += u.fingers * state.buildings.cursor;
    }
    return mult + bonus;
  }

  function costOf(b, owned) {
    return Math.ceil(b.cost * Math.pow(COST_GROWTH, owned));
  }

  function bulkCost(b, amount) {
    let total = 0;
    for (let i = 0; i < amount; i++) total += costOf(b, state.buildings[b.id] + i);
    return total;
  }

  /* ------------------------------------------------------------------ *
   * DOM references
   * ------------------------------------------------------------------ */

  const el = {
    count: $('cookieCount'),
    cps: $('cpsLabel'),
    click: $('clickLabel'),
    stage: $('stage'),
    bigCookie: $('bigCookie'),
    floaters: $('floaters'),
    buffBar: $('buffBar'),
    soundBtn: $('soundBtn'),
    resetBtn: $('resetBtn'),
    buyModes: $('buyModes'),
    buildings: $('buildings'),
    upgrades: $('upgrades'),
    upgBadge: $('upgBadge'),
    noUpgrades: $('noUpgrades'),
    toasts: $('toasts'),
    achievements: $('achievements'),
    stat: {
      bank: $('statBank'),
      baked: $('statBaked'),
      cps: $('statCps'),
      click: $('statClick'),
      handmade: $('statHandmade'),
      clicks: $('statClicks'),
      buildings: $('statBuildings'),
      upgrades: $('statUpgrades'),
      golden: $('statGolden'),
      ach: $('statAch'),
      time: $('statTime'),
    },
  };

  const rowRefs = new Map();

  /* ------------------------------------------------------------------ *
   * Sound
   * ------------------------------------------------------------------ */

  let audioCtx = null;

  function playClick(freq = 0) {
    if (!state.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = (freq || 340 + Math.random() * 160);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    } catch {
      /* audio is a nicety — never let it break the game */
    }
  }

  /* ------------------------------------------------------------------ *
   * Toasts & floaters
   * ------------------------------------------------------------------ */

  function toast(message) {
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    el.toasts.appendChild(node);
    while (el.toasts.children.length > 3) el.toasts.firstElementChild.remove();
    setTimeout(() => {
      node.classList.add('is-out');
      setTimeout(() => node.remove(), 320);
    }, 3200);
  }

  function floater(text, clientX, clientY, big = false) {
    const rect = el.stage.getBoundingClientRect();
    const cookieRect = el.bigCookie.getBoundingClientRect();
    const span = document.createElement('span');
    span.className = 'floater' + (big ? ' is-big' : '');
    span.textContent = text;
    const x = clientX != null ? clientX - rect.left : cookieRect.left - rect.left + cookieRect.width / 2;
    const y = clientY != null ? clientY - rect.top : cookieRect.top - rect.top + cookieRect.height / 2;
    span.style.left = `${x + (Math.random() * 30 - 15)}px`;
    span.style.top = `${y}px`;
    el.floaters.appendChild(span);
    span.addEventListener('animationend', () => span.remove(), { once: true });
  }

  /* ------------------------------------------------------------------ *
   * Store
   * ------------------------------------------------------------------ */

  function buildStoreRows() {
    el.buildings.textContent = '';
    for (const b of BUILDINGS) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'build-row';
      row.dataset.id = b.id;
      row.innerHTML =
        `<span class="b-icon" aria-hidden="true"></span>` +
        `<span class="b-main"><span class="b-name"></span><span class="b-blurb"></span></span>` +
        `<span class="b-cost" data-cost></span>`;
      row.querySelector('.b-icon').textContent = b.icon;
      row.querySelector('.b-name').textContent = b.name;
      row.querySelector('.b-blurb').textContent = b.blurb;
      const count = document.createElement('span');
      count.className = 'b-count';
      count.dataset.count = '';
      row.querySelector('.b-name').appendChild(count);
      row.addEventListener('click', () => buyBuilding(b));
      rowRefs.set(b.id, row);
      el.buildings.appendChild(row);
    }
  }

  function buyBuilding(b) {
    const amount = state.buyAmount;
    const cost = bulkCost(b, amount);
    if (!Number.isFinite(cost) || cost > state.cookies) return;
    state.cookies -= cost;
    state.buildings[b.id] += amount;
    playClick(200);
    upgradeSignature = '';
    renderUpgrades(true);
    paint();
    checkAchievements();
    save();
  }

  /* ------------------------------------------------------------------ *
   * Upgrades
   * ------------------------------------------------------------------ */

  let upgradeSignature = null;

  function visibleUpgrades() {
    const bought = new Set(state.upgrades);
    return UPGRADES.filter(u => !bought.has(u.id) && u.req(state));
  }

  function renderUpgrades(force = false) {
    const list = visibleUpgrades();
    const signature = list.map(u => u.id).join(',');
    if (!force && signature === upgradeSignature) return;
    upgradeSignature = signature;

    el.upgrades.textContent = '';
    for (const u of list) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'upgrade';
      card.dataset.id = u.id;
      card.innerHTML = `<span class="u-name"></span><span class="u-desc"></span><span class="u-cost"></span>`;
      card.querySelector('.u-name').textContent = u.name;
      card.querySelector('.u-desc').textContent = u.desc;
      card.querySelector('.u-cost').textContent = fmt(u.cost);
      card.addEventListener('click', () => buyUpgrade(u));
      el.upgrades.appendChild(card);
    }

    el.noUpgrades.hidden = list.length > 0;
    el.upgBadge.hidden = list.length === 0;
    el.upgBadge.textContent = String(list.length);
  }

  function buyUpgrade(u) {
    if (state.upgrades.includes(u.id)) return;
    if (state.cookies < u.cost) return;
    state.cookies -= u.cost;
    state.upgrades.push(u.id);
    playClick(560);
    upgradeSignature = '';
    renderUpgrades(true);
    toast(`Upgrade bought: ${u.name}`);
    paint();
    checkAchievements();
    save();
  }

  /* ------------------------------------------------------------------ *
   * Golden cookie
   * ------------------------------------------------------------------ */

  let goldenEl = null;
  let goldenTimer = null;

  const GOLDEN_SVG =
    `<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false"><defs>` +
    `<radialGradient id="goldDough" cx="36%" cy="30%" r="76%">` +
    `<stop offset="0%" stop-color="#fffce6"/><stop offset="45%" stop-color="#ffe27a"/><stop offset="100%" stop-color="#d99a1f"/>` +
    `</radialGradient></defs>` +
    `<circle cx="100" cy="100" r="92" fill="url(#goldDough)"/>` +
    `<g fill="#c98a17" opacity=".75"><ellipse cx="70" cy="66" rx="11" ry="9" transform="rotate(-16 70 66)"/>` +
    `<ellipse cx="126" cy="88" rx="13" ry="11" transform="rotate(24 126 88)"/>` +
    `<ellipse cx="92" cy="124" rx="12" ry="10"/><ellipse cx="132" cy="136" rx="8" ry="7"/></g>` +
    `<ellipse cx="72" cy="50" rx="30" ry="15" fill="#fff" opacity=".4" transform="rotate(-28 72 50)"/></svg>`;

  function scheduleGolden(delay) {
    clearTimeout(goldenTimer);
    const wait = delay != null ? delay : (55 + Math.random() * 80) * 1000;
    goldenTimer = setTimeout(spawnGolden, wait);
  }

  function spawnGolden() {
    if (document.hidden) {
      scheduleGolden(15000);
      return;
    }
    if (goldenEl) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'golden';
    btn.setAttribute('aria-label', 'Golden cookie — click it!');
    btn.innerHTML = GOLDEN_SVG;

    const stageRect = el.stage.getBoundingClientRect();
    const size = 76;
    const maxX = Math.max(0, stageRect.width - size - 16);
    const maxY = Math.max(0, stageRect.height - size - 16);
    btn.style.left = `${8 + Math.random() * maxX}px`;
    btn.style.top = `${8 + Math.random() * maxY}px`;

    btn.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      harvestGolden(btn);
    });

    el.stage.appendChild(btn);
    goldenEl = btn;
    goldenTimer = setTimeout(() => {
      dismissGolden();
      scheduleGolden();
    }, 13000);
  }

  function dismissGolden() {
    clearTimeout(goldenTimer);
    goldenEl?.remove();
    goldenEl = null;
  }

  function harvestGolden(btn) {
    const rect = btn.getBoundingClientRect();
    dismissGolden();
    scheduleGolden();
    state.golden += 1;
    playClick(760);

    if (Math.random() < 0.6) {
      const cps = totalCps();
      const bonus = Math.min(state.cookies * 0.15, Math.max(13, cps * 900)) + 13;
      state.cookies += bonus;
      state.baked += bonus;
      floater(`+${fmt(bonus)}`, rect.left + rect.width / 2, rect.top + rect.height / 2, true);
      toast(`Lucky! You found ${fmt(bonus)} cookies.`);
    } else {
      state.buffs.push({ label: 'Frenzy ×7', mult: 7, until: Date.now() + 20000 });
      floater('FRENZY!', rect.left + rect.width / 2, rect.top + rect.height / 2, true);
      toast('Cookie frenzy! ×7 production for 20 seconds.');
    }

    paint();
    checkAchievements();
    save();
  }

  /* ------------------------------------------------------------------ *
   * Achievements
   * ------------------------------------------------------------------ */

  function renderAchievements() {
    el.achievements.textContent = '';
    for (const a of ACHIEVEMENTS) {
      const li = document.createElement('li');
      li.className = 'ach';
      li.dataset.id = a.id;
      li.innerHTML = `<span class="ach-icon" aria-hidden="true"></span><span><strong></strong><span class="ach-desc"></span></span>`;
      li.querySelector('.ach-icon').textContent = a.icon;
      li.querySelector('strong').textContent = a.name;
      li.querySelector('.ach-desc').textContent = a.desc;
      el.achievements.appendChild(li);
    }
    syncAchievements();
  }

  function syncAchievements() {
    const unlocked = new Set(state.achievements);
    for (const li of el.achievements.children) {
      li.classList.toggle('is-unlocked', unlocked.has(li.dataset.id));
    }
  }

  function checkAchievements() {
    const fresh = [];
    for (const a of ACHIEVEMENTS) {
      if (state.achievements.includes(a.id)) continue;
      let earned = false;
      try {
        earned = Boolean(a.test(state));
      } catch {
        earned = false;
      }
      if (earned) {
        state.achievements.push(a.id);
        fresh.push(a);
      }
    }
    if (!fresh.length) return;

    syncAchievements();
    fresh.forEach((a, i) => {
      setTimeout(() => toast(`Achievement unlocked: ${a.name}`), i * 450);
    });
    playClick(680);
    if (state.achievements.length === ACHIEVEMENTS.length) {
      toast('All achievements unlocked. You are a cookie legend.');
    }
    save();
  }

  /* ------------------------------------------------------------------ *
   * Rendering
   * ------------------------------------------------------------------ */

  function updateBuffBar() {
    const active = activeBuffs();
    const signature = active.map(b => b.until).join(',');
    if (el.buffBar.dataset.sig !== signature) {
      el.buffBar.dataset.sig = signature;
      el.buffBar.textContent = '';
      for (const b of active) {
        const chip = document.createElement('div');
        chip.className = 'buff';
        chip.dataset.until = String(b.until);
        chip.dataset.label = b.label;
        el.buffBar.appendChild(chip);
      }
    }
    for (const chip of el.buffBar.children) {
      const left = Math.max(0, (Number(chip.dataset.until) - Date.now()) / 1000);
      const text = `${chip.dataset.label} · ${left.toFixed(1)}s`;
      if (chip.textContent !== text) chip.textContent = text;
    }
  }

  function updateStore() {
    for (const b of BUILDINGS) {
      const row = rowRefs.get(b.id);
      if (!row) continue;
      const owned = state.buildings[b.id];
      const amount = state.buyAmount;
      const cost = bulkCost(b, amount);
      const affordable = cost <= state.cookies;

      row.hidden = !(owned > 0 || b.cost <= 50 || state.baked >= b.cost * 0.3);
      row.disabled = !affordable;
      row.classList.toggle('is-affordable', affordable);
      row.classList.toggle('is-locked', !affordable);
      row.setAttribute('aria-label', `Buy ${amount} ${b.name} for ${fmt(cost)} cookies`);

      const countNode = row.querySelector('[data-count]');
      const countText = owned ? `×${fmt(owned)}` : '';
      if (countNode.textContent !== countText) countNode.textContent = countText;

      const costNode = row.querySelector('[data-cost]');
      const costText = fmt(cost);
      if (costNode.textContent !== costText) costNode.textContent = costText;
    }
  }

  function updateUpgradeAffordability() {
    for (const card of el.upgrades.children) {
      const u = UPGRADE_BY_ID[card.dataset.id];
      if (!u) continue;
      const affordable = state.cookies >= u.cost;
      card.disabled = !affordable;
      card.classList.toggle('is-affordable', affordable);
    }
  }

  function updateStats() {
    const s = el.stat;
    const owned = BUILDINGS.reduce((sum, b) => sum + state.buildings[b.id], 0);
    const set = (node, value) => {
      if (node.textContent !== value) node.textContent = value;
    };
    set(s.bank, fmt(state.cookies));
    set(s.baked, fmt(state.baked));
    set(s.cps, fmtRate(totalCps()));
    set(s.click, fmtRate(clickPower()));
    set(s.handmade, fmt(state.handmade));
    set(s.clicks, fmt(state.clicks));
    set(s.buildings, String(owned));
    set(s.upgrades, String(state.upgrades.length));
    set(s.golden, String(state.golden));
    set(s.ach, `${state.achievements.length} / ${ACHIEVEMENTS.length}`);
    set(s.time, formatDuration((Date.now() - state.started) / 1000));
  }

  function paint() {
    el.count.textContent = fmt(state.cookies);
    el.cps.textContent = `${fmtRate(totalCps())} per second`;
    el.click.textContent = `${fmtRate(clickPower())} per click`;
    updateBuffBar();
    updateStore();
    updateUpgradeAffordability();
    updateStats();
    document.title = `${fmt(state.cookies)} cookies · Cookie Clicker`;
  }

  /* ------------------------------------------------------------------ *
   * Clicking
   * ------------------------------------------------------------------ */

  let pressTimer = null;

  function squash() {
    el.bigCookie.classList.add('is-pressed');
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => el.bigCookie.classList.remove('is-pressed'), 90);
  }

  function bake(clientX, clientY) {
    const gain = clickPower();
    state.cookies += gain;
    state.baked += gain;
    state.handmade += gain;
    state.clicks += 1;

    playClick();
    floater(`+${fmtRate(gain)}`, clientX, clientY);
    squash();
    paint();
    checkAchievements();
  }

  el.bigCookie.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    bake(ev.clientX, ev.clientY);
  });

  el.bigCookie.addEventListener('keydown', ev => {
    if (ev.key === ' ' || ev.key === 'Enter' || ev.key === 'Spacebar') {
      ev.preventDefault();
      bake(null, null);
    }
  });

  /* ------------------------------------------------------------------ *
   * Tabs
   * ------------------------------------------------------------------ */

  const tabs = [...document.querySelectorAll('.tab')];
  const panels = {
    store: $('panel-store'),
    upgrades: $('panel-upgrades'),
    stats: $('panel-stats'),
  };

  function switchTab(name) {
    for (const tab of tabs) {
      const active = tab.dataset.tab === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    }
    for (const [key, panel] of Object.entries(panels)) {
      panel.classList.toggle('is-hidden', key !== name);
    }
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  }

  /* ------------------------------------------------------------------ *
   * Controls
   * ------------------------------------------------------------------ */

  function syncBuyModes() {
    for (const btn of el.buyModes.querySelectorAll('.buy-mode')) {
      const active = Number(btn.dataset.amount) === state.buyAmount;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    }
  }

  el.buyModes.addEventListener('click', ev => {
    const btn = ev.target.closest('.buy-mode');
    if (!btn) return;
    state.buyAmount = Number(btn.dataset.amount) || 1;
    syncBuyModes();
    paint();
    save();
  });

  function syncSoundButton() {
    el.soundBtn.textContent = state.sound ? '🔔' : '🔇';
    el.soundBtn.setAttribute('aria-pressed', String(state.sound));
    el.soundBtn.setAttribute('aria-label', state.sound ? 'Mute click sound' : 'Unmute click sound');
  }

  el.soundBtn.addEventListener('click', () => {
    state.sound = !state.sound;
    syncSoundButton();
    if (state.sound) playClick(520);
    save();
  });

  el.resetBtn.addEventListener('click', () => {
    if (!window.confirm('Reset all progress? This cannot be undone.')) return;
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  });

  /* ------------------------------------------------------------------ *
   * Saving, offline progress, loop
   * ------------------------------------------------------------------ */

  function save() {
    state.lastSeen = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      /* storage may be full or blocked — the game keeps running */
    }
  }

  function applyOfflineProgress() {
    const elapsed = (Date.now() - state.lastSeen) / 1000;
    if (!Number.isFinite(elapsed) || elapsed < 60) return;
    const cps = totalCps();
    if (cps <= 0) return;
    const seconds = Math.min(elapsed, OFFLINE_CAP);
    const gain = cps * seconds * OFFLINE_RATE;
    if (gain < 1) return;
    state.cookies += gain;
    state.baked += gain;
    toast(`You baked ${fmt(gain)} cookies while away for ${formatDuration(seconds)}.`);
  }

  let lastTick = performance.now();

  function tick() {
    const now = performance.now();
    let dt = (now - lastTick) / 1000;
    lastTick = now;
    if (!Number.isFinite(dt) || dt < 0) dt = 0;
    if (dt > 5) dt = 5;

    const gain = totalCps() * dt;
    if (gain > 0) {
      state.cookies += gain;
      state.baked += gain;
    }

    if (state.buffs.length) state.buffs = activeBuffs();
    paint();
    checkAchievements();
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */

  buildStoreRows();
  renderUpgrades(true);
  renderAchievements();
  syncBuyModes();
  syncSoundButton();
  applyOfflineProgress();
  paint();
  checkAchievements();

  setInterval(tick, 100);
  setInterval(save, 5000);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save();
    else lastTick = performance.now();
  });
  window.addEventListener('pagehide', save);

  scheduleGolden();
})();
