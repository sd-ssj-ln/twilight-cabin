/* ─────────────────────────────────────────────────────────────
   暮色林中小屋 · scene art
   Every tree, stone, flame and mote is drawn procedurally.
   No images, no libraries.
   ───────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  const W = 1600;
  const H = 900;
  const TAU = Math.PI * 2;

  /* ── small utilities ─────────────────────────────────────── */

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function hexRgb(hex) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function mixHex(a, b, t) {
    const A = hexRgb(a);
    const B = hexRgb(b);
    return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(
      lerp(A[2], B[2], t)
    )})`;
  }

  function rgba(hex, a) {
    const c = hexRgb(hex);
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  function shade(hex, amount) {
    const c = hexRgb(hex);
    return `rgb(${clamp(Math.round(c[0] + amount), 0, 255)},${clamp(
      Math.round(c[1] + amount),
      0,
      255
    )},${clamp(Math.round(c[2] + amount), 0, 255)})`;
  }

  function makeLayer(draw, scale) {
    const c = document.createElement("canvas");
    c.width = Math.round(W * scale);
    c.height = Math.round(H * scale);
    const g = c.getContext("2d");
    g.scale(scale, scale);
    draw(g);
    return c;
  }

  function pineSilhouette(g, x, base, h, color, rand, lean) {
    const half = h * (0.19 + rand() * 0.08);
    const topX = x + (rand() - 0.5) * h * 0.04 + (lean || 0);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x - h * 0.012, base);
    g.lineTo(topX - h * 0.004, base - h);
    g.lineTo(x + h * 0.014, base);
    g.closePath();
    g.fill();

    const tiers = 7 + Math.floor(rand() * 4);
    for (let i = 0; i < tiers; i++) {
      const p = i / tiers;
      const y = base - h * (0.18 + p * 0.78);
      const spread = half * (0.25 + p * 0.95) * (0.8 + rand() * 0.3);
      const drop = h * (0.055 + rand() * 0.045);
      const skew = (rand() - 0.5) * spread * 0.25;
      g.beginPath();
      g.moveTo(topX + skew * 0.4, y - drop * 0.3);
      const steps = 5;
      for (let s = 1; s <= steps; s++) {
        const q = s / steps;
        g.lineTo(topX + skew * (1 - q) - spread * q, y + drop * q * (1.02 + rand() * 0.25));
        if (s < steps) g.lineTo(topX - spread * q * 0.66, y + drop * (q + 0.11));
      }
      g.lineTo(topX - spread * 0.16, y + drop * 0.62);
      for (let s = steps; s >= 1; s--) {
        const q = s / steps;
        g.lineTo(topX + spread * q, y + drop * q * (1.03 + rand() * 0.2));
        if (s > 1) g.lineTo(topX + spread * q * 0.66, y + drop * (q - 0.08));
      }
      g.closePath();
      g.fill();
    }
  }

  function birchSilhouette(g, x, base, h, color, rand) {
    g.strokeStyle = color;
    g.lineCap = "round";
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(x, base);
    g.bezierCurveTo(x - 5, base - h * 0.4, x + 8, base - h * 0.7, x + 2, base - h);
    g.stroke();
    for (let i = 0; i < 12; i++) {
      const y = base - h * (0.25 + rand() * 0.7);
      const dir = rand() > 0.5 ? 1 : -1;
      const len = h * (0.06 + rand() * 0.14);
      g.lineWidth = 1 + rand() * 1.2;
      g.beginPath();
      g.moveTo(x + (rand() - 0.5) * 4, y);
      g.quadraticCurveTo(x + dir * len * 0.5, y - 5 - rand() * 9, x + dir * len, y - 10 - rand() * 14);
      g.stroke();
    }
  }

  function drawBirds(g, t, alpha) {
    if (alpha <= 0.01) return;
    const cycle = 46;
    const p = (t % cycle) / cycle;
    if (p > 0.52) return;
    const baseX = lerp(-120, 880, p / 0.52);
    const baseY = 150 + Math.sin(p * 16) * 16;
    g.save();
    g.strokeStyle = `rgba(12,20,20,${alpha})`;
    g.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const x = baseX + i * (26 + i * 6);
      const y = baseY + Math.sin(i * 2.1) * 12 + i * 7;
      const flap = Math.sin(t * 4.2 + i * 1.7) * 4;
      g.beginPath();
      g.moveTo(x - 8, y + flap);
      g.quadraticCurveTo(x - 2, y - 2, x, y + 1);
      g.quadraticCurveTo(x + 2, y - 2, x + 8, y + flap);
      g.stroke();
    }
    g.restore();
  }

  function drawMoon(g, phase, t) {
    const x = 684;
    const y = 178 + Math.sin(t * 0.02) * 1.2;
    const alpha = 0.62 + phase * 0.28;
    const halo = g.createRadialGradient(x, y, 8, x, y, 220);
    halo.addColorStop(0, `rgba(228,230,205,${0.2 * alpha})`);
    halo.addColorStop(0.28, `rgba(212,220,200,${0.075 * alpha})`);
    halo.addColorStop(1, "rgba(190,206,190,0)");
    g.fillStyle = halo;
    g.beginPath();
    g.arc(x, y, 220, 0, TAU);
    g.fill();

    const body = g.createRadialGradient(x - 9, y - 10, 2, x, y, 37);
    body.addColorStop(0, `rgba(247,243,220,${alpha})`);
    body.addColorStop(0.72, `rgba(232,229,205,${alpha * 0.97})`);
    body.addColorStop(1, `rgba(197,199,179,${alpha * 0.92})`);
    g.fillStyle = body;
    g.beginPath();
    g.arc(x, y, 35, 0, TAU);
    g.fill();

    g.save();
    g.globalCompositeOperation = "multiply";
    const craters = [
      [-10, -7, 7, 0.08],
      [8, 9, 10, 0.07],
      [-2, 16, 5, 0.06],
      [15, -12, 4, 0.06],
      [-16, 12, 4, 0.055],
    ];
    for (const c of craters) {
      const cg = g.createRadialGradient(x + c[0], y + c[1], 0, x + c[0], y + c[1], c[2]);
      cg.addColorStop(0, `rgba(120,125,120,${c[3]})`);
      cg.addColorStop(1, "rgba(120,125,120,0)");
      g.fillStyle = cg;
      g.beginPath();
      g.arc(x + c[0], y + c[1], c[2], 0, TAU);
      g.fill();
    }
    g.restore();
  }

  const starRand = mulberry32(77821);
  const stars = Array.from({ length: 190 }, () => ({
    x: starRand() * W,
    y: starRand() * 470,
    r: 0.45 + starRand() * 1.35,
    p: starRand() * TAU,
    s: 0.4 + starRand() * 1.6,
  }));

  function drawSky(g, phase, t) {
    const top = mixHex("#23313a", "#03070d", smooth(0, 0.92, phase));
    const mid = mixHex("#535a57", "#0b151e", smooth(0, 0.9, phase));
    const low = mixHex("#a27b5b", "#29363c", smooth(0, 1, phase));
    const bottom = mixHex("#c99967", "#3d4748", smooth(0, 1, phase));

    g.fillStyle = top;
    g.fillRect(-300, -300, W + 600, H + 600);

    const sky = g.createLinearGradient(0, 0, 0, 570);
    sky.addColorStop(0, top);
    sky.addColorStop(0.42, mid);
    sky.addColorStop(0.78, low);
    sky.addColorStop(1, bottom);
    g.fillStyle = sky;
    g.fillRect(-300, -300, W + 600, 900);

    const glow = g.createRadialGradient(588, 512, 10, 588, 512, 520);
    glow.addColorStop(0, `rgba(236,172,111,${0.4 * (1 - phase * 0.82)})`);
    glow.addColorStop(0.36, `rgba(205,139,92,${0.18 * (1 - phase * 0.8)})`);
    glow.addColorStop(1, "rgba(150,110,90,0)");
    g.fillStyle = glow;
    g.fillRect(-200, 160, W + 400, 430);

    const haze = g.createLinearGradient(0, 430, 0, 590);
    haze.addColorStop(0, "rgba(211,196,172,0)");
    haze.addColorStop(1, `rgba(192,188,170,${0.14 + phase * 0.03})`);
    g.fillStyle = haze;
    g.fillRect(-200, 430, W + 400, 170);

    const starAlpha = smooth(0.18, 0.72, phase);
    if (starAlpha > 0.01) {
      for (const s of stars) {
        const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.s + s.p));
        g.fillStyle = `rgba(227,232,214,${starAlpha * tw * (0.25 + s.r * 0.38)})`;
        g.beginPath();
        g.arc(s.x, s.y, s.r, 0, TAU);
        g.fill();
      }
      for (let i = 0; i < 7; i++) {
        const a = stars[i * 13];
        const tw = 0.5 + 0.5 * Math.sin(t * 2.1 + a.p);
        g.strokeStyle = `rgba(230,235,215,${starAlpha * tw * 0.4})`;
        g.lineWidth = 0.7;
        g.beginPath();
        g.moveTo(a.x - 4, a.y);
        g.lineTo(a.x + 4, a.y);
        g.moveTo(a.x, a.y - 4);
        g.lineTo(a.x, a.y + 4);
        g.stroke();
      }
    }

    drawMoon(g, phase, t);
    drawBirds(g, t, 0.32 * (1 - phase * 0.55));
  }

  function drawClouds(g, phase, t) {
    const color = phase < 0.55 ? [194, 176, 153] : [122, 138, 138];
    const c = new THREE_COLOR(color);
    for (let i = 0; i < 9; i++) {
      const speed = 2.1 + (i % 3) * 1.2;
      const bw = 220 + (i % 4) * 150;
      let x = ((i * 271 + t * speed) % (W + 700)) - 350;
      const y = 120 + (i % 4) * 66 + Math.sin(i * 1.7) * 18;
      const alpha = (0.03 + (i % 3) * 0.012) * (0.62 + phase * 0.2);
      g.save();
      g.translate(x, y);
      g.scale(1, 0.22 + (i % 3) * 0.04);
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, bw);
      grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${alpha})`);
      grad.addColorStop(0.45, `rgba(${c[0]},${c[1]},${c[2]},${alpha * 0.55})`);
      grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, 0, bw, 0, TAU);
      g.fill();
      g.restore();
    }
  }

  // tiny helper so cloud color arrays stay readable
  function THREE_COLOR(c) {
    return c;
  }

  /* ── static exterior layers ──────────────────────────────── */

  function drawRidge(g) {
    const rand = mulberry32(9917);
    g.fillStyle = "#1c2f2b";
    g.beginPath();
    g.moveTo(-100, 620);
    g.lineTo(-100, 505);
    let x = -100;
    while (x < W + 120) {
      const step = 60 + rand() * 100;
      const y = 500 + rand() * 50;
      g.quadraticCurveTo(x + step * 0.45, y - 18 - rand() * 30, x + step, 512 + rand() * 40);
      x += step;
    }
    g.lineTo(W + 120, 620);
    g.closePath();
    g.fill();

    const rand2 = mulberry32(551);
    for (let i = 0; i < 78; i++) {
      const tx = -30 + rand2() * (W + 60);
      const ty = 510 + rand2() * 44;
      const th = 22 + rand2() * 62;
      pineSilhouette(g, tx, ty, th, "rgba(16,33,30,0.92)", rand2, 0);
    }

    const fog = g.createLinearGradient(0, 500, 0, 620);
    fog.addColorStop(0, "rgba(173,186,175,0)");
    fog.addColorStop(0.7, "rgba(173,186,175,0.12)");
    fog.addColorStop(1, "rgba(150,166,157,0)");
    g.fillStyle = fog;
    g.fillRect(0, 490, W, 150);
  }

  function drawFarForest(g) {
    const rand = mulberry32(42311);
    for (let i = 0; i < 70; i++) {
      const x = -30 + (i / 70) * (W + 60) + (rand() - 0.5) * 32;
      const base = 590 + rand() * 28;
      const h = 140 + rand() * 185;
      const col = rand() > 0.6 ? "#1a2b28" : "#162724";
      pineSilhouette(g, x, base, h, col, rand, (rand() - 0.5) * 16);
    }
    for (let i = 0; i < 5; i++) {
      birchSilhouette(g, 210 + i * 290 + rand() * 60, 604, 170 + rand() * 70, "rgba(91,107,99,0.7)", rand);
    }
    const fog = g.createLinearGradient(0, 480, 0, 650);
    fog.addColorStop(0, "rgba(164,178,168,0)");
    fog.addColorStop(0.66, "rgba(164,178,168,0.15)");
    fog.addColorStop(1, "rgba(132,151,141,0.02)");
    g.fillStyle = fog;
    g.fillRect(0, 470, W, 200);
  }

  function drawMidForest(g) {
    const rand = mulberry32(81233);
    for (let i = 0; i < 30; i++) {
      const x = -80 + (i / 29) * (W + 160) + (rand() - 0.5) * 70;
      const base = 660 + rand() * 40;
      const h = 280 + rand() * 290;
      const col = rand() > 0.72 ? "#0a1715" : "#0c1a18";
      pineSilhouette(g, x, base, h, col, rand, (rand() - 0.5) * 28);
    }
    for (let i = 0; i < 4; i++) {
      birchSilhouette(g, 140 + i * 390 + rand() * 100, 665, 260 + rand() * 110, "rgba(53,68,62,0.8)", rand);
    }
    const mist = g.createLinearGradient(0, 560, 0, 760);
    mist.addColorStop(0, "rgba(155,172,162,0)");
    mist.addColorStop(0.7, "rgba(155,172,162,0.09)");
    mist.addColorStop(1, "rgba(109,131,122,0)");
    g.fillStyle = mist;
    g.fillRect(0, 550, W, 220);
  }

  function pathCenter(y) {
    const t = clamp((y - 690) / 240, 0, 1);
    return lerp(978, 760, t * t * 0.82 + t * 0.18);
  }

  function drawGround(g) {
    const rand = mulberry32(45109);
    const grad = g.createLinearGradient(0, 540, 0, H);
    grad.addColorStop(0, "#2c3930");
    grad.addColorStop(0.18, "#1d2b24");
    grad.addColorStop(0.56, "#121e19");
    grad.addColorStop(1, "#080f0d");
    g.fillStyle = grad;
    g.fillRect(-100, 530, W + 200, H - 430);

    // soft clearing light
    const pool = g.createRadialGradient(1010, 690, 20, 1010, 700, 470);
    pool.addColorStop(0, "rgba(129,123,93,0.08)");
    pool.addColorStop(0.55, "rgba(90,100,76,0.035)");
    pool.addColorStop(1, "rgba(40,60,50,0)");
    g.fillStyle = pool;
    g.fillRect(400, 560, 900, 340);

    // footpath
    g.beginPath();
    g.moveTo(968, 676);
    g.bezierCurveTo(1020, 730, 940, 790, 820, 840);
    g.bezierCurveTo(745, 872, 690, 892, 660, 920);
    g.lineTo(990, 920);
    g.bezierCurveTo(930, 850, 1040, 780, 1058, 720);
    g.closePath();
    g.fillStyle = "#211d17";
    g.fill();
    g.strokeStyle = "rgba(143,132,104,0.1)";
    g.lineWidth = 1;
    g.stroke();

    // path stones
    for (let i = 0; i < 46; i++) {
      const y = 690 + rand() * 210;
      const cx = pathCenter(y) + (rand() - 0.5) * (80 + (y - 690) * 0.55);
      const rx = 4 + rand() * 14 * (0.6 + (y - 680) / 300);
      const ry = 2 + rand() * 4;
      g.fillStyle = `rgba(${86 + Math.round(rand() * 20)},${82 + Math.round(rand() * 16)},${66 + Math.round(
        rand() * 12
      )},${0.14 + rand() * 0.2})`;
      g.beginPath();
      g.ellipse(cx, y, rx, ry, rand() * 0.5, 0, TAU);
      g.fill();
    }

    // puddles
    function puddle(cx, cy, rx, ry) {
      const p = g.createLinearGradient(0, cy - ry, 0, cy + ry);
      p.addColorStop(0, "rgba(35,50,49,0.92)");
      p.addColorStop(0.55, "rgba(12,24,24,0.95)");
      p.addColorStop(1, "rgba(7,14,14,0.98)");
      g.fillStyle = p;
      g.beginPath();
      g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
      g.fill();
      g.strokeStyle = "rgba(154,165,146,0.12)";
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
      g.stroke();
    }
    puddle(622, 778, 108, 20);
    puddle(1128, 744, 62, 11);
    puddle(844, 858, 72, 14);

    // grass and low scrub
    const avoid = (x, y) => Math.abs(x - pathCenter(y)) < 55 + (y - 690) * 0.42;
    for (let i = 0; i < 520; i++) {
      const x = -30 + rand() * (W + 60);
      const y = 608 + rand() * 300;
      if (avoid(x, y)) continue;
      const h = 4 + rand() * 16;
      const lean = (rand() - 0.5) * 10;
      g.strokeStyle = `rgba(${28 + Math.round(rand() * 24)},${43 + Math.round(rand() * 28)},${35 + Math.round(
        rand() * 18
      )},${0.3 + rand() * 0.4})`;
      g.lineWidth = 0.7 + rand() * 0.9;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + lean * 0.45, y - h * 0.55, x + lean, y - h);
      g.stroke();
    }

    // ferns
    for (let i = 0; i < 11; i++) {
      const fx = 60 + rand() * 330 + (i > 6 ? 950 : 0);
      const fy = 730 + rand() * 140;
      drawFern(g, fx, fy, 30 + rand() * 34, rand, "rgba(18,37,29,0.85)");
    }

    // rocks
    for (let i = 0; i < 13; i++) {
      const x = -20 + rand() * (W + 40);
      const y = 690 + rand() * 190;
      if (avoid(x, y)) continue;
      const r = 5 + rand() * 19;
      const rock = g.createLinearGradient(x - r, y - r, x + r, y + r);
      rock.addColorStop(0, "rgba(65,69,59,0.72)");
      rock.addColorStop(0.6, "rgba(39,45,39,0.85)");
      rock.addColorStop(1, "rgba(21,28,25,0.9)");
      g.fillStyle = rock;
      g.beginPath();
      g.ellipse(x, y, r, r * 0.52, rand() * 0.4, 0, TAU);
      g.fill();
      g.fillStyle = "rgba(126,134,112,0.08)";
      g.beginPath();
      g.ellipse(x - r * 0.2, y - r * 0.22, r * 0.55, r * 0.18, 0.1, 0, TAU);
      g.fill();
    }

    // fallen log
    g.save();
    g.translate(380, 758);
    g.rotate(-0.06);
    const logGrad = g.createLinearGradient(0, -18, 0, 24);
    logGrad.addColorStop(0, "#302a20");
    logGrad.addColorStop(0.45, "#221f18");
    logGrad.addColorStop(1, "#101411");
    g.fillStyle = logGrad;
    g.beginPath();
    g.roundRect(-122, -20, 248, 40, 17);
    g.fill();
    g.strokeStyle = "rgba(122,110,80,0.15)";
    g.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.moveTo(-112 + i * 24, -12 + (i % 3) * 5);
      g.lineTo(-100 + i * 24, 9 + (i % 2) * 4);
      g.stroke();
    }
    g.fillStyle = "rgba(60,83,54,0.35)";
    g.beginPath();
    g.ellipse(-18, -18, 70, 6, -0.02, 0, TAU);
    g.fill();
    g.strokeStyle = "rgba(20,26,20,0.8)";
    g.beginPath();
    g.ellipse(126, 0, 8, 20, 0, 0, TAU);
    g.stroke();
    g.restore();

    // mushrooms
    for (let i = 0; i < 9; i++) {
      const x = 330 + rand() * 90 + (i > 5 ? 430 : 0);
      const y = 775 + rand() * 55;
      const s = 2 + rand() * 3;
      g.strokeStyle = "rgba(155,151,124,0.42)";
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y - s * 2.6);
      g.stroke();
      g.fillStyle = "rgba(139,110,77,0.55)";
      g.beginPath();
      g.ellipse(x, y - s * 2.7, s * 1.5, s * 0.7, 0, Math.PI, TAU);
      g.fill();
    }

    // leaf litter
    for (let i = 0; i < 680; i++) {
      const x = -20 + rand() * (W + 40);
      const y = 620 + rand() * 280;
      if (avoid(x, y)) continue;
      g.fillStyle = `rgba(${82 + Math.round(rand() * 55)},${60 + Math.round(rand() * 40)},${34 + Math.round(
        rand() * 26
      )},${0.08 + rand() * 0.22})`;
      g.beginPath();
      g.ellipse(x, y, 1 + rand() * 3, 0.6 + rand() * 1.4, rand() * TAU, 0, TAU);
      g.fill();
    }

    // distant low bushes
    for (let i = 0; i < 24; i++) {
      const x = -20 + rand() * (W + 40);
      const y = 640 + rand() * 100;
      const r = 15 + rand() * 40;
      const bush = g.createRadialGradient(x, y - r * 0.5, 0, x, y, r);
      bush.addColorStop(0, "rgba(28,46,37,0.6)");
      bush.addColorStop(1, "rgba(15,28,22,0)");
      g.fillStyle = bush;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
    }

    // dark foreground lip
    const lip = g.createLinearGradient(0, 850, 0, H);
    lip.addColorStop(0, "rgba(3,8,6,0)");
    lip.addColorStop(1, "rgba(2,6,5,0.9)");
    g.fillStyle = lip;
    g.fillRect(0, 820, W, 100);
  }

  function drawFern(g, x, y, size, rand, color) {
    const blades = 5 + Math.floor(rand() * 4);
    for (let i = 0; i < blades; i++) {
      const a = -Math.PI / 2 + (i - (blades - 1) / 2) * 0.42 + (rand() - 0.5) * 0.1;
      const len = size * (0.55 + rand() * 0.55);
      const tipX = x + Math.cos(a) * len;
      const tipY = y + Math.sin(a) * len;
      g.strokeStyle = color;
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 - 7, y + Math.sin(a) * len * 0.55, tipX, tipY);
      g.stroke();
      for (let j = 1; j < 7; j++) {
        const q = j / 7;
        const px = lerp(x, tipX, q) - 7 * Math.sin(q * Math.PI * 0.8);
        const py = lerp(y, tipY, q);
        const leaf = size * 0.13 * (1 - q * 0.55);
        g.lineWidth = 0.7;
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px + Math.cos(a - 1.15) * leaf, py + Math.sin(a - 1.15) * leaf);
        g.moveTo(px, py);
        g.lineTo(px + Math.cos(a + 1.15) * leaf, py + Math.sin(a + 1.15) * leaf);
        g.stroke();
      }
    }
  }

  /* ── cabin ───────────────────────────────────────────────── */

  function drawLogCourse(g, x1, x2, y, h, rand, light) {
    const sag = (rand() - 0.5) * 2.4;
    const grad = g.createLinearGradient(0, y, 0, y + h);
    const base = 52 + Math.round(rand() * 18) + light;
    grad.addColorStop(0, `rgb(${base + 12},${base - 2},${base - 18})`);
    grad.addColorStop(0.18, `rgb(${base},${base - 12},${base - 24})`);
    grad.addColorStop(0.72, `rgb(${base - 14},${base - 23},${base - 32})`);
    grad.addColorStop(1, `rgb(${Math.max(14, base - 28)},${Math.max(12, base - 35)},${Math.max(
      10,
      base - 40
    )})`);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(x1, y + 1);
    g.quadraticCurveTo((x1 + x2) / 2, y + sag, x2, y + 1);
    g.lineTo(x2, y + h - 1.5);
    g.quadraticCurveTo((x1 + x2) / 2, y + h - 3 + sag, x1, y + h - 1.5);
    g.closePath();
    g.fill();

    g.strokeStyle = "rgba(190,169,126,0.09)";
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x1 + 2, y + 1.5);
    g.quadraticCurveTo((x1 + x2) / 2, y + sag + 1, x2 - 2, y + 1.5);
    g.stroke();

    // grain
    for (let i = 0; i < 4; i++) {
      const gy = y + 2 + rand() * (h - 4);
      g.strokeStyle = `rgba(15,13,10,${0.06 + rand() * 0.09})`;
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(x1 + 4, gy);
      g.bezierCurveTo(x1 + (x2 - x1) * 0.3, gy + rand() * 2, x1 + (x2 - x1) * 0.7, gy - rand() * 2, x2 - 4, gy);
      g.stroke();
    }

    // knots and moss
    if (rand() > 0.6) {
      const kx = x1 + 20 + rand() * (x2 - x1 - 40);
      const ky = y + h * 0.5;
      g.strokeStyle = "rgba(14,13,11,0.45)";
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(kx, ky, 2 + rand() * 3, 1.2 + rand() * 1.6, 0, 0, TAU);
      g.stroke();
    }
    if (rand() > 0.55) {
      const mx = x1 + 12 + rand() * (x2 - x1 - 30);
      g.fillStyle = `rgba(${41 + Math.round(rand() * 20)},${64 + Math.round(
        rand() * 18
      )},${43 + Math.round(rand() * 12)},${0.18 + rand() * 0.24})`;
      g.beginPath();
      g.ellipse(mx, y + h - 1, 8 + rand() * 18, 2 + rand() * 3, 0, 0, TAU);
      g.fill();
    }
  }

  function drawStoneWall(g, x, y, w, h, rand, palette) {
    const cols = ["#45443b", "#3b3b34", "#4d4a3e", "#35362f", "#504b3d"];
    let row = 0;
    let yy = y;
    while (yy < y + h) {
      const rh = 9 + rand() * 9;
      let xx = x - rand() * 12;
      while (xx < x + w) {
        const rw = 13 + rand() * 26;
        const c = cols[Math.floor(rand() * cols.length)];
        g.fillStyle = c;
        g.beginPath();
        g.roundRect(xx + 1, yy + 1, rw - 2, rh - 2, 2.5);
        g.fill();
        g.fillStyle = "rgba(191,182,151,0.08)";
        g.beginPath();
        g.roundRect(xx + 1.5, yy + 1.5, rw - 4, 1.6, 1);
        g.fill();
        g.fillStyle = "rgba(10,13,11,0.18)";
        g.beginPath();
        g.roundRect(xx + 1.5, yy + rh - 3, rw - 3, 1.6, 1);
        g.fill();
        xx += rw;
      }
      yy += rh;
      row++;
      if (row > 60) break;
    }
    g.fillStyle = "rgba(10,14,11,0.12)";
    g.fillRect(x, y, w, h);
  }

  function drawChimney(g, rand) {
    const x = 1092;
    const top = 245;
    const bottom = 430;
    const w = 58;
    g.save();
    g.fillStyle = "rgba(4,8,7,0.3)";
    g.beginPath();
    g.ellipse(x + w / 2, 422, w * 0.8, 26, 0, 0, TAU);
    g.fill();
    drawStoneWall(g, x, top, w, bottom - top, rand, null);
    g.fillStyle = "#272822";
    g.beginPath();
    g.roundRect(x - 7, top - 12, w + 14, 12, 2);
    g.fill();
    g.fillStyle = "rgba(170,163,132,0.12)";
    g.beginPath();
    g.roundRect(x - 5, top - 11, w + 10, 2, 1);
    g.fill();
    g.fillStyle = "#151712";
    g.beginPath();
    g.roundRect(x + 8, top - 22, w - 16, 10, 2);
    g.fill();
    g.fillStyle = "rgba(194,181,141,0.09)";
    g.beginPath();
    g.roundRect(x + 10, top - 21, w - 20, 1.4, 1);
    g.fill();

    // soot lean
    const soot = g.createLinearGradient(0, top - 20, 0, top + 80);
    soot.addColorStop(0, "rgba(8,10,9,0.22)");
    soot.addColorStop(1, "rgba(8,10,9,0)");
    g.fillStyle = soot;
    g.fillRect(x, top - 20, w, 80);

    // moss on stones
    for (let i = 0; i < 12; i++) {
      g.fillStyle = `rgba(${38 + Math.round(rand() * 24)},${58 + Math.round(
        rand() * 20
      )},${42 + Math.round(rand() * 14)},${0.16 + rand() * 0.24})`;
      g.beginPath();
      g.ellipse(x + rand() * w, top + 20 + rand() * (bottom - top - 30), 2 + rand() * 7, 1 + rand() * 2.6, 0, 0, TAU);
      g.fill();
    }
    g.restore();
  }

  function drawCabin(g) {
    const rand = mulberry32(31077);
    const apexX = 1004;
    const apexY = 326;
    const eaveY = 486;
    const leftEave = 792;
    const rightEave = 1216;
    const wallL = 858;
    const wallR = 1150;
    const wallTop = 478;
    const baseY = 654;

    // ground shadow
    const shadow = g.createRadialGradient(1004, 680, 40, 1004, 680, 300);
    shadow.addColorStop(0, "rgba(2,7,6,0.6)");
    shadow.addColorStop(1, "rgba(2,7,6,0)");
    g.fillStyle = shadow;
    g.beginPath();
    g.ellipse(1004, 682, 300, 58, 0, 0, TAU);
    g.fill();

    // chimney behind roof
    drawChimney(g, rand);

    // front wall logs
    g.save();
    g.beginPath();
    g.rect(wallL, wallTop, wallR - wallL, baseY - wallTop);
    g.clip();
    g.fillStyle = "#221e17";
    g.fillRect(wallL, wallTop, wallR - wallL, baseY - wallTop);
    for (let i = 0; i < 12; i++) {
      const y = wallTop + i * ((baseY - wallTop) / 12);
      drawLogCourse(g, wallL - 2, wallR + 2, y, (baseY - wallTop) / 12 + 1, rand, 0);
    }
    g.restore();

    // gable wall
    g.save();
    g.beginPath();
    g.moveTo(wallL, wallTop);
    g.lineTo(apexX, apexY + 40);
    g.lineTo(wallR, wallTop);
    g.closePath();
    g.clip();
    g.fillStyle = "#211d16";
    g.fillRect(wallL, apexY + 30, wallR - wallL, wallTop - apexY - 30);
    for (let i = 0; i < 8; i++) {
      const y = apexY + 38 + i * 14;
      drawLogCourse(g, wallL - 10, wallR + 10, y, 15, rand, 0);
    }
    g.restore();

    // corner log ends
    for (let i = 0; i < 12; i++) {
      const y = wallTop + i * ((baseY - wallTop) / 12) + 4;
      const len = 8 + rand() * 7;
      g.fillStyle = i % 2 ? "#2d261c" : "#241f17";
      g.beginPath();
      g.roundRect(wallL - len, y, len, (baseY - wallTop) / 12 - 2, 3);
      g.fill();
      g.beginPath();
      g.roundRect(wallR, y, len, (baseY - wallTop) / 12 - 2, 3);
      g.fill();
      g.fillStyle = "rgba(151,130,93,0.13)";
      g.fillRect(wallL - len + 1, y + 1, len - 2, 1);
      g.fillRect(wallR + 1, y + 1, len - 2, 1);
    }

    // roof border + shingle fringe
    function roofPlane(side) {
      const outerX = side < 0 ? leftEave : rightEave;
      const innerX = side < 0 ? leftEave + 18 : rightEave - 18;
      const grad = g.createLinearGradient(outerX, eaveY, apexX, apexY);
      grad.addColorStop(0, "#1a2420");
      grad.addColorStop(0.55, "#141e1b");
      grad.addColorStop(1, "#0d1513");
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(apexX, apexY - 10);
      g.lineTo(outerX, eaveY + 14);
      g.lineTo(innerX, eaveY + 14);
      g.lineTo(apexX, apexY + 12);
      g.closePath();
      g.fill();

      g.strokeStyle = "rgba(143,148,118,0.12)";
      g.lineWidth = 0.8;
      for (let i = 0; i < 14; i++) {
        const q = i / 14;
        const x = lerp(apexX, innerX, q);
        const y = lerp(apexY + 10, eaveY + 13, q);
        g.beginPath();
        g.moveTo(x - 4, y + 2);
        g.lineTo(x + 4, y + 2);
        g.stroke();
      }
    }
    roofPlane(-1);
    roofPlane(1);

    // bargeboards
    function barge(side) {
      const outerX = side < 0 ? leftEave - 8 : rightEave + 8;
      const grad = g.createLinearGradient(apexX, apexY, outerX, eaveY);
      grad.addColorStop(0, "#3c3325");
      grad.addColorStop(0.5, "#2c261d");
      grad.addColorStop(1, "#211d17");
      g.strokeStyle = grad;
      g.lineWidth = 16;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(apexX, apexY - 3);
      g.lineTo(outerX, eaveY + 8);
      g.stroke();
      g.strokeStyle = "rgba(183,153,104,0.16)";
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(apexX, apexY - 11);
      g.lineTo(outerX, eaveY);
      g.stroke();
    }
    barge(-1);
    barge(1);

    // eave shadow
    g.fillStyle = "rgba(3,7,6,0.45)";
    g.fillRect(wallL - 10, wallTop, wallR - wallL + 20, 16);

    // gable ridge cap
    g.strokeStyle = "#4a3d2b";
    g.lineWidth = 6;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(apexX - 26, apexY + 8);
    g.lineTo(apexX, apexY - 2);
    g.lineTo(apexX + 26, apexY + 8);
    g.stroke();

    // attic round window
    g.fillStyle = "#171410";
    g.beginPath();
    g.arc(apexX, 408, 20, 0, TAU);
    g.fill();
    g.strokeStyle = "rgba(100,86,64,0.7)";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(apexX, 408, 22, 0, TAU);
    g.stroke();
    g.strokeStyle = "rgba(83,73,56,0.55)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(apexX - 20, 408);
    g.lineTo(apexX + 20, 408);
    g.moveTo(apexX, 388);
    g.lineTo(apexX, 428);
    g.stroke();

    // window recesses
    function recess(x, y, w, h) {
      g.fillStyle = "#0e100d";
      g.fillRect(x, y, w, h);
      g.strokeStyle = "#17130e";
      g.lineWidth = 5;
      g.strokeRect(x - 2, y - 2, w + 4, h + 4);
      g.strokeStyle = "rgba(139,116,80,0.3)";
      g.lineWidth = 1;
      g.strokeRect(x - 5, y - 5, w + 10, h + 10);
    }
    recess(872, 524, 64, 82);
    recess(1064, 524, 64, 82);

    // window frames
    function frame(x, y, w, h) {
      g.strokeStyle = "#3d3325";
      g.lineWidth = 9;
      g.strokeRect(x - 4, y - 4, w + 8, h + 8);
      g.strokeStyle = "rgba(169,139,96,0.28)";
      g.lineWidth = 1.2;
      g.strokeRect(x - 8, y - 8, w + 16, h + 16);
      g.fillStyle = "#4b3d2b";
      g.fillRect(x - 10, y + h + 5, w + 20, 7);
      g.fillStyle = "rgba(174,144,99,0.2)";
      g.fillRect(x - 10, y + h + 5, w + 20, 1.4);
      // curtains hint
      g.fillStyle = "rgba(79,48,35,0.65)";
      g.beginPath();
      g.moveTo(x - 3, y);
      g.quadraticCurveTo(x + 7, y + h * 0.4, x - 4, y + h);
      g.lineTo(x - 16, y + h);
      g.lineTo(x - 16, y);
      g.closePath();
      g.fill();
      g.beginPath();
      g.moveTo(x + w + 3, y);
      g.quadraticCurveTo(x + w - 7, y + h * 0.45, x + w + 4, y + h);
      g.lineTo(x + w + 16, y + h);
      g.lineTo(x + w + 16, y);
      g.closePath();
      g.fill();
    }
    frame(872, 524, 64, 82);
    frame(1064, 524, 64, 82);

    // flower box under left window
    g.fillStyle = "#3b3022";
    g.beginPath();
    g.roundRect(866, 606, 78, 14, 2);
    g.fill();
    g.fillStyle = "rgba(151,122,82,0.17)";
    g.fillRect(868, 607, 74, 2);
    for (let i = 0; i < 9; i++) {
      const x = 870 + i * 8.2;
      g.strokeStyle = "rgba(52,82,52,0.72)";
      g.lineWidth = 1.1;
      g.beginPath();
      g.moveTo(x, 607);
      g.quadraticCurveTo(x - 4 + rand() * 8, 592 - rand() * 7, x + (rand() - 0.5) * 12, 584 - rand() * 9);
      g.stroke();
    }

    // door
    g.fillStyle = "#0e100c";
    g.fillRect(940, 540, 84, 116);
    g.fillStyle = "#2e261c";
    g.beginPath();
    g.roundRect(946, 544, 72, 112, 2);
    g.fill();
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = i % 2 ? "rgba(9,10,8,0.45)" : "rgba(158,132,92,0.08)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(950 + i * 14, 545);
      g.lineTo(950 + i * 14, 655);
      g.stroke();
    }
    // door braces
    g.strokeStyle = "#342a1e";
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(950, 556);
    g.lineTo(1014, 588);
    g.moveTo(950, 630);
    g.lineTo(1014, 610);
    g.stroke();
    g.strokeStyle = "rgba(172,139,92,0.16)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(950, 552);
    g.lineTo(1014, 584);
    g.stroke();
    // handle
    g.strokeStyle = "#8d744a";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(1008, 602, 5, 0, TAU);
    g.stroke();
    g.fillStyle = "#6b583a";
    g.beginPath();
    g.arc(1008, 602, 2.2, 0, TAU);
    g.fill();
    // small wreath
    g.strokeStyle = "rgba(52,66,42,0.75)";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(982, 576, 12, 0, TAU);
    g.stroke();
    g.strokeStyle = "rgba(120,87,52,0.5)";
    g.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      g.beginPath();
      g.moveTo(982 + Math.cos(a) * 12, 576 + Math.sin(a) * 12);
      g.lineTo(982 + Math.cos(a + 0.5) * 17, 576 + Math.sin(a + 0.5) * 17);
      g.stroke();
    }

    // porch beam & posts
    g.fillStyle = "#2c251b";
    g.fillRect(802, 486, 404, 11);
    g.fillStyle = "rgba(171,143,98,0.14)";
    g.fillRect(802, 486, 404, 2);
    g.fillStyle = "rgba(3,7,5,0.4)";
    g.fillRect(802, 497, 404, 7);

    function post(x) {
      const pg = g.createLinearGradient(x - 7, 0, x + 7, 0);
      pg.addColorStop(0, "#1d1913");
      pg.addColorStop(0.45, "#352b1e");
      pg.addColorStop(0.7, "#2a2319");
      pg.addColorStop(1, "#171410");
      g.fillStyle = pg;
      g.fillRect(x - 7, 492, 14, 164);
      g.fillStyle = "rgba(3,6,5,0.5)";
      g.fillRect(x + 4, 492, 3, 164);
      g.strokeStyle = "rgba(156,130,89,0.13)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x - 5, 494);
      g.lineTo(x - 5, 650);
      g.stroke();
      // brace
      g.strokeStyle = "#2b241a";
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(x + (x < 900 ? 2 : -2), 505);
      g.lineTo(x + (x < 900 ? 34 : -34), 540);
      g.stroke();
    }
    post(820);
    post(1184);

    // deck
    g.fillStyle = "#261f17";
    g.beginPath();
    g.roundRect(806, 650, 396, 22, 2);
    g.fill();
    g.strokeStyle = "rgba(173,139,90,0.12)";
    g.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      g.beginPath();
      g.moveTo(812 + i * 24, 651);
      g.lineTo(812 + i * 24, 671);
      g.stroke();
    }
    g.fillStyle = "rgba(3,7,5,0.55)";
    g.fillRect(806, 669, 396, 5);

    // steps
    g.fillStyle = "#2a231a";
    g.fillRect(948, 672, 76, 15);
    g.fillStyle = "#221c15";
    g.fillRect(940, 687, 92, 15);
    g.fillStyle = "#1a1611";
    g.fillRect(932, 702, 108, 13);

    // rail
    g.strokeStyle = "#2c241a";
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(824, 606);
    g.lineTo(918, 606);
    g.stroke();
    for (let i = 0; i < 6; i++) {
      g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(832 + i * 16, 606);
      g.lineTo(832 + i * 16, 650);
      g.stroke();
    }

    // bench
    g.fillStyle = "#30271c";
    g.fillRect(836, 618, 74, 8);
    g.fillStyle = "#241d15";
    g.fillRect(842, 626, 8, 24);
    g.fillRect(896, 626, 8, 24);
    g.fillStyle = "rgba(167,137,91,0.15)";
    g.fillRect(836, 618, 74, 1.5);
    // folded blanket
    g.fillStyle = "rgba(86,54,42,0.72)";
    g.beginPath();
    g.roundRect(852, 612, 34, 9, 3);
    g.fill();
    g.fillStyle = "rgba(160,116,75,0.18)";
    g.fillRect(854, 613, 30, 1.2);

    // firewood stack
    g.save();
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4 - (row % 2); col++) {
        const x = 1136 + col * 14 + (row % 2) * 7;
        const y = 640 - row * 13;
        g.fillStyle = "#2c251a";
        g.beginPath();
        g.arc(x, y, 7.2, 0, TAU);
        g.fill();
        g.strokeStyle = "rgba(160,128,83,0.2)";
        g.lineWidth = 1;
        g.beginPath();
        g.arc(x, y, 5.2, 0, TAU);
        g.stroke();
        g.fillStyle = "rgba(108,84,56,0.34)";
        g.beginPath();
        g.arc(x, y, 2, 0, TAU);
        g.fill();
      }
    }
    g.restore();

    // boots by the door
    g.fillStyle = "#17140f";
    g.beginPath();
    g.ellipse(1028, 648, 7, 4, 0, 0, TAU);
    g.ellipse(1041, 649, 7, 4, 0, 0, TAU);
    g.fill();
    g.fillRect(1024, 634, 8, 12);
    g.fillRect(1037, 635, 8, 12);

    // broom
    g.save();
    g.translate(1168, 650);
    g.rotate(0.08);
    g.strokeStyle = "#4d3b25";
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(-3, -98);
    g.stroke();
    g.strokeStyle = "rgba(127,101,57,0.6)";
    g.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      g.beginPath();
      g.moveTo(-7 + i * 1.5, -2);
      g.lineTo(-10 + i * 2.2, -26 - (i % 3) * 5);
      g.stroke();
    }
    g.restore();

    // moss along roof and wall base
    for (let i = 0; i < 34; i++) {
      const x = 790 + rand() * 420;
      const y = 480 + rand() * 12;
      g.fillStyle = `rgba(${36 + Math.round(rand() * 20)},${55 + Math.round(
        rand() * 22
      )},${38 + Math.round(rand() * 15)},${0.12 + rand() * 0.2})`;
      g.beginPath();
      g.ellipse(x, y, 4 + rand() * 14, 1.2 + rand() * 2.4, 0, 0, TAU);
      g.fill();
    }

    // dry vines on right wall
    g.strokeStyle = "rgba(52,59,37,0.4)";
    g.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(1128 + i * 5, 520);
      g.bezierCurveTo(1136 + i * 8, 560, 1120 + i * 12, 600, 1134 + i * 9, 646);
      g.stroke();
    }

    // chimney soot on roof
    g.fillStyle = "rgba(5,8,7,0.25)";
    g.beginPath();
    g.ellipse(1128, 382, 52, 24, 0.2, 0, TAU);
    g.fill();
  }

  function drawNearTrees(g) {
    const rand = mulberry32(1907);

    // left framing pine
    g.save();
    g.translate(118, 940);
    const trunk = g.createLinearGradient(-36, 0, 42, 0);
    trunk.addColorStop(0, "#030807");
    trunk.addColorStop(0.62, "#050b09");
    trunk.addColorStop(1, "#0a1210");
    g.fillStyle = trunk;
    g.beginPath();
    g.moveTo(-42, 30);
    g.bezierCurveTo(-30, -260, -20, -560, -12, -910);
    g.lineTo(16, -910);
    g.bezierCurveTo(22, -600, 34, -300, 50, 30);
    g.closePath();
    g.fill();
    // rim
    g.strokeStyle = "rgba(118,127,95,0.12)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(50, 20);
    g.bezierCurveTo(34, -280, 22, -600, 16, -900);
    g.stroke();
    // branches
    g.strokeStyle = "#040a08";
    g.lineCap = "round";
    for (let i = 0; i < 9; i++) {
      const y = -180 - i * 72 + rand() * 30;
      const dir = i % 2 ? 1 : 0.75;
      const len = 150 + rand() * 230;
      g.lineWidth = 7 - i * 0.4;
      g.beginPath();
      g.moveTo(-6, y);
      g.bezierCurveTo(len * 0.3, y - 20, len * 0.7, y - 30 - rand() * 40, len, y - 60 - rand() * 30);
      g.stroke();
      // needle clusters
      for (let k = 0; k < 14; k++) {
        const q = 0.16 + rand() * 0.84;
        const bx = -6 + len * q * dir;
        const by = y - q * 54 - rand() * 10;
        pineNeedles(g, bx, by, 8 + rand() * 18, rand, "rgba(3,9,7,0.92)");
      }
    }
    g.restore();

    // right framing pine
    g.save();
    g.translate(1512, 930);
    const trunk2 = g.createLinearGradient(-38, 0, 38, 0);
    trunk2.addColorStop(0, "#030706");
    trunk2.addColorStop(1, "#0a1310");
    g.fillStyle = trunk2;
    g.beginPath();
    g.moveTo(-44, 20);
    g.bezierCurveTo(-36, -260, -22, -610, -10, -900);
    g.lineTo(20, -900);
    g.bezierCurveTo(28, -580, 36, -300, 48, 20);
    g.closePath();
    g.fill();
    g.strokeStyle = "#040a08";
    for (let i = 0; i < 8; i++) {
      const y = -200 - i * 76 + rand() * 30;
      const len = 130 + rand() * 210;
      g.lineWidth = 6 - i * 0.35;
      g.beginPath();
      g.moveTo(8, y);
      g.bezierCurveTo(-len * 0.4, y - 20, -len * 0.7, y - 35, -len, y - 55);
      g.stroke();
      for (let k = 0; k < 12; k++) {
        const q = 0.15 + rand() * 0.85;
        pineNeedles(g, 8 - len * q, y - q * 48 - rand() * 10, 7 + rand() * 16, rand, "rgba(3,9,7,0.92)");
      }
    }
    g.restore();

    // top-right bough
    g.save();
    g.strokeStyle = "#040a08";
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(1640, 60);
    g.bezierCurveTo(1480, 80, 1330, 140, 1200, 210);
    g.stroke();
    for (let i = 0; i < 16; i++) {
      const q = i / 16;
      const x = lerp(1630, 1200, q);
      const y = lerp(66, 208, q) + Math.sin(q * 8) * 10;
      pineNeedles(g, x, y, 11 + rand() * 20, rand, "rgba(3,9,7,0.92)");
    }
    g.restore();

    // low foreground grass and fern silhouettes
    g.save();
    g.filter = "blur(2.2px)";
    for (let i = 0; i < 26; i++) {
      const x = rand() * W;
      const y = 830 + rand() * 120;
      g.strokeStyle = `rgba(2,7,5,${0.5 + rand() * 0.4})`;
      g.lineWidth = 1 + rand() * 1.6;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + (rand() - 0.5) * 20, y - 40 - rand() * 60, x + (rand() - 0.5) * 50, y - 70 - rand() * 60);
      g.stroke();
    }
    for (let i = 0; i < 4; i++) {
      drawFern(g, 40 + rand() * 260 + (i > 1 ? 1210 : 0), 900 + rand() * 40, 50 + rand() * 40, rand, "rgba(2,7,5,0.9)");
    }
    g.restore();
  }

  function pineNeedles(g, x, y, size, rand, color) {
    g.strokeStyle = color;
    g.lineWidth = 1;
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI / 2 + (rand() - 0.5) * 2.6;
      const len = size * (0.4 + rand() * 0.8);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len + size * 0.25);
      g.stroke();
    }
  }

  /* ── interior static ─────────────────────────────────────── */

  function drawInterior(g) {
    const rand = mulberry32(66210);

    // back wall
    const wall = g.createLinearGradient(0, 100, 0, 700);
    wall.addColorStop(0, "#241811");
    wall.addColorStop(0.4, "#372619");
    wall.addColorStop(1, "#1b1310");
    g.fillStyle = wall;
    g.fillRect(0, 0, W, 720);

    // vertical boards
    for (let i = 0; i < 39; i++) {
      const x = i * 42 + rand() * 2;
      g.strokeStyle = `rgba(${12 + Math.round(rand() * 12)},${8 + Math.round(rand() * 8)},${6 + Math.round(
        rand() * 6
      )},${0.24 + rand() * 0.18})`;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, 92);
      g.lineTo(x + (rand() - 0.5) * 5, 710);
      g.stroke();
      if (rand() > 0.55) {
        g.strokeStyle = "rgba(131,91,55,0.08)";
        g.beginPath();
        g.moveTo(x + 1.5, 92);
        g.lineTo(x + 2, 710);
        g.stroke();
      }
    }

    // ceiling
    const ceil = g.createLinearGradient(0, 0, 0, 130);
    ceil.addColorStop(0, "#0f0a07");
    ceil.addColorStop(1, "#251a12");
    g.fillStyle = ceil;
    g.fillRect(0, 0, W, 118);

    // beams
    g.fillStyle = "#1e150f";
    g.fillRect(0, 105, W, 18);
    g.fillStyle = "rgba(148,102,61,0.13)";
    g.fillRect(0, 106, W, 2);
    g.fillStyle = "rgba(0,0,0,0.42)";
    g.fillRect(0, 120, W, 8);

    for (let i = 0; i < 5; i++) {
      const x = 120 + i * 355;
      g.fillStyle = "#241811";
      g.fillRect(x - 13, 0, 26, 118);
      g.fillStyle = "rgba(161,112,68,0.1)";
      g.fillRect(x - 12, 0, 2, 118);
      // diagonal rafters
      g.strokeStyle = "rgba(18,12,8,0.75)";
      g.lineWidth = 13;
      g.beginPath();
      g.moveTo(x, 112);
      g.lineTo(x - 90, 0);
      g.stroke();
      g.beginPath();
      g.moveTo(x, 112);
      g.lineTo(x + 90, 0);
      g.stroke();
    }

    // left and right wall perspective
    g.fillStyle = "rgba(8,6,4,0.42)";
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(120, 120);
    g.lineTo(120, 720);
    g.lineTo(0, 900);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(1600, 0);
    g.lineTo(1462, 120);
    g.lineTo(1462, 720);
    g.lineTo(1600, 900);
    g.closePath();
    g.fill();

    // floor
    const floor = g.createLinearGradient(0, 690, 0, 900);
    floor.addColorStop(0, "#3a2718");
    floor.addColorStop(0.45, "#281b12");
    floor.addColorStop(1, "#130d0a");
    g.fillStyle = floor;
    g.fillRect(0, 696, W, 210);
    const vpx = 800;
    const vpy = 520;
    for (let i = -14; i <= 22; i++) {
      const bx = i * 108;
      g.strokeStyle = "rgba(9,6,4,0.42)";
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(vpx, vpy);
      g.lineTo(bx, 900);
      g.stroke();
      g.strokeStyle = "rgba(156,108,63,0.08)";
      g.beginPath();
      g.moveTo(vpx + 1.4, vpy);
      g.lineTo(bx + 2.5, 900);
      g.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const y = 710 + i * i * 3.8 + i * 14;
      g.strokeStyle = "rgba(8,5,3,0.32)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }

    // warm pool on floor
    const pool = g.createRadialGradient(490, 760, 20, 490, 760, 480);
    pool.addColorStop(0, "rgba(235,142,64,0.16)");
    pool.addColorStop(0.5, "rgba(196,100,43,0.08)");
    pool.addColorStop(1, "rgba(120,50,20,0)");
    g.fillStyle = pool;
    g.fillRect(0, 600, 1150, 300);

    // window recess (glass added dynamically)
    g.fillStyle = "#090b0a";
    g.fillRect(1168, 252, 268, 322);
    g.fillStyle = "#1a110b";
    g.fillRect(1154, 240, 296, 16);
    g.fillRect(1154, 560, 296, 18);
    g.fillRect(1154, 240, 16, 338);
    g.fillRect(1436, 240, 16, 338);
    g.fillStyle = "rgba(171,124,77,0.16)";
    g.fillRect(1156, 242, 292, 2);
    g.fillRect(1168, 560, 268, 2);
    // deep sill
    g.fillStyle = "#2b1d13";
    g.fillRect(1140, 574, 324, 18);
    g.fillStyle = "rgba(190,137,82,0.14)";
    g.fillRect(1140, 574, 324, 2);
    // curtain rod
    g.fillStyle = "#21160f";
    g.fillRect(1110, 218, 390, 7);
    g.beginPath();
    g.arc(1110, 221, 7, 0, TAU);
    g.arc(1500, 221, 7, 0, TAU);
    g.fill();

    // fireplace
    drawFireplace(g, rand);

    // rug
    g.save();
    g.beginPath();
    g.moveTo(574, 900);
    g.lineTo(602, 746);
    g.lineTo(1218, 754);
    g.lineTo(1280, 900);
    g.closePath();
    g.clip();
    const rug = g.createLinearGradient(600, 740, 1200, 900);
    rug.addColorStop(0, "#5b342b");
    rug.addColorStop(0.5, "#482a24");
    rug.addColorStop(1, "#331d1a");
    g.fillStyle = rug;
    g.fillRect(560, 730, 760, 190);
    // rug border
    g.strokeStyle = "rgba(196,157,112,0.24)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(640, 900);
    g.lineTo(660, 770);
    g.lineTo(1160, 776);
    g.lineTo(1200, 900);
    g.stroke();
    g.strokeStyle = "rgba(196,157,112,0.12)";
    g.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const x = 680 + i * 110;
      g.beginPath();
      g.moveTo(x, 900);
      g.lineTo(x + 22, 782);
      g.lineTo(x + 54, 782);
      g.lineTo(x + 36, 900);
      g.stroke();
    }
    // diamond motifs
    for (let i = 0; i < 7; i++) {
      const x = 720 + i * 82;
      const y = 850 - (i % 2) * 26;
      g.strokeStyle = "rgba(196,157,112,0.16)";
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(x, y - 13);
      g.lineTo(x + 11, y);
      g.lineTo(x, y + 13);
      g.lineTo(x - 11, y);
      g.closePath();
      g.stroke();
    }
    g.restore();

    // armchair
    drawArmchair(g, rand);

    // side table
    drawSideTable(g, rand);

    // shelf
    drawShelf(g, rand);

    // hanging herbs
    drawHangingHerbs(g, rand);

    // pendant lamp
    drawPendant(g);

    // foreground floor shadow
    const fg = g.createLinearGradient(0, 800, 0, 900);
    fg.addColorStop(0, "rgba(2,2,2,0)");
    fg.addColorStop(1, "rgba(2,2,2,0.5)");
    g.fillStyle = fg;
    g.fillRect(0, 800, W, 100);

    // vignette baked
    const vig = g.createRadialGradient(800, 480, 260, 800, 480, 820);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(0.7, "rgba(0,0,0,0.16)");
    vig.addColorStop(1, "rgba(0,0,0,0.58)");
    g.fillStyle = vig;
    g.fillRect(0, 0, W, H);
  }

  function drawFireplace(g, rand) {
    // stone chimney breast
    g.fillStyle = "#221d17";
    g.beginPath();
    g.roundRect(306, 230, 386, 480, 6);
    g.fill();
    g.save();
    g.beginPath();
    g.roundRect(306, 230, 386, 480, 6);
    g.clip();
    drawStoneWall(g, 300, 224, 400, 492, rand, null);
    g.restore();

    // soot
    const soot = g.createRadialGradient(500, 470, 30, 500, 500, 240);
    soot.addColorStop(0, "rgba(4,4,3,0.72)");
    soot.addColorStop(0.5, "rgba(5,5,4,0.3)");
    soot.addColorStop(1, "rgba(4,4,3,0)");
    g.fillStyle = soot;
    g.fillRect(300, 250, 400, 330);

    // mantel
    g.fillStyle = "#342317";
    g.beginPath();
    g.roundRect(276, 438, 448, 24, 3);
    g.fill();
    g.fillStyle = "rgba(187,134,80,0.2)";
    g.fillRect(278, 439, 444, 3);
    g.fillStyle = "rgba(3,3,2,0.45)";
    g.fillRect(278, 456, 444, 6);

    // fire opening
    g.fillStyle = "#080604";
    g.beginPath();
    g.moveTo(374, 700);
    g.lineTo(374, 548);
    g.bezierCurveTo(378, 500, 440, 476, 500, 476);
    g.bezierCurveTo(560, 476, 622, 500, 626, 548);
    g.lineTo(626, 700);
    g.closePath();
    g.fill();
    // stone arch ring
    g.strokeStyle = "#4b4438";
    g.lineWidth = 16;
    g.beginPath();
    g.moveTo(368, 700);
    g.lineTo(368, 548);
    g.bezierCurveTo(372, 490, 438, 464, 500, 464);
    g.bezierCurveTo(562, 464, 628, 490, 632, 548);
    g.lineTo(632, 700);
    g.stroke();
    g.strokeStyle = "rgba(170,158,124,0.14)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(362, 700);
    g.lineTo(362, 548);
    g.bezierCurveTo(366, 486, 436, 458, 500, 458);
    g.bezierCurveTo(564, 458, 634, 486, 638, 548);
    g.lineTo(638, 700);
    g.stroke();

    // hearth slab
    g.fillStyle = "#2f2c25";
    g.beginPath();
    g.roundRect(330, 694, 344, 26, 3);
    g.fill();
    g.fillStyle = "rgba(166,157,126,0.12)";
    g.fillRect(332, 695, 340, 2);

    // andirons
    g.strokeStyle = "#15120e";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(408, 686);
    g.lineTo(408, 644);
    g.moveTo(592, 686);
    g.lineTo(592, 644);
    g.stroke();
    // logs
    g.strokeStyle = "#2c1c11";
    g.lineWidth = 14;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(420, 680);
    g.lineTo(582, 664);
    g.stroke();
    g.strokeStyle = "#3a2415";
    g.lineWidth = 12;
    g.beginPath();
    g.moveTo(438, 660);
    g.lineTo(570, 684);
    g.stroke();
    g.strokeStyle = "rgba(235,126,49,0.18)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(442, 671);
    g.lineTo(562, 672);
    g.stroke();

    // firewood basket left
    g.strokeStyle = "#2b2117";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(256, 664, 48, 0.1, Math.PI - 0.1);
    g.stroke();
    for (let i = 0; i < 7; i++) {
      g.strokeStyle = i % 2 ? "#332418" : "#2a1d13";
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(226 + i * 10, 668);
      g.lineTo(246 + i * 8, 610 - (i % 3) * 8);
      g.stroke();
    }

    // mantel objects
    // candle
    g.fillStyle = "#d3b07b";
    g.fillRect(346, 402, 7, 36);
    g.fillStyle = "rgba(238,200,139,0.35)";
    g.fillRect(347.4, 402, 2, 36);
    g.fillStyle = "#392a1c";
    g.beginPath();
    g.ellipse(349.5, 439, 12, 4, 0, 0, TAU);
    g.fill();
    // framed sketch
    g.fillStyle = "#2e2117";
    g.fillRect(470, 342, 82, 92);
    g.fillStyle = "#6f5a41";
    g.fillRect(476, 348, 70, 80);
    g.fillStyle = "rgba(36,27,19,0.7)";
    g.fillRect(483, 355, 56, 66);
    g.strokeStyle = "rgba(196,173,133,0.35)";
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(490, 408);
    g.quadraticCurveTo(505, 372, 518, 400);
    g.quadraticCurveTo(526, 384, 534, 396);
    g.stroke();
    g.beginPath();
    g.arc(500, 374, 6, 0, TAU);
    g.stroke();
    // clock
    g.fillStyle = "#35261a";
    g.beginPath();
    g.roundRect(574, 384, 58, 50, 3);
    g.fill();
    g.fillStyle = "#a98f63";
    g.beginPath();
    g.arc(603, 409, 16, 0, TAU);
    g.fill();
    g.strokeStyle = "#2a2015";
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(603, 409);
    g.lineTo(603, 399);
    g.moveTo(603, 409);
    g.lineTo(610, 413);
    g.stroke();
    // jar
    g.fillStyle = "rgba(86,104,72,0.45)";
    g.beginPath();
    g.roundRect(648, 408, 17, 26, 4);
    g.fill();
    g.fillStyle = "rgba(190,197,157,0.15)";
    g.fillRect(651, 410, 3, 20);

    // small side stool with kettle
    g.fillStyle = "#2a1d14";
    g.fillRect(692, 584, 58, 8);
    g.fillRect(698, 592, 7, 56);
    g.fillRect(738, 592, 7, 56);
    g.fillStyle = "#1a1712";
    g.beginPath();
    g.ellipse(720, 578, 18, 14, 0, 0, TAU);
    g.fill();
    g.strokeStyle = "rgba(167,146,112,0.22)";
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(720, 570, 13, 3, 0, 0, TAU);
    g.stroke();
    g.beginPath();
    g.moveTo(738, 578);
    g.quadraticCurveTo(750, 568, 742, 560);
    g.stroke();
  }

  function drawArmchair(g, rand) {
    // shadow
    g.fillStyle = "rgba(3,3,2,0.42)";
    g.beginPath();
    g.ellipse(830, 775, 142, 26, 0, 0, TAU);
    g.fill();

    // back
    const back = g.createLinearGradient(730, 500, 930, 750);
    back.addColorStop(0, "#5a382e");
    back.addColorStop(0.55, "#472b25");
    back.addColorStop(1, "#2d1b18");
    g.fillStyle = back;
    g.beginPath();
    g.moveTo(748, 750);
    g.bezierCurveTo(720, 620, 728, 512, 798, 500);
    g.bezierCurveTo(870, 490, 922, 562, 932, 640);
    g.lineTo(934, 752);
    g.closePath();
    g.fill();
    // back highlight
    g.strokeStyle = "rgba(202,143,96,0.16)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(758, 740);
    g.bezierCurveTo(736, 622, 744, 526, 800, 514);
    g.stroke();
    // seams
    g.strokeStyle = "rgba(28,15,12,0.45)";
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(802, 512);
    g.quadraticCurveTo(812, 620, 808, 748);
    g.stroke();
    g.beginPath();
    g.moveTo(862, 522);
    g.quadraticCurveTo(870, 630, 866, 748);
    g.stroke();

    // seat
    const seat = g.createLinearGradient(740, 680, 940, 760);
    seat.addColorStop(0, "#58362c");
    seat.addColorStop(0.5, "#432822");
    seat.addColorStop(1, "#2b1916");
    g.fillStyle = seat;
    g.beginPath();
    g.moveTo(744, 692);
    g.quadraticCurveTo(838, 668, 936, 686);
    g.lineTo(944, 748);
    g.quadraticCurveTo(836, 772, 738, 750);
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(197,135,91,0.14)";
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(748, 698);
    g.quadraticCurveTo(840, 678, 932, 694);
    g.stroke();

    // arms
    g.fillStyle = "#3a241e";
    g.beginPath();
    g.roundRect(716, 662, 52, 74, 18);
    g.fill();
    g.beginPath();
    g.roundRect(930, 660, 56, 78, 18);
    g.fill();
    g.fillStyle = "rgba(201,143,97,0.16)";
    g.beginPath();
    g.ellipse(742, 667, 24, 7, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.ellipse(958, 665, 26, 7, 0, 0, TAU);
    g.fill();

    // throw blanket
    const throwG = g.createLinearGradient(760, 640, 900, 780);
    throwG.addColorStop(0, "#8a5b3d");
    throwG.addColorStop(0.45, "#6b432e");
    throwG.addColorStop(1, "#4a2c20");
    g.fillStyle = throwG;
    g.beginPath();
    g.moveTo(760, 642);
    g.bezierCurveTo(790, 656, 808, 690, 806, 748);
    g.lineTo(858, 758);
    g.bezierCurveTo(862, 700, 850, 664, 842, 646);
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(226,177,129,0.2)";
    g.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.moveTo(770 + i * 13, 650 + i * 2);
      g.quadraticCurveTo(786 + i * 10, 690, 810 + i * 8, 742);
      g.stroke();
    }
    // fringe
    g.strokeStyle = "rgba(207,157,107,0.35)";
    for (let i = 0; i < 7; i++) {
      g.beginPath();
      g.moveTo(808 + i * 7, 750);
      g.lineTo(806 + i * 7, 762);
      g.stroke();
    }

    // legs
    g.fillStyle = "#1b110d";
    g.fillRect(744, 748, 9, 34);
    g.fillRect(922, 746, 9, 36);
    g.fillRect(760, 760, 7, 20);
    g.fillRect(916, 760, 7, 22);
  }

  function drawSideTable(g) {
    // table
    g.fillStyle = "rgba(2,2,2,0.35)";
    g.beginPath();
    g.ellipse(1040, 758, 92, 15, 0, 0, TAU);
    g.fill();
    const top = g.createLinearGradient(960, 640, 1120, 700);
    top.addColorStop(0, "#5a4028");
    top.addColorStop(0.5, "#3b2a1c");
    top.addColorStop(1, "#271b12");
    g.fillStyle = top;
    g.beginPath();
    g.ellipse(1040, 660, 88, 22, 0, 0, TAU);
    g.fill();
    g.strokeStyle = "rgba(198,150,94,0.2)";
    g.lineWidth = 1.2;
    g.beginPath();
    g.ellipse(1040, 657, 84, 18, 0, 0, TAU);
    g.stroke();
    g.fillStyle = "#241a11";
    g.fillRect(1032, 670, 14, 92);
    g.fillRect(962, 668, 9, 84);
    g.fillRect(1104, 668, 9, 84);
    // lower shelf
    g.fillStyle = "#2c2015";
    g.fillRect(972, 728, 132, 7);

    // mug
    g.fillStyle = "#b4a58b";
    g.beginPath();
    g.roundRect(1018, 618, 30, 34, 4);
    g.fill();
    g.fillStyle = "#867961";
    g.beginPath();
    g.ellipse(1033, 618, 15, 5, 0, 0, TAU);
    g.fill();
    g.strokeStyle = "#9f9075";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(1052, 632, 10, -1.1, 1.4);
    g.stroke();
    g.fillStyle = "rgba(43,31,22,0.8)";
    g.beginPath();
    g.ellipse(1033, 620, 12, 3.2, 0, 0, TAU);
    g.fill();

    // open book
    g.save();
    g.translate(1054, 660);
    g.rotate(-0.12);
    g.fillStyle = "#c7bda2";
    g.beginPath();
    g.moveTo(-42, 0);
    g.quadraticCurveTo(-20, -7, 0, 1);
    g.quadraticCurveTo(20, -7, 42, 0);
    g.lineTo(40, 13);
    g.quadraticCurveTo(20, 7, 0, 14);
    g.quadraticCurveTo(-20, 7, -42, 12);
    g.closePath();
    g.fill();
    g.fillStyle = "#8e8268";
    g.beginPath();
    g.moveTo(-40, 11);
    g.quadraticCurveTo(-20, 6, 0, 13);
    g.quadraticCurveTo(20, 6, 40, 11);
    g.lineTo(40, 14);
    g.quadraticCurveTo(20, 8, 0, 15);
    g.quadraticCurveTo(-20, 8, -40, 13);
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(55,45,32,0.3)";
    g.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.moveTo(-32 + i * 14, 3 + (i % 2));
      g.lineTo(-20 + i * 12, 5 + (i % 2));
      g.stroke();
    }
    g.restore();

    // glass jar on lower shelf
    g.fillStyle = "rgba(126,131,95,0.45)";
    g.beginPath();
    g.roundRect(1084, 690, 15, 38, 3);
    g.fill();
    g.fillStyle = "rgba(218,208,168,0.15)";
    g.fillRect(1087, 692, 3, 32);
  }

  function drawShelf(g, rand) {
    // shelf boards left
    g.fillStyle = "#241a12";
    for (let i = 0; i < 3; i++) {
      g.fillRect(30, 280 + i * 105, 215, 10);
      g.fillStyle = "rgba(173,127,80,0.13)";
      g.fillRect(30, 280 + i * 105, 215, 1.5);
      g.fillStyle = "#241a12";
    }
    // books
    const books = [
      [44, 218, 15, 62, "#6c3d2a"],
      [62, 226, 11, 54, "#7b5e37"],
      [76, 214, 19, 66, "#3e4b40"],
      [98, 230, 9, 50, "#8b6a45"],
      [110, 220, 16, 60, "#4d3528"],
    ];
    for (const b of books) {
      g.fillStyle = b[4];
      g.fillRect(b[0], b[1], b[2], b[3]);
      g.fillStyle = "rgba(212,184,133,0.18)";
      g.fillRect(b[0] + 1, b[1] + 5, b[2] - 2, 1.2);
      g.fillStyle = "rgba(0,0,0,0.22)";
      g.fillRect(b[0] + b[2] - 2, b[1], 2, b[3]);
    }
    // leaning book
    g.save();
    g.translate(142, 280);
    g.rotate(-0.24);
    g.fillStyle = "#5f4b2f";
    g.fillRect(0, -55, 13, 55);
    g.restore();
    // radio on second shelf
    g.fillStyle = "#2f2115";
    g.beginPath();
    g.roundRect(52, 398, 94, 66, 5);
    g.fill();
    g.fillStyle = "#4a3522";
    g.beginPath();
    g.roundRect(58, 404, 82, 54, 3);
    g.fill();
    g.fillStyle = "rgba(14,12,9,0.62)";
    g.fillRect(64, 411, 38, 38);
    for (let i = 0; i < 6; i++) {
      g.strokeStyle = "rgba(143,117,76,0.4)";
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(66, 415 + i * 6);
      g.lineTo(100, 415 + i * 6);
      g.stroke();
    }
    g.fillStyle = "#c9a26b";
    g.beginPath();
    g.arc(118, 422, 7, 0, TAU);
    g.fill();
    g.fillStyle = "#352719";
    g.beginPath();
    g.arc(118, 422, 2.4, 0, TAU);
    g.fill();
    g.strokeStyle = "#5e4630";
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(118, 446, 5, 0, TAU);
    g.stroke();
    g.fillStyle = "#8b6b45";
    g.beginPath();
    g.arc(118, 446, 1.5, 0, TAU);
    g.fill();
    // third shelf items
    g.fillStyle = "#7c5b3d";
    g.beginPath();
    g.roundRect(44, 500, 34, 46, 3);
    g.fill();
    g.fillStyle = "rgba(29,22,15,0.6)";
    g.fillRect(50, 510, 22, 20);
    g.fillStyle = "rgba(80,102,69,0.5)";
    g.beginPath();
    g.roundRect(96, 496, 28, 52, 6);
    g.fill();
    g.strokeStyle = "rgba(58,84,55,0.7)";
    g.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(101 + i * 6, 497);
      g.quadraticCurveTo(96 + i * 7, 478, 108 + i * 5, 466);
      g.stroke();
    }
    g.fillStyle = "#b3a27e";
    g.beginPath();
    g.arc(152, 520, 12, 0, TAU);
    g.fill();
    g.fillStyle = "rgba(64,50,34,0.6)";
    g.beginPath();
    g.arc(152, 520, 7, 0, TAU);
    g.fill();
    // tiny framed sketch
    g.fillStyle = "#2d2116";
    g.fillRect(172, 492, 46, 54);
    g.fillStyle = "#7c6648";
    g.fillRect(177, 497, 36, 44);
    g.fillStyle = "rgba(32,25,17,0.65)";
    g.fillRect(181, 501, 28, 36);
    g.strokeStyle = "rgba(200,178,139,0.35)";
    g.beginPath();
    g.moveTo(185, 530);
    g.lineTo(195, 512);
    g.lineTo(203, 522);
    g.lineTo(207, 507);
    g.stroke();
  }

  function drawHangingHerbs(g, rand) {
    g.strokeStyle = "rgba(53,42,26,0.8)";
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(1050, 118);
    g.lineTo(1050, 190);
    g.stroke();
    for (let i = 0; i < 3; i++) {
      const x = 1040 + i * 12;
      g.strokeStyle = "rgba(87,91,57,0.8)";
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(1050, 136 + i * 5);
      g.quadraticCurveTo(x, 180, x - 2, 232);
      g.stroke();
      for (let j = 0; j < 13; j++) {
        const q = j / 13;
        const y = 160 + q * 66;
        const dx = (x - 1050) * q;
        g.fillStyle = `rgba(${61 + Math.round(rand() * 20)},${76 + Math.round(
          rand() * 18
        )},${46 + Math.round(rand() * 14)},${0.4 + rand() * 0.3})`;
        g.beginPath();
        g.ellipse(1050 + dx + (rand() - 0.5) * 9, y, 2.2 + rand() * 2, 4 + rand() * 3, rand(), 0, TAU);
        g.fill();
      }
    }
    // garlic braid
    g.strokeStyle = "rgba(119,103,74,0.5)";
    g.beginPath();
    g.moveTo(1280, 118);
    g.quadraticCurveTo(1276, 160, 1286, 200);
    g.stroke();
    for (let i = 0; i < 4; i++) {
      g.fillStyle = "rgba(196,181,145,0.55)";
      g.beginPath();
      g.ellipse(1282 + Math.sin(i) * 4, 142 + i * 19, 8, 10, (i % 2) * 0.2, 0, TAU);
      g.fill();
    }
  }

  function drawPendant(g) {
    g.strokeStyle = "#1b130d";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(1002, 0);
    g.lineTo(1002, 130);
    g.stroke();
    g.fillStyle = "#2d2318";
    g.beginPath();
    g.moveTo(966, 168);
    g.quadraticCurveTo(972, 128, 1002, 128);
    g.quadraticCurveTo(1032, 128, 1038, 168);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(178,138,85,0.22)";
    g.beginPath();
    g.ellipse(1002, 166, 35, 5, 0, 0, TAU);
    g.fill();
    g.fillStyle = "#e0b26e";
    g.beginPath();
    g.arc(1002, 170, 7, 0, TAU);
    g.fill();
    g.fillStyle = "rgba(255,213,148,0.25)";
    g.beginPath();
    g.arc(1002, 170, 15, 0, TAU);
    g.fill();
  }

  /* ── dynamic exterior ────────────────────────────────────── */

  function drawWindowLight(g, opts) {
    const { x, y, w, h, warm, phase, t, lampLevel, left } = opts;
    // interior glow behind glass
    const glass = g.createLinearGradient(x, y, x, y + h);
    glass.addColorStop(0, mixHex("#4d2f18", "#1e130b", phase * 0.4));
    glass.addColorStop(0.4, mixHex("#b06f34", "#7b4a26", phase * 0.25));
    glass.addColorStop(1, mixHex("#f1b66b", "#d38f48", phase * 0.2));
    g.fillStyle = glass;
    g.fillRect(x, y, w, h);

    // lamp / room shapes inside
    g.fillStyle = "rgba(255,211,142,0.7)";
    g.beginPath();
    g.arc(x + w * 0.62, y + h * 0.52, 8, 0, TAU);
    g.fill();
    g.fillStyle = "rgba(65,35,17,0.72)";
    g.fillRect(x + w * 0.58, y + h * 0.56, 2, 25);
    g.beginPath();
    g.ellipse(x + w * 0.6, y + h * 0.79, 12, 3, 0, 0, TAU);
    g.fill();

    // cat on sill in left window
    if (left) {
      g.fillStyle = "rgba(30,18,10,0.88)";
      g.beginPath();
      g.ellipse(x + w * 0.46, y + h * 0.82, 10, 9, 0, 0, TAU);
      g.fill();
      g.beginPath();
      g.arc(x + w * 0.46, y + h * 0.7, 6.5, 0, TAU);
      g.fill();
      g.beginPath();
      g.moveTo(x + w * 0.42, y + h * 0.65);
      g.lineTo(x + w * 0.43, y + h * 0.6);
      g.lineTo(x + w * 0.47, y + h * 0.64);
      g.closePath();
      g.fill();
      g.beginPath();
      g.moveTo(x + w * 0.49, y + h * 0.64);
      g.lineTo(x + w * 0.51, y + h * 0.6);
      g.lineTo(x + w * 0.52, y + h * 0.66);
      g.closePath();
      g.fill();
    } else {
      // plant silhouette
      g.strokeStyle = "rgba(32,22,12,0.74)";
      g.lineWidth = 1.4;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo(x + w * 0.35, y + h * 0.86);
        g.quadraticCurveTo(x + w * (0.25 + i * 0.08), y + h * 0.7, x + w * (0.3 + i * 0.05), y + h * 0.58);
        g.stroke();
      }
    }

    // curtain edges
    g.fillStyle = "rgba(72,39,23,0.82)";
    g.beginPath();
    g.moveTo(x - 2, y - 2);
    g.quadraticCurveTo(x + 10, y + h * 0.4, x - 3, y + h + 2);
    g.lineTo(x - 16, y + h + 2);
    g.lineTo(x - 16, y - 2);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(x + w + 2, y - 2);
    g.quadraticCurveTo(x + w - 9, y + h * 0.45, x + w + 3, y + h + 2);
    g.lineTo(x + w + 16, y + h + 2);
    g.lineTo(x + w + 16, y - 2);
    g.closePath();
    g.fill();

    // muntins
    g.strokeStyle = "rgba(42,30,19,0.9)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x + w / 2, y);
    g.lineTo(x + w / 2, y + h);
    g.moveTo(x, y + h / 2);
    g.lineTo(x + w, y + h / 2);
    g.stroke();
    g.strokeStyle = "rgba(224,188,132,0.13)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x + w / 2 + 1, y);
    g.lineTo(x + w / 2 + 1, y + h);
    g.stroke();

    // reflection
    g.fillStyle = "rgba(255,231,190,0.05)";
    g.beginPath();
    g.moveTo(x + 4, y + h);
    g.lineTo(x + w * 0.5, y);
    g.lineTo(x + w * 0.74, y);
    g.lineTo(x + 26, y + h);
    g.closePath();
    g.fill();

    if (lampLevel > 0.01) {
      g.save();
      g.globalCompositeOperation = "lighter";
      const flicker = 0.94 + Math.sin(t * 7.1) * 0.025 + Math.sin(t * 13.7) * 0.018;
      const cx = left ? x + w * 0.4 : x + w * 0.56;
      const cy = y + h * 0.5;
      const glow = g.createRadialGradient(cx, cy, 5, cx, cy, 240);
      glow.addColorStop(0, `rgba(255,203,132,${0.24 * lampLevel * flicker})`);
      glow.addColorStop(0.25, `rgba(246,171,95,${0.1 * lampLevel * flicker})`);
      glow.addColorStop(0.6, `rgba(193,113,57,${0.035 * lampLevel})`);
      glow.addColorStop(1, "rgba(140,80,40,0)");
      g.fillStyle = glow;
      g.beginPath();
      g.arc(cx, cy, 240, 0, TAU);
      g.fill();

      // light spill on porch floor
      const spill = g.createLinearGradient(0, y + h, 0, 690);
      spill.addColorStop(0, `rgba(231,157,80,${0.12 * lampLevel})`);
      spill.addColorStop(0.55, `rgba(190,112,53,${0.04 * lampLevel})`);
      spill.addColorStop(1, "rgba(120,70,35,0)");
      g.fillStyle = spill;
      g.beginPath();
      g.moveTo(x - 8, y + h);
      g.lineTo(x + w + 8, y + h);
      g.lineTo(x + w + 74, 710);
      g.lineTo(x - 54, 710);
      g.closePath();
      g.fill();
      g.restore();
    }
  }

  function drawLantern(g, t, lampLevel, hovered) {
    const x = 1038;
    const y = 512;
    const flicker = 0.91 + Math.sin(t * 8.3) * 0.045 + Math.sin(t * 15.1) * 0.025;

    // bracket
    g.strokeStyle = "#1d1811";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(1038, 484);
    g.lineTo(1038, 498);
    g.stroke();
    g.strokeStyle = "rgba(177,142,88,0.22)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(1037, 484);
    g.lineTo(1037, 498);
    g.stroke();

    // halo
    if (lampLevel > 0.02) {
      g.save();
      g.globalCompositeOperation = "lighter";
      const halo = g.createRadialGradient(x, y + 16, 2, x, y + 16, 130 + (hovered ? 24 : 0));
      halo.addColorStop(0, `rgba(255,214,145,${(0.34 + (hovered ? 0.1 : 0)) * lampLevel * flicker})`);
      halo.addColorStop(0.16, `rgba(255,185,104,${0.16 * lampLevel * flicker})`);
      halo.addColorStop(0.5, `rgba(218,134,64,${0.06 * lampLevel})`);
      halo.addColorStop(1, "rgba(160,90,40,0)");
      g.fillStyle = halo;
      g.beginPath();
      g.arc(x, y + 16, 132 + (hovered ? 24 : 0), 0, TAU);
      g.fill();
      g.restore();
    }

    // lantern body
    g.fillStyle = lampLevel > 0.1 ? `rgba(255,200,120,${0.42 * lampLevel})` : "rgba(55,55,45,0.35)";
    g.beginPath();
    g.roundRect(x - 12, y, 24, 40, 4);
    g.fill();
    g.strokeStyle = "#1a1610";
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(x - 12, y, 24, 40, 4);
    g.stroke();
    // top/bottom caps
    g.fillStyle = "#211b12";
    g.beginPath();
    g.moveTo(x - 16, y + 1);
    g.lineTo(x + 16, y + 1);
    g.lineTo(x + 11, y - 7);
    g.lineTo(x - 11, y - 7);
    g.closePath();
    g.fill();
    g.fillRect(x - 15, y + 37, 30, 6);
    // glass panes
    g.strokeStyle = "rgba(33,27,19,0.9)";
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(x, y + 2);
    g.lineTo(x, y + 36);
    g.moveTo(x - 11, y + 19);
    g.lineTo(x + 11, y + 19);
    g.stroke();
    // wick
    if (lampLevel > 0.02) {
      const flameH = 11 + Math.sin(t * 7.4) * 2.4;
      const fg = g.createLinearGradient(x, y + 27, x, y + 27 - flameH);
      fg.addColorStop(0, "rgba(255,224,168,0.95)");
      fg.addColorStop(0.55, "rgba(255,177,85,0.85)");
      fg.addColorStop(1, "rgba(255,132,48,0)");
      g.fillStyle = fg;
      g.beginPath();
      g.moveTo(x, y + 27 - flameH);
      g.quadraticCurveTo(x + 5, y + 24, x, y + 27);
      g.quadraticCurveTo(x - 5, y + 24, x, y + 27 - flameH);
      g.fill();
    }
    // hanging hook
    g.strokeStyle = "#1c1710";
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(x, y - 10, 5, 0.2, Math.PI - 0.2);
    g.stroke();

    // moths
    if (lampLevel > 0.4) {
      for (let i = 0; i < 4; i++) {
        const a = t * (0.6 + i * 0.17) + i * 1.9;
        const rr = 20 + i * 11;
        const mx = x + Math.cos(a) * rr;
        const my = y + 14 + Math.sin(a * 1.3) * rr * 0.55;
        g.fillStyle = `rgba(245,224,178,${0.2 + 0.14 * Math.sin(t * 3 + i)})`;
        g.beginPath();
        g.ellipse(mx, my, 1.7, 1.1, a, 0, TAU);
        g.fill();
      }
    }
  }

  function drawExteriorLights(g, t, phase, lampLevel, hovered, state) {
    if (lampLevel <= 0.01) {
      // cold dead windows
      for (const cfg of [
        { x: 872, y: 524, w: 64, h: 82, left: true },
        { x: 1064, y: 524, w: 64, h: 82, left: false },
      ]) {
        g.fillStyle = "rgba(16,22,21,0.92)";
        g.fillRect(cfg.x, cfg.y, cfg.w, cfg.h);
        g.strokeStyle = "rgba(27,32,28,0.9)";
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(cfg.x + cfg.w / 2, cfg.y);
        g.lineTo(cfg.x + cfg.w / 2, cfg.y + cfg.h);
        g.moveTo(cfg.x, cfg.y + cfg.h / 2);
        g.lineTo(cfg.x + cfg.w, cfg.y + cfg.h / 2);
        g.stroke();
      }
    } else {
      drawWindowLight(g, { x: 872, y: 524, w: 64, h: 82, phase, t, lampLevel, left: true });
      drawWindowLight(g, { x: 1064, y: 524, w: 64, h: 82, phase, t, lampLevel, left: false });
    }
    drawLantern(g, t, lampLevel, hovered === "lantern");

    // attic window faint
    if (lampLevel > 0.2) {
      g.fillStyle = `rgba(239,180,103,${0.12 * lampLevel})`;
      g.beginPath();
      g.arc(1004, 408, 17, 0, TAU);
      g.fill();
    }

    // warm ground/puddle reflections
    if (lampLevel > 0.1) {
      g.save();
      g.globalCompositeOperation = "lighter";
      const ref = g.createLinearGradient(0, 650, 0, 860);
      ref.addColorStop(0, `rgba(218,139,66,${0.1 * lampLevel})`);
      ref.addColorStop(0.55, `rgba(158,91,44,${0.045 * lampLevel})`);
      ref.addColorStop(1, "rgba(100,60,30,0)");
      g.fillStyle = ref;
      g.beginPath();
      g.ellipse(1000, 748, 120, 90, 0, 0, TAU);
      g.fill();
      // puddle streaks
      const flick = 0.7 + 0.3 * Math.sin(t * 2.2);
      g.fillStyle = `rgba(233,164,86,${0.18 * lampLevel * flick})`;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.ellipse(622 + i * 4, 778 - i * 2, 60 - i * 12, 2.2, 0, 0, TAU);
        g.fill();
      }
      g.fillStyle = `rgba(233,164,86,${0.13 * lampLevel * flick})`;
      g.beginPath();
      g.ellipse(1128, 744, 32, 1.6, 0, 0, TAU);
      g.fill();
      // lantern reflection on path
      g.fillStyle = `rgba(239,179,99,${0.1 * lampLevel})`;
      g.beginPath();
      g.ellipse(1036, 716, 17, 3, 0, 0, TAU);
      g.fill();
      g.restore();
    }

    // chimney smoke
    state.smoke.forEach((p) => {
      const a = p.life * (0.11 + phase * 0.02);
      const sx = 1121 + p.x + Math.sin(t * 0.4 + p.seed) * 10 * p.life;
      const sy = 236 - p.life * 300;
      const r = 9 + p.life * 62;
      const grad = g.createRadialGradient(sx, sy, 0, sx, sy, r);
      grad.addColorStop(0, `rgba(182,190,177,${a})`);
      grad.addColorStop(0.55, `rgba(150,163,153,${a * 0.55})`);
      grad.addColorStop(1, "rgba(120,140,132,0)");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(sx, sy, r, 0, TAU);
      g.fill();
    });
  }

  function drawFog(g, t, rain) {
    g.save();
    g.globalCompositeOperation = "screen";
    const alphaBase = 0.038 + rain * 0.03;
    for (let i = 0; i < 9; i++) {
      const speed = 5 + (i % 3) * 3;
      const x = ((i * 231 + t * speed) % (W + 600)) - 300;
      const y = 600 + (i % 4) * 46 + Math.sin(t * 0.17 + i) * 8;
      const rx = 220 + (i % 3) * 120;
      const ry = 55 + (i % 2) * 30;
      g.save();
      g.translate(x, y);
      g.scale(1, ry / rx);
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      grad.addColorStop(0, `rgba(167,181,168,${alphaBase})`);
      grad.addColorStop(0.55, `rgba(147,165,154,${alphaBase * 0.5})`);
      grad.addColorStop(1, "rgba(130,150,140,0)");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, 0, rx, 0, TAU);
      g.fill();
      g.restore();
    }
    // low ground mist
    const ground = g.createLinearGradient(0, 690, 0, 900);
    ground.addColorStop(0, `rgba(147,164,151,${0.015 + rain * 0.02})`);
    ground.addColorStop(0.5, `rgba(126,148,136,${0.035 + rain * 0.025})`);
    ground.addColorStop(1, "rgba(100,125,115,0)");
    g.fillStyle = ground;
    g.fillRect(0, 660, W, 240);
    g.restore();
  }

  function drawRain(g, t, amount) {
    if (amount < 0.01) return;
    const rand = mulberry32(2245);
    g.save();
    g.lineCap = "round";
    const count = Math.round(270 * amount);
    for (let i = 0; i < count; i++) {
      const speed = 700 + rand() * 700;
      const x = ((rand() * W + t * 80 * amount + Math.sin(t + i) * 12) % (W + 200)) - 100;
      const y = ((rand() * H + t * speed) % (H + 200)) - 100;
      const len = 10 + rand() * 24;
      const alpha = (0.05 + rand() * 0.16) * amount;
      g.strokeStyle = `rgba(183,204,199,${alpha})`;
      g.lineWidth = 0.6 + rand() * 0.7;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - len * 0.16, y + len);
      g.stroke();
    }
    // splashes
    for (let i = 0; i < 18; i++) {
      const phase = (t * (0.7 + rand() * 0.9) + i * 0.37) % 1;
      const y = 710 + rand() * 170;
      const x = rand() * W;
      if (phase > 0.35) continue;
      const r = phase * 18 * amount;
      g.strokeStyle = `rgba(170,194,188,${(1 - phase / 0.35) * 0.12 * amount})`;
      g.lineWidth = 0.7;
      g.beginPath();
      g.ellipse(x, y, r, r * 0.28, 0, 0, TAU);
      g.stroke();
    }
    g.restore();
  }

  function drawFireflies(g, t, phase) {
    const alpha = 0.35 + phase * 0.55;
    for (let i = 0; i < 24; i++) {
      const seed = i * 13.37;
      const x = 300 + ((i * 197) % 980) + Math.sin(t * 0.23 + seed) * 22;
      const y = 560 + ((i * 91) % 230) + Math.cos(t * 0.31 + seed * 1.7) * 16;
      const blink = 0.5 + 0.5 * Math.sin(t * 1.4 + seed * 2.3);
      if (blink < 0.38) continue;
      const a = (blink - 0.38) * alpha;
      g.save();
      g.globalCompositeOperation = "lighter";
      const grad = g.createRadialGradient(x, y, 0, x, y, 9);
      grad.addColorStop(0, `rgba(255,224,137,${a * 0.7})`);
      grad.addColorStop(1, "rgba(210,190,80,0)");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, 9, 0, TAU);
      g.fill();
      g.fillStyle = `rgba(255,239,177,${a})`;
      g.beginPath();
      g.arc(x, y, 1.2, 0, TAU);
      g.fill();
      g.restore();
    }
  }

  function drawShootingStar(g, t, phase) {
    if (phase < 0.4) return;
    const cycle = 23;
    const p = (t % cycle) / cycle;
    if (p > 0.07) return;
    const q = p / 0.07;
    const sx = 820 + q * 260;
    const sy = 130 + q * 70;
    const grad = g.createLinearGradient(sx, sy, sx - 60, sy - 20);
    grad.addColorStop(0, `rgba(240,239,214,${0.7 * (1 - q)})`);
    grad.addColorStop(1, "rgba(240,239,214,0)");
    g.strokeStyle = grad;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(sx - 60, sy - 20);
    g.lineTo(sx, sy);
    g.stroke();
  }

  /* ── dynamic interior ────────────────────────────────────── */

  function drawInteriorWindow(g, t, phase, rain, curtain, hovered) {
    const x = 1168;
    const y = 252;
    const w = 268;
    const h = 322;
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();

    const top = mixHex("#18232a", "#040b11", smooth(0, 1, phase));
    const low = mixHex("#52615f", "#1b2a31", smooth(0, 1, phase));
    const sky = g.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, top);
    sky.addColorStop(0.65, low);
    sky.addColorStop(1, "#1a2724");
    g.fillStyle = sky;
    g.fillRect(x, y, w, h);

    // distant trees
    for (let i = 0; i < 12; i++) {
      const tx = x - 20 + i * 27 + (i % 3) * 5;
      const base = y + h * 0.86;
      const th = 70 + (i % 5) * 28;
      pineSilhouette(g, tx, base, th, "rgba(6,14,12,0.85)", mulberry32(90 + i), 0);
    }
    // moon in window
    const mx = x + w * 0.7;
    const my = y + h * 0.22;
    const halo = g.createRadialGradient(mx, my, 2, mx, my, 42);
    halo.addColorStop(0, "rgba(219,227,209,0.28)");
    halo.addColorStop(1, "rgba(219,227,209,0)");
    g.fillStyle = halo;
    g.beginPath();
    g.arc(mx, my, 42, 0, TAU);
    g.fill();
    g.fillStyle = "rgba(233,236,215,0.82)";
    g.beginPath();
    g.arc(mx, my, 12, 0, TAU);
    g.fill();

    // rain / condensation
    if (rain > 0.02) {
      const rand = mulberry32(778);
      for (let i = 0; i < 35; i++) {
        const rx = x + rand() * w;
        const ry = y + rand() * h;
        const len = 6 + rand() * 20;
        g.strokeStyle = `rgba(163,193,190,${0.06 + rand() * 0.1})`;
        g.lineWidth = 0.7;
        g.beginPath();
        g.moveTo(rx, ry);
        g.lineTo(rx + 1.5, ry + len);
        g.stroke();
      }
      for (let i = 0; i < 30; i++) {
        const rx = x + rand() * w;
        const ry = y + rand() * h;
        g.fillStyle = `rgba(194,208,199,${0.04 + rand() * 0.09})`;
        g.beginPath();
        g.arc(rx, ry, 0.7 + rand() * 1.6, 0, TAU);
        g.fill();
      }
      // running drops
      for (let i = 0; i < 4; i++) {
        const px = x + 32 + i * 59;
        const py = y + ((t * (16 + i * 4) + i * 50) % (h + 40));
        g.strokeStyle = "rgba(197,216,208,0.16)";
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(px, py);
        g.quadraticCurveTo(px + 2, py + 10, px, py + 24);
        g.stroke();
      }
    }

    // glass reflection
    const ref = g.createLinearGradient(x, y, x + w, y + h);
    ref.addColorStop(0, "rgba(207,222,209,0.03)");
    ref.addColorStop(0.45, "rgba(207,222,209,0.02)");
    ref.addColorStop(0.5, "rgba(207,222,209,0.08)");
    ref.addColorStop(0.6, "rgba(207,222,209,0.01)");
    ref.addColorStop(1, "rgba(207,222,209,0.04)");
    g.fillStyle = ref;
    g.fillRect(x, y, w, h);

    // muntins
    g.strokeStyle = "rgba(39,26,16,0.92)";
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(x + w / 2, y);
    g.lineTo(x + w / 2, y + h);
    g.moveTo(x, y + h / 2);
    g.lineTo(x + w, y + h / 2);
    g.stroke();
    g.strokeStyle = "rgba(198,149,93,0.14)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x + w / 2 + 2, y);
    g.lineTo(x + w / 2 + 2, y + h);
    g.stroke();

    // curtains, animate closure
    const openW = 38;
    const closedW = w * 0.58;
    const cw = lerp(openW, closedW, curtain);
    const curtainColor = g.createLinearGradient(x, y, x + cw, y);
    curtainColor.addColorStop(0, "rgba(76,43,27,0.98)");
    curtainColor.addColorStop(0.6, "rgba(57,31,21,0.97)");
    curtainColor.addColorStop(1, "rgba(39,21,15,0.9)");
    g.fillStyle = curtainColor;
    g.beginPath();
    g.moveTo(x - 2, y - 2);
    g.quadraticCurveTo(x + cw * 0.24, y + h * 0.35, x + cw * 0.08, y + h + 2);
    g.lineTo(x - 2, y + h + 2);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(x + w + 2, y - 2);
    g.quadraticCurveTo(x + w - cw * 0.24, y + h * 0.4, x + w - cw * 0.08, y + h + 2);
    g.lineTo(x + w + 2, y + h + 2);
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(176,120,78,0.14)";
    g.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(x + 4 + i * (cw * 0.19), y + 3);
      g.quadraticCurveTo(x + 2 + i * (cw * 0.17), y + h * 0.5, x + 5 + i * (cw * 0.12), y + h);
      g.stroke();
    }

    // cool glow from window
    g.save();
    g.globalCompositeOperation = "lighter";
    const glow = g.createRadialGradient(x + w * 0.5, y + h * 0.5, 10, x + w * 0.5, y + h * 0.5, 240);
    glow.addColorStop(0, `rgba(132,174,176,${0.08 * (1 - curtain * 0.8)})`);
    glow.addColorStop(1, "rgba(90,130,135,0)");
    g.fillStyle = glow;
    g.beginPath();
    g.arc(x + w * 0.5, y + h * 0.5, 240, 0, TAU);
    g.fill();
    g.restore();
    g.restore();
  }

  function drawFire(g, t, stoke, hovered) {
    const cx = 500;
    const baseY = 690;
    const flame = 0.82 + Math.sin(t * 9.3) * 0.07 + Math.sin(t * 17.7) * 0.04 + stoke * 0.16;
    g.save();
    g.globalCompositeOperation = "lighter";

    // room glow around hearth
    const glow = g.createRadialGradient(cx, 610, 20, cx, 620, 470);
    glow.addColorStop(0, `rgba(255,159,78,${0.2 * flame})`);
    glow.addColorStop(0.24, `rgba(235,117,46,${0.11 * flame})`);
    glow.addColorStop(0.62, `rgba(160,64,23,${0.035 * flame})`);
    glow.addColorStop(1, "rgba(110,40,15,0)");
    g.fillStyle = glow;
    g.beginPath();
    g.arc(cx, 620, 470, 0, TAU);
    g.fill();

    // fire bed
    const bed = g.createRadialGradient(cx, 676, 3, cx, 676, 96);
    bed.addColorStop(0, `rgba(255,205,112,${0.85 * flame})`);
    bed.addColorStop(0.3, `rgba(255,133,43,${0.6 * flame})`);
    bed.addColorStop(1, "rgba(153,44,12,0)");
    g.fillStyle = bed;
    g.beginPath();
    g.ellipse(cx, 676, 105, 22, 0, 0, TAU);
    g.fill();

    // hot core, kept soft so the flame reads as light rather than paper
    const core = g.createRadialGradient(cx, 646, 2, cx, 650, 104);
    core.addColorStop(0, `rgba(255,238,188,${0.34 * flame})`);
    core.addColorStop(0.42, `rgba(255,168,72,${0.18 * flame})`);
    core.addColorStop(1, "rgba(255,110,30,0)");
    g.fillStyle = core;
    g.beginPath();
    g.ellipse(cx, 650, 110, 92, 0, 0, TAU);
    g.fill();

    // flames: layered tufts
    const layers = [
      { n: 3, w: 92, h: 164, c1: "rgba(166,50,12,0.34)", c2: "rgba(84,23,8,0)" },
      { n: 4, w: 66, h: 136, c1: "rgba(235,96,22,0.48)", c2: "rgba(168,49,10,0)" },
      { n: 4, w: 44, h: 106, c1: "rgba(255,164,58,0.56)", c2: "rgba(226,88,17,0)" },
      { n: 3, w: 25, h: 72, c1: "rgba(255,224,148,0.7)", c2: "rgba(255,148,48,0)" },
    ];
    layers.forEach((L, li) => {
      for (let i = 0; i < L.n; i++) {
        const ox = (i - (L.n - 1) / 2) * (L.w * 0.48);
        const hh = L.h * (0.72 + 0.38 * Math.sin(t * (6.3 + li * 1.4) + i * 2.1 + li));
        const sway = Math.sin(t * (4.2 + li) + i * 1.7) * 14;
        const ww = L.w * (0.45 + 0.2 * Math.sin(t * 3.1 + i));
        const tipX = cx + ox + sway;
        const tipY = baseY - 14 - hh;
        const grad = g.createLinearGradient(cx + ox, baseY - 10, tipX, tipY);
        grad.addColorStop(0, L.c1);
        grad.addColorStop(0.58, L.c1);
        grad.addColorStop(1, L.c2);
        g.save();
        g.fillStyle = grad;
        g.shadowColor = "rgba(255,104,26,0.5)";
        g.shadowBlur = 22 + li * 7;
        g.beginPath();
        g.moveTo(cx + ox - ww / 2, baseY - 12);
        g.bezierCurveTo(cx + ox - ww * 0.7, baseY - hh * 0.38, tipX - ww * 0.3, tipY + 26, tipX, tipY);
        g.bezierCurveTo(tipX + ww * 0.34, tipY + 40, cx + ox + ww * 0.74, baseY - hh * 0.32, cx + ox + ww / 2, baseY - 12);
        g.closePath();
        g.fill();
        g.restore();
      }
    });

    // heat bloom above the fire bed
    const bloom = g.createLinearGradient(cx, 540, cx, 690);
    bloom.addColorStop(0, "rgba(255,138,48,0)");
    bloom.addColorStop(0.62, `rgba(255,146,52,${0.045 * flame})`);
    bloom.addColorStop(1, `rgba(255,186,92,${0.06 * flame})`);
    g.fillStyle = bloom;
    g.fillRect(cx - 120, 540, 240, 150);

    // sparks
    const sparkCount = 10 + Math.round(stoke * 16);
    for (let i = 0; i < sparkCount; i++) {
      const seed = i * 7.3;
      const p = (t * (0.22 + (i % 5) * 0.04) + seed) % 1;
      const sx = cx + Math.sin(seed * 11 + t) * 64 * (1 - p * 0.4);
      const sy = baseY - 30 - p * (200 + (i % 4) * 50);
      const a = (1 - p) * (0.4 + (i % 3) * 0.18);
      g.fillStyle = `rgba(255,${150 + (i % 4) * 18},${70 + (i % 3) * 20},${a})`;
      g.beginPath();
      g.arc(sx, sy, 0.9 + (i % 3) * 0.5, 0, TAU);
      g.fill();
    }

    // ember line
    g.strokeStyle = `rgba(255,154,66,${0.24 * flame})`;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(cx - 96, 682);
    g.quadraticCurveTo(cx, 668, cx + 92, 680);
    g.stroke();
    g.restore();
  }

  function drawInteriorLights(g, t, phase, curtain, stoke) {
    const pouch = 0.92 + Math.sin(t * 8.7) * 0.045 + Math.sin(t * 15.3) * 0.02 + stoke * 0.06;
    // pendant lamp
    g.save();
    g.globalCompositeOperation = "lighter";
    const lampX = 1002;
    const lampY = 172;
    const lg = g.createRadialGradient(lampX, lampY, 4, lampX, lampY, 160);
    lg.addColorStop(0, "rgba(255,210,143,0.28)");
    lg.addColorStop(0.2, "rgba(245,175,99,0.12)");
    lg.addColorStop(1, "rgba(190,110,50,0)");
    g.fillStyle = lg;
    g.beginPath();
    g.arc(lampX, lampY, 160, 0, TAU);
    g.fill();

    // cone to table
    const cone = g.createLinearGradient(0, 185, 0, 740);
    cone.addColorStop(0, "rgba(255,205,135,0.12)");
    cone.addColorStop(0.55, "rgba(236,164,93,0.045)");
    cone.addColorStop(1, "rgba(180,110,55,0)");
    g.fillStyle = cone;
    g.beginPath();
    g.moveTo(980, 176);
    g.lineTo(1024, 176);
    g.lineTo(1160, 760);
    g.lineTo(846, 760);
    g.closePath();
    g.fill();

    // fireplace bounce on room
    const bounce = g.createLinearGradient(300, 500, 900, 760);
    bounce.addColorStop(0, `rgba(255,150,66,${0.075 * pouch})`);
    bounce.addColorStop(0.5, `rgba(220,105,42,${0.026 * pouch})`);
    bounce.addColorStop(1, "rgba(120,50,20,0)");
    g.fillStyle = bounce;
    g.fillRect(150, 430, 900, 380);

    // window cool light on floor
    const cool = g.createLinearGradient(0, 570, 0, 900);
    cool.addColorStop(0, `rgba(117,159,160,${0.07 * (1 - curtain * 0.75)})`);
    cool.addColorStop(0.55, `rgba(89,130,134,${0.035 * (1 - curtain * 0.75)})`);
    cool.addColorStop(1, "rgba(60,96,100,0)");
    g.fillStyle = cool;
    g.beginPath();
    g.moveTo(1150, 590);
    g.lineTo(1450, 590);
    g.lineTo(1540, 900);
    g.lineTo(970, 900);
    g.closePath();
    g.fill();
    g.restore();
  }

  function drawInteriorAtmosphere(g, t, stoke, mugSteam, hovered) {
    // dust motes in pendant light
    g.save();
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 42; i++) {
      const seed = i * 5.73;
      const x = 900 + Math.sin(t * 0.19 + seed) * 170 + (i % 7) * 14;
      const y = 210 + ((i * 137 + t * (3 + (i % 4))) % 450);
      const a = 0.08 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.8 + seed));
      g.fillStyle = `rgba(255,215,155,${a})`;
      g.beginPath();
      g.arc(x, y, 0.7 + (i % 3) * 0.5, 0, TAU);
      g.fill();
    }
    g.restore();

    // mug steam
    const steamAlpha = 0.1 + (mugSteam ? 0.08 : 0);
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.32 + i * 0.33) % 1;
      const x = 1032 + Math.sin(t * 1.1 + i * 2.2) * 7;
      const y = 612 - p * 86;
      g.strokeStyle = `rgba(221,207,179,${steamAlpha * (1 - p)})`;
      g.lineWidth = 1.1;
      g.beginPath();
      g.moveTo(x, y + 18);
      g.bezierCurveTo(x - 9, y + 7, x + 10, y - 2, x + Math.sin(t + i) * 5, y - 16);
      g.stroke();
    }

    // radio notes
    // triggered by a flag on g
    g.restore && null;
  }

  function drawRadioNotes(g, t, on) {
    if (!on) return;
    g.save();
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.16 + i * 0.19) % 1;
      const x = 150 + Math.sin(t * 0.8 + i * 1.9) * 26;
      const y = 390 - p * 180;
      const a = (1 - p) * 0.32;
      g.fillStyle = `rgba(247,214,157,${a})`;
      g.font = `${13 + (i % 2) * 3}px serif`;
      g.fillText(i % 2 ? "♪" : "♫", x, y);
    }
    g.restore();
  }

  function drawCat(g, t, awake, hovered) {
    const x = 1096;
    const y = 718;
    const breathe = 1 + Math.sin(t * 1.5) * 0.015;
    g.save();
    g.translate(x, y);
    g.scale(breathe * 1.16, breathe * 1.16);

    // soft pool of hearth light under the cat
    const pool = g.createRadialGradient(0, 4, 2, 0, 4, 92);
    pool.addColorStop(0, "rgba(238,136,67,0.12)");
    pool.addColorStop(1, "rgba(238,136,67,0)");
    g.fillStyle = pool;
    g.beginPath();
    g.ellipse(0, 4, 92, 32, 0, 0, TAU);
    g.fill();

    // shadow
    g.fillStyle = "rgba(4,3,2,0.38)";
    g.beginPath();
    g.ellipse(0, 12, 48, 9, 0, 0, TAU);
    g.fill();

    // body
    const body = g.createLinearGradient(-40, -20, 38, 22);
    body.addColorStop(0, "#3b2a21");
    body.addColorStop(0.55, "#2a1e18");
    body.addColorStop(1, "#18120f");
    g.fillStyle = body;
    g.beginPath();
    g.ellipse(0, -2, 42, 22, -0.04, 0, TAU);
    g.fill();
    // haunch
    g.beginPath();
    g.ellipse(-22, -1, 24, 19, 0, 0, TAU);
    g.fill();

    // head
    g.fillStyle = "#31231b";
    g.beginPath();
    g.ellipse(32, -12, 16, 14, 0.1, 0, TAU);
    g.fill();
    // ears
    g.beginPath();
    g.moveTo(22, -23);
    g.lineTo(20, -38);
    g.lineTo(31, -29);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(39, -26);
    g.lineTo(47, -37);
    g.lineTo(45, -22);
    g.closePath();
    g.fill();

    // tail
    g.strokeStyle = "#2b1f18";
    g.lineWidth = 8;
    g.lineCap = "round";
    const tailSwing = Math.sin(t * (awake ? 1.6 : 0.5)) * (awake ? 0.2 : 0.06);
    g.beginPath();
    g.moveTo(-38, 4);
    g.bezierCurveTo(-62, 2 + tailSwing * 20, -56, -18, -42, -14 + tailSwing * 8);
    g.stroke();
    g.strokeStyle = "rgba(149,104,73,0.14)";
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(-40, -13);
    g.bezierCurveTo(-52, -20, -58, 2, -48, 6);
    g.stroke();

    // warm rim from fire
    g.strokeStyle = "rgba(248,166,96,0.34)";
    g.lineWidth = 1.8;
    g.beginPath();
    g.ellipse(31, -13, 16, 14, 0.1, -2.1, 0.8);
    g.stroke();
    g.beginPath();
    g.ellipse(5, -11, 42, 21, -0.04, -2.7, -1.5);
    g.stroke();
    // faint fur catch along the haunch and tail
    g.strokeStyle = "rgba(226,152,94,0.18)";
    g.lineWidth = 1.1;
    g.beginPath();
    g.ellipse(-22, -1, 24, 19, 0, -2.2, -0.6);
    g.stroke();

    // closed eye / open eye
    if (awake) {
      g.strokeStyle = "rgba(222,174,92,0.8)";
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(37, -14, 2.2, 0, TAU);
      g.stroke();
      g.fillStyle = "rgba(16,12,9,0.85)";
      g.beginPath();
      g.ellipse(37, -14, 1.2, 1.8, 0, 0, TAU);
      g.fill();
    } else {
      g.strokeStyle = "rgba(12,9,7,0.8)";
      g.lineWidth = 1;
      g.beginPath();
      g.arc(37, -14, 2.4, 0.2, Math.PI - 0.2);
      g.stroke();
    }
    // nose / whiskers
    g.fillStyle = "rgba(168,120,91,0.55)";
    g.beginPath();
    g.arc(46, -10, 1.2, 0, TAU);
    g.fill();
    g.strokeStyle = "rgba(205,177,146,0.18)";
    g.lineWidth = 0.7;
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(47, -9 + i * 1.5);
      g.lineTo(62, -12 + i * 5);
      g.stroke();
    }
    if (hovered) {
      g.strokeStyle = "rgba(255,193,118,0.18)";
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(0, -3, 46, 26, 0, 0, TAU);
      g.stroke();
    }
    g.restore();
  }

  function drawInteriorHover(g, hovered, t) {
    if (!hovered) return;
    const rings = {
      fire: [500, 610, 150, 118],
      cat: [1096, 706, 80, 64],
      mug: [1033, 638, 36, 38],
      radio: [100, 430, 64, 60],
      window: [1300, 415, 155, 190],
      chair: [835, 645, 130, 125],
    };
    const r = rings[hovered];
    if (!r) return;
    g.save();
    g.strokeStyle = `rgba(255,206,140,${0.13 + 0.04 * Math.sin(t * 2)})`;
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(r[0], r[1], r[2], r[3], 0, 0, TAU);
    g.stroke();
    g.restore();
  }

  /* ── export ──────────────────────────────────────────────── */

  window.CabinArt = {
    W,
    H,
    TAU,
    clamp,
    lerp,
    smooth,
    mixHex,
    rgba,
    mulberry32,
    buildLayers() {
      const scale = 1.35;
      return {
        ridge: makeLayer(drawRidge, scale),
        far: makeLayer(drawFarForest, scale),
        mid: makeLayer(drawMidForest, scale),
        ground: makeLayer(drawGround, scale),
        cabin: makeLayer(drawCabin, scale),
        near: makeLayer(drawNearTrees, scale),
        interior: makeLayer(drawInterior, scale),
      };
    },
    drawSky,
    drawClouds,
    drawExteriorLights,
    drawFog,
    drawRain,
    drawFireflies,
    drawShootingStar,
    drawInteriorWindow,
    drawFire,
    drawInteriorLights,
    drawInteriorAtmosphere,
    drawRadioNotes,
    drawCat,
    drawInteriorHover,
    drawLantern,
  };
})();
