/**
 * 🎨 Three.js 颜色工具库
 * 
 * 将主题色板转换为 Three.js 可用的颜色格式
 * 提供便捷的颜色操作函数
 */

import * as THREE from 'three';
import { ColorPalette, ThemeName, getTheme } from './colorPalettes';

// ============================================
// 🔄 颜色转换工具
// ============================================

/**
 * 将十六进制颜色转换为 THREE.Color
 */
export const hexToThreeColor = (hex: string): THREE.Color => {
  return new THREE.Color(hex);
};

/**
 * 将十六进制颜色转换为 RGB 数组 [0-1]
 */
export const hexToRGB = (hex: string): [number, number, number] => {
  const color = new THREE.Color(hex);
  return [color.r, color.g, color.b];
};

/**
 * 将十六进制颜色转换为 RGB 数组 [0-255]
 */
export const hexToRGB255 = (hex: string): [number, number, number] => {
  const [r, g, b] = hexToRGB(hex);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

/**
 * 处理带透明度的颜色字符串（如 #FF000080）
 */
export const parseColorWithAlpha = (colorStr: string): { color: THREE.Color; opacity: number } => {
  // 检查是否有透明度后缀
  if (colorStr.length === 9 && colorStr.startsWith('#')) {
    const hex = colorStr.slice(0, 7);
    const alpha = parseInt(colorStr.slice(7, 9), 16) / 255;
    return {
      color: new THREE.Color(hex),
      opacity: alpha
    };
  }
  return {
    color: new THREE.Color(colorStr),
    opacity: 1
  };
};

/**
 * 在两个颜色之间插值
 */
export const lerpColor = (color1: string, color2: string, t: number): THREE.Color => {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  return c1.lerp(c2, t);
};

// ============================================
// 🎨 主题颜色管理器
// ============================================

export class ThemeColorManager {
  private currentTheme: ColorPalette;
  
  constructor(themeName: ThemeName = 'warmCoral') {
    this.currentTheme = getTheme(themeName);
  }
  
  /**
   * 切换主题
   */
  setTheme(themeName: ThemeName): void {
    this.currentTheme = getTheme(themeName);
  }
  
  /**
   * 获取当前主题
   */
  getTheme(): ColorPalette {
    return this.currentTheme;
  }
  
  // ========== 背景颜色 ==========
  
  /**
   * 获取天空背景色（处理渐变）
   */
  getSkyColors(): THREE.Color[] {
    const sky = this.currentTheme.background.sky;
    if (Array.isArray(sky)) {
      return sky.map(hex => hexToThreeColor(hex));
    }
    return [hexToThreeColor(sky)];
  }
  
  /**
   * 获取地平线颜色
   */
  getHorizonColor(): THREE.Color | null {
    const horizon = this.currentTheme.background.horizon;
    return horizon ? hexToThreeColor(horizon) : null;
  }
  
  /**
   * 获取地面颜色
   */
  getGroundColor(): THREE.Color | null {
    const ground = this.currentTheme.background.ground;
    return ground ? hexToThreeColor(ground) : null;
  }
  
  // ========== 主色调 ==========
  
  /**
   * 获取主要颜色数组
   */
  getPrimaryColors(): THREE.Color[] {
    return this.currentTheme.primary.map(hex => hexToThreeColor(hex));
  }
  
  /**
   * 获取特定索引的主颜色（循环）
   */
  getPrimaryColor(index: number): THREE.Color {
    const colors = this.getPrimaryColors();
    return colors[index % colors.length];
  }
  
  // ========== 辅助色 ==========
  
  /**
   * 获取辅助颜色数组
   */
  getSecondaryColors(): THREE.Color[] {
    return this.currentTheme.secondary.map(hex => hexToThreeColor(hex));
  }
  
  /**
   * 获取特定索引的辅助色（循环）
   */
  getSecondaryColor(index: number): THREE.Color {
    const colors = this.getSecondaryColors();
    return colors[index % colors.length];
  }
  
  // ========== 强调色 ==========
  
  /**
   * 获取强调色数组
   */
  getAccentColors(): THREE.Color[] {
    return this.currentTheme.accent.map(hex => hexToThreeColor(hex));
  }
  
  /**
   * 获取特定索引的强调色（循环）
   */
  getAccentColor(index: number): THREE.Color {
    const colors = this.getAccentColors();
    return colors[index % colors.length];
  }
  
  // ========== 光照颜色 ==========
  
  /**
   * 获取环境光颜色
   */
  getAmbientLightColor(): THREE.Color {
    return hexToThreeColor(this.currentTheme.lighting.ambient);
  }
  
  /**
   * 获取方向光颜色
   */
  getDirectionalLightColor(): THREE.Color {
    return hexToThreeColor(this.currentTheme.lighting.directional);
  }
  
  /**
   * 获取高光颜色
   */
  getHighlightColor(): THREE.Color {
    return hexToThreeColor(this.currentTheme.lighting.highlight);
  }
  
  /**
   * 获取阴影颜色（含透明度）
   */
  getShadowColor(): { color: THREE.Color; opacity: number } {
    return parseColorWithAlpha(this.currentTheme.lighting.shadow);
  }
  
  // ========== 雾效颜色 ==========
  
  /**
   * 获取雾效颜色和密度
   */
  getFogColor(): { color: THREE.Color; opacity: number } {
    return parseColorWithAlpha(this.currentTheme.fog);
  }
  
  // ========== UI 颜色 ==========
  
  /**
   * 获取 UI 颜色（返回十六进制字符串，用于 CSS）
   */
  getUIColors() {
    return this.currentTheme.ui;
  }
  
  /**
   * 获取目标点颜色（通常是强调色中的金黄色）
   */
  getGoalColor(): THREE.Color {
    // 查找金黄色，通常是 #FFD93D
    const goldAccent = this.currentTheme.accent.find(c => 
      c.toLowerCase().includes('ffd') || c.toLowerCase().includes('gold')
    );
    return hexToThreeColor(goldAccent || this.currentTheme.accent[1]);
  }
  
  /**
   * 获取玩家颜色（通常使用第一个强调色）
   */
  getPlayerColor(): THREE.Color {
    return this.getAccentColor(0);
  }
  
  /**
   * 获取交互元素颜色（通常使用青色/绿色强调色）
   */
  getInteractiveColor(): THREE.Color {
    return this.getAccentColor(0);
  }
}

// ============================================
// 🎨 预定义的主题实例（方便使用）
// ============================================

export const warmCoralColors = new ThemeColorManager('warmCoral');
export const deepOceanColors = new ThemeColorManager('deepOcean');
export const purpleTwilightColors = new ThemeColorManager('purpleTwilight');
export const emeraldForestColors = new ThemeColorManager('emeraldForest');
export const desertRuinsColors = new ThemeColorManager('desertRuins');
export const darkVoidColors = new ThemeColorManager('darkVoid');
export const cherryBlossomColors = new ThemeColorManager('cherryBlossom');
export const infernoColors = new ThemeColorManager('inferno');

// ============================================
// 🛠️ 辅助工具函数
// ============================================

/**
 * 创建渐变材质（用于天空球等）
 */
export const createGradientTexture = (
  colors: string[],
  width: number = 512,
  height: number = 512
): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');
  
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  
  colors.forEach((color, index) => {
    gradient.addColorStop(index / (colors.length - 1), color);
  });
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
};

/**
 * 根据高度获取渐变颜色（用于分层着色）
 */
export const getColorByHeight = (
  y: number,
  minY: number,
  maxY: number,
  colors: string[]
): THREE.Color => {
  const t = Math.max(0, Math.min(1, (y - minY) / (maxY - minY)));
  const segmentCount = colors.length - 1;
  const segment = Math.floor(t * segmentCount);
  const localT = (t * segmentCount) - segment;
  
  const color1 = colors[Math.min(segment, colors.length - 1)];
  const color2 = colors[Math.min(segment + 1, colors.length - 1)];
  
  return lerpColor(color1, color2, localT);
};

/**
 * 添加发光效果的材质属性
 */
export const addEmissive = (
  baseColor: string,
  emissiveIntensity: number = 0.3
): { color: THREE.Color; emissive: THREE.Color; emissiveIntensity: number } => {
  const color = hexToThreeColor(baseColor);
  return {
    color: color,
    emissive: color.clone(),
    emissiveIntensity: emissiveIntensity
  };
};

/**
 * 调整颜色亮度
 */
export const adjustBrightness = (colorHex: string, factor: number): THREE.Color => {
  const color = hexToThreeColor(colorHex);
  color.multiplyScalar(factor);
  return color;
};

/**
 * 获取颜色的暗色版本（用于阴影面）
 */
export const getDarkerColor = (colorHex: string, amount: number = 0.7): THREE.Color => {
  return adjustBrightness(colorHex, amount);
};

/**
 * 获取颜色的亮色版本（用于高光面）
 */
export const getLighterColor = (colorHex: string, amount: number = 1.3): THREE.Color => {
  return adjustBrightness(colorHex, amount);
};

