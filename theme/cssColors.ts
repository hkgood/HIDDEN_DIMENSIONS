/**
 * 🎨 CSS 颜色变量生成器
 * 
 * 将主题色板导出为 CSS 自定义属性，用于 UI 组件
 */

import { ColorPalette, ThemeName, getTheme } from './colorPalettes';

/**
 * 生成 CSS 变量名
 */
const toCSSVar = (name: string): string => {
  return `--${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
};

/**
 * 将主题转换为 CSS 变量对象
 */
export const themeToCSSVariables = (theme: ColorPalette): Record<string, string> => {
  const vars: Record<string, string> = {};
  
  // 背景颜色
  if (Array.isArray(theme.background.sky)) {
    theme.background.sky.forEach((color, index) => {
      vars[toCSSVar(`bgSky${index + 1}`)] = color;
    });
  } else {
    vars[toCSSVar('bgSky')] = theme.background.sky;
  }
  
  if (theme.background.horizon) {
    vars[toCSSVar('bgHorizon')] = theme.background.horizon;
  }
  
  if (theme.background.ground) {
    vars[toCSSVar('bgGround')] = theme.background.ground;
  }
  
  // 主色调
  theme.primary.forEach((color, index) => {
    vars[toCSSVar(`primary${index + 1}`)] = color;
  });
  
  // 辅助色
  theme.secondary.forEach((color, index) => {
    vars[toCSSVar(`secondary${index + 1}`)] = color;
  });
  
  // 强调色
  theme.accent.forEach((color, index) => {
    vars[toCSSVar(`accent${index + 1}`)] = color;
  });
  
  // 光照颜色
  vars[toCSSVar('lightAmbient')] = theme.lighting.ambient;
  vars[toCSSVar('lightDirectional')] = theme.lighting.directional;
  vars[toCSSVar('lightHighlight')] = theme.lighting.highlight;
  vars[toCSSVar('lightShadow')] = theme.lighting.shadow;
  
  // 雾效
  vars[toCSSVar('fog')] = theme.fog;
  
  // UI 颜色
  vars[toCSSVar('uiText')] = theme.ui.text;
  vars[toCSSVar('uiTextSecondary')] = theme.ui.textSecondary;
  vars[toCSSVar('uiPanel')] = theme.ui.panel;
  vars[toCSSVar('uiBorder')] = theme.ui.border;
  vars[toCSSVar('uiSuccess')] = theme.ui.success;
  vars[toCSSVar('uiWarning')] = theme.ui.warning;
  vars[toCSSVar('uiError')] = theme.ui.error;
  
  return vars;
};

/**
 * 生成 CSS 字符串
 */
export const generateCSSString = (theme: ColorPalette, selector: string = ':root'): string => {
  const vars = themeToCSSVariables(theme);
  
  let css = `${selector} {\n`;
  Object.entries(vars).forEach(([key, value]) => {
    css += `  ${key}: ${value};\n`;
  });
  css += '}\n';
  
  return css;
};

/**
 * 应用主题到 document
 */
export const applyThemeToDocument = (themeName: ThemeName): void => {
  const theme = getTheme(themeName);
  const vars = themeToCSSVariables(theme);
  
  Object.entries(vars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
};

/**
 * 生成完整的 CSS 文件内容（包含所有主题）
 */
export const generateAllThemesCSS = (): string => {
  const themes: ThemeName[] = [
    'warmCoral',
    'deepOcean',
    'purpleTwilight',
    'emeraldForest',
    'desertRuins',
    'darkVoid',
    'cherryBlossom',
    'inferno'
  ];
  
  let css = `/* 🎨 Auto-generated theme colors from colorPalettes.ts */\n\n`;
  
  themes.forEach(themeName => {
    const theme = getTheme(themeName);
    css += `/* ${theme.name} - ${theme.description} */\n`;
    css += generateCSSString(theme, `[data-theme="${themeName}"]`);
    css += '\n';
  });
  
  // 默认主题
  css += `/* Default theme */\n`;
  css += generateCSSString(getTheme('warmCoral'), ':root');
  
  return css;
};

/**
 * 生成 Tailwind 配置兼容的颜色对象
 */
export const generateTailwindColors = (theme: ColorPalette) => {
  return {
    primary: {
      DEFAULT: theme.primary[0],
      50: theme.primary[3],
      100: theme.primary[2],
      200: theme.primary[1],
      300: theme.primary[0],
    },
    secondary: {
      DEFAULT: theme.secondary[0],
      50: theme.secondary[3],
      100: theme.secondary[2],
      200: theme.secondary[1],
      300: theme.secondary[0],
    },
    accent: {
      DEFAULT: theme.accent[0],
      cyan: theme.accent[0],
      gold: theme.accent[1],
      green: theme.accent[2],
      pink: theme.accent[3],
    },
    background: {
      sky: Array.isArray(theme.background.sky) ? theme.background.sky[0] : theme.background.sky,
      horizon: theme.background.horizon || theme.background.sky,
      ground: theme.background.ground || theme.background.sky,
    },
    ui: {
      text: theme.ui.text,
      textSecondary: theme.ui.textSecondary,
      panel: theme.ui.panel,
      border: theme.ui.border,
      success: theme.ui.success,
      warning: theme.ui.warning,
      error: theme.ui.error,
    }
  };
};

