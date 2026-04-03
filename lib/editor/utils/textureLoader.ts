import * as THREE from 'three';

export interface TextureInfo {
  name: string;
  displayName: string;
  path: string;
  category: 'wall' | 'roof' | 'ground' | 'window';
}

// Predefined textures
export const WALL_TEXTURES: TextureInfo[] = [
  { name: 'brick', displayName: 'Brick', path: '/assets/mat/red_block.jpeg', category: 'wall' },
  { name: 'concrete', displayName: 'Concrete', path: '/assets/mat/grey_solid.jpg', category: 'wall' },
  { name: 'stucco', displayName: 'Stucco', path: '/assets/mat/rough_plaster.jpg', category: 'wall' },
  { name: 'wood', displayName: 'Wood', path: '/assets/mat/timber_plank.jpg', category: 'wall' },
  { name: 'wood2', displayName: 'Wood Panel', path: '/assets/mat/timber_panel.jpg', category: 'wall' },
  { name: 'ceramic', displayName: 'Ceramic', path: '/assets/mat/white_tile.jpg', category: 'wall' },
  { name: 'gold', displayName: 'Gold', path: '/assets/mat/yellow_metal.jpg', category: 'wall' },
  { name: 'terrazzo', displayName: 'Terrazzo', path: '/assets/mat/speckled_floor.png', category: 'wall' },
];

export const ROOF_TEXTURES: TextureInfo[] = [
  { name: 'shingle', displayName: 'Shingles', path: '/assets/mat/roof_shingle.jpg', category: 'roof' },
  { name: 'metal', displayName: 'Metal', path: '/assets/mat/roof_metal.jpg', category: 'roof' },
  { name: 'tile', displayName: 'Tile', path: '/assets/mat/roof_tile.jpg', category: 'roof' },
  { name: 'green-roof', displayName: 'Green Roof', path: '/assets/mat/roof_green.jpg', category: 'roof' },
];

export const GROUND_TEXTURES: TextureInfo[] = [
  { name: 'grass', displayName: 'Grass', path: '/assets/mat/floor_grass.jpg', category: 'ground' },
  { name: 'asphalt', displayName: 'Asphalt', path: '/assets/mat/floor_asphalt.jpg', category: 'ground' },
];

export const WINDOW_TEXTURES: TextureInfo[] = [
  { name: 'clear', displayName: 'Clear Glass', path: '', category: 'window' },
  { name: 'glass', displayName: 'Glass', path: '/assets/mat/window_glass.jpg', category: 'window' },
];

// Texture cache to avoid reloading
const textureCache = new Map<string, THREE.Texture>();

export function loadTexture(path: string): THREE.Texture | null {
  if (!path) return null;

  if (textureCache.has(path)) {
    return textureCache.get(path)!;
  }

  const loader = new THREE.TextureLoader();
  const texture = loader.load(
    path,
    (tex) => {
      // Texture loaded successfully
      console.log(`Texture loaded: ${path}`);
    },
    undefined,
    (error) => {
      console.error(`Error loading texture ${path}:`, error);
    }
  );

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  textureCache.set(path, texture);
  return texture;
}

export function loadTextureFromDataURL(dataUrl: string): THREE.Texture {
  if (textureCache.has(dataUrl)) {
    return textureCache.get(dataUrl)!;
  }

  const loader = new THREE.TextureLoader();
  const texture = loader.load(dataUrl);

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  textureCache.set(dataUrl, texture);
  return texture;
}

// Color fallbacks when textures are missing
const TEXTURE_COLORS: Record<string, number> = {
  'brick': 0x8B4513,      // Brown
  'concrete': 0x808080,    // Gray
  'stucco': 0xF5DEB3,     // Wheat
  'wood': 0xDEB887,       // Burlywood
  'wood2': 0xD2691E,      // Chocolate
  'ceramic': 0xFFFAF0,    // Floral white
  'gold': 0xFFD700,       // Gold
  'terrazzo': 0xD3D3D3,   // Light gray
  'shingle': 0x2F4F4F,    // Dark slate gray
  'metal': 0xC0C0C0,      // Silver
  'tile': 0xCD853F,       // Peru
  'green-roof': 0x228B22, // Forest green
  'glass': 0xB0E0E6,      // Powder blue
};

export function createMaterialWithTexture(
  texturePath: string,
  width: number,
  height: number,
  tileSize: number = 3
): THREE.MeshStandardMaterial {
  const texture = loadTexture(texturePath);

  // Extract texture name from path for color fallback
  const textureName = texturePath.split('/').pop()?.replace('.jpg', '') || '';
  const fallbackColor = TEXTURE_COLORS[textureName] || 0xCCCCCC;

  if (texture) {
    texture.repeat.set(width / tileSize, height / tileSize);
    return new THREE.MeshStandardMaterial({
      map: texture,
    });
  }

  // Fallback to solid color if texture fails to load
  return new THREE.MeshStandardMaterial({
    color: fallbackColor,
  });
}

export function getTexturePath(textureName: string, category: 'wall' | 'roof' | 'window' | 'ground'): string {
  const textures = category === 'wall'
    ? WALL_TEXTURES
    : category === 'roof'
      ? ROOF_TEXTURES
      : category === 'ground'
        ? GROUND_TEXTURES
        : WINDOW_TEXTURES;
  const textureInfo = textures.find(t => t.name === textureName);
  return textureInfo?.path || textures[0].path;
}
