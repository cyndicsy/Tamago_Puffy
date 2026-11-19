// ============================================================
//  Puffling – a tiny virtual pet in a pocket toy
//  The pet and its little world are pixel art drawn on a 60x60 canvas.
//  Tip: add ?speed=30 to the address to make time pass 30x faster.
// ============================================================

const SAVE_KEY = "puffling-save-v1";
const SPEED = Number(new URLSearchParams(location.search).get("speed")) || 1;

const STAGES = [
  { id: "egg",   name: "Egg",   from: 0 },
  { id: "baby",  name: "Baby",  from: 0.25 }, // hatches after 15 seconds
  { id: "kid",   name: "Kid",   from: 20 },   // 20 minutes
  { id: "grown", name: "Grown", from: 120 },  // 2 hours
];

// ============================================================
//  1. Game state and rules
// ============================================================
function newPet(name) {
  return {
    name: name || "Puffling", ageMin: 0,
    hunger: 80, fun: 80, energy: 80, clean: 100, health: 100,
    asleep: false, sick: false, dead: false,
    poops: [], poopTimer: 10, sickTimer: 0, lastTick: Date.now(),
  };
}
function load() { try { const r = localStorage.getItem(SAVE_KEY); if (r) return JSON.parse(r); } catch (e) {} return null; }
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(pet)); } catch (e) {} }

let pet = load();
const clamp = (v) => Math.max(0, Math.min(100, v));
const stageOf = (p) => [...STAGES].reverse().find((s) => p.ageMin >= s.from);
const isEgg = () => stageOf(pet).id === "egg";

// dt = minutes that passed
function step(dt) {
  if (pet.dead) return;
  pet.ageMin += dt;
  if (isEgg()) return;
  const s = pet.asleep;
  pet.hunger = clamp(pet.hunger - (s ? 0.8 : 1.6) * dt);
  pet.fun    = clamp(pet.fun    - (s ? 0.4 : 1.2) * dt);
  pet.energy = clamp(pet.energy + (s ? 5 : -0.9) * dt);
  pet.clean  = clamp(pet.clean  - (0.5 + pet.poops.length) * dt);

  if (!s) {
    pet.poopTimer -= dt;
    if (pet.poopTimer <= 0 && pet.poops.length < 4) {
      pet.poops.push(8 + Math.random() * 84);
      pet.poopTimer = 8 + Math.random() * 8;
    }
  }
  if (!pet.sick && (pet.clean < 20 || pet.poops.length >= 3)) {
    pet.sickTimer += dt;
    if (pet.sickTimer > 5) { pet.sick = true; pet.sickTimer = 0; }
  } else if (!pet.sick) pet.sickTimer = 0;

  const empties = [pet.hunger, pet.fun, pet.energy, pet.clean].filter((v) => v <= 0).length;
  if (pet.sick || empties) pet.health = clamp(pet.health - (pet.sick ? 1.5 : 0) * dt - empties * 1.2 * dt);
  else pet.health = clamp(pet.health + 0.5 * dt);

  if (s && pet.energy >= 100) { pet.asleep = false; say("Good morning!"); }
  if (!s && pet.energy <= 0) pet.asleep = true;
  if (pet.health <= 0) pet.dead = true;
}

function catchUp() {
  const now = Date.now();
  let mins = Math.min(((now - pet.lastTick) / 60000) * SPEED, 1440);
  while (mins > 0) { const d = Math.min(1, mins); step(d); mins -= d; }
  pet.lastTick = now;
}

function moodOf(p) {
  if (p.sick) return "sick";
  const avg = (p.hunger + p.fun + p.clean) / 3;
  return avg > 60 ? "happy" : avg < 30 ? "sad" : "ok";
}

// ============================================================
//  2. Pixel art
// ============================================================
const W = 60, H = 60, GROUND = 47;
const cv = document.getElementById("screen");
const ctx = cv.getContext("2d");

const PAL = {
  o: "#4a3020", f: "#f3e3cc", l: "#fffaf1", q: "#f08a9a", a: "#f08a3a", p: "#f1a3ae", b: "#f4a3a3", m: "#d0503f",
  g: "#6fae5a", c: "#fff3da", s: "#e0ac77", w: "#ffffff", r: "#e45b5b", k: "#2f5233",
  y: "#f5cf54", u: "#7cc0e6", d: "#7a4e2e", n: "#9a6a45", t: "#8ecdf5",
};
const SICK = { f: "#cfe0a8", l: "#e6f0cc" };

// Each letter is one pixel; "." is see-through. Letters map to colours in PAL.
const SPRITES = {
  egg: [
    "...oooo...",
    "..occcco..",
    ".occsccco.",
    ".occcccco.",
    "occcccscco",
    "occcccccco",
    "ocscccccco",
    "occcccccco",
    ".occccsco.",
    "..oooooo..",
  ],
  // Puffling is a little rabbit. Ears grow longer at each stage.
  baby: [
    "...oo..oo...",
    "..opo..opo..",
    "..opo..opo..",
    "..oooooooo..",
    ".offffffffo.",
    "oflffffffffo",
    "offeffffeffo",
    "offeffffeffo",
    "obfffqqfffbo",
    "offffmmffffo",
    ".offffffffo.",
    "..oooooooo..",
  ],
  kid: [
    "...oo....oo...",
    "..opo....opo..",
    "..opo....opo..",
    "..opo....opo..",
    "..ofo....ofo..",
    "..oooooooooo..",
    ".offffffffffo.",
    "oflffffffffffo",
    "offfeffffefffo",
    "offfeffffefffo",
    "obffffqqffffbo",
    "offfffmmfffffo",
    "offffffffffffo",
    ".offffffffffo.",
    "..oooooooooo..",
  ],
  grown: [
    "....oo.......ooo",
    "...opo......oppo",
    "...opo.....opoo.",
    "...opo....opo...",
    "...opo....opo...",
    "...ofo....ofo...",
    "..oooooooooooo..",
    ".offffffffffffo.",
    "oflffffffffffffo",
    "offfeffffffefffo",
    "offfeffffffefffo",
    "obfffffqqfffffbo",
    "offffffmmffffffo",
    "offfllllllllfffo",
    "offfllllllllfffo",
    ".offffffffffffo.",
    "..oooooooooooo..",
  ],
  poop: ["..n..", ".ndn.", ".nnn.", "nndnn", "nnnnn"],
  meal: ["..g.g", "...g.", "..aa.", ".aaa.", "aa..."],
  berry: ["..g..", ".rrr.", "rrwrr", "rrrrr", ".rrr."],
  star: ["..y..", ".yyy.", "yyyyy", ".yyy.", ".y.y."],
  pinkheart: [".p.p.", "ppppp", ".ppp.", "..p.."],
  z: ["oooo", "..o.", ".o..", "oooo"],
  heart: [".r.r.", "rrrrr", ".rrr.", "..r.."],
  plus: [".r.", "rrr", ".r."],
  cloud: ["..www...", ".wwwwww.", "wwwwwwww"],
  bang: ["r", "r", "r", ".", "r"],
};

function px(x, y, color) { ctx.fillStyle = color; ctx.fillRect(x | 0, y | 0, 1, 1); }
function sprite(rows, x, y, map) {
  for (let j = 0; j < rows.length; j++)
    for (let i = 0; i < rows[j].length; i++) {
      const ch = rows[j][i];
      if (ch === ".") continue;
      const col = map ? map(ch, i, j) : PAL[ch];
      if (col) px(x + i, y + j, col);
    }
}

// Background details are generated once so they stay in place
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const SAND = [];
for (let y = GROUND; y < H; y++) for (let x = 0; x < W; x++) {
  const r = rand();
  if (r < 0.12) SAND.push([x, y, "#d9c48f"]);
  else if (r < 0.2) SAND.push([x, y, "#f4e6c2"]);
}
const STARS = Array.from({ length: 14 }, () => [Math.floor(rand() * W), Math.floor(rand() * 34), rand() * 6]);

function drawWorld(t, night) {
  // sky
  const sky = night ? ["#1f2a44", "#26345a", "#2f4170"] : ["#a9d2e2", "#bfe0ea", "#d6ebef"];
  for (let y = 0; y < GROUND; y++) {
    const band = y < 16 ? 0 : y < 32 ? 1 : 2;
    ctx.fillStyle = sky[band];
    ctx.fillRect(0, y, W, 1);
    // dithered edge between bands
    if (y === 16 || y === 32) for (let x = 0; x < W; x += 2) px(x + (y % 4 ? 1 : 0), y, sky[band - 1]);
  }
  if (night) {
    for (const [x, y, ph] of STARS) if (Math.sin(t * 2 + ph) > -0.3) px(x, y, "#fdf3c4");
    // moon
    ctx.fillStyle = "#fdf3c4"; ctx.fillRect(46, 13, 5, 5); ctx.fillRect(47, 12, 3, 7); ctx.fillRect(45, 14, 7, 3);
    ctx.fillStyle = sky[0]; ctx.fillRect(48, 12, 3, 5);
  } else {
    // sun and drifting clouds
    ctx.fillStyle = "#fff2b0"; ctx.fillRect(47, 13, 6, 6); ctx.fillRect(46, 14, 8, 4); ctx.fillRect(48, 12, 4, 8);
    const cx = ((t * 1.5) % (W + 16)) - 10;
    sprite(SPRITES.cloud, Math.round(cx), 15);
    sprite(SPRITES.cloud, Math.round(((t * 1 + 40) % (W + 16)) - 10), 22);
  }
  // ground
  ctx.fillStyle = night ? "#8f876d" : "#ead9ae";
  ctx.fillRect(0, GROUND, W, H - GROUND);
  for (const [x, y, c] of SAND) px(x, y, night ? "#7c745c" : c);
  // plants
  const leaf = night ? "#3f6b48" : "#5d9e52", leaf2 = night ? "#335a3c" : "#4b8743";
  for (const [x, h] of [[3, 9], [6, 6], [53, 8], [56, 11], [24, 4]]) {
    const sway = Math.round(Math.sin(t * 1.5 + x) * 0.6);
    for (let i = 0; i < h; i++) px(x + (i > h / 2 ? sway : 0), GROUND - 1 - i, i % 3 ? leaf : leaf2);
  }
  // rock
  ctx.fillStyle = night ? "#59606e" : "#8d939c"; ctx.fillRect(40, GROUND - 3, 7, 3); ctx.fillRect(41, GROUND - 4, 4, 1);
  ctx.fillStyle = night ? "#6c7381" : "#a9afb7"; ctx.fillRect(41, GROUND - 3, 3, 1);
  // little mushroom
  ctx.fillStyle = "#f1e6d0"; ctx.fillRect(13, GROUND - 3, 1, 3);
  ctx.fillStyle = night ? "#a3504a" : "#d9675d"; ctx.fillRect(11, GROUND - 5, 5, 2); ctx.fillRect(12, GROUND - 6, 3, 1);
  px(12, GROUND - 5, "#fff"); px(14, GROUND - 6, "#fff");
}

// ---------- pet drawing ----------
const view = {
  x: 30, target: 30, hop: 0, look: 0, blinkAt: 0,
  jumpUntil: 0, eatUntil: 0, healUntil: 0, cleanStart: -10, cleanPoops: [],
};

function drawPet(t) {
  const stage = stageOf(pet).id;
  const rows = SPRITES[stage];
  const w = rows[0].length, h = rows.length;
  let x = Math.round(view.x - w / 2);
  let y = GROUND - h + 1;

  if (stage === "egg") {
    const wob = t % 3 > 2.6 ? (Math.floor(t * 10) % 2 ? 1 : -1) : 0;
    sprite(rows, x + wob, y);
    if (pet.ageMin > 0.15) { px(x + wob + 3, y + 4, PAL.o); px(x + wob + 4, y + 5, PAL.o); px(x + wob + 5, y + 4, PAL.o); px(x + wob + 6, y + 5, PAL.o); }
    return;
  }

  const mood = moodOf(pet);
  if (now() < view.jumpUntil) y -= [0, 2, 4, 5, 4, 2][Math.floor((view.jumpUntil - now()) / 60) % 6];
  else if (!pet.asleep) y -= view.hop;

  const blink = t > view.blinkAt && t < view.blinkAt + 0.15;
  const eating = now() < view.eatUntil;
  const eyeRows = rows.map((r, j) => (r.includes("e") ? j : -1)).filter((j) => j >= 0);
  const closedTop = pet.asleep || blink || mood === "sick";
  const eyes = [];

  sprite(rows, x, y, (ch, i, j) => {
    if (ch === "f" || ch === "e") {
      if (ch === "e" && !(closedTop && j === eyeRows[0])) eyes.push([i, j]);
      return (pet.sick && SICK.f) || PAL.f;
    }
    if (ch === "l") return (pet.sick && SICK.l) || PAL.l;
    if (ch === "m") {
      if (pet.asleep) return (pet.sick && SICK.f) || PAL.f;
      if (eating) return Math.floor(t * 6) % 2 ? PAL.o : PAL.m;
      return mood === "happy" ? PAL.m : PAL.o;
    }
    return PAL[ch];
  });
  const dx = pet.asleep ? 0 : view.look;
  for (const [i, j] of eyes) px(x + i + dx, y + j, PAL.o);
  if (mood === "sad" && !pet.asleep && eyes.length) px(x + eyes[0][0], y + eyeRows[1] + 1, PAL.t);
  if (mood === "sick" && !pet.asleep) { px(x + w, y + 2, PAL.t); px(x + w, y + 3, PAL.t); }

  if (pet.asleep) {
    const k = Math.floor(t * 1.2) % 3;
    for (let i = 0; i <= k; i++) sprite(SPRITES.z, x + w + 1 + i * 4, y - 3 - i * 5, () => "#e8edff");
  }
  if (eating) {
    const left = Math.ceil(((view.eatUntil - now()) / 1800) * 3); // 3,2,1 bites left
    const food = SPRITES[view.food || "meal"].map((r, j) => (j < 5 - left * 1.7 ? "....." : r));
    sprite(food, x + w + 1, GROUND - 4);
  }
  if (now() < view.healUntil && Math.floor(t * 5) % 2) {
    sprite(SPRITES.plus, x - 4, y + 1); sprite(SPRITES.plus, x + w + 1, y + 3);
  }
  if (now() < view.jumpUntil) sprite(SPRITES.heart, x + w - 1, y - 6);
}

function drawPoops(t) {
  const cleaning = now() - view.cleanStart < 1400;
  const list = cleaning ? view.cleanPoops : pet.poops;
  const wave = cleaning ? Math.floor(((now() - view.cleanStart) / 1400) * (W + 8)) - 4 : -99;
  for (const p of list) {
    const x = Math.round(2 + (p / 100) * 52);
    if (cleaning && x < wave) continue;
    sprite(SPRITES.poop, x, GROUND - 4);
    if (Math.floor(t * 2 + p) % 2) { px(x + 1, GROUND - 7, "#9aa58a"); px(x + 3, GROUND - 8, "#9aa58a"); }
  }
  if (cleaning) for (let y = 30; y < H; y++) for (let k = 0; k < 4; k++) px(wave + k - (y % 2), y, k === 3 ? "#ffffff" : "#8fd0ee");
}

function drawAttention(t) {
  if (needsCare() && Math.floor(t * 2) % 2) {
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(1, 1, 5, 9);
    sprite(SPRITES.bang, 3, 3);
  }
}
function needsCare() {
  return !isEgg() && !pet.dead && (pet.hunger < 30 || pet.fun < 30 || pet.poops.length > 0 || pet.sick || (pet.energy < 25 && !pet.asleep));
}

// ============================================================
//  3. Moving around, saying things, actions
// ============================================================
const now = () => performance.now();
let mode = "main"; // main | menu | game | catch
let busyUntil = 0;  // short animations block new actions

function moveTick() {
  if (mode !== "main" || pet.asleep || isEgg() || now() < busyUntil) { view.hop = 0; return; }
  if (Math.abs(view.x - view.target) < 1 || Math.random() < 0.05) view.target = 12 + Math.random() * 36;
  const d = Math.sign(view.target - view.x);
  view.x += d * (Math.random() < 0.3 ? 0 : 1);
  view.look = d;
  view.hop = view.hop ? 0 : 1;
}

let sayTimer;
function say(text, ms = 2600) {
  const el = document.getElementById("say");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(sayTimer);
  if (ms) sayTimer = setTimeout(() => el.classList.remove("show"), ms);
}
const hush = () => document.getElementById("say").classList.remove("show");

function jump() { view.jumpUntil = now() + 720; }

function act(action) {
  if (pet.dead || !document.getElementById("nameSheet").hidden) return;
  if (mode === "game") return gameInput(action);
  if (mode === "catch") return;
  if (mode === "menu" || mode === "stats") closePanel();
  if (action === "stats") return openStats();
  if (now() < busyUntil) return;
  if (isEgg()) return say(["*wiggle*", "It's still an egg!", "*tap tap*"][Math.floor(Math.random() * 3)]);

  if (action === "feed") {
    if (pet.asleep) return say("Shh... sleeping");
    return openMenu("feed", "What's for food?", [
      { label: "Carrot", hint: "fills the tummy", run: () => eat("meal") },
      { label: "Berry treat", hint: "a little food, lots of joy", run: () => eat("berry") },
    ]);
  }
  if (action === "play") {
    if (pet.asleep) return say("Shh... sleeping");
    if (pet.energy < 10) return say("Too tired...");
    return openMenu("play", "Let's play!", [
      { label: "Catch stars", hint: "tap the falling stars", run: startCatch },
      { label: "Left or right", hint: "guess where I'll turn", run: startGame },
    ]);
  }
  if (action === "sleep") {
    if (!pet.asleep && pet.energy > 90) return say("Not sleepy!");
    pet.asleep = !pet.asleep;
    say(pet.asleep ? "Nighty night..." : "Lights on!");
  }
  if (action === "clean") {
    if (!pet.poops.length && pet.clean > 95) return say("Already clean!");
    view.cleanPoops = pet.poops.slice();
    view.cleanStart = now(); busyUntil = now() + 1400;
    pet.poops = []; pet.clean = 100;
    say("Squeaky clean!");
  }
  if (action === "heal") {
    if (!pet.sick) return say("I'm not sick!");
    pet.sick = false; pet.health = clamp(pet.health + 25); pet.fun = clamp(pet.fun - 10);
    view.healUntil = busyUntil = now() + 1500;
    say("Yuck! But better.");
  }
  save();
}

// ---------- Play: guess which way Puffling will turn (5 rounds) ----------
let game = null;
function startGame() {
  mode = "game";
  view.x = 30; view.look = 0;
  game = { round: 1, wins: 0, waiting: true };
  say("Round 1/5: Left or right? Left or right button", 0);
}
function gameInput(action) {
  if (!game.waiting) return;
  let guess = 0;
  if (action === "A" || action === "left") guess = -1;
  if (action === "C" || action === "right") guess = 1;
  if (action === "B") return endGame(true); // middle button quits
  if (!guess) return;
  game.waiting = false;
  const dir = Math.random() < 0.5 ? -1 : 1;
  view.look = dir; view.x = 30 + dir * 4;
  const win = dir === guess;
  if (win) { game.wins++; jump(); }
  say(win ? "Yes!" : "Nope!", 0);
  setTimeout(() => {
    if (game.round >= 5) return endGame(false);
    game.round++; game.waiting = true;
    view.x = 30; view.look = 0;
    say(`Round ${game.round}/5: Left or right?`, 0);
  }, 1100);
}
function endGame(quit) {
  const wins = game ? game.wins : 0;
  mode = "main"; game = null;
  if (quit) return say("Maybe later!");
  pet.fun = clamp(pet.fun + 10 + wins * 7);
  pet.energy = clamp(pet.energy - 8);
  pet.hunger = clamp(pet.hunger - 5);
  say(wins >= 3 ? `${wins}/5! Best day ever!` : `${wins}/5. That was fun!`, 3200);
  if (wins >= 3) jump();
  save();
}

// ---------- Pick-one menus on the screen (Feed and Play) ----------
let menu = null;
function openMenu(owner, title, options) {
  menu = { owner, title, options, sel: 0 };
  mode = "menu";
  hush();
  drawMenu();
  document.getElementById("panel").hidden = false;
}
function drawMenu() {
  document.getElementById("panel").innerHTML = `<h3>${menu.title}</h3>` +
    menu.options.map((o, i) => `<button class="opt${i === menu.sel ? " sel" : ""}" data-i="${i}"><span>${i === menu.sel ? "&gt; " : "&nbsp; "}${o.label}</span><small>${o.hint}</small></button>`).join("") +
    `<p class="hint">Next · OK · Back, or tap one</p>`;
}
function chooseMenu(i) {
  const o = menu.options[i];
  closePanel();
  o.run();
  updateButtons(); save();
}
function closePanel() { document.getElementById("panel").hidden = true; mode = "main"; menu = null; }

function eat(food) {
  if (pet.hunger > 92) return say("I'm full!");
  if (food === "meal") { pet.hunger = clamp(pet.hunger + 35); say("Crunch crunch!"); }
  else { pet.hunger = clamp(pet.hunger + 10); pet.fun = clamp(pet.fun + 15); say("Berry nice!"); }
  view.food = food;
  view.x = Math.min(view.x, 42); view.look = 1;
  view.eatUntil = busyUntil = now() + 1800;
}

function poke() {
  if (pet.dead) return;
  if (isEgg()) return say("*crack crack*");
  if (pet.asleep) return say("Zzz... (shh!)");
  jump();
  pet.fun = clamp(pet.fun + 1);
  say(["Hehe, that tickles!", "Boop!", "Hi hi!"][Math.floor(Math.random() * 3)]);
}

// ---------- Play: catch the falling stars (10 seconds) ----------
let catchGame = null;
function startCatch() {
  mode = "catch";
  view.x = 30; view.look = 0;
  catchGame = { stars: [], caught: 0, ends: now() + 10000, nextSpawn: 0, last: now() };
  say("Tap the stars! 10s", 0);
}
function updateCatch() {
  const g = catchGame, t = now(), dt = (t - g.last) / 1000;
  g.last = t;
  if (t > g.nextSpawn && t < g.ends - 800) {
    g.stars.push({ x: 4 + Math.random() * 50, y: -5, vy: 12 + Math.random() * 10, kind: Math.random() < 0.3 ? "pinkheart" : "star" });
    g.nextSpawn = t + 550;
  }
  for (const s of g.stars) s.y += s.vy * dt;
  g.stars = g.stars.filter((s) => s.y < GROUND);
  const left = Math.max(0, Math.ceil((g.ends - t) / 1000));
  if (g.shown !== left) { g.shown = left; say(`Caught ${g.caught} · ${left}s`, 0); }
  if (t >= g.ends) endCatch();
}
function drawCatch() {
  for (const s of catchGame.stars) sprite(SPRITES[s.kind], Math.round(s.x) - 2, Math.round(s.y) - 2);
  for (const p of catchGame.pops || []) if (now() - p.t < 400) sprite(SPRITES.plus, p.x - 1, p.y - 1, () => "#fff7c2");
}
function catchTap(cx, cy) {
  const g = catchGame;
  const hit = g.stars.find((s) => Math.abs(s.x - cx) < 5 && Math.abs(s.y - cy) < 5);
  if (!hit) return;
  g.stars = g.stars.filter((s) => s !== hit);
  g.caught++;
  (g.pops = g.pops || []).push({ x: Math.round(hit.x), y: Math.round(hit.y), t: now() });
  pet.fun = clamp(pet.fun + 6);
  pet.energy = clamp(pet.energy - 1);
  view.look = Math.sign(hit.x - view.x);
  jump();
  say(`Caught ${g.caught} · ${g.shown}s`, 0);
}
function endCatch() {
  const n = catchGame.caught;
  catchGame = null; mode = "main";
  pet.energy = clamp(pet.energy - 8);
  pet.hunger = clamp(pet.hunger - 5);
  say(n >= 10 ? `Wow, ${n} stars! Best day ever!` : n > 0 ? `${n} stars! That was fun!` : "Aww, maybe next time!", 3200);
  if (n > 0) jump();
  updateButtons(); save();
}

// ---------- Stats on the screen ----------
function openStats() {
  const s = stageOf(pet);
  const bar = (label, v) => `<div class="row"><span>${label}</span><div class="pbar${v < 30 ? " low" : ""}"><i style="width:${Math.round(v)}%"></i></div></div>`;
  const p = document.getElementById("panel");
  p.innerHTML = `<h3>${escapeHtml(pet.name)} · ${s.name}</h3>
    ${bar("Food", pet.hunger)}${bar("Joy", pet.fun)}${bar("Energy", pet.energy)}${bar("Clean", pet.clean)}${bar("Health", pet.health)}
    <p class="hint">Age ${formatAge(pet.ageMin)}${pet.sick ? " · feeling ill" : ""}</p>`;
  p.hidden = false;
  mode = "stats";
  hush();
}

// ---------- Icon menu on the screen + the three buttons ----------
// Each icon is a 7x7 pixel drawing ("#" = pixel).
const ICONS = [
  { id: "feed", name: "Feed", px: ["....#.#", ".....#.", "....##.", "...###.", "..###..", ".###...", "##....."] },
  { id: "play", name: "Play", px: ["..###..", ".#####.", "##..###", "#######", "###..##", ".#####.", "..###.."] },
  { id: "sleep", name: "Lights", px: ["..###..", ".##....", "##.....", "##.....", "##.....", ".##....", "..###.."] },
  { id: "clean", name: "Clean", px: ["...#...", "..###..", "..###..", ".#####.", "#######", "#######", ".#####."] },
  { id: "heal", name: "Heal", px: ["..###..", "..###..", "#######", "#######", "#######", "..###..", "..###.."] },
  { id: "stats", name: "Stats", px: [".......", ".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."] },
];
let sel = -1;
const iconBar = document.getElementById("icons");
iconBar.innerHTML = ICONS.map((ic, i) => {
  let rects = "";
  ic.px.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "#") rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }));
  return `<button class="ic" data-i="${i}" aria-label="${ic.name}" title="${ic.name}"><svg viewBox="0 0 7 7">${rects}</svg></button>`;
}).join("");
iconBar.addEventListener("click", (e) => {
  e.stopPropagation();
  const b = e.target.closest(".ic");
  if (!b || mode === "game" || mode === "catch") return;
  sel = Number(b.dataset.i);
  act(ICONS[sel].id);
  updateButtons();
});
function showSel() {
  iconBar.querySelectorAll(".ic").forEach((b, i) => b.classList.toggle("sel", i === sel));
}

// A = next, B = OK, C = back
function press(btn) {
  if (pet.dead || !document.getElementById("nameSheet").hidden) return;
  if (mode === "game") return gameInput(btn);
  if (mode === "catch") { if (btn === "C") endCatch(); return; }
  if (mode === "menu") {
    if (btn === "A") { menu.sel = (menu.sel + 1) % menu.options.length; drawMenu(); }
    if (btn === "B") chooseMenu(menu.sel);
    if (btn === "C") closePanel();
    return;
  }
  if (mode === "stats") { closePanel(); if (btn !== "A") return; }
  if (btn === "A") { sel = (sel + 1) % ICONS.length; showSel(); }
  if (btn === "B") { if (sel < 0) poke(); else act(ICONS[sel].id); }
  if (btn === "C") { sel = -1; showSel(); }
}

function formatAge(m) {
  if (m < 1) return "New";
  if (m < 60) return Math.floor(m) + " min";
  if (m < 1440) return Math.floor(m / 60) + "h " + Math.floor(m % 60) + "m";
  return Math.floor(m / 1440) + " days";
}
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function chatter() {
  if (pet.dead || mode !== "main" || pet.asleep || isEgg() || now() < busyUntil) return;
  if (pet.sick) return say("I feel sick...");
  if (pet.poops.length) return say("Eww, messy!");
  if (pet.hunger < 30) return say("I'm hungry!");
  if (pet.energy < 25) return say("So sleepy...");
  if (pet.fun < 30) return say("Play with me?");
  if (Math.random() < 0.4) say(["La la la", "I love you!", "Nice day!", "Hehe", "*wiggle*"][Math.floor(Math.random() * 5)]);
}

// ============================================================
//  4. Drawing loop, buttons, start
// ============================================================
function frame() {
  const t = now() / 1000;
  if (t > view.blinkAt + 3 + Math.random() * 2) view.blinkAt = t;
  ctx.clearRect(0, 0, W, H);
  drawWorld(t, pet.asleep);
  drawPoops(t);
  drawPet(t);
  if (mode === "catch") { updateCatch(); if (catchGame) drawCatch(); }
  requestAnimationFrame(frame);
}

function updateButtons() {
  const set = (a, on) => iconBar.querySelector(`[data-i="${ICONS.findIndex((ic) => ic.id === a)}"]`).classList.toggle("alert", on && !isEgg() && !pet.dead);
  set("feed", pet.hunger < 30 && !pet.asleep);
  set("play", pet.fun < 30 && !pet.asleep);
  set("sleep", pet.energy < 25 && !pet.asleep);
  set("clean", pet.poops.length > 0);
  set("heal", pet.sick);
  showSel();
  document.getElementById("tagName").textContent = pet.name;
  for (const k of ["hunger", "fun", "energy", "clean", "health"]) {
    const v = pet[k], bar = document.getElementById("bar-" + k);
    bar.style.width = v + "%";
    bar.style.background = v > 55 ? "var(--good)" : v > 25 ? "var(--mid)" : "var(--low)";
  }
  const st = stageOf(pet);
  document.getElementById("stageLine").textContent = `${pet.name} · ${st.name}${pet.sick ? " · feeling ill" : ""} · ${formatAge(pet.ageMin)}`;
  if (pet.dead && document.getElementById("byeSheet").hidden && document.getElementById("nameSheet").hidden) {
    document.getElementById("byeName").textContent = pet.name;
    document.getElementById("byeSheet").hidden = false;
  }
}

document.querySelectorAll(".btn").forEach((b) =>
  b.addEventListener("click", () => { press(b.dataset.btn); updateButtons(); })
);
document.getElementById("lcd").addEventListener("click", (e) => {
  if (mode === "game") {
    const r = e.currentTarget.getBoundingClientRect();
    return gameInput(e.clientX < r.left + r.width / 2 ? "left" : "right");
  }
  if (mode === "catch") {
    const r = cv.getBoundingClientRect();
    return catchTap(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H);
  }
  if (mode === "menu") {
    const o = e.target.closest(".opt");
    if (o) chooseMenu(Number(o.dataset.i));
    return;
  }
  if (mode === "stats") return closePanel();
  poke();
});
document.addEventListener("keydown", (e) => {
  if (!document.getElementById("nameSheet").hidden || !document.getElementById("byeSheet").hidden) return;
  const k = e.key;
  if (mode === "game" && (k === "ArrowLeft" || k === "ArrowRight")) return gameInput(k === "ArrowLeft" ? "left" : "right");
  if (/^[1-6]$/.test(k) && mode !== "game" && mode !== "catch") { sel = Number(k) - 1; act(ICONS[sel].id); updateButtons(); return; }
  const map = { a: "A", ArrowRight: "A", ArrowDown: "A", s: "B", Enter: "B", " ": "B", d: "C", Escape: "C", Backspace: "C" };
  if (map[k]) { e.preventDefault(); press(map[k]); updateButtons(); }
});

// Drag the toy to tilt and spin it in 3D (springs back when you let go)
(function tilt() {
  const dev = document.getElementById("device");
  let drag = null;
  dev.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".btn, .lcd")) return;
    drag = { x: e.clientX, y: e.clientY };
    dev.setPointerCapture(e.pointerId);
    dev.classList.add("dragging");
  });
  dev.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const ry = Math.max(-60, Math.min(60, (e.clientX - drag.x) * 0.45));
    const rx = Math.max(-35, Math.min(35, -(e.clientY - drag.y) * 0.35));
    dev.style.setProperty("--ry", ry + "deg");
    dev.style.setProperty("--rx", rx + "deg");
  });
  const end = () => {
    if (!drag) return;
    drag = null;
    dev.classList.remove("dragging");
    dev.style.setProperty("--ry", "0deg");
    dev.style.setProperty("--rx", "0deg");
  };
  dev.addEventListener("pointerup", end);
  dev.addEventListener("pointercancel", end);
})();

// Name sheet
let nameIsNew = true;
function askName(title, isNew) {
  nameIsNew = isNew;
  document.getElementById("nameTitle").textContent = title;
  document.getElementById("nameInput").value = isNew ? "" : pet.name;
  document.getElementById("nameCancel").hidden = !pet || pet.dead || isNew && !load();
  document.getElementById("nameSheet").hidden = false;
  setTimeout(() => document.getElementById("nameInput").focus(), 50);
}
function confirmName() {
  const name = document.getElementById("nameInput").value.trim() || "Puffling";
  if (nameIsNew) { pet = newPet(name); game = null; catchGame = null; sel = -1; closePanel(); }
  else pet.name = name;
  document.getElementById("nameSheet").hidden = true;
  save(); updateButtons();
  say(nameIsNew ? "A new egg!" : `Call me ${name}!`);
}
document.getElementById("nameOk").addEventListener("click", confirmName);
document.getElementById("nameInput").addEventListener("keydown", (e) => { if (e.key === "Enter") confirmName(); });
document.getElementById("nameCancel").addEventListener("click", () => (document.getElementById("nameSheet").hidden = true));
document.getElementById("renameBtn").addEventListener("click", () => askName("Rename your Puffling", false));
document.getElementById("resetBtn").addEventListener("click", () => askName("Start over with a new egg?", true));
document.getElementById("byeOk").addEventListener("click", () => {
  document.getElementById("byeSheet").hidden = true;
  askName("A new egg appeared!", true);
});

// Start!
if (!pet) { pet = newPet("Puffling"); askName("A new egg appeared!", true); }
else { catchUp(); say("Welcome back!"); }
updateButtons();
requestAnimationFrame(frame);

let last = Date.now();
setInterval(() => {
  const t = Date.now();
  const before = stageOf(pet).id;
  if (document.getElementById("nameSheet").hidden) step(((t - last) / 60000) * SPEED);
  last = t; pet.lastTick = t;
  const after = stageOf(pet).id;
  if (mode === "stats") openStats();
  if (before !== after) { jump(); say(before === "egg" ? `${pet.name} hatched!` : `Grew into a ${stageOf(pet).name}!`, 3500); }
  updateButtons();
  save();
}, 1000);
setInterval(moveTick, 450);
setInterval(chatter, 9000);
