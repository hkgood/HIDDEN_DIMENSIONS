# 🎨 Hidden Dimensions - 主题色板系统

> 基于 Monument Valley 风格深度提取的配色方案

## 📚 目录结构

```
theme/
├── colorPalettes.ts      # 主题色板定义（8个完整主题）
├── threeColors.ts        # Three.js 颜色工具和管理器
├── cssColors.ts          # CSS 变量生成和 Tailwind 集成
├── index.ts              # 统一导出
└── README.md            # 本文件
```

---

## 🎨 8 个预定义主题

### 1. 🌅 暖橙梦境 (Warm Coral Dream)
**情绪**: 温暖、欢快、童话感  
**适用**: 入门关卡、轻松氛围  
**主色调**: 珊瑚粉 `#FF6B6B`、桃橙 `#FFA07A`、薰衣草紫 `#B19CD9`

```typescript
import { warmCoralColors } from '@/theme';

// 获取主建筑颜色
const buildingColor = warmCoralColors.getPrimaryColor(0);
```

### 2. 🌊 深海秘境 (Deep Ocean Mystery)
**情绪**: 神秘、宁静、深邃  
**适用**: 水下关卡、谜题场景  
**主色调**: 海军蓝 `#2C3E50`、青绿 `#4ECDC4`、冰蓝 `#A8DADC`

```typescript
import { deepOceanColors } from '@/theme';

const waterColor = deepOceanColors.getPrimaryColor(0);
const glowColor = deepOceanColors.getSecondaryColor(0);
```

### 3. 🌙 紫夜幻境 (Purple Twilight)
**情绪**: 梦幻、浪漫、静谧  
**适用**: 夜晚场景、冥想关卡  
**主色调**: 深紫灰 `#6C5B7B`、玫瑰紫红 `#C06C84`、粉紫 `#E8B4C8`

### 4. 🌿 翠绿森林 (Emerald Forest)
**情绪**: 清新、生机、希望  
**适用**: 森林场景、成长主题  
**主色调**: 深森林绿 `#2D4739`、荧光黄绿 `#9FE870`

### 5. 🏜️ 沙漠遗迹 (Desert Ruins)
**情绪**: 苍凉、神秘、古老  
**适用**: 沙漠场景、遗迹探索  
**主色调**: 沙棕 `#D4A574`、绿松石 `#7FCDCD`

### 6. 🌌 暗黑虚空 (Dark Void)
**情绪**: 神秘、危险、挑战  
**适用**: 最终关卡、高难度场景  
**主色调**: 纯黑 `#000000`、霓虹粉 `#FF6EC7`、橙红 `#FF5733`

### 7. 🌸 樱花庭院 (Cherry Blossom Garden)
**情绪**: 浪漫、柔和、诗意  
**适用**: 花园场景、和风关卡  
**主色调**: 樱花粉 `#FFB6C1`、薄荷绿 `#A8E6CF`

### 8. 🔥 火焰地狱 (Inferno Realm)
**情绪**: 炽热、危险、极端  
**适用**: 火山关卡、终极挑战  
**主色调**: 深红 `#8B0000`、橙红岩浆 `#FF6B00`

---

## 🚀 快速开始

### 1. 在 Three.js 场景中使用

```typescript
import { ThemeColorManager } from '@/theme';

// 创建颜色管理器
const colorManager = new ThemeColorManager('deepOcean');

// 获取天空渐变颜色
const skyColors = colorManager.getSkyColors();
scene.background = skyColors[0];

// 获取建筑材质颜色
const buildingMaterial = new THREE.MeshStandardMaterial({
  color: colorManager.getPrimaryColor(0),
  emissive: colorManager.getHighlightColor(),
  emissiveIntensity: 0.2
});

// 设置光照
const ambientLight = new THREE.AmbientLight(
  colorManager.getAmbientLightColor(),
  0.6
);

const directionalLight = new THREE.DirectionalLight(
  colorManager.getDirectionalLightColor(),
  0.8
);

// 设置雾效
const { color, opacity } = colorManager.getFogColor();
scene.fog = new THREE.FogExp2(color, 0.01);
```

### 2. 在 React UI 中使用

```typescript
import { applyThemeToDocument } from '@/theme';

// 应用主题到整个文档
applyThemeToDocument('warmCoral');

// 在组件中使用 Tailwind 类
function GameUI() {
  return (
    <div className="bg-background-sky text-ui-text">
      <button className="bg-primary hover:bg-primary-100 text-white">
        开始游戏
      </button>
      
      <div className="text-accent-gold animate-glow">
        目标点
      </div>
    </div>
  );
}
```

### 3. 动态切换主题

```typescript
import { ThemeColorManager, applyThemeToDocument } from '@/theme';

class GameThemeController {
  private colorManager: ThemeColorManager;
  
  constructor() {
    this.colorManager = new ThemeColorManager('warmCoral');
  }
  
  changeTheme(themeName: ThemeName) {
    // 更新 Three.js 场景
    this.colorManager.setTheme(themeName);
    this.updateSceneColors();
    
    // 更新 UI
    applyThemeToDocument(themeName);
  }
  
  private updateSceneColors() {
    // 重新应用颜色到场景对象
    scene.background = this.colorManager.getSkyColors()[0];
    // ... 其他更新
  }
}
```

### 4. 根据关卡自动选择主题

```typescript
import { getThemeByLevel } from '@/theme';

function loadLevel(levelIndex: number) {
  // 自动循环使用8个主题
  const theme = getThemeByLevel(levelIndex);
  const colorManager = new ThemeColorManager(theme.name as ThemeName);
  
  // 使用主题设置场景
  setupSceneWithTheme(colorManager);
}
```

---

## 🎯 高级用法

### 颜色插值和渐变

```typescript
import { lerpColor, createGradientTexture } from '@/theme';

// 在两个颜色间插值
const midColor = lerpColor('#FF6B6B', '#B19CD9', 0.5);

// 创建渐变纹理（用于天空球）
const skyColors = ['#FFE5E5', '#FFD1DC', '#FFC4D0'];
const gradientTexture = createGradientTexture(skyColors, 512, 512);

const skyMaterial = new THREE.MeshBasicMaterial({
  map: gradientTexture,
  side: THREE.BackSide
});
```

### 根据高度分层着色

```typescript
import { getColorByHeight } from '@/theme';

// 建筑物根据高度改变颜色
function createBuildingBlock(y: number) {
  const colors = ['#FF6B6B', '#FFA07A', '#B19CD9', '#C8B8DB'];
  const color = getColorByHeight(y, 0, 20, colors);
  
  const material = new THREE.MeshStandardMaterial({ color });
  return material;
}
```

### 添加发光效果

```typescript
import { addEmissive, getDarkerColor, getLighterColor } from '@/theme';

// 创建发光材质
const glowMaterial = new THREE.MeshStandardMaterial({
  ...addEmissive('#4ECDC4', 0.5)
});

// 创建阴影面和高光面
const darkSide = new THREE.MeshStandardMaterial({
  color: getDarkerColor('#FF6B6B', 0.7)
});

const lightSide = new THREE.MeshStandardMaterial({
  color: getLighterColor('#FF6B6B', 1.3)
});
```

---

## 📦 颜色结构说明

每个主题包含以下颜色类别：

### 🎨 Background（背景）
- `sky`: 天空颜色（支持渐变数组）
- `horizon`: 地平线颜色
- `ground`: 地面颜色

### 🏗️ Primary（主色调）
- 4个主要建筑颜色
- 用于大型结构、墙体、平台

### 🎭 Secondary（辅助色）
- 4个辅助装饰颜色
- 用于柱子、阴影面、次要元素

### ✨ Accent（强调色）
- 4个强调/交互颜色
- 用于机关、目标点、特殊装饰

### 💡 Lighting（光照）
- `ambient`: 环境光颜色
- `directional`: 方向光颜色
- `highlight`: 高光颜色
- `shadow`: 阴影颜色（支持透明度）

### 🌫️ Fog（雾效）
- 场景雾效颜色（支持透明度）

### 🖥️ UI（用户界面）
- `text`: 主文本颜色
- `textSecondary`: 次要文本颜色
- `panel`: 面板背景色
- `border`: 边框颜色
- `success/warning/error`: 状态颜色

---

## 🛠️ 工具函数速查

### 颜色转换
```typescript
hexToThreeColor('#FF6B6B')      // → THREE.Color
hexToRGB('#FF6B6B')             // → [r, g, b] (0-1)
hexToRGB255('#FF6B6B')          // → [r, g, b] (0-255)
parseColorWithAlpha('#FF6B6B80') // → { color, opacity }
```

### 颜色操作
```typescript
lerpColor(color1, color2, t)     // 颜色插值
adjustBrightness(color, factor)  // 调整亮度
getDarkerColor(color, amount)    // 变暗
getLighterColor(color, amount)   // 变亮
```

### 材质辅助
```typescript
addEmissive(color, intensity)    // 添加发光
createGradientTexture(colors)    // 创建渐变纹理
getColorByHeight(y, min, max, colors) // 高度分层着色
```

---

## 🎨 Tailwind CSS 集成

主题颜色已自动集成到 Tailwind 配置中：

```jsx
// 使用主题颜色
<div className="bg-primary text-ui-text">
<div className="bg-secondary-50">
<div className="text-accent-gold">
<div className="bg-background-sky">

// 使用语义化别名
<div className="text-goal">目标点</div>
<div className="text-player">玩家</div>
<div className="border-interactive">交互元素</div>

// 使用自定义动画
<div className="animate-float">浮动</div>
<div className="animate-glow">发光</div>
<div className="shadow-glow">发光阴影</div>
```

---

## 📝 最佳实践

### 1. 主题一致性
同一关卡使用同一主题的所有颜色，保持视觉一致性。

### 2. 颜色层次
- **主色调**: 大型建筑、主要结构
- **辅助色**: 装饰、次要元素、阴影面
- **强调色**: 交互元素、目标点、特殊标记

### 3. 对比度
确保玩家、目标点等重要元素使用强调色，与背景形成明显对比。

### 4. 性能优化
```typescript
// ✅ 好：复用颜色管理器
const colorManager = new ThemeColorManager('warmCoral');
const color1 = colorManager.getPrimaryColor(0);
const color2 = colorManager.getPrimaryColor(0); // 复用

// ❌ 差：重复创建
const color1 = new ThemeColorManager('warmCoral').getPrimaryColor(0);
const color2 = new ThemeColorManager('warmCoral').getPrimaryColor(0);
```

### 5. 主题切换动画
```typescript
// 平滑过渡主题颜色
function transitionTheme(oldTheme, newTheme, duration = 1000) {
  const startTime = Date.now();
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    
    // 插值所有颜色
    scene.background = lerpColor(
      oldTheme.getSkyColors()[0],
      newTheme.getSkyColors()[0],
      t
    );
    
    if (t < 1) requestAnimationFrame(animate);
  }
  
  animate();
}
```

---

## 🎓 设计理念

### 色彩心理学应用
- **暖色系** (珊瑚、桃橙): 欢快、温暖、友好 → 入门关卡
- **冷色系** (深蓝、青绿): 冷静、神秘、深邃 → 谜题关卡
- **中性色** (紫色、粉紫): 梦幻、浪漫、柔和 → 过渡场景
- **极端色** (黑红、火焰): 危险、挑战、紧张 → 终极关卡

### Monument Valley 美学原则
1. **高饱和度** + **柔和过渡**
2. **强烈对比** + **和谐共存**
3. **极简几何** + **丰富色彩**
4. **等距视角** + **视觉错觉**

---

## 🔮 未来扩展

### 计划添加的功能
- [ ] 动态天气系统（日出、日落、暴雨等）
- [ ] 季节主题（春夏秋冬）
- [ ] 用户自定义主题编辑器
- [ ] 主题预览画廊
- [ ] 色盲友好模式

### 贡献新主题
欢迎贡献新的主题配色！请遵循以下格式：

```typescript
export const myNewTheme: ColorPalette = {
  name: 'My New Theme',
  description: '简短描述情绪和适用场景',
  background: { /* ... */ },
  primary: [ /* 4个颜色 */ ],
  secondary: [ /* 4个颜色 */ ],
  accent: [ /* 4个颜色 */ ],
  lighting: { /* ... */ },
  fog: '...',
  ui: { /* ... */ }
};
```

---

## 📞 技术支持

如有问题或建议，请查看：
- 主项目 README
- types.ts - 类型定义
- 示例关卡配置

**Happy Theming! 🎨✨**

