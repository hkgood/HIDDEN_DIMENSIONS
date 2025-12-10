/**
 * 🎨 主题系统统一导出
 * 
 * 使用示例:
 * 
 * // 在 Three.js 组件中
 * import { ThemeColorManager } from '@/theme';
 * const colorManager = new ThemeColorManager('deepOcean');
 * const skyColors = colorManager.getSkyColors();
 * 
 * // 在 React 组件中
 * import { applyThemeToDocument } from '@/theme';
 * applyThemeToDocument('purpleTwilight');
 */

// 色板定义
export * from './colorPalettes';

// Three.js 颜色工具
export * from './threeColors';

// CSS 颜色工具
export * from './cssColors';

// 默认导出：最常用的工具
export { 
  ThemeColorManager,
  warmCoralColors,
  deepOceanColors,
  purpleTwilightColors,
  emeraldForestColors,
  desertRuinsColors,
  darkVoidColors,
  cherryBlossomColors,
  infernoColors,
} from './threeColors';

export {
  applyThemeToDocument,
  generateCSSString,
  generateAllThemesCSS,
} from './cssColors';

export {
  getTheme,
  getRandomTheme,
  getThemeByLevel,
  allThemes,
  type ThemeName,
  type ColorPalette,
} from './colorPalettes';

