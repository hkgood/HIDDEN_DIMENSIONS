# 🎨 色板系统快速参考卡

> 一页掌握所有核心用法

---

## ⚡ 最快开始（3行代码）

```typescript
import { ThemeColorManager } from '@/theme';
const colors = new ThemeColorManager('warmCoral');
scene.background = colors.getSkyColors()[0];
```

---

## 📦 导入路径速查

```typescript
// 方式1: 从入口统一导入（推荐）
import { 
  ThemeColorManager,      // 核心管理器
  getTheme,               // 获取主题
  applyThemeToDocument    // 应用到CSS
} from '@/theme';

// 方式2: 直接导入预定义实例
import { warmCoralColors, deepOceanColors } from '@/theme';

// 方式3: 导入特定模块
import { ThemeColorManager } from '@/theme/threeColors';
import { ColorPalette } from '@/theme/colorPalettes';
```

---

## 🎨 8个主题速查

| 代码 | 中文名 | 情绪 | 主色 |
|-----|-------|------|-----|
| `warmCoral` | 暖橙梦境 | 温暖欢快 | 🍑 珊瑚粉 |
| `deepOcean` | 深海秘境 | 神秘宁静 | 🌊 海军蓝 |
| `purpleTwilight` | 紫夜幻境 | 梦幻浪漫 | 🌙 深紫灰 |
| `emeraldForest` | 翠绿森林 | 清新生机 | 🌿 森林绿 |
| `desertRuins` | 沙漠遗迹 | 苍凉神秘 | 🏜️ 沙棕色 |
| `darkVoid` | 暗黑虚空 | 神秘危险 | 🌌 纯黑色 |
| `cherryBlossom` | 樱花庭院 | 浪漫柔和 | 🌸 樱花粉 |
| `inferno` | 火焰地狱 | 炽热危险 | 🔥 深红色 |

---

## 🔧 ThemeColorManager 常用方法

### 背景相关
```typescript
colors.getSkyColors()       // 天空色（数组，支持渐变）
colors.getGroundColor()     // 地面颜色
```

### 建筑颜色
```typescript
colors.getPrimaryColor(0)   // 主建筑色（0-3）
colors.getSecondaryColor(0) // 辅助色（0-3）
colors.getAccentColor(0)    // 强调色（0-3）
```

### 光照设置
```typescript
colors.getAmbientLightColor()      // 环境光
colors.getDirectionalLightColor()  // 方向光
colors.getHighlightColor()         // 高光
colors.getShadowColor()            // 阴影（含透明度）
```

### 特殊用途
```typescript
colors.getGoalColor()         // 目标点（金黄色）
colors.getPlayerColor()       // 玩家颜色
colors.getInteractiveColor()  // 交互元素
colors.getFogColor()          // 雾效（含透明度）
```

---

## 🎯 典型使用场景

### 场景1: 设置基础场景
```typescript
import { setupBasicScene } from '@/theme/examples';

const colorManager = setupBasicScene(scene, 'deepOcean');
```

### 场景2: 创建建筑块
```typescript
const color = colorManager.getPrimaryColor(0);
const material = new THREE.MeshStandardMaterial({ color });
const cube = new THREE.Mesh(geometry, material);
```

### 场景3: 创建发光元素
```typescript
import { addEmissive } from '@/theme';

const material = new THREE.MeshStandardMaterial({
  ...addEmissive('#4ECDC4', 0.5)
});
```

### 场景4: 动态切换主题
```typescript
colorManager.setTheme('inferno');
scene.background = colorManager.getSkyColors()[0];
applyThemeToDocument('inferno'); // 同步更新UI
```

### 场景5: React Hook
```typescript
import { useTheme } from '@/theme/examples';

function MyComponent() {
  const { currentTheme, changeTheme } = useTheme('warmCoral');
  
  return (
    <button onClick={() => changeTheme('deepOcean')}>
      切换主题
    </button>
  );
}
```

---

## 🎨 颜色工具函数

```typescript
// 转换
hexToThreeColor('#FF6B6B')              // → THREE.Color
hexToRGB('#FF6B6B')                     // → [r,g,b] 0-1
parseColorWithAlpha('#FF6B6B80')        // → { color, opacity }

// 操作
lerpColor('#FF6B6B', '#B19CD9', 0.5)   // 插值
getDarkerColor('#FF6B6B', 0.7)         // 变暗
getLighterColor('#FF6B6B', 1.3)        // 变亮

// 材质
addEmissive('#4ECDC4', 0.5)            // 添加发光
createGradientTexture(['#FF0000', '#0000FF']) // 渐变纹理
getColorByHeight(10, 0, 20, colors)    // 高度分层
```

---

## 🖥️ Tailwind CSS 类名

```jsx
{/* 主色调 */}
<div className="bg-primary text-white">
<div className="bg-primary-50">  {/* 浅色 */}
<div className="bg-primary-300"> {/* 深色 */}

{/* 辅助色 */}
<div className="bg-secondary">
<div className="text-secondary-100">

{/* 强调色 */}
<div className="text-accent-gold">
<div className="bg-accent-cyan">
<div className="border-accent-green">

{/* 语义化颜色 */}
<div className="text-goal">        {/* 目标点 */}
<div className="bg-player">        {/* 玩家 */}
<div className="border-interactive"> {/* 交互元素 */}

{/* 背景 */}
<div className="bg-background-sky">
<div className="bg-background-ground">

{/* UI 颜色 */}
<div className="text-ui-text">
<div className="bg-ui-panel">
<div className="border-ui-border">
<div className="text-ui-success">
<div className="text-ui-warning">
<div className="text-ui-error">

{/* 动画 */}
<div className="animate-float">     {/* 浮动 */}
<div className="animate-glow">      {/* 发光 */}
<div className="animate-pulse-slow"> {/* 慢速脉动 */}

{/* 阴影 */}
<div className="shadow-glow">
<div className="shadow-glow-strong">
```

---

## 📊 颜色索引含义

### Primary (主色调)
- `[0]` - 主建筑、大型结构
- `[1]` - 次要建筑
- `[2]` - 塔楼、柱子
- `[3]` - 装饰、边缘

### Secondary (辅助色)
- `[0]` - 阴影面
- `[1]` - 装饰元素
- `[2]` - 次要元素
- `[3]` - 远景、过渡

### Accent (强调色)
- `[0]` - 交互元素
- `[1]` - 目标点（通常是金黄色）
- `[2]` - 特殊装饰
- `[3]` - 强调标记

---

## 🚨 常见错误与解决

### ❌ 错误1: 导入路径不对
```typescript
// ❌ 错误
import { ThemeColorManager } from './theme/threeColors';

// ✅ 正确
import { ThemeColorManager } from '@/theme';
```

### ❌ 错误2: 主题名称拼写错误
```typescript
// ❌ 错误
new ThemeColorManager('warm-coral')

// ✅ 正确
new ThemeColorManager('warmCoral')  // 驼峰命名
```

### ❌ 错误3: 重复创建管理器
```typescript
// ❌ 低效
function createMaterial() {
  const colors = new ThemeColorManager('warmCoral'); // 每次都创建
  return new THREE.MeshStandardMaterial({
    color: colors.getPrimaryColor(0)
  });
}

// ✅ 高效
const colors = new ThemeColorManager('warmCoral'); // 复用
function createMaterial() {
  return new THREE.MeshStandardMaterial({
    color: colors.getPrimaryColor(0)
  });
}
```

### ❌ 错误4: 忘记应用 UI 主题
```typescript
// ❌ 不完整
colorManager.setTheme('deepOcean');
scene.background = colorManager.getSkyColors()[0];

// ✅ 完整
colorManager.setTheme('deepOcean');
scene.background = colorManager.getSkyColors()[0];
applyThemeToDocument('deepOcean'); // 同步 UI
```

---

## 💡 性能优化建议

```typescript
// ✅ 好习惯1: 复用颜色管理器
const colorManager = new ThemeColorManager('warmCoral');

// ✅ 好习惯2: 缓存颜色对象
const primaryColor = colorManager.getPrimaryColor(0);
for (let i = 0; i < 100; i++) {
  materials[i] = new THREE.MeshStandardMaterial({ color: primaryColor });
}

// ✅ 好习惯3: 缓存渐变纹理
const skyTexture = createGradientTexture(colors);
// 复用 skyTexture

// ✅ 好习惯4: 使用预定义实例
import { deepOceanColors } from '@/theme';
const color = deepOceanColors.getPrimaryColor(0);
```

---

## 🎓 学习路径

1. **入门** (5分钟)
   - 阅读本参考卡
   - 运行第一个示例

2. **进阶** (20分钟)
   - 阅读 `theme/README.md`
   - 查看 `theme/examples.ts`

3. **精通** (1小时)
   - 研究 `theme/ARCHITECTURE.md`
   - 自定义新主题
   - 集成到实际项目

---

## 📞 快速帮助

| 问题 | 查看文档 |
|-----|---------|
| 如何开始？ | 本参考卡 |
| 详细API文档？ | `theme/README.md` |
| 架构设计？ | `theme/ARCHITECTURE.md` |
| 使用示例？ | `theme/examples.ts` |
| 可视化预览？ | `theme/ColorPalettePreview.tsx` |
| 完成总览？ | `theme/SUMMARY.md` |

---

## 🎯 核心记忆点

1. **导入**: `import { ThemeColorManager } from '@/theme'`
2. **创建**: `new ThemeColorManager('warmCoral')`
3. **使用**: `colors.getPrimaryColor(0)`
4. **切换**: `colors.setTheme('deepOcean')`
5. **同步UI**: `applyThemeToDocument('deepOcean')`

---

**记住这5点，就能流畅使用整个系统！** 🚀

**打印本卡片，贴在显示器旁边** 📌

