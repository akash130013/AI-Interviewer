#!/usr/bin/env node
/**
 * Generates assets/icon.png and assets/splash.png for Interview Boat.
 *
 * icon.png   — 1024×1024, ocean-blue background + white microphone.
 *              Used as: app.json "icon" (legacy) AND adaptiveIcon.foregroundImage.
 *              For adaptive icons the background is set separately via backgroundColor,
 *              so we fill the whole square to avoid transparent gaps.
 *
 * splash.png — 1024×1024, same design, mic centred for landscape-safe loading screen.
 *
 * Run: node scripts/generate-icon.js
 */

const { PNG } = require("pngjs");
const fs      = require("fs");
const path    = require("path");

// ── Canvas helpers ────────────────────────────────────────────────────────────

function makeCanvas(size) {
  const buf = Buffer.alloc(size * size * 4, 0);

  function idx(x, y) { return (y * size + x) * 4; }

  function set(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = idx(x, y);
    buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = a;
  }

  function fillRect(x1, y1, x2, y2, r, g, b, a = 255) {
    for (let y = Math.max(0, y1); y <= Math.min(size-1, y2); y++)
      for (let x = Math.max(0, x1); x <= Math.min(size-1, x2); x++)
        set(x, y, r, g, b, a);
  }

  function fillCircle(cx, cy, radius, r, g, b, a = 255) {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++)
        if (dx*dx + dy*dy <= r2) set(cx+dx, cy+dy, r, g, b, a);
  }

  function fillRoundedRect(x, y, w, h, cr, r, g, b, a = 255) {
    fillRect(x+cr, y,    x+w-cr, y+h,    r, g, b, a);
    fillRect(x,    y+cr, x+w,    y+h-cr, r, g, b, a);
    fillCircle(x+cr,     y+cr,     cr, r, g, b, a);
    fillCircle(x+w-cr,   y+cr,     cr, r, g, b, a);
    fillCircle(x+cr,     y+h-cr,   cr, r, g, b, a);
    fillCircle(x+w-cr,   y+h-cr,   cr, r, g, b, a);
  }

  // Full ring at (cx,cy), inner radius rIn, outer radius rOut (all directions)
  function fillRing(cx, cy, rIn, rOut, r, g, b, a = 255) {
    for (let dy = -rOut; dy <= rOut; dy++)
      for (let dx = -rOut; dx <= rOut; dx++) {
        const d2 = dx*dx + dy*dy;
        if (d2 >= rIn*rIn && d2 <= rOut*rOut) set(cx+dx, cy+dy, r, g, b, a);
      }
  }

  // Bottom-half arc only (dy >= 0)
  function fillArcBottom(cx, cy, rIn, rOut, r, g, b, a = 255) {
    for (let dy = 0; dy <= rOut; dy++)
      for (let dx = -rOut; dx <= rOut; dx++) {
        const d2 = dx*dx + dy*dy;
        if (d2 >= rIn*rIn && d2 <= rOut*rOut) set(cx+dx, cy+dy, r, g, b, a);
      }
  }

  function save(filePath) {
    const png = new PNG({ width: size, height: size });
    png.data = buf;
    fs.writeFileSync(filePath, PNG.sync.write(png));
    console.log("✓ Written:", filePath);
  }

  return { set, fillRect, fillCircle, fillRoundedRect, fillRing, fillArcBottom, save };
}

// ── Ocean blue gradient background ───────────────────────────────────────────
// Top: #0c4a6e  →  Bottom: #0369a1

function drawBackground(c, SIZE) {
  for (let y = 0; y < SIZE; y++) {
    const t = y / (SIZE - 1);
    const R = Math.round(12  + t * (3  - 12));
    const G = Math.round(74  + t * (105 - 74));
    const B = Math.round(110 + t * (161 - 110));
    for (let x = 0; x < SIZE; x++) c.set(x, y, R, G, B);
  }
}

// ── Microphone silhouette ─────────────────────────────────────────────────────
// Drawn in white at a given scale/offset, centred at cx.

function drawMic(c, cx, cy, scale) {
  const W = 255, G = 255, B2 = 255;

  function s(v) { return Math.round(v * scale); }

  // Body — tall rounded pill
  const bW = s(160), bH = s(340), bR = s(80);
  c.fillRoundedRect(cx - Math.floor(bW/2), cy - s(230), bW, bH, bR, W, G, B2);

  // Stand arch — bottom semicircle arc
  c.fillArcBottom(cx, cy + s(110), s(160), s(210), W, G, B2);

  // Vertical pole
  const pW = s(28);
  c.fillRoundedRect(cx - Math.floor(pW/2), cy + s(310), pW, s(130), s(14), W, G, B2);

  // Horizontal base
  const baseW = s(240), baseH = s(36);
  c.fillRoundedRect(cx - Math.floor(baseW/2), cy + s(430), baseW, baseH, s(18), W, G, B2);

  // Small wave lines beneath mic — subtle nautical touch
  const waveY = cy + s(560);
  for (let i = 0; i < 3; i++) {
    const wx = cx - s(160) + i * s(110);
    c.fillRoundedRect(wx, waveY,      s(80),  s(16), s(8), W, G, B2);
    c.fillRoundedRect(wx + s(20), waveY + s(24), s(80), s(16), s(8), W, G, B2);
  }
}

// ── icon.png  (1024 × 1024) ───────────────────────────────────────────────────

function generateIcon() {
  const SIZE = 1024;
  const c = makeCanvas(SIZE);

  drawBackground(c, SIZE);
  // Mic centred, shifted slightly up so base has breathing room
  drawMic(c, 512, 310, 0.78);

  c.save(path.join(__dirname, "..", "assets", "icon.png"));
}

// ── splash.png  (1024 × 1024) ────────────────────────────────────────────────

function generateSplash() {
  const SIZE = 1024;
  const c = makeCanvas(SIZE);

  drawBackground(c, SIZE);
  // Smaller mic, centred vertically
  drawMic(c, 512, 340, 0.52);

  c.save(path.join(__dirname, "..", "assets", "splash.png"));
}

generateIcon();
generateSplash();
console.log("Done. Commit assets/ and rebuild.");
