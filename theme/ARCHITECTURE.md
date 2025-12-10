# 🎨 色板系统架构可视化

## 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    🎨 色板系统入口                            │
│                     theme/index.ts                           │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  核心定义  │  │ Three.js │  │  CSS集成  │
│colorPalettes│ │threeColors│ │cssColors │
└──────────┘  └──────────┘  └──────────┘
     │             │             │
     │             │             │
     ▼             ▼             ▼
┌─────────────────────────────────────┐
│          8个主题配色方案              │
├─────────────────────────────────────┤
│ • Warm Coral Dream (暖橙梦境)        │
│ • Deep Ocean Mystery (深海秘境)     │
│ • Purple Twilight (紫夜幻境)        │
│ • Emerald Forest (翠绿森林)         │
│ • Desert Ruins (沙漠遗迹)           │
│ • Dark Void (暗黑虚空)              │
│ • Cherry Blossom Garden (樱花庭院)  │
│ • Inferno Realm (火焰地狱)          │
└─────────────────────────────────────┘
```

## 颜色数据流

```
原始色板数据
    │
    ├─→ Three.js 场景
    │      │
    │      ├─→ 材质颜色
    │      ├─→ 光照系统
    │      ├─→ 背景/天空
    │      └─→ 雾效
    │
    ├─→ CSS 变量
    │      │
    │      ├─→ UI 组件
    │      ├─→ Tailwind 类
    │      └─→ 自定义样式
    │
    └─→ JSON 导出
           │
           └─→ 外部工具/资源
```

## 单个主题结构

```
ColorPalette (主题对象)
│
├─ 📦 Background (背景)
│  ├─ sky: 天空颜色 [支持渐变]
│  ├─ horizon: 地平线
│  └─ ground: 地面
│
├─ 🎨 Primary (主色调) [4色]
│  ├─ [0] 主建筑
│  ├─ [1] 次要建筑
│  ├─ [2] 塔楼
│  └─ [3] 装饰
│
├─ 🎭 Secondary (辅助色) [4色]
│  ├─ [0] 阴影面
│  ├─ [1] 柱子
│  ├─ [2] 次要元素
│  └─ [3] 远景
│
├─ ✨ Accent (强调色) [4色]
│  ├─ [0] 交互元素
│  ├─ [1] 目标点 (金黄)
│  ├─ [2] 特殊装饰
│  └─ [3] 强调标记
│
├─ 💡 Lighting (光照)
│  ├─ ambient: 环境光
│  ├─ directional: 方向光
│  ├─ highlight: 高光
│  └─ shadow: 阴影 [含透明度]
│
├─ 🌫️ Fog (雾效)
│  └─ 颜色 + 透明度
│
└─ 🖥️ UI (界面)
   ├─ text: 主文本
   ├─ textSecondary: 次要文本
   ├─ panel: 面板背景
   ├─ border: 边框
   ├─ success: 成功状态
   ├─ warning: 警告状态
   └─ error: 错误状态
```

## 使用流程图

```
开始游戏
    │
    ▼
选择/加载关卡
    │
    ▼
确定主题
    │
    ├─→ 手动指定
    ├─→ 随机选择
    └─→ 按关卡索引
    │
    ▼
创建 ThemeColorManager
    │
    ├─→ 获取场景颜色
    │      │
    │      ├─→ 设置背景
    │      ├─→ 配置光照
    │      ├─→ 创建材质
    │      └─→ 添加雾效
    │
    └─→ 应用 UI 主题
           │
           └─→ 更新 CSS 变量
    │
    ▼
游戏运行中
    │
    ├─→ 关卡切换
    │      │
    │      └─→ 主题切换
    │             │
    │             ├─→ 瞬间切换
    │             └─→ 平滑过渡
    │
    └─→ 动态效果
           │
           ├─→ 发光动画
           ├─→ 颜色插值
           └─→ 高度分层
```

## ThemeColorManager API 地图

```
ThemeColorManager
│
├─ 构造器
│  └─ new ThemeColorManager(themeName)
│
├─ 主题管理
│  ├─ setTheme(themeName)
│  └─ getTheme()
│
├─ 背景相关
│  ├─ getSkyColors()          → THREE.Color[]
│  ├─ getHorizonColor()       → THREE.Color
│  └─ getGroundColor()        → THREE.Color
│
├─ 主色调
│  ├─ getPrimaryColors()      → THREE.Color[]
│  └─ getPrimaryColor(index)  → THREE.Color
│
├─ 辅助色
│  ├─ getSecondaryColors()    → THREE.Color[]
│  └─ getSecondaryColor(index)→ THREE.Color
│
├─ 强调色
│  ├─ getAccentColors()       → THREE.Color[]
│  └─ getAccentColor(index)   → THREE.Color
│
├─ 光照
│  ├─ getAmbientLightColor()    → THREE.Color
│  ├─ getDirectionalLightColor()→ THREE.Color
│  ├─ getHighlightColor()       → THREE.Color
│  └─ getShadowColor()          → { color, opacity }
│
├─ 特殊用途
│  ├─ getGoalColor()         → THREE.Color (目标点)
│  ├─ getPlayerColor()       → THREE.Color (玩家)
│  └─ getInteractiveColor()  → THREE.Color (交互元素)
│
└─ 环境效果
   ├─ getFogColor()          → { color, opacity }
   └─ getUIColors()          → UI颜色对象
```

## 工具函数速查树

```
颜色转换
├─ hexToThreeColor(hex)        → THREE.Color
├─ hexToRGB(hex)               → [r,g,b] 0-1
├─ hexToRGB255(hex)            → [r,g,b] 0-255
└─ parseColorWithAlpha(str)    → { color, opacity }

颜色操作
├─ lerpColor(c1, c2, t)        → THREE.Color (插值)
├─ adjustBrightness(hex, f)    → THREE.Color
├─ getDarkerColor(hex, amt)    → THREE.Color
└─ getLighterColor(hex, amt)   → THREE.Color

材质辅助
├─ addEmissive(color, intensity) → 材质属性对象
├─ createGradientTexture(colors) → THREE.Texture
└─ getColorByHeight(y, min, max, colors) → THREE.Color

CSS 集成
├─ themeToCSSVariables(theme)   → Record<string, string>
├─ generateCSSString(theme)     → CSS 字符串
├─ applyThemeToDocument(name)   → void (应用到DOM)
└─ generateTailwindColors(theme)→ Tailwind配置对象
```

## 文件依赖关系

```
index.ts (入口)
    │
    ├─ 导出 → colorPalettes.ts
    │            │
    │            ├─ 定义: ColorPalette 接口
    │            ├─ 定义: 8个主题常量
    │            └─ 导出: 工具函数
    │
    ├─ 导出 → threeColors.ts
    │            │
    │            ├─ 依赖: colorPalettes.ts
    │            ├─ 定义: ThemeColorManager 类
    │            ├─ 定义: 颜色转换函数
    │            └─ 导出: 8个预定义实例
    │
    ├─ 导出 → cssColors.ts
    │            │
    │            ├─ 依赖: colorPalettes.ts
    │            ├─ 定义: CSS 变量生成器
    │            └─ 导出: Tailwind 集成
    │
    └─ 参考 → examples.ts
                 │
                 ├─ 依赖: 上述所有模块
                 └─ 提供: 完整使用示例

独立文件
├─ ColorPalettePreview.tsx (React 预览组件)
├─ palettes.json (JSON 数据)
├─ README.md (完整文档)
└─ SUMMARY.md (总览文档)
```

## 颜色应用场景矩阵

| 场景 | 使用颜色类别 | 方法 | 用途 |
|-----|------------|------|-----|
| 大型建筑 | Primary | `getPrimaryColor(0-3)` | 主要结构体 |
| 装饰元素 | Secondary | `getSecondaryColor(0-3)` | 次要装饰 |
| 目标点 | Accent | `getGoalColor()` | 关卡目标 |
| 玩家角色 | Accent | `getPlayerColor()` | 玩家可视化 |
| 机关按钮 | Accent | `getInteractiveColor()` | 可交互元素 |
| 天空背景 | Background | `getSkyColors()` | 场景背景 |
| 环境光 | Lighting | `getAmbientLightColor()` | 基础照明 |
| 方向光 | Lighting | `getDirectionalLightColor()` | 主光源 |
| 高光面 | Lighting | `getHighlightColor()` | 反光效果 |
| 阴影 | Lighting | `getShadowColor()` | 阴影渲染 |
| 场景雾 | Fog | `getFogColor()` | 景深效果 |
| UI 文本 | UI | `getUIColors().text` | 界面文字 |
| UI 面板 | UI | `getUIColors().panel` | 面板背景 |

## 主题选择决策树

```
开始选择主题
    │
    ▼
关卡类型？
    │
    ├─ 入门/教程
    │  └─→ Warm Coral (暖橙梦境)
    │
    ├─ 水下/海洋
    │  └─→ Deep Ocean (深海秘境)
    │
    ├─ 夜晚/梦境
    │  └─→ Purple Twilight (紫夜幻境)
    │
    ├─ 森林/自然
    │  └─→ Emerald Forest (翠绿森林)
    │
    ├─ 沙漠/遗迹
    │  └─→ Desert Ruins (沙漠遗迹)
    │
    ├─ 挑战/最终
    │  └─→ Dark Void (暗黑虚空)
    │
    ├─ 和风/花园
    │  └─→ Cherry Blossom (樱花庭院)
    │
    └─ 火山/地狱
       └─→ Inferno (火焰地狱)
```

---

**架构设计**: 模块化、可扩展、类型安全  
**使用方式**: 简单直观、文档完善  
**性能考虑**: 对象复用、纹理缓存  
**扩展性**: 易于添加新主题

