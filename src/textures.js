// Harici görsel dosyası kullanmıyoruz: dokuları kodla çiziyoruz.
export const TEXTURE_KEYS = {
  glow: 'neon-fx-glow', // Mavi parlama (iz için varsayılan doku)
  white: 'neon-fx-white', // Renksiz parlama: tint ile istenen renge boyanır (parçacık, halka)
};

// Dokunun piksel boyutu. Ekranda ölçeklenerek istenen boyuta getirilir.
export const GLOW_TEXTURE_SIZE = 128;

const GLOW_STOPS = [
  [0, 'rgba(210, 250, 255, 0.95)'],
  [0.2, 'rgba(90, 225, 255, 0.7)'],
  [0.5, 'rgba(46, 170, 255, 0.25)'],
  [1, 'rgba(46, 120, 255, 0)'],
];

const WHITE_STOPS = [
  [0, 'rgba(255, 255, 255, 1)'],
  [0.3, 'rgba(255, 255, 255, 0.8)'],
  [0.6, 'rgba(255, 255, 255, 0.25)'],
  [1, 'rgba(255, 255, 255, 0)'],
];

// Merkezden dışa doğru yumuşakça solan yuvarlak bir parlama dokusu üretir
function createRadialTexture(scene, key, colorStops) {
  if (scene.textures.exists(key)) return;

  const size = GLOW_TEXTURE_SIZE;
  const half = size / 2;
  const texture = scene.textures.createCanvas(key, size, size);
  const ctx = texture.getContext();

  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  for (const [offset, color] of colorStops) {
    gradient.addColorStop(offset, color);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  texture.refresh();
}

// İki dokuyu da hazırlar. Doku zaten varsa dokunmaz, yani tekrar çağırmak güvenlidir.
export function createGlowTextures(scene) {
  createRadialTexture(scene, TEXTURE_KEYS.glow, GLOW_STOPS);
  createRadialTexture(scene, TEXTURE_KEYS.white, WHITE_STOPS);
}
