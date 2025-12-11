/**
 * 🎨 Monument Valley 风格色板系统
 * 从参考图深度提取的配色方案
 * 
 * 色彩设计原则：
 * 1. 高饱和度主色 + 柔和辅助色
 * 2. 强烈对比但和谐共存
 * 3. 每个主题传递特定情绪和氛围
 */

// ============================================
// 🌈 核心色板接口定义
// ============================================

export interface ColorPalette {
  name: string;
  description: string;
  background: BackgroundColors;
  primary: string[];
  secondary: string[];
  accent: string[];
  buildingColors: BuildingColorSet; // 新增：三色着色系统
  lighting: LightingColors;
  fog: string;
  ui: UIColors;
}

export interface BuildingColorSet {
  light: string;  // 受光面（亮色）
  mid: string;    // 侧面（中间色）
  dark: string;   // 背光面（暗色）
  // 新增：纪念碑谷风格的六面配色
  faceColors?: {
    top: string;     // 顶面（+Y）
    bottom: string;  // 底面（-Y）
    right: string;   // 右侧面（+X）
    left: string;    // 左侧面（-X）
    front: string;   // 前面（+Z）
    back: string;    // 后面（-Z）
  };
}

export interface BackgroundColors {
  sky: string | string[]; // 支持渐变
  horizon?: string;
  ground?: string;
}

export interface LightingColors {
  ambient: string;
  directional: string;
  highlight: string;
  shadow: string;
}

export interface UIColors {
  text: string;
  textSecondary: string;
  panel: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

// ============================================
// 📦 预定义主题色板
// ============================================

/**
 * 🌅 主题 1: 暖橙梦境 (Warm Coral Dream)
 * 情绪: 温暖、欢快、童话感
 * 适用: 入门关卡、轻松氛围
 */
export const warmCoralTheme: ColorPalette = {
  name: 'Warm Coral Dream',
  description: '珊瑚粉与紫色的梦幻组合，营造温暖童话氛围',
  
  background: {
    sky: ['#FFE5E5', '#FFD1DC', '#FFC4D0'], // 粉色渐变天空
    horizon: '#FFB6C1',
    ground: '#FFDAB9'
  },
  
  primary: [
    '#FF6B6B', // 珊瑚红 - 主建筑色
    '#FFA07A', // 浅珊瑚 - 次要建筑
    '#FF9F80', // 桃橙色 - 装饰
    '#FFB199'  // 淡桃色 - 地面
  ],
  
  secondary: [
    '#B19CD9', // 薰衣草紫 - 阴影面
    '#9D84B7', // 中紫 - 柱子
    '#8B7BB8', // 深紫 - 塔楼
    '#C8B8DB'  // 淡紫 - 高光
  ],
  
  accent: [
    '#7FCDCD', // 青绿色 - 机关/交互元素
    '#FFD93D', // 金黄色 - 目标点
    '#6BCF7F', // 薄荷绿 - 特殊装饰
    '#FF6EC7'  // 粉红 - 强调色
  ],
  
  buildingColors: {
    light: '#FFB199',  // 淡桃色 - 受光面
    mid: '#FF9F80',    // 桃橙色 - 侧面
    dark: '#C06C84',   // 玫瑰紫红 - 背光面
    faceColors: {
      top: '#FFB199',     // 顶面：淡桃色（最亮）
      right: '#FF9F80',   // 右侧：桃橙色
      left: '#FFA07A',    // 左侧：浅珊瑚
      front: '#B19CD9',   // 前面：薰衣草紫
      back: '#9D84B7',    // 后面：中紫
      bottom: '#C06C84'   // 底面：玫瑰紫红（最暗）
    }
  },
  
  lighting: {
    ambient: '#FFE8E0',
    directional: '#FFF5E1',
    highlight: '#FFFFFF',
    shadow: '#B19CD980' // 带透明度
  },
  
  fog: '#FFD1DC',
  
  ui: {
    text: '#4A4A4A',
    textSecondary: '#7A7A7A',
    panel: '#FFFFFFcc',
    border: '#FF6B6B',
    success: '#6BCF7F',
    warning: '#FFD93D',
    error: '#FF6B6B'
  }
};

/**
 * 🌊 主题 2: 深海秘境 (Deep Ocean Mystery)
 * 情绪: 神秘、宁静、深邃
 * 适用: 水下关卡、谜题场景
 */
export const deepOceanTheme: ColorPalette = {
  name: 'Deep Ocean Mystery',
  description: '深蓝与青绿的海洋系，营造神秘深邃氛围',
  
  background: {
    sky: ['#00A8E8', '#00C9FF', '#66E0FF'], // 改为鲜艳的天蓝色渐变（高饱和高亮度）
    horizon: '#7FE5FF',
    ground: '#264653'
  },
  
  primary: [
    '#2C3E50', // 海军蓝 - 主建筑
    '#34495E', // 深石板蓝 - 次要建筑
    '#3A5A6B', // 深青 - 塔楼
    '#445F70'  // 中青蓝 - 装饰
  ],
  
  secondary: [
    '#4ECDC4', // 青绿 - 发光建筑
    '#6BCABA', // 浅青绿 - 高光面
    '#7FD8CC', // 薄荷青 - 特殊元素
    '#A8DADC'  // 冰蓝 - 天空元素
  ],
  
  accent: [
    '#C7F0F0', // 浅青 - 高光/水面反光
    '#FFD700', // 金色 - 目标点
    '#87CEEB', // 天蓝 - 浮动元素
    '#4DD0E1'  // 亮青 - 交互元素
  ],
  
  buildingColors: {
    light: '#7FD8CC',  // 薄荷青 - 受光面
    mid: '#4ECDC4',    // 青绿 - 侧面
    dark: '#2C5F5D',   // 深青 - 背光面
    faceColors: {
      top: '#A8DADC',     // 顶面：冰蓝（最亮）
      right: '#7FD8CC',   // 右侧：薄荷青
      left: '#6BCABA',    // 左侧：浅青绿
      front: '#4ECDC4',   // 前面：青绿
      back: '#3A5A6B',    // 后面：深青
      bottom: '#2C5F5D'   // 底面：深青（最暗）
    }
  },
  
  lighting: {
    ambient: '#2C3E50',
    directional: '#4ECDC4',
    highlight: '#C7F0F0',
    shadow: '#1A233280'
  },
  
  fog: '#2C3E5099',
  
  ui: {
    text: '#FFFFFF',
    textSecondary: '#A8DADC',
    panel: '#2C3E50cc',
    border: '#4ECDC4',
    success: '#6BCABA',
    warning: '#FFD700',
    error: '#FF6B6B'
  }
};

/**
 * 🌙 主题 3: 紫夜幻境 (Purple Twilight)
 * 情绪: 梦幻、浪漫、静谧
 * 适用: 夜晚场景、冥想关卡
 */
export const purpleTwilightTheme: ColorPalette = {
  name: 'Purple Twilight',
  description: '紫粉渐变的黄昏系，浪漫而神秘',
  
  background: {
    sky: ['#4A2C4E', '#6C5B7B', '#9B89B3', '#C8A4D4'], // 紫色渐变
    horizon: '#E8B4C8',
    ground: '#9B89B3'
  },
  
  primary: [
    '#6C5B7B', // 深紫灰 - 主建筑
    '#8B7BA8', // 中紫 - 次要建筑
    '#9B89B3', // 薰衣草紫 - 装饰
    '#A89CC8'  // 淡紫 - 高光
  ],
  
  secondary: [
    '#C06C84', // 玫瑰紫红 - 强调建筑
    '#E8B4C8', // 粉紫 - 天空元素
    '#FFB6B9', // 浅粉 - 地面
    '#B4A5C8'  // 灰紫 - 阴影
  ],
  
  accent: [
    '#A8E6CF', // 薄荷绿 - 发光元素
    '#FFD93D', // 金黄 - 目标点
    '#F9C6D9', // 樱花粉 - 特殊装饰
    '#E0BBE4'  // 浅紫 - 交互提示
  ],
  
  buildingColors: {
    light: '#E8B4C8',  // 粉紫 - 受光面
    mid: '#9B89B3',    // 薰衣草紫 - 侧面
    dark: '#6C5B7B',   // 深紫灰 - 背光面
    faceColors: {
      top: '#E8B4C8',     // 顶面：粉紫（最亮）
      right: '#C06C84',   // 右侧：玫瑰紫红
      left: '#9B89B3',    // 左侧：薰衣草紫
      front: '#8B7BA8',   // 前面：中紫
      back: '#A89CC8',    // 后面：淡紫
      bottom: '#6C5B7B'   // 底面：深紫灰（最暗）
    }
  },
  
  lighting: {
    ambient: '#9B89B3',
    directional: '#E8B4C8',
    highlight: '#FFE5E5',
    shadow: '#4A2C4E80'
  },
  
  fog: '#9B89B388',
  
  ui: {
    text: '#FFFFFF',
    textSecondary: '#E8B4C8',
    panel: '#6C5B7Bcc',
    border: '#C06C84',
    success: '#A8E6CF',
    warning: '#FFD93D',
    error: '#C06C84'
  }
};

/**
 * 🌿 主题 4: 翠绿森林 (Emerald Forest)
 * 情绪: 清新、生机、希望
 * 适用: 森林场景、成长主题关卡
 */
export const emeraldForestTheme: ColorPalette = {
  name: 'Emerald Forest',
  description: '深绿与荧光绿的森林系，充满生命力',
  
  background: {
    sky: ['#00D084', '#00E896', '#66FFB8'], // 改为鲜艳的翠绿色渐变（高饱和高亮度）
    horizon: '#7FFFC8',
    ground: '#2D4739'
  },
  
  primary: [
    '#2D4739', // 深森林绿 - 主建筑
    '#3C5A47', // 中绿 - 次要建筑
    '#4A6B5A', // 青绿 - 装饰
    '#5A7C6B'  // 浅绿 - 高光
  ],
  
  secondary: [
    '#6B8E7D', // 灰绿 - 阴影面
    '#7FA08F', // 淡绿 - 天空元素
    '#8FB29A', // 薄荷灰绿 - 地面
    '#A0C4AB'  // 极淡绿 - 远景
  ],
  
  accent: [
    '#9FE870', // 荧光黄绿 - 发光植物
    '#FFD93D', // 金黄 - 目标点
    '#FF6EC7', // 霓虹粉 - 特殊标记
    '#7FFF00'  // 亮绿 - 交互元素
  ],
  
  buildingColors: {
    light: '#7FA08F',  // 淡绿 - 受光面
    mid: '#4A6B5A',    // 青绿 - 侧面
    dark: '#2D4739',   // 深森林绿 - 背光面
    faceColors: {
      top: '#A0C4AB',     // 顶面：极淡绿（最亮）
      right: '#8FB29A',   // 右侧：薄荷灰绿
      left: '#7FA08F',    // 左侧：淡绿
      front: '#6B8E7D',   // 前面：灰绿
      back: '#4A6B5A',    // 后面：青绿
      bottom: '#2D4739'   // 底面：深森林绿（最暗）
    }
  },
  
  lighting: {
    ambient: '#3C5A47',
    directional: '#9FE870',
    highlight: '#D4FFAA',
    shadow: '#1E3A2C80'
  },
  
  fog: '#2D473966',
  
  ui: {
    text: '#FFFFFF',
    textSecondary: '#A0C4AB',
    panel: '#2D4739cc',
    border: '#9FE870',
    success: '#9FE870',
    warning: '#FFD93D',
    error: '#FF6EC7'
  }
};

/**
 * 🏜️ 主题 5: 沙漠遗迹 (Desert Ruins)
 * 情绪: 苍凉、神秘、古老
 * 适用: 沙漠场景、遗迹探索
 */
export const desertRuinsTheme: ColorPalette = {
  name: 'Desert Ruins',
  description: '暖沙色与青铜色的沙漠系，古老而神秘',
  
  background: {
    sky: ['#E8D5B7', '#F4E7D7', '#FFFAF0'], // 沙色渐变天空
    horizon: '#D4B896',
    ground: '#C9A676'
  },
  
  primary: [
    '#D4A574', // 沙棕色 - 主建筑
    '#E0B589', // 浅沙色 - 次要建筑
    '#C9A676', // 古铜色 - 塔楼
    '#B89968'  // 深沙色 - 阴影
  ],
  
  secondary: [
    '#7FCDCD', // 绿松石 - 水池/绿洲
    '#4ECDC4', // 青绿 - 发光元素
    '#A8DADC', // 浅青 - 天空装饰
    '#95C9C3'  // 灰青 - 特殊元素
  ],
  
  accent: [
    '#FFD93D', // 金黄 - 目标点/阳光
    '#FF9F43', // 橙黄 - 强调色
    '#6BCF7F', // 绿色 - 绿洲植物
    '#FF6B6B'  // 红色 - 警告元素
  ],
  
  buildingColors: {
    light: '#E0B589',  // 浅沙色 - 受光面
    mid: '#D4A574',    // 沙棕色 - 侧面
    dark: '#B89968',   // 深沙色 - 背光面
    faceColors: {
      top: '#F4E7D7',     // 顶面：极淡沙色（最亮）
      right: '#E0B589',   // 右侧：浅沙色
      left: '#D4A574',    // 左侧：沙棕色
      front: '#7FCDCD',   // 前面：绿松石（对比色）
      back: '#C9A676',    // 后面：古铜色
      bottom: '#B89968'   // 底面：深沙色（最暗）
    }
  },
  
  lighting: {
    ambient: '#F4E7D7',
    directional: '#FFFAF0',
    highlight: '#FFFFFF',
    shadow: '#B8996880'
  },
  
  fog: '#E8D5B755',
  
  ui: {
    text: '#4A4A4A',
    textSecondary: '#7A7A7A',
    panel: '#FFFFFFcc',
    border: '#D4A574',
    success: '#6BCF7F',
    warning: '#FFD93D',
    error: '#FF6B6B'
  }
};

/**
 * 🌌 主题 6: 暗黑虚空 (Dark Void)
 * 情绪: 神秘、危险、挑战
 * 适用: 最终关卡、高难度场景
 */
export const darkVoidTheme: ColorPalette = {
  name: 'Dark Void',
  description: '黑色背景与霓虹发光的虚空系，危险而迷人',
  
  background: {
    sky: ['#FF10F0', '#FF6EC7', '#FF9EE0'], // 改为霓虹粉紫渐变（高饱和高亮度）
    horizon: '#FFBEF0',
    ground: '#0F0F0F'
  },
  
  primary: [
    '#2A2A2A', // 深灰 - 主建筑
    '#3A3A3A', // 中灰 - 次要建筑
    '#4A4A4A', // 浅灰 - 高光面
    '#1A1A1A'  // 极深灰 - 阴影
  ],
  
  secondary: [
    '#5A5A5A', // 中性灰 - 装饰
    '#6A6A6A', // 浅灰 - 边缘
    '#7A7A7A', // 极浅灰 - 反光
    '#8A8A8A'  // 银灰 - 金属质感
  ],
  
  accent: [
    '#FF5733', // 橙红 - 危险/熔岩
    '#FF6EC7', // 霓虹粉 - 发光装饰
    '#9FE870', // 荧光绿 - 安全区
    '#FFD93D'  // 金黄 - 目标点
  ],
  
  buildingColors: {
    light: '#5A5A5A',  // 中性灰 - 受光面
    mid: '#3A3A3A',    // 中灰 - 侧面
    dark: '#1A1A1A',   // 极深灰 - 背光面
    faceColors: {
      top: '#7A7A7A',     // 顶面：浅灰（最亮）
      right: '#FF6EC7',   // 右侧：霓虹粉（发光色）
      left: '#5A5A5A',    // 左侧：中性灰
      front: '#9FE870',   // 前面：荧光绿（发光色）
      back: '#3A3A3A',    // 后面：中灰
      bottom: '#1A1A1A'   // 底面：极深灰（最暗）
    }
  },
  
  lighting: {
    ambient: '#1A1A1A',
    directional: '#FF6EC7',
    highlight: '#FFFFFF',
    shadow: '#00000099'
  },
  
  fog: '#00000066',
  
  ui: {
    text: '#FFFFFF',
    textSecondary: '#AAAAAA',
    panel: '#2A2A2Acc',
    border: '#FF6EC7',
    success: '#9FE870',
    warning: '#FFD93D',
    error: '#FF5733'
  }
};

/**
 * 🌸 主题 7: 樱花庭院 (Cherry Blossom Garden)
 * 情绪: 浪漫、柔和、诗意
 * 适用: 花园场景、和风关卡
 */
export const cherryBlossomTheme: ColorPalette = {
  name: 'Cherry Blossom Garden',
  description: '樱花粉与薄荷绿的春日系，浪漫诗意',
  
  background: {
    sky: ['#E0F7FA', '#F0F8F9', '#FAFCFD'], // 淡青天空
    horizon: '#F5E6E8',
    ground: '#E8D5D8'
  },
  
  primary: [
    '#FFB6C1', // 樱花粉 - 主建筑
    '#FFC9D0', // 浅樱花粉 - 次要建筑
    '#FFDCE5', // 极淡粉 - 地面
    '#FFE4E9'  // 白粉 - 高光
  ],
  
  secondary: [
    '#B4E7CE', // 薄荷绿 - 植物
    '#A8E6CF', // 淡薄荷 - 装饰
    '#9DE0C5', // 青绿 - 水面
    '#C5EFDB'  // 极淡绿 - 天空装饰
  ],
  
  accent: [
    '#FFD93D', // 金黄 - 目标点
    '#FF85A1', // 深粉 - 强调元素
    '#7FCDCD', // 青色 - 机关
    '#C8A4D4'  // 淡紫 - 特殊装饰
  ],
  
  buildingColors: {
    light: '#FFDCE5',  // 极淡粉 - 受光面
    mid: '#FFC9D0',    // 浅樱花粉 - 侧面
    dark: '#D87093',   // 古粉红 - 背光面
    faceColors: {
      top: '#FFE4E9',     // 顶面：白粉（最亮）
      right: '#FFDCE5',   // 右侧：极淡粉
      left: '#FFC9D0',    // 左侧：浅樱花粉
      front: '#B4E7CE',   // 前面：薄荷绿（对比色）
      back: '#FFB6C1',    // 后面：樱花粉
      bottom: '#D87093'   // 底面：古粉红（最暗）
    }
  },
  
  lighting: {
    ambient: '#FFF5F7',
    directional: '#FFFFFF',
    highlight: '#FFFFFF',
    shadow: '#FFB6C140'
  },
  
  fog: '#F5E6E833',
  
  ui: {
    text: '#4A4A4A',
    textSecondary: '#7A7A7A',
    panel: '#FFFFFFdd',
    border: '#FFB6C1',
    success: '#A8E6CF',
    warning: '#FFD93D',
    error: '#FF85A1'
  }
};

/**
 * 🔥 主题 8: 火焰地狱 (Inferno Realm)
 * 情绪: 炽热、危险、极端
 * 适用: 火山关卡、终极挑战
 */
export const infernoTheme: ColorPalette = {
  name: 'Inferno Realm',
  description: '红黑渐变的地狱系，充满危险与挑战',
  
  background: {
    sky: ['#330000', '#660000', '#990000', '#CC0000'], // 深红到亮红渐变
    horizon: '#FF4444',
    ground: '#440000'
  },
  
  primary: [
    '#8B0000', // 深红 - 主建筑
    '#A52A2A', // 褐红 - 次要建筑
    '#B22222', // 火砖红 - 塔楼
    '#CD5C5C'  // 印度红 - 装饰
  ],
  
  secondary: [
    '#2F1B1B', // 深褐 - 阴影
    '#4A2F2F', // 褐色 - 岩石
    '#5C3636', // 灰褐 - 地面
    '#6E4242'  // 浅褐 - 边缘
  ],
  
  accent: [
    '#FF6B00', // 橙红 - 岩浆
    '#FFAA00', // 橙黄 - 火焰高光
    '#FFD700', // 金黄 - 目标点
    '#FF4500'  // 橙红 - 爆发效果
  ],
  
  buildingColors: {
    light: '#CD5C5C',  // 印度红 - 受光面
    mid: '#B22222',    // 火砖红 - 侧面
    dark: '#8B0000',   // 深红 - 背光面
    faceColors: {
      top: '#FF6B00',     // 顶面：橙红（岩浆色）
      right: '#CD5C5C',   // 右侧：印度红
      left: '#FFAA00',    // 左侧：橙黄（火焰）
      front: '#B22222',   // 前面：火砖红
      back: '#A52A2A',    // 后面：褐红
      bottom: '#8B0000'   // 底面：深红（最暗）
    }
  },
  
  lighting: {
    ambient: '#660000',
    directional: '#FF6B00',
    highlight: '#FFAA00',
    shadow: '#33000099'
  },
  
  fog: '#66000088',
  
  ui: {
    text: '#FFFFFF',
    textSecondary: '#FFAA00',
    panel: '#2F1B1Bcc',
    border: '#FF6B00',
    success: '#FFD700',
    warning: '#FFAA00',
    error: '#FF4500'
  }
};

// ============================================
// 🎯 主题集合与管理
// ============================================

export const allThemes: ColorPalette[] = [
  warmCoralTheme,
  deepOceanTheme,
  purpleTwilightTheme,
  emeraldForestTheme,
  desertRuinsTheme,
  darkVoidTheme,
  cherryBlossomTheme,
  infernoTheme
];

export type ThemeName = 
  | 'warmCoral'
  | 'deepOcean'
  | 'purpleTwilight'
  | 'emeraldForest'
  | 'desertRuins'
  | 'darkVoid'
  | 'cherryBlossom'
  | 'inferno';

export const themeMap: Record<ThemeName, ColorPalette> = {
  warmCoral: warmCoralTheme,
  deepOcean: deepOceanTheme,
  purpleTwilight: purpleTwilightTheme,
  emeraldForest: emeraldForestTheme,
  desertRuins: desertRuinsTheme,
  darkVoid: darkVoidTheme,
  cherryBlossom: cherryBlossomTheme,
  inferno: infernoTheme
};

/**
 * 获取指定主题
 */
export const getTheme = (themeName: ThemeName): ColorPalette => {
  return themeMap[themeName];
};

/**
 * 获取随机主题
 */
export const getRandomTheme = (): ColorPalette => {
  return allThemes[Math.floor(Math.random() * allThemes.length)];
};

/**
 * 根据关卡索引获取推荐主题（循环使用）
 */
export const getThemeByLevel = (levelIndex: number): ColorPalette => {
  return allThemes[levelIndex % allThemes.length];
};

