// Şekilli öldürme efektleri.
// Rastgelelik yok: şekiller açıya ve sıraya bağlı, her oynatışta aynı görünür.
// g: Phaser Graphics (0,0 = efektin merkezi) · p: 0 → 1 ilerleme · color: ana renk · accent: vurgu rengi · s: ölçek

// Bu türler şekilli çizim ister (Effects.killBurst havuzdaki Graphics ile oynatır)
export const SHAPED_KILL_KINDS = ['glitch', 'circuit', 'electrons', 'lightning'];

// Efektin süresi (saniye)
export const KILL_SHAPE_DURATION = { glitch: 0.35, circuit: 0.45, electrons: 0.5, lightning: 0.3 };

export function drawKillShape(g, kind, p, color, accent, s = 1) {
  const fade = 1 - p;
  if (kind === 'glitch') {
    // Bozuk piksel dağılması: kareler dışa kayar, bazıları yatay şeride uzar
    for (let i = 0; i < 10; i++) {
      const a = i * 2.39996; // Altın açı: kareler dengeli dağılır
      const d = (6 + (i % 4) * 7) * (0.4 + p * 1.4) * s;
      const size = (7 - (i % 3) * 2) * fade * s + 1;
      const wide = i % 4 === 0 ? 3 : 1;
      g.fillStyle(i % 3 === 0 ? 0xffffff : color, fade);
      g.fillRect(Math.cos(a) * d - (size * wide) / 2, Math.sin(a) * d - size / 2, size * wide, size);
    }
    return;
  }
  if (kind === 'circuit') {
    // Devre izi: dört yöne uzayan, bir kez dirsek yapan yollar; uçlarında ped
    const reach = 34 * s * Math.min(1, p * 1.6);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const turn = a + (i % 2 ? 0.7 : -0.7);
      const mid = { x: Math.cos(a) * reach * 0.6, y: Math.sin(a) * reach * 0.6 };
      const end = { x: mid.x + Math.cos(turn) * reach * 0.45, y: mid.y + Math.sin(turn) * reach * 0.45 };
      g.lineStyle(2.5 * s, accent, fade);
      g.lineBetween(0, 0, mid.x, mid.y);
      g.lineBetween(mid.x, mid.y, end.x, end.y);
      g.fillStyle(0xd9b25a, fade); // Lehim pedi
      g.fillCircle(end.x, end.y, 3.5 * s);
    }
    g.fillStyle(accent, fade);
    g.fillCircle(0, 0, 4 * s * fade);
    return;
  }
  if (kind === 'electrons') {
    // Elektron saçılması: altı elektron sarmal çizerek dışarı kaçar, arkalarında kısa iz
    for (let i = 0; i < 6; i++) {
      const a0 = (i * Math.PI) / 3;
      for (let k = 0; k < 3; k++) {
        const q = Math.max(0, p - k * 0.06);
        const a = a0 + q * 3.2;
        const d = (4 + q * 40) * s;
        g.fillStyle(k === 0 ? 0xffffff : accent, fade * (1 - k * 0.3));
        g.fillCircle(Math.cos(a) * d, Math.sin(a) * d, (3.2 - k * 0.8) * s);
      }
    }
    return;
  }
  if (kind === 'lightning') {
    // Yıldırım çarpması: dört kırık kol dışa çakar, beyaz çekirdek parlar
    const len = 44 * s * Math.min(1, 0.4 + p * 1.5);
    for (let i = 0; i < 4; i++) {
      const base = (i * Math.PI) / 2 + 0.4;
      const pts = [];
      for (let k = 0; k <= 4; k++) {
        const d = (len * k) / 4;
        const off = k === 0 || k === 4 ? 0 : Math.sin(i * 7.1 + k * 3.3) * 0.35;
        pts.push({ x: Math.cos(base + off) * d, y: Math.sin(base + off) * d });
      }
      g.lineStyle(5 * s, accent, 0.4 * fade);
      g.strokePoints(pts, false);
      g.lineStyle(2 * s, 0xffffff, fade);
      g.strokePoints(pts, false);
    }
    g.fillStyle(0xffffff, fade);
    g.fillCircle(0, 0, 6 * s * fade);
  }
}
