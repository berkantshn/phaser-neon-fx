import Phaser from 'phaser';
import { TEXTURE_KEYS, GLOW_TEXTURE_SIZE, createGlowTextures } from './textures.js';

// Hareket eden bir nesnenin arkasında kalan solan ışık izi.
// Parlama görsellerini baştan bir kez oluşturup tekrar tekrar kullanıyoruz
// (nesne havuzlama): her karede yeni nesne yaratmak telefonu yorar.
const COLOR_BLOCK = 6; // Çok renkli izde bir renk bloğunun uzunluğu (iz noktası)

// Varsayılan ayarlar. Her biri new SparkTrail(scene, { ... }) ile değiştirilebilir.
export const DEFAULT_TRAIL_OPTIONS = {
  textureKey: TEXTURE_KEYS.glow, // İz noktalarının dokusu
  tint: 0xffffff, // Tek renkli izin rengi
  tints: null, // Renk blokları: [renk1, renk2, ...]
  rainbow: false, // Renk sürekli döner
  pulse: false, // Kalp atışı gibi parlaklık dalgası
  aurora: null, // İki renk arasında akan dalga: [renk1, renk2]
  sparkle: false, // Bazı noktalar beyaz yıldız gibi parlar
  lifetime: 0.35, // İzin ekranda kalma süresi (saniye). Büyüdükçe iz uzar.
  spacing: 4, // İz noktaları arasındaki mesafe. Küçüldükçe iz daha pürüzsüz (ama daha çok nesne).
  maxPoints: 80, // Aynı anda en fazla kaç iz noktası çizilir (performans sınırı)
  radius: 26, // İzin başındaki parlamanın yarıçapı
  startAlpha: 0.6, // İzin başındaki parlaklık. 0 = görünmez, 1 = tam parlak.
  endSize: 0.2, // İzin sonundaki boyut, başa oranla. 0.2 = sonda beşte bir boyutuna iner.
  depth: 9, // Çizim sırası
};

const lerpColor = (a, b, k) => {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(
    Phaser.Display.Color.IntegerToColor(a),
    Phaser.Display.Color.IntegerToColor(b),
    100,
    Math.round(k * 100),
  );
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
};

// Bir iz noktasının görünüşü. Kendi önizlemeni çizmek istersen aynı hesabı kullanabilirsin.
// look: { tint, tints?, rainbow?, pulse?, aurora?, sparkle? } · i: noktanın sırası (baştan) · phase: noktanın eklenme sırası
// time: saniye · hue: gökkuşağı için dönen renk tonu
// Döner: { tint, alpha, scale } (alpha ve scale çarpan; 1 = değişmez)
export function trailPointLook(look, i, phase, time, hue = 0) {
  let tint = look.tint;
  let alpha = 1;
  let scale = 1;
  if (look.rainbow) {
    const c = Phaser.Display.Color.HSVToRGB((hue + i * 0.02) % 1, 0.8, 1);
    tint = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
  } else if (look.tints) {
    // Renk blokları iz boyunca kayar (her blok COLOR_BLOCK nokta)
    tint = look.tints[Math.floor(phase / COLOR_BLOCK) % look.tints.length];
  } else if (look.aurora) {
    // İki renk arasında yavaşça akan dalga
    tint = lerpColor(look.aurora[0], look.aurora[1], 0.5 + 0.5 * Math.sin(time * 1.3 - i * 0.18));
  }
  if (look.pulse) {
    // Kalp atışı gibi: iz boyunca ilerleyen parlaklık dalgası
    const beat = 0.5 + 0.5 * Math.sin(time * 7 - i * 0.55);
    alpha = 0.45 + 0.55 * beat;
    scale = 0.85 + 0.3 * beat;
  }
  if (look.sparkle) {
    // Bazı noktalar kısa anlarda beyaz yıldız gibi parlar (rastgele değil: sıraya ve zamana bağlı)
    const twinkle = Math.sin(phase * 12.9898 + time * 9) * 0.5 + 0.5;
    if (twinkle > 0.82) {
      tint = 0xffffff;
      scale = 1.45;
      alpha = 1;
    }
  }
  return { tint, alpha, scale };
}

export class SparkTrail {
  constructor(scene, options = {}) {
    const cfg = { ...DEFAULT_TRAIL_OPTIONS, ...options };
    this.cfg = cfg;
    this.points = [];
    this.images = [];
    this.look = {
      tint: cfg.tint,
      tints: cfg.tints ?? null,
      pulse: cfg.pulse === true,
      aurora: cfg.aurora ?? null,
      sparkle: cfg.sparkle === true,
    };
    this.rainbow = cfg.rainbow === true; // Gökkuşağı izi: renk sürekli döner
    this.phase = 0; // Eklenen her noktada artar (renk blokları ve parıltı buna bağlı)
    this.hue = 0;
    this.time = 0;
    this.boost = 1; // İz uzunluğu çarpanı (dışarıdan değiştirilebilir)
    // Tek renkli, efektsiz izde her karede renk hesaplamaya gerek yok
    this.plain = !this.look.tints && !this.look.pulse && !this.look.aurora && !this.look.sparkle;

    createGlowTextures(scene);

    for (let i = 0; i < cfg.maxPoints; i++) {
      const image = scene.add
        .image(0, 0, cfg.textureKey)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(cfg.tint)
        .setDepth(cfg.depth)
        .setVisible(false);
      this.images.push(image);
    }
  }

  // Her karede çağrılır. dt: geçen süre (saniye) · x, y: izin başının konumu
  update(dt, x, y) {
    const cfg = this.cfg;
    const lifetime = cfg.lifetime * this.boost;
    this.time += dt;

    // Eski noktaları yaşlandır, ömrü dolanları at
    for (const point of this.points) point.age += dt;
    while (this.points.length > 0 && this.points[0].age >= lifetime) {
      this.points.shift();
    }

    // Yeterince ilerlediyse yeni bir iz noktası ekle
    const last = this.points[this.points.length - 1];
    if (!last || Phaser.Math.Distance.Between(last.x, last.y, x, y) >= cfg.spacing) {
      if (this.points.length >= cfg.maxPoints) this.points.shift();
      this.phase += 1;
      this.points.push({ x, y, age: 0, phase: this.phase });
    }

    // Noktaları çiz: yaşlandıkça küçülür ve söner
    const baseScale = (cfg.radius * 2) / GLOW_TEXTURE_SIZE;
    if (this.rainbow) this.hue = (this.hue + dt * 0.6) % 1;
    const styled = this.rainbow || !this.plain;
    const look = this.rainbow ? { ...this.look, rainbow: true } : this.look;
    for (let i = 0; i < this.images.length; i++) {
      const image = this.images[i];
      const point = this.points[i];
      if (!point) {
        image.setVisible(false);
        continue;
      }
      const life = Math.max(0, 1 - point.age / lifetime); // 1 = yeni, 0 = bitmek üzere
      const sizeFactor = cfg.endSize + (1 - cfg.endSize) * life;
      let alpha = 1;
      let scale = 1;
      if (styled) {
        const p = trailPointLook(look, i, point.phase, this.time, this.hue);
        image.setTint(p.tint);
        alpha = p.alpha;
        scale = p.scale;
      }
      image
        .setVisible(true)
        .setPosition(point.x, point.y)
        .setAlpha(life * cfg.startAlpha * alpha)
        .setScale(baseScale * sizeFactor * scale);
    }
  }

  // İzi sahneden kaldırır (görünümü değiştirirken eskisini silmek için)
  destroy() {
    for (const image of this.images) image.destroy();
    this.images = [];
    this.points = [];
  }
}
