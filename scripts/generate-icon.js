#!/usr/bin/env node
/**
 * Generates assets/icon.png and assets/splash.png for the CrackIt app.
 * Design: dark navy gradient background + white microphone silhouette.
 * Run with: node scripts/generate-icon.js
 */

const { PNG } = require("pngjs");
const fs = require("fs");
const path = require("path");

// ─── Pixel helpers ────────────────────────────────────────────────────────────

function makeCanvas(size) {
  const buf = Buffer.alloc(size * size * 4, 0);

  function set(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
  }

  function fillRect(x1, y1, x2, y2, r, g, b) {
    for (let y = Math.max(0, y1); y <= Math.min(size - 1, y2); y++)
      for (let x = Math.max(0, x1); x <= Math.min(size - 1, x2); x++)
        set(x, y, r, g, b);
  }

  function fillCircle(cx, cy, radius, r, g, b) {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++)
        if (dx * dx + dy * dy <= r2) set(cx + dx, cy + dy, r, g, b);
  }

  // Pill-shaped rounded rectangle (r = corner radius)
  function fillRoundedRect(x, y, w, h, cr, r, g, b) {
    fillRect(x + cr, y, x + w - cr, y + h, r, g, b);
    fillRect(x, y + cr, x + w, y + h - cr, r, g, b);
    fillCircle(x + cr,     y + cr,     cr, r, g, b);
    fillCircle(x + w - cr, y + cr,     cr, r, g, b);
    fillCircle(x + cr,     y + h - cr, cr, r, g, b);
    fillCircle(x + w - cr, y + h - cr, cr, r, g, b);
  }

  // Bottom-half ring arc (y >= cy)
  function fillArcBottom(cx, cy, rIn, rOut, r, g, b) {
    for (let dy = 0; dy <= rOut; dy++)
      for (let dx = -rOut; dx <= rOut; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 >= rIn * rIn && d2 <= rOut * rOut)
          set(cx + dx, cy + dy, r, g, b);
      }
  }

  function save(filePath) {
    const png = new PNG({ width: size, height: size });
    png.data = buf;
    fs.writeFileSync(filePath, PNG.sync.write(png));
    console.log("Written:", filePath);
  }

  return { buf, set, fillRect, fillCircle, fillRoundedRect, fillArcBottom, save };
}

// ─── Icon (1024 × 1024) ───────────────────────────────────────────────────────

function generateIcon() {
  const SIZE = 1024;
  const c = makeCanvas(SIZE);

  // Background gradient: #1e293b (top) → #0f172a (bottom)
  for (let y = 0; y < SIZE; y++) {
    const t = y / SIZE;
    const R = Math.round(30 + t * (15 - 30));
    const G = Math.round(41 + t * (23 - 41));
    const B = Math.round(59 + t * (42 - 59));
    for (let x = 0; x < SIZE; x++) c.set(x, y, R, G, B);
  }

  const CX = 512;
  const W = 255;

  // 1. Microphone capsule — pill shape 240×400 centered at (512, 330)
  //    top=130, bottom=530, r=120 (half-width → perfect pill)
  c.fillRoundedRect(392, 130, 240, 400, 120, W, W, W);

  // 2. Mic stand arc — bottom semicircle, center=(512, 530), ring r=220–280
  c.fillArcBottom(CX, 530, 220, 280, W, W, W);

  // 3. Vertical stand pole
  c.fillRoundedRect(492, 810, 40, 100, 20, W, W, W);

  // 4. Horizontal base — centered, wide, pill-shaped
  c.fillRoundedRect(382, 895, 260, 40, 20, W, W, W);

  c.save(path.join(__dirname, "..", "assets", "icon.png"));
}

// ─── Splash (1024 × 1024) ─────────────────────────────────────────────────────

function generateSplash() {
  const SIZE = 1024;
  const c = makeCanvas(SIZE);

  // Same dark background
  for (let y = 0; y < SIZE; y++) {
    const t = y / SIZE;
    const R = Math.round(30 + t * (15 - 30));
    const G = Math.round(41 + t * (23 - 41));
    const B = Math.round(59 + t * (42 - 59));
    for (let x = 0; x < SIZE; x++) c.set(x, y, R, G, B);
  }

  const CX = 512;
  const W = 255;

  // Smaller mic centered for splash (scale 0.55)
  const scale = 0.55;
  const offsetY = -30;

  function s(v) { return Math.round(v * scale); }

  c.fillRoundedRect(
    CX - s(120), 400 + offsetY, s(240), s(400), s(120), W, W, W
  );
  c.fillArcBottom(CX, 400 + s(200) + offsetY, s(220), s(280), W, W, W);

  const poleTop = 400 + s(200) + s(220) + offsetY;
  c.fillRoundedRect(CX - s(20), poleTop, s(40), s(100), s(20), W, W, W);
  c.fillRoundedRect(CX - s(130), poleTop + s(100) - 10, s(260), s(40), s(20), W, W, W);

  // App name text — draw "CrackIt" as small pixels (we skip actual font rendering;
  // Expo overlays its own splash text via the config if needed)

  c.save(path.join(__dirname, "..", "assets", "splash.png"));
}

generateIcon();
generateSplash();
console.log("Done. Rebuild the app with: eas build --platform android --profile preview");
