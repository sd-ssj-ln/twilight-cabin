/* ─────────────────────────────────────────────────────────────
   暮色林中小屋 · runtime
   camera, weather, light, interaction, procedural soundscape
   ───────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  const Art = window.CabinArt;
  if (!Art) return;

  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d", { alpha: false });
  const intro = document.getElementById("intro");
  const hud = document.getElementById("hud");
  const veil = document.getElementById("veil");
  const whisperEl = document.getElementById("whisper");
  const cursorEl = document.getElementById("cursor");
  const clockEl = document.getElementById("clock");
  const sceneNameEl = document.getElementById("sceneName");
  const weatherStateEl = document.getElementById("weatherState");
  const weatherToggle = document.getElementById("weatherToggle");
  const weatherLabel = document.getElementById("weatherLabel");
  const soundToggle = document.getElementById("soundToggle");
  const soundLabel = document.getElementById("soundLabel");
  const doorBtn = document.getElementById("doorBtn");
  const doorLabel = document.getElementById("doorLabel");
  const railDot = document.getElementById("railDot");
  const timeButtons = Array.from(document.querySelectorAll(".time-btn"));
  const enterBtn = document.getElementById("enterBtn");
  const enterSilent = document.getElementById("enterSilent");

  const W = Art.W;
  const H = Art.H;
  const TAU = Math.PI * 2;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── state ───────────────────────────────────────────────── */

  const state = {
    entered: false,
    busy: false,
    mode: "exterior",
    t: 0,
    phase: 0,
    phaseTarget: 0,
    timeIndex: 0,
    rain: 0,
    rainTarget: 0,
    lamp: 1,
    lampTarget: 1,
    curtain: 0,
    curtainTarget: 0,
    stoke: 0,
    hover: null,
    hoverPoint: null,
    pointer: { nx: 0, ny: 0, sx: 0, sy: 0 },
    press: null,
    drag: null,
    mugSteam: 0,
    catAwakeUntil: 0,
    whisper: "",
    whisperLockedUntil: 0,
    whisperIndex: 0,
    sound: false,
    radioOn: false,
    rainSound: 0,
    smoke: [],
  };

  const view = { w: 0, h: 0, dpr: 1, scale: 1, focusX: 800, focusY: 450, portrait: false };
  const cam = { zoom: 1, targetZoom: 1, x: 0, y: 0, tx: 0, ty: 0, init: false };

  const times = [
    { label: "黄昏", clock: "18:42", phase: 0 },
    { label: "入夜", clock: "20:17", phase: 0.52 },
    { label: "深夜", clock: "23:48", phase: 1 },
  ];

  const exteriorHotspots = [
    { id: "door", x: 983, y: 598, r: 56, depth: 7.2, caption: "门没锁，只是虚掩着。", action: "enter" },
    { id: "lantern", x: 1038, y: 532, r: 34, depth: 7.4, caption: "檐下的灯，刚点上不久。", action: "lamp" },
    { id: "window", x: 1096, y: 558, r: 38, depth: 7.2, caption: "窗里有一盏小灯，和一只打盹的猫。", action: "peek" },
    { id: "chimney", x: 1121, y: 300, r: 42, depth: 7.2, caption: "烟往山谷那边去了。", action: "smoke" },
    { id: "moon", x: 684, y: 178, r: 38, depth: 1.4, caption: "月亮像一枚旧银币，边缘磨得发白。", action: "moon" },
    { id: "puddle", x: 622, y: 778, r: 70, depth: 6.4, caption: "水里也有一个亮着的窗。", action: "puddle" },
  ];

  const interiorHotspots = [
    { id: "fire", x: 500, y: 590, r: 108, depth: 0.7, caption: "拨一拨炭火，火会记得你。", action: "fire" },
    { id: "cat", x: 1096, y: 712, r: 58, depth: 0.7, caption: "猫睡在火光够得着的地方。", action: "cat" },
    { id: "mug", x: 1033, y: 636, r: 31, depth: 0.7, caption: "茶凉了一半，杯子还是温的。", action: "mug" },
    { id: "radio", x: 100, y: 430, r: 48, depth: 0.7, caption: "一台旧收音机，旋钮停在很远的地方。", action: "radio" },
    { id: "window", x: 1300, y: 414, r: 118, depth: 0.7, caption: "雨把窗外的松针洗得发亮。", action: "curtain" },
    { id: "chair", x: 828, y: 640, r: 86, depth: 0.7, caption: "椅子空着，毯子还留着一点温度。", action: "chair" },
  ];

  const ambientWhispers = {
    exterior: [
      "风穿过松林，像有人在低声讲旧事。",
      "门缝里漏出一点光，和很轻的柴火味。",
      "再往前一步，脚底的松针就响了。",
    ],
    interior: [
      "火还醒着。",
      "雨落在屋顶上，声音变得很软。",
      "椅子空着，毯子还带着温度。",
    ],
  };

  let layers = null;
  let raf = 0;
  let whisperTimer = null;
  let whisperFade = null;
  let lastWhisperText = "";

  /* ── audio ───────────────────────────────────────────────── */

  class Ambience {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.buses = {};
      this.enabled = false;
      this.built = false;
      this.rain = 0;
      this.mode = "exterior";
      this.radioOn = false;
      this.radioTimer = null;
      this.noteIndex = 0;
      this.failed = false;
    }

    build() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error("no webaudio");
      const ac = new AC();
      this.ctx = ac;

      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -26;
      comp.knee.value = 18;
      comp.ratio.value = 3.2;
      comp.attack.value = 0.02;
      comp.release.value = 0.3;

      const master = ac.createGain();
      master.gain.value = 0;
      master.connect(comp);
      comp.connect(ac.destination);
      this.master = master;

      const noise = this.makeNoise(5);
      const crackle = this.makeCrackle(7);

      // wind
      const windSrc = ac.createBufferSource();
      windSrc.buffer = noise;
      windSrc.loop = true;
      const windFilter = ac.createBiquadFilter();
      windFilter.type = "lowpass";
      windFilter.frequency.value = 280;
      windFilter.Q.value = 0.55;
      const windGain = ac.createGain();
      windGain.gain.value = 0;
      windSrc.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      windSrc.start();

      const windLfo = ac.createOscillator();
      windLfo.frequency.value = 0.055;
      const windLfoGain = ac.createGain();
      windLfoGain.gain.value = 120;
      windLfo.connect(windLfoGain);
      windLfoGain.connect(windFilter.frequency);
      windLfo.start();

      // rain
      const rainSrc = ac.createBufferSource();
      rainSrc.buffer = noise;
      rainSrc.loop = true;
      const rainHigh = ac.createBiquadFilter();
      rainHigh.type = "highpass";
      rainHigh.frequency.value = 700;
      const rainLow = ac.createBiquadFilter();
      rainLow.type = "lowpass";
      rainLow.frequency.value = 7600;
      const rainGain = ac.createGain();
      rainGain.gain.value = 0;
      rainSrc.connect(rainHigh);
      rainHigh.connect(rainLow);
      rainLow.connect(rainGain);
      rainGain.connect(master);
      rainSrc.start();

      // fire crackle
      const fireSrc = ac.createBufferSource();
      fireSrc.buffer = crackle;
      fireSrc.loop = true;
      const fireHigh = ac.createBiquadFilter();
      fireHigh.type = "lowpass";
      fireHigh.frequency.value = 4200;
      const fireGain = ac.createGain();
      fireGain.gain.value = 0;
      fireSrc.connect(fireHigh);
      fireHigh.connect(fireGain);
      fireGain.connect(master);
      fireSrc.start();

      // fire rumble
      const rumbleSrc = ac.createBufferSource();
      rumbleSrc.buffer = noise;
      rumbleSrc.loop = true;
      const rumbleFilter = ac.createBiquadFilter();
      rumbleFilter.type = "lowpass";
      rumbleFilter.frequency.value = 150;
      const rumbleGain = ac.createGain();
      rumbleGain.gain.value = 0;
      rumbleSrc.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(master);
      rumbleSrc.start();

      // room tone
      const roomSrc = ac.createBufferSource();
      roomSrc.buffer = noise;
      roomSrc.loop = true;
      const roomFilter = ac.createBiquadFilter();
      roomFilter.type = "lowpass";
      roomFilter.frequency.value = 95;
      const roomGain = ac.createGain();
      roomGain.gain.value = 0;
      roomSrc.connect(roomFilter);
      roomFilter.connect(roomGain);
      roomGain.connect(master);
      roomSrc.start();

      // radio bus + echo
      const radioGain = ac.createGain();
      radioGain.gain.value = 0;
      radioGain.connect(master);
      const delay = ac.createDelay(1.6);
      delay.delayTime.value = 0.27;
      const feedback = ac.createGain();
      feedback.gain.value = 0.22;
      const wet = ac.createGain();
      wet.gain.value = 0.24;
      radioGain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      wet.connect(master);
      this.buses.radio = radioGain;

      this.buses.wind = windGain;
      this.buses.rain = rainGain;
      this.buses.fire = fireGain;
      this.buses.rumble = rumbleGain;
      this.buses.room = roomGain;
      this.built = true;
    }

    makeNoise(seconds) {
      const ac = this.ctx;
      const len = Math.floor(ac.sampleRate * seconds);
      const buffer = ac.createBuffer(1, len, ac.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.82 + white * 0.18;
        data[i] = last * 0.9;
      }
      return buffer;
    }

    makeCrackle(seconds) {
      const ac = this.ctx;
      const len = Math.floor(ac.sampleRate * seconds);
      const buffer = ac.createBuffer(1, len, ac.sampleRate);
      const data = buffer.getChannelData(0);
      const bursts = 130;
      for (let b = 0; b < bursts; b++) {
        const start = Math.floor(Math.random() * (len - 2000));
        const amp = 0.05 + Math.random() * 0.34;
        const dur = 40 + Math.floor(Math.random() * 900);
        for (let i = 0; i < dur; i++) {
          const decay = Math.pow(1 - i / dur, 3.2);
          data[start + i] += (Math.random() * 2 - 1) * amp * decay;
        }
      }
      // soft bed
      for (let i = 0; i < len; i++) data[i] += (Math.random() * 2 - 1) * 0.008;
      return buffer;
    }

    async start() {
      if (this.failed) return false;
      try {
        if (!this.built) this.build();
        if (this.ctx.state === "suspended") await this.ctx.resume();
        this.enabled = true;
        const now = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setValueAtTime(Math.max(0.001, this.master.gain.value), now);
        this.master.gain.linearRampToValueAtTime(0.85, now + 2.4);
        this.update();
        return true;
      } catch (e) {
        this.failed = true;
        return false;
      }
    }

    setEnabled(on) {
      this.enabled = on;
      if (!this.ctx || !this.master) return;
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(on ? 0.85 : 0.0001, now + 0.6);
      if (on && this.ctx.state === "suspended") this.ctx.resume();
      if (!on) this.setRadio(false);
      this.update();
    }

    setMode(mode) {
      this.mode = mode;
      this.update();
      if (mode !== "interior") this.setRadio(false);
    }

    setRain(amount) {
      this.rain = amount;
      this.update();
    }

    setFireBoost(v) {
      this.boost = v;
      this.update();
    }

    update() {
      if (!this.built) return;
      const ac = this.ctx;
      const now = ac.currentTime;
      const ext = this.mode === "exterior";
      const target = (node, value) => {
        if (!node) return;
        node.gain.cancelScheduledValues(now);
        node.gain.setTargetAtTime(value, now, 0.5);
      };
      target(this.buses.wind, ext ? 0.12 : 0.022);
      target(this.buses.rain, this.rain * (ext ? 0.062 : 0.04));
      target(this.buses.fire, ext ? 0.003 : 0.095 + (this.boost || 0) * 0.02);
      target(this.buses.rumble, ext ? 0.002 : 0.035);
      target(this.buses.room, ext ? 0 : 0.018);
      target(this.buses.radio, this.radioOn && this.mode === "interior" ? 0.11 : 0);
    }

    setRadio(on) {
      const was = this.radioOn;
      this.radioOn = on;
      this.update();
      if (on && !was) {
        this.playPhrase();
        if (this.radioTimer) clearInterval(this.radioTimer);
        this.radioTimer = setInterval(() => this.playPhrase(), 4300);
      } else if (!on && this.radioTimer) {
        clearInterval(this.radioTimer);
        this.radioTimer = null;
      }
    }

    playPhrase() {
      if (!this.ctx || !this.radioOn || !this.enabled || this.mode !== "interior") return;
      const ac = this.ctx;
      const notes = [261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66, 261.63];
      const offs = [0, 0.52, 1.04, 1.6, 2.22, 2.78, 3.34, 3.9];
      const base = ac.currentTime + 0.08;
      for (let i = 0; i < notes.length; i++) {
        if (i > 0 && ((this.noteIndex + i) % 11 === 0)) continue;
        const start = base + offs[i];
        const dur = i === notes.length - 1 ? 1.3 : 0.72;
        const osc = ac.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = notes[i] * (1 + ((this.noteIndex + i) % 5) * 0.0008);
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.05, start + 0.035);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        const filter = ac.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1500;
        osc.connect(filter);
        filter.connect(g);
        g.connect(this.buses.radio);
        osc.start(start);
        osc.stop(start + dur + 0.08);
      }
      this.noteIndex++;
    }

    pulseFire() {
      if (!this.ctx || !this.enabled) return;
      const ac = this.ctx;
      const src = ac.createBufferSource();
      src.buffer = this.makeNoise(0.8);
      const filter = ac.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1800;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08, ac.currentTime + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.5);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.buses.fire || this.master);
      src.start();
      src.stop(ac.currentTime + 0.55);
    }
  }

  const ambience = new Ambience();

  /* ── sizing / camera ────────────────────────────────────── */

  function baseZoomFor() {
    if (view.portrait) return state.mode === "interior" ? 0.94 : 1;
    // Landscape: keep the full 1600px stage visible, then breathe in slightly.
    const full = Math.max(1, view.w / view.scale / W);
    return full * (state.mode === "interior" ? 1.02 : 1.07);
  }

  function panBounds() {
    const halfW = view.w / (2 * view.scale * cam.zoom);
    const margin = 26;
    if (halfW >= W / 2 - margin) return { min: 0, max: 0 };
    return {
      min: margin + halfW - view.focusX,
      max: W - margin - halfW - view.focusX,
    };
  }

  function clampPan() {
    if (state.mode !== "interior" || !view.portrait) {
      cam.tx = 0;
      cam.x = 0;
      return;
    }
    const b = panBounds();
    cam.tx = Math.max(b.min, Math.min(b.max, cam.tx));
    cam.x = Math.max(b.min, Math.min(b.max, cam.x));
  }

  function resize() {
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(view.w * view.dpr));
    canvas.height = Math.max(1, Math.round(view.h * view.dpr));
    canvas.style.width = view.w + "px";
    canvas.style.height = view.h + "px";
    view.scale = Math.max(view.w / W, view.h / H);
    view.portrait = view.w / view.h < 0.92;
    document.body.classList.toggle("is-portrait", view.portrait);
    document.body.classList.toggle("is-interior", state.mode === "interior");
    view.focusX = view.portrait ? (state.mode === "interior" ? 720 : 1004) : 800;
    view.focusY = view.portrait ? (state.mode === "interior" ? 460 : 476) : 450;
    const base = baseZoomFor();
    if (!cam.init) {
      cam.zoom = cam.targetZoom = base;
      cam.init = true;
    } else if (!state.busy) {
      cam.targetZoom = base;
    }
    clampPan();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
  }

  function beginWorld(depth, zoomMul) {
    const s = view.scale * cam.zoom * (zoomMul || 1);
    const px = state.pointer.sx * depth * (reducedMotion ? 0.2 : 1);
    const py = state.pointer.sy * depth * 0.7 * (reducedMotion ? 0.2 : 1);
    const driftX = reducedMotion ? 0 : Math.sin(state.t * 0.13) * 2.4;
    const driftY = reducedMotion ? 0 : Math.cos(state.t * 0.1) * 1.4;
    const cx = view.focusX + cam.x + px + driftX;
    const cy = view.focusY + cam.y + py + driftY;
    ctx.setTransform(
      view.dpr * s,
      0,
      0,
      view.dpr * s,
      view.dpr * (view.w / 2 - cx * s),
      view.dpr * (view.h / 2 - cy * s)
    );
  }

  function worldToScreen(x, y, depth) {
    const s = view.scale * cam.zoom;
    const px = state.pointer.sx * depth * (reducedMotion ? 0.2 : 1);
    const py = state.pointer.sy * depth * 0.7 * (reducedMotion ? 0.2 : 1);
    const driftX = reducedMotion ? 0 : Math.sin(state.t * 0.13) * 2.4;
    const driftY = reducedMotion ? 0 : Math.cos(state.t * 0.1) * 1.4;
    const cx = view.focusX + cam.x + px + driftX;
    const cy = view.focusY + cam.y + py + driftY;
    return {
      x: view.w / 2 + (x - cx) * s,
      y: view.h / 2 + (y - cy) * s,
    };
  }

  /* ── atmospheric particles ──────────────────────────────── */

  function initSmoke() {
    const rand = Art.mulberry32(4451);
    state.smoke = Array.from({ length: 26 }, () => ({
      life: rand(),
      speed: 0.018 + rand() * 0.018,
      x: (rand() - 0.5) * 22,
      seed: rand() * TAU,
    }));
  }

  function updateSmoke(dt) {
    for (const p of state.smoke) {
      p.life += dt * p.speed;
      if (p.life > 1) {
        p.life -= 1;
        p.x = (Math.random() - 0.5) * 18;
      }
    }
  }

  function drawLeaves(t, phase) {
    const alpha = 0.2 + (1 - phase) * 0.24;
    for (let i = 0; i < 14; i++) {
      const seed = i * 7.31;
      const speed = 8 + (i % 4) * 5;
      const x = ((i * 149 + t * speed) % (W + 160)) - 80;
      const y = 580 + ((i * 83 + t * (12 + (i % 5) * 6)) % 260);
      const rot = t * (0.3 + (i % 3) * 0.2) + seed;
      const s = 2.2 + (i % 4) * 0.8;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(1, 0.45);
      ctx.fillStyle = `rgba(${130 + (i % 4) * 16},${83 + (i % 3) * 11},${38 + (i % 3) * 8},${alpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 2.2, s, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(50,32,18,0.25)";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-s * 2, 0);
      ctx.lineTo(s * 2, 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ── render ─────────────────────────────────────────────── */

  function drawGrade(phase) {
    beginWorld(0);
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgba(19,38,52,${phase * 0.3})`;
    ctx.fillRect(-200, -200, W + 400, H + 400);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(2,7,10,${phase * 0.12})`;
    ctx.fillRect(-200, -200, W + 400, H + 400);
    ctx.restore();
  }

  function renderExterior() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#050a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    beginWorld(0);
    Art.drawSky(ctx, state.phase, state.t);
    beginWorld(1.4);
    Art.drawClouds(ctx, state.phase, state.t);
    beginWorld(0.4);
    Art.drawShootingStar(ctx, state.t, state.phase);

    beginWorld(2.1);
    ctx.drawImage(layers.ridge, 0, 0, W, H);
    beginWorld(2.8);
    ctx.drawImage(layers.far, 0, 0, W, H);
    beginWorld(3.4);
    Art.drawFog(ctx, state.t * 0.6, state.rain);
    beginWorld(4.3);
    ctx.drawImage(layers.mid, 0, 0, W, H);
    beginWorld(5.2);
    Art.drawFog(ctx, state.t * 0.8 + 20, state.rain);

    beginWorld(6.2);
    ctx.drawImage(layers.ground, 0, 0, W, H);
    beginWorld(6.9);
    ctx.drawImage(layers.cabin, 0, 0, W, H);

    drawGrade(state.phase);

    beginWorld(7.2);
    Art.drawExteriorLights(ctx, state.t, state.phase, state.lamp, state.hover, state);
    beginWorld(8.0);
    Art.drawFog(ctx, state.t + 45, state.rain);
    beginWorld(9.4);
    ctx.drawImage(layers.near, 0, 0, W, H);

    beginWorld(8.6);
    drawLeaves(state.t, state.phase);
    Art.drawFireflies(ctx, state.t, state.phase);
    beginWorld(9.0);
    Art.drawRain(ctx, state.t, state.rain);
  }

  function renderInterior() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#050403";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    beginWorld(0);
    ctx.drawImage(layers.interior, 0, 0, W, H);

    beginWorld(0.35);
    Art.drawInteriorWindow(ctx, state.t, state.phase, state.rain, state.curtain, state.hover);
    Art.drawFire(ctx, state.t, state.stoke, state.hover);
    Art.drawInteriorLights(ctx, state.t, state.phase, state.curtain, state.stoke);
    beginWorld(0.7);
    Art.drawCat(ctx, state.t, state.catAwakeUntil > state.t, state.hover === "cat");
    Art.drawRadioNotes(ctx, state.t, state.radioOn);
    Art.drawInteriorAtmosphere(ctx, state.t, state.stoke, state.mugSteam > 0.2, state.hover);
    beginWorld(0.2);
    Art.drawInteriorHover(ctx, state.hover, state.t);
  }

  function render() {
    if (state.mode === "interior") renderInterior();
    else renderExterior();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ── update loop ────────────────────────────────────────── */

  function update(dt) {
    state.t += dt;
    state.phase += (state.phaseTarget - state.phase) * Math.min(1, dt * 1.15);
    state.rain += (state.rainTarget - state.rain) * Math.min(1, dt * 1.6);
    state.lamp += (state.lampTarget - state.lamp) * Math.min(1, dt * 5.5);
    state.curtain += (state.curtainTarget - state.curtain) * Math.min(1, dt * 2.3);
    state.stoke = Math.max(0, state.stoke - dt * 0.34);
    state.mugSteam = Math.max(0, state.mugSteam - dt * 0.3);
    state.pointer.sx += (state.pointer.nx - state.pointer.sx) * Math.min(1, dt * 2.2);
    state.pointer.sy += (state.pointer.ny - state.pointer.sy) * Math.min(1, dt * 2.2);

    cam.zoom += (cam.targetZoom - cam.zoom) * Math.min(1, dt * 3.1);
    cam.x += (cam.tx - cam.x) * Math.min(1, dt * 3.1);
    cam.y += (cam.ty - cam.y) * Math.min(1, dt * 3.1);
    if (state.mode === "interior" && view.portrait) {
      const b = panBounds();
      cam.tx = Math.max(b.min, Math.min(b.max, cam.tx));
      cam.x = Math.max(b.min, Math.min(b.max, cam.x));
    }

    updateSmoke(dt);
    ambience.rain = state.rain;
    if (ambience.enabled && Math.floor(state.t * 60) % 24 === 0) {
      ambience.setFireBoost(state.stoke);
    }

    // slow default whisper rotation
    if (
      state.entered &&
      state.mode === "exterior" &&
      !state.hover &&
      state.t > state.whisperLockedUntil &&
      Math.floor(state.t) % 21 === 0 &&
      Math.abs(state.t - Math.round(state.t)) < dt * 1.5
    ) {
      state.whisperIndex++;
      setWhisper(defaultWhisper(), 0, true);
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - (frame.last || now)) / 1000));
    frame.last = now;
    update(dt);
    render();
    raf = requestAnimationFrame(frame);
  }

  /* ── hotspots / cursor ──────────────────────────────────── */

  function activeHotspots() {
    return state.mode === "interior" ? interiorHotspots : exteriorHotspots;
  }

  function findHotspot(clientX, clientY) {
    const list = activeHotspots();
    let best = null;
    let bestD = Infinity;
    for (const h of list) {
      const p = worldToScreen(h.x, h.y, h.depth);
      const scale = Math.max(0.8, Math.min(1.35, view.scale * cam.zoom));
      const r = h.r * scale;
      const d = Math.hypot(clientX - p.x, clientY - p.y);
      if (d < r && d < bestD) {
        best = h;
        bestD = d;
      }
    }
    return best;
  }

  function setHover(h) {
    const id = h ? h.id : null;
    if (state.hover === id) return;
    state.hover = id;
    cursorEl.classList.toggle("is-active", !!h);
    if (!h) {
      restoreWhisper();
      return;
    }
    setWhisper(h.caption);
  }

  function pointerMove(e) {
    if (
      state.drag &&
      state.drag.id === e.pointerId &&
      state.entered &&
      !state.busy &&
      state.mode === "interior" &&
      view.portrait
    ) {
      const dx = e.clientX - state.drag.x;
      if (Math.abs(dx) > 4) state.drag.moved = true;
      if (state.drag.moved) {
        const s = view.scale * cam.zoom;
        const b = panBounds();
        cam.tx = Math.max(b.min, Math.min(b.max, state.drag.tx + dx / s));
        cam.x = cam.tx;
        document.body.classList.add("is-dragging");
        setHover(null);
        return;
      }
    }
    if (e.pointerType === "touch") return;
    document.body.classList.add("cursor-on");
    cursorEl.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    state.pointer.nx = (e.clientX / view.w - 0.5) * 2;
    state.pointer.ny = (e.clientY / view.h - 0.5) * 2;
    if (!state.entered || state.busy) {
      setHover(null);
      return;
    }
    if (e.target !== canvas) {
      setHover(null);
      return;
    }
    setHover(findHotspot(e.clientX, e.clientY));
  }

  function pointerDown(e) {
    state.press = { x: e.clientX, y: e.clientY, id: e.pointerId };
    if (state.entered && state.mode === "interior" && view.portrait) {
      state.drag = { x: e.clientX, tx: cam.tx, id: e.pointerId, moved: false };
    }
    if (e.pointerType !== "touch") {
      cursorEl.classList.add("is-active");
    }
  }

  function pointerUp(e) {
    const press = state.press;
    const dragged = !!(state.drag && state.drag.moved);
    state.press = null;
    state.drag = null;
    document.body.classList.remove("is-dragging");
    if (!press || press.id !== e.pointerId) return;
    const dist = Math.hypot(e.clientX - press.x, e.clientY - press.y);
    if (dragged || dist > 10) return;
    if (!state.entered || state.busy) return;
    if (e.target !== canvas) return;
    const h = findHotspot(e.clientX, e.clientY);
    if (h) {
      e.preventDefault();
      runAction(h.action, h);
    }
  }

  function pointerLeave() {
    document.body.classList.remove("cursor-on");
    if (state.entered && !state.busy) setHover(null);
  }

  /* ── whisper ────────────────────────────────────────────── */

  function defaultWhisper() {
    const arr = state.mode === "interior" ? ambientWhispers.interior : ambientWhispers.exterior;
    if (state.mode === "exterior" && state.rain > 0.35) return "雨落下来，林子里忽然安静了。";
    return arr[state.whisperIndex % arr.length];
  }

  function setWhisper(text, holdMs, force) {
    if (!text) return;
    if (!force && text === lastWhisperText) return;
    lastWhisperText = text;
    state.whisper = text;
    if (holdMs) state.whisperLockedUntil = state.t + holdMs / 1000;
    cleanWhisperTimers();
    whisperEl.classList.add("is-changing");
    whisperFade = setTimeout(() => {
      whisperEl.textContent = text;
      whisperEl.classList.remove("is-changing");
    }, 180);
    if (holdMs) {
      whisperTimer = setTimeout(() => {
        if (state.hover) return;
        setWhisper(defaultWhisper(), 0, true);
      }, holdMs);
    }
  }

  function cleanWhisperTimers() {
    if (whisperFade) clearTimeout(whisperFade);
    if (whisperTimer) clearTimeout(whisperTimer);
    whisperFade = null;
    whisperTimer = null;
  }

  function restoreWhisper() {
    if (state.t < state.whisperLockedUntil) return;
    setWhisper(defaultWhisper(), 0, true);
  }

  function startWhisperRotation() {
    setInterval(() => {
      if (!state.entered || state.hover || state.busy) return;
      if (state.t < state.whisperLockedUntil) return;
      state.whisperIndex++;
      setWhisper(defaultWhisper(), 0, true);
    }, 21000);
  }

  /* ── actions ────────────────────────────────────────────── */

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, reducedMotion ? Math.min(ms, 260) : ms));
  }

  async function enterCabin() {
    if (state.busy || state.mode !== "exterior") return;
    state.busy = true;
    setHover(null);
    document.body.classList.add("is-transitioning");
    setWhisper("门轴响了一声，比想象中轻。", 2400, true);

    cam.targetZoom = reducedMotion ? baseZoomFor() * 1.18 : baseZoomFor() * 2.35;
    cam.tx = 983 - view.focusX;
    cam.ty = 580 - view.focusY;
    await sleep(880);

    veil.classList.remove("is-cold");
    veil.classList.add("is-on");
    await sleep(420);

    state.mode = "interior";
    resize();
    cam.zoom = baseZoomFor() * 1.035;
    cam.targetZoom = baseZoomFor();
    cam.x = 0;
    cam.y = 0;
    cam.tx = 0;
    cam.ty = 0;
    clampPan();
    ambience.setMode("interior");
    updateHud();
    setWhisper(
      state.rain > 0.35
        ? "雨落在屋顶上，声音变得很软。"
        : view.portrait
        ? "左右拖动，看看屋里别处。"
        : "火还醒着。",
      0,
      true
    );

    await sleep(120);
    veil.classList.remove("is-on");
    await sleep(560);
    document.body.classList.remove("is-transitioning");
    state.busy = false;
    state.whisperLockedUntil = state.t + 1.4;
  }

  async function exitCabin() {
    if (state.busy || state.mode !== "interior") return;
    state.busy = true;
    setHover(null);
    document.body.classList.add("is-transitioning");
    cam.targetZoom = reducedMotion ? baseZoomFor() * 1.04 : baseZoomFor() * 1.18;
    await sleep(500);
    veil.classList.add("is-cold", "is-on");
    await sleep(420);

    state.mode = "exterior";
    resize();
    cam.zoom = baseZoomFor() * 1.03;
    cam.targetZoom = baseZoomFor();
    cam.x = 0;
    cam.y = 0;
    cam.tx = 0;
    cam.ty = 0;
    ambience.setMode("exterior");
    updateHud();
    setWhisper("门在身后合上，林子的气味又回来了。", 3200, true);

    await sleep(120);
    veil.classList.remove("is-on");
    await sleep(540);
    document.body.classList.remove("is-transitioning");
    state.busy = false;
  }

  function toggleLamp() {
    state.lampTarget = state.lampTarget > 0.5 ? 0 : 1;
    setWhisper(state.lampTarget ? "灯芯还很长，够亮到有人回来。" : "灯灭了。月亮替它亮了一会儿。", 3600);
  }

  function toggleWeather() {
    state.rainTarget = state.rainTarget > 0.5 ? 0 : 1;
    state.rainSound = state.rainTarget;
    ambience.setRain(state.rainTarget);
    updateHud();
    setWhisper(state.rainTarget ? "先是几滴，然后整片松林都开始下雨。" : "雨停了。屋檐还在滴水。", 4200);
    if (state.rainTarget && !ambience.enabled && state.entered) {
      // weather stays visual; audio is intentionally opt-in
    }
  }

  function setTime(i) {
    state.timeIndex = i;
    state.phaseTarget = times[i].phase;
    updateHud();
    if (state.entered) {
      setWhisper(
        i === 0
          ? "天还没全黑，屋里的灯先亮了。"
          : i === 1
          ? "夜从林线漫上来，窗子显得更暖。"
          : "这么深的夜，只有这一扇窗还醒着。",
        3200
      );
    }
  }

  function toggleSound(force) {
    const want = typeof force === "boolean" ? force : !ambience.enabled;
    if (!want) {
      ambience.setEnabled(false);
      state.sound = false;
      updateHud();
      return Promise.resolve(false);
    }
    return ambience.start().then((ok) => {
      state.sound = !!ok && ambience.enabled;
      if (ok) {
        ambience.setMode(state.mode);
        ambience.setRain(state.rainTarget);
      }
      updateHud();
      if (!ok) setWhisper("这台设备没有让声音醒过来。", 2400);
      return ok;
    });
  }

  function pressFire() {
    state.stoke = Math.min(1.8, state.stoke + 0.75);
    state.catAwakeUntil = state.t + 0.9;
    ambience.pulseFire();
    setWhisper(
      state.stoke > 1.2 ? "火苗窜起来，影子在墙上翻了个身。" : "炭火塌下去一点，又慢慢亮起来。",
      3400
    );
  }

  function pressRadio() {
    state.radioOn = !state.radioOn;
    if (state.radioOn) {
      if (!ambience.enabled) {
        toggleSound(true).then(() => ambience.setRadio(true));
      } else {
        ambience.setRadio(true);
      }
      setWhisper("旧收音机醒了。是一支听不出年代的曲子。", 4200);
    } else {
      ambience.setRadio(false);
      setWhisper("旋钮转到底，房间重新安静下来。", 3000);
    }
  }

  function pressCurtain() {
    state.curtainTarget = state.curtainTarget > 0.5 ? 0 : 1;
    setWhisper(
      state.curtainTarget
        ? "把夜色关在外面，火声就显得更近了。"
        : "拉开窗帘，雨还在，松林也在。",
      3600
    );
  }

  function pressMug() {
    state.mugSteam = 1.5;
    setWhisper("茶凉了。可杯子被火烤得温温的，像谁刚放下。", 4200);
  }

  function pressCat() {
    state.catAwakeUntil = state.t + 1.6;
    setWhisper("猫醒了半秒，看了看火，又睡了。", 3200);
  }

  function pressPeek() {
    setWhisper("窗里没有人。只有一只猫，守着它的那小块暖。", 3800);
  }

  function pressChimney() {
    for (const p of state.smoke) p.life = Math.random() * 0.3;
    setWhisper("烟从瓦缝里出来，散得很慢。", 2800);
  }

  function pressMoon() {
    setWhisper("月亮挂在那里，像一句没有说出口的话。", 3200);
  }

  function pressPuddle() {
    setWhisper("水里的窗比真的窗更亮一点。", 3200);
  }

  function pressChair() {
    setWhisper("毯子上有一道折痕，像有人刚刚起身。", 3600);
  }

  function runAction(action) {
    switch (action) {
      case "enter":
        enterCabin();
        break;
      case "lamp":
        toggleLamp();
        break;
      case "peek":
        pressPeek();
        break;
      case "smoke":
        pressChimney();
        break;
      case "moon":
        pressMoon();
        break;
      case "puddle":
        pressPuddle();
        break;
      case "fire":
        pressFire();
        break;
      case "cat":
        pressCat();
        break;
      case "mug":
        pressMug();
        break;
      case "radio":
        pressRadio();
        break;
      case "curtain":
        pressCurtain();
        break;
      case "chair":
        pressChair();
        break;
      default:
        break;
    }
  }

  /* ── hud ────────────────────────────────────────────────── */

  function updateHud() {
    const t = times[state.timeIndex];
    clockEl.textContent = t.clock;
    sceneNameEl.textContent = state.mode === "interior" ? "屋内" : "林间";
    document.body.classList.toggle("is-interior", state.mode === "interior");
    document.body.classList.toggle("is-exterior", state.mode !== "interior");
    weatherStateEl.textContent = state.rainTarget > 0.5 ? "细雨" : "薄雾";
    weatherLabel.textContent = state.rainTarget > 0.5 ? "收雨" : "细雨";
    weatherToggle.setAttribute("aria-pressed", String(state.rainTarget > 0.5));
    weatherToggle.setAttribute(
      "aria-label",
      state.rainTarget > 0.5 ? "收起细雨，恢复薄雾" : "让林间下起细雨"
    );
    soundToggle.setAttribute("aria-pressed", String(ambience.enabled));
    soundLabel.textContent = ambience.enabled ? "声音 开" : "声音 关";
    soundToggle.setAttribute("aria-label", ambience.enabled ? "关闭环境声音" : "开启环境声音");
    doorLabel.textContent = state.mode === "interior" ? "回到林间" : "推门";
    doorBtn.setAttribute("aria-label", state.mode === "interior" ? "回到林间" : "推门走进木屋");
    railDot.style.left = `${state.timeIndex * 50}%`;
    timeButtons.forEach((b, i) => {
      const on = i === state.timeIndex;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  /* ── experience ─────────────────────────────────────────── */

  function removeIntro() {
    if (!intro) return;
    intro.setAttribute("aria-hidden", "true");
    intro.style.display = "none";
  }

  function startExperience(withSound) {
    if (state.entered) return;
    state.entered = true;
    document.body.classList.add("is-entering");
    hud.removeAttribute("aria-hidden");
    hud.inert = false;
    state.whisperIndex = 0;
    setWhisper(defaultWhisper(), 0, true);
    cam.zoom = baseZoomFor() * 1.025;
    cam.targetZoom = baseZoomFor();
    cam.init = true;
    if (withSound) toggleSound(true);
    setTimeout(() => {
      document.body.classList.remove("is-entering");
      document.body.classList.add("is-entered");
      removeIntro();
      startWhisperRotation();
    }, reducedMotion ? 100 : 950);
  }

  function instantEnter(opts) {
    state.entered = true;
    document.body.classList.add("is-entered");
    hud.removeAttribute("aria-hidden");
    hud.inert = false;
    removeIntro();
    if (opts && opts.mode === "interior") {
      state.mode = "interior";
      resize();
      ambience.setMode("interior");
    }
    cam.init = true;
    cam.zoom = baseZoomFor();
    cam.targetZoom = baseZoomFor();
    cam.x = cam.tx = 0;
    cam.y = cam.ty = 0;
    clampPan();
    if (opts && typeof opts.phase === "number") {
      state.phase = opts.phase;
      state.phaseTarget = opts.phase;
      state.timeIndex = opts.phase > 0.75 ? 2 : opts.phase > 0.25 ? 1 : 0;
    }
    if (opts && opts.rain) {
      state.rain = 1;
      state.rainTarget = 1;
      ambience.rain = 1;
    }
    if (opts && opts.curtain) {
      state.curtain = 1;
      state.curtainTarget = 1;
    }
    if (opts && opts.radio) {
      state.radioOn = true;
    }
    updateHud();
    if (state.mode === "interior" && view.portrait) {
      setWhisper("左右拖动，看看屋里别处。", 0, true);
    } else {
      setWhisper(defaultWhisper(), 0, true);
    }
  }

  /* ── events ─────────────────────────────────────────────── */

  function bindEvents() {
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", pointerMove, { passive: true });
    window.addEventListener("pointerdown", pointerDown, { passive: true });
    window.addEventListener("pointerup", pointerUp, { passive: false });
    document.addEventListener("pointerleave", pointerLeave);
    document.addEventListener("mouseout", (e) => {
      if (!e.relatedTarget) pointerLeave();
    });

    enterBtn.addEventListener("click", () => startExperience(true));
    enterSilent.addEventListener("click", () => startExperience(false));

    timeButtons.forEach((b, i) => b.addEventListener("click", () => setTime(i)));
    weatherToggle.addEventListener("click", toggleWeather);
    soundToggle.addEventListener("click", () => toggleSound());
    doorBtn.addEventListener("click", () => {
      if (state.busy) return;
      if (state.mode === "interior") exitCabin();
      else enterCabin();
    });

    document.addEventListener("keydown", (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === "escape" && state.mode === "interior" && state.entered && !state.busy) {
        exitCabin();
        return;
      }
      if (!state.entered || state.busy) return;
      if (k === "1") setTime(0);
      else if (k === "2") setTime(1);
      else if (k === "3") setTime(2);
      else if (k === "r") toggleWeather();
      else if (k === "s") toggleSound();
      else if (k === "l" && state.mode === "exterior") toggleLamp();
      else if (k === "e") {
        if (state.mode === "interior") exitCabin();
        else enterCabin();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (!ambience.ctx) return;
      if (document.hidden && ambience.ctx.state === "running") ambience.ctx.suspend();
      else if (!document.hidden && ambience.enabled && ambience.ctx.state === "suspended") {
        ambience.ctx.resume();
      }
    });

    // small debug surface for interaction tests and for curious visitors
    window.CabinDebug = {
      state, view, cam,
      setTime, toggleWeather, toggleLamp, toggleSound,
      enterCabin, exitCabin, runAction, worldToScreen, activeHotspots, ambience,
    };
  }

  /* ── boot ───────────────────────────────────────────────── */

  function boot() {
    resize();
    initSmoke();
    updateHud();
    bindEvents();

    // defer heavy art build one frame so intro text paints immediately
    requestAnimationFrame(() => {
      try {
        layers = Art.buildLayers();
      } catch (e) {
        console.error(e);
      }
      hud.inert = true;
      document.body.classList.add("is-ready");
      frame.last = performance.now();
      raf = requestAnimationFrame(frame);

      const params = new URLSearchParams(location.search);
      const viewParam = params.get("view");
      if (viewParam) {
        const phase = params.has("phase") ? Number(params.get("phase")) : 0;
        instantEnter({
          mode: viewParam,
          phase: Number.isFinite(phase) ? phase : 0,
          rain: params.get("rain") === "1",
          curtain: params.get("curtain") === "1",
          radio: params.get("radio") === "1",
        });
      }
    });
  }

  boot();
})();
