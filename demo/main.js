import Phaser from 'phaser';
import { Effects, SparkTrail, TEXTURE_KEYS, GLOW_TEXTURE_SIZE } from '../src/index.js';

const KILL_KINDS = ['default', 'shower', 'ring', 'gold', 'shock', 'glitch', 'circuit', 'electrons', 'lightning'];
const COLORS = [0x2ee6ff, 0xff4fd8, 0xc6ff3d, 0xffc93c, 0x8a7bff];

// Açılır listedeki iz görünüşleri
const TRAIL_LOOKS = {
  plain: { tint: 0xffffff },
  rainbow: { rainbow: true },
  tints: { tints: [0x2ee6ff, 0xff4fd8], textureKey: TEXTURE_KEYS.white },
  aurora: { aurora: [0x2ee6ff, 0xc6ff3d], textureKey: TEXTURE_KEYS.white },
  pulse: { tint: 0xff4fd8, pulse: true, textureKey: TEXTURE_KEYS.white },
  sparkle: { tint: 0x2ee6ff, sparkle: true, textureKey: TEXTURE_KEYS.white },
};

class DemoScene extends Phaser.Scene {
  constructor() {
    super('demo');
    this.clicks = 0;
    this.elapsed = 0;
  }

  create() {
    this.grid = this.add.graphics().setDepth(0);
    this.drawGrid();
    this.scale.on('resize', () => this.drawGrid());

    this.effects = new Effects(this);
    this.setTrailLook('rainbow');

    // İzin başındaki parlak nokta
    this.head = this.add
      .image(0, 0, TEXTURE_KEYS.white)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(10)
      .setScale(36 / GLOW_TEXTURE_SIZE);

    this.input.on('pointerdown', (pointer) => this.spawnAt(pointer.x, pointer.y));

    // Üstteki kontroller
    const killSelect = document.getElementById('kill-kind');
    for (const kind of KILL_KINDS) killSelect.add(new Option(kind, kind));
    const trailSelect = document.getElementById('trail-look');
    for (const name of Object.keys(TRAIL_LOOKS)) trailSelect.add(new Option(name, name));
    trailSelect.value = 'rainbow';
    trailSelect.addEventListener('change', () => this.setTrailLook(trailSelect.value));
    document.getElementById('flash').addEventListener('click', () => this.effects.flash(0x2ee6ff, 0.35, 260));
    document.getElementById('shake').addEventListener('click', () => this.effects.shake(200, 0.01));
    this.killSelect = killSelect;
  }

  // Görünüm değişince iz baştan kurulur
  setTrailLook(name) {
    this.trail?.destroy();
    this.trail = new SparkTrail(this, TRAIL_LOOKS[name]);
  }

  // Tıklama: öldürme efekti (patlama + seçili efekt) ve her zaman bir halka
  spawnAt(x, y) {
    const color = COLORS[this.clicks % COLORS.length];
    const choice = this.killSelect.value;
    this.effects.killKind = choice === 'auto' ? KILL_KINDS[this.clicks % KILL_KINDS.length] : choice;
    this.effects.killBurst(x, y, color, 24);
    this.effects.ring(x, y, 90, color);
    this.effects.vibrate(20);
    this.clicks += 1;
  }

  update(_time, delta) {
    const dt = delta / 1000;
    this.elapsed += dt;
    const { width, height } = this.scale;
    const x = width / 2 + Math.cos(this.elapsed * 1.1) * width * 0.34;
    const y = height / 2 + Math.sin(this.elapsed * 1.9) * height * 0.3;
    this.head.setPosition(x, y);
    this.trail.update(dt, x, y);
  }

  // Koyu zemin üstünde soluk neon ızgara
  drawGrid() {
    const { width, height } = this.scale;
    const step = 48;
    this.grid.clear();
    this.grid.lineStyle(1, 0x2ee6ff, 0.07);
    for (let x = step; x < width; x += step) this.grid.lineBetween(x, 0, x, height);
    for (let y = step; y < height; y += step) this.grid.lineBetween(0, y, width, y);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'stage',
  backgroundColor: '#05070f',
  banner: false,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: DemoScene,
});
