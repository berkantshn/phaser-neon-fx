import Phaser from 'phaser';
import { TEXTURE_KEYS, GLOW_TEXTURE_SIZE, createGlowTextures } from './textures.js';
import { SHAPED_KILL_KINDS, KILL_SHAPE_DURATION, drawKillShape } from './killFx.js';

const GOLD = 0xffd166; // 'gold' efektinin rengi

// Varsayılan ayarlar. Her biri new Effects(scene, { ... }) ile değiştirilebilir.
export const DEFAULT_EFFECTS_OPTIONS = {
  depth: 7, // Parçacık, halka ve şekillerin çizim sırası
  flashDepth: 901, // Ekran flaşının çizim sırası (her şeyin üstünde olsun)
  killKind: 'default', // Öldürme efekti: default, shower, ring, gold, shock, glitch, circuit, electrons, lightning
  accentColor: 0x2ee6ff, // 'shock' ve şekilli efektlerin vurgu rengi
  lowQuality: false, // Düşük kalite: parçacık sayısı yarıya iner, ek halka ve şekiller çizilmez
  killFxMinGap: 0.05, // Öldürme efektindeki halkalar arasında en az bu kadar saniye (kalabalıkta kasmasın)
  shapePoolSize: 8, // Şekilli efektler için hazır tuval sayısı
  screenShake: true, // false: shake() hiçbir şey yapmaz
  vibration: true, // false: vibrate() hiçbir şey yapmaz
  flashes: true, // false: flash() hiçbir şey yapmaz
};

// Görsel efektler: parçacık patlamaları, halkalar, flaşlar, sarsıntı ve titreşim.
// Ayarların hepsi aynı adla nesnenin üstünde durur; oyun sırasında değiştirilebilir (örn. effects.flashes = false).
export class Effects {
  constructor(scene, options = {}) {
    const cfg = { ...DEFAULT_EFFECTS_OPTIONS, ...options };
    this.scene = scene;
    this.depth = cfg.depth;
    this.flashDepth = cfg.flashDepth;
    this.killKind = cfg.killKind;
    this.accentColor = cfg.accentColor;
    this.lowQuality = cfg.lowQuality;
    this.killFxMinGap = cfg.killFxMinGap;
    this.screenShake = cfg.screenShake;
    this.vibration = cfg.vibration;
    this.flashes = cfg.flashes;

    createGlowTextures(scene);

    // Tek bir parçacık yayıcı, her patlamada rengi değiştirilip kullanılır
    this.emitter = scene.add.particles(0, 0, TEXTURE_KEYS.white, {
      speed: { min: 80, max: 260 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.22, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 250, max: 500 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.emitter.setDepth(this.depth);
    this.lastKillRing = 0;
    // Şekilli öldürme efektleri için hazır çizim tuvalleri (havuz: her efektte yeni nesne yaratılmaz)
    this.shapePool = [];
    for (let i = 0; i < cfg.shapePoolSize; i++) {
      this.shapePool.push(
        scene.add.graphics().setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD).setVisible(false),
      );
    }
  }

  // Öldürme anı: seçili efekte göre parçacık + (varsa) halka.
  // Halkalar killFxMinGap ile seyreltilir: aynı anda onlarca halka açılıp oyunu kasmasın.
  killBurst(x, y, color, count) {
    const kind = this.killKind;
    this.burst(x, y, kind === 'gold' ? GOLD : color, kind === 'shower' ? count * 2 : count);
    if (kind === 'default' || kind === 'shower' || this.lowQuality) return;
    const now = this.scene.time.now / 1000;
    if (now - this.lastKillRing < this.killFxMinGap) return;
    this.lastKillRing = now;
    if (SHAPED_KILL_KINDS.includes(kind)) this.killShape(x, y, kind, color);
    else if (kind === 'ring') this.ring(x, y, 70, color, 300);
    else if (kind === 'gold') this.ring(x, y, 60, GOLD, 320);
    else if (kind === 'shock') this.ring(x, y, 130, this.accentColor, 380);
  }

  // Şekilli öldürme efekti (glitch, circuit, electrons, lightning): havuzdaki boş tuvalde oynatılır.
  // Boş tuval yoksa efekt atlanır (kalabalıkta kasmasın).
  killShape(x, y, kind, color) {
    const g = this.shapePool.find((item) => !item.visible);
    if (!g) return;
    g.setPosition(x, y).setVisible(true);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: KILL_SHAPE_DURATION[kind] * 1000,
      onUpdate: (tween) => {
        g.clear();
        drawKillShape(g, kind, tween.getValue(), color, this.accentColor);
      },
      onComplete: () => g.clear().setVisible(false),
    });
  }

  // Ekran sarsıntısı (screenShake ile kapatılabilir)
  shake(durationMs, intensity) {
    if (!this.screenShake) return;
    this.scene.cameras.main.shake(durationMs, intensity);
  }

  // Telefon titreşimi (vibration ile kapatılabilir, desteklemeyen cihazlarda sessizce geçer)
  vibrate(pattern) {
    if (!this.vibration) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  // Parçacık patlaması
  burst(x, y, color, count) {
    this.emitter.setParticleTint(color);
    this.emitter.explode(this.lowQuality ? Math.ceil(count / 2) : count, x, y);
  }

  // Tüm ekranı kaplayan kısa renk flaşı (flashes ile kapatılabilir)
  flash(color, alpha, duration) {
    if (!this.flashes) return;
    const { width, height } = this.scene.scale;
    const rect = this.scene.add
      .rectangle(0, 0, width, height, color, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(this.flashDepth)
      .setAlpha(alpha);
    this.scene.tweens.add({ targets: rect, alpha: 0, duration, onComplete: () => rect.destroy() });
  }

  // Merkezden dışa genişleyip solan halka
  ring(x, y, radius, color, duration = 350) {
    const image = this.scene.add
      .image(x, y, TEXTURE_KEYS.white)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(color)
      .setDepth(this.depth)
      .setScale(0.2)
      .setAlpha(0.9);
    this.scene.tweens.add({
      targets: image,
      scale: (radius * 2.4) / GLOW_TEXTURE_SIZE,
      alpha: 0,
      duration,
      ease: 'Cubic.Out',
      onComplete: () => image.destroy(),
    });
  }
}
