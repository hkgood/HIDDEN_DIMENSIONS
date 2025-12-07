# 🌌 Ethereal Perspectives / Hidden Dimensions

> **"What you see is where you can walk."**  
> **"所见即所得，所见即可达。"**

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## 🇬🇧 English

**Ethereal Perspectives** is a web-based architectural puzzle game inspired by the impossible geometry of *Monument Valley*. It is not just a clone; it is a technical exploration into **Orthographic Pathfinding**, **Procedural Aesthetics**, and **Generative Audio**.

Built with **React**, **Three.js (R3F)**, and **Math**.

### 🎮 The Core Logic: "The Escher Align"

In a standard 3D game, if Block A is at `x:0` and Block B is at `x:10`, you cannot walk between them.
In **Ethereal Perspectives**, physics is optional. 

The game engine creates a graph of walkable nodes based on **Screen Space Alignment**:
1.  The world is rendered using an **Orthographic Camera** (no perspective distortion).
2.  When you rotate the world by 90°, the Z-axis (depth) is flattened visually.
3.  If Block A (Foreground) visually overlaps Block B (Background), the pathfinding algorithm creates a bridge. 
4.  **Result:** You can walk across thin air because, from your perspective, there is no gap.

### ✨ Key Features

*   **Crystalline Shaders**: Custom WebGL shaders that apply a continuous, vertical gradient across the entire level geometry. No textures, just math.
*   **Generative Audio**: An FM-Synthesis sound engine (via Tone.js) that procedurally generates ambient melodies based on a Pentatonic scale. It never plays the exact same loop twice.
*   **Reactive Physics**: Lanterns and charms dangle from blocks, reacting physically to your camera rotations and slider movements.
*   **Optical Illusions**: Rotators and Sliders that only function when viewed from specific angles.

### 🛠️ Tech Stack

*   **Framework**: React 19 + TypeScript
*   **3D Engine**: @react-three/fiber & Drei
*   **State**: Zustand (Game logic & Pathfinding)
*   **Animation**: @react-spring/three (Physics-based interpolation)
*   **Post-Processing**: Bloom, SMAA, Vignette
*   **Audio**: Tone.js

### 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run the ethereal realm
npm start
```

---

<a name="chinese"></a>
## 🇨🇳 中文

**Ethereal Perspectives (隐匿维度)** 是一款受《纪念碑谷》启发的网页端视错觉解谜游戏。它不仅是对经典玩法的致敬，更是一次关于 **正交寻路算法**、**程序化美学** 和 **生成式音频** 的技术探索。

### 🎮 核心逻辑："埃舍尔对齐"

在普通的 3D 游戏中，如果方块 A 在 `x:0`，方块 B 在 `x:10`，你是无法跨越中间的鸿沟的。
但在 **Ethereal Perspectives** 中，物理法则服从于视觉法则。

游戏引擎基于 **屏幕空间对齐 (Screen Space Alignment)** 构建寻路图：
1.  世界通过 **正交相机 (Orthographic Camera)** 渲染，消除了透视变形。
2.  当你旋转视角 90° 时，深度的 Z 轴在视觉上被“压扁”了。
3.  如果前景的方块 A 在屏幕上遮挡了背景的方块 B，寻路算法会判定它们“已连接”。
4.  **结果：** 角色可以跨越虚空行走，因为在那个视角下，缝隙并不存在。

### ✨ 亮点特性

*   **晶体着色器 (Crystalline Shaders)**：自定义 WebGL Shader，根据方块在世界中的高度计算连续的渐变色。没有贴图，全靠数学计算出的光辉。
*   **生成式音频**：基于 Tone.js 的 FM 合成器引擎。它不播放固定的 MP3，而是根据五声音阶实时生成空灵的旋律，每一次聆听都是独一无二的。
*   **交互物理**：悬挂在建筑上的灯笼和挂饰会根据你的旋转操作产生惯性摆动。
*   **视觉谜题**：只有在特定角度下才能连通的旋转桥梁和升降梯。

### 🛠️ 技术栈

*   **框架**: React 19 + TypeScript
*   **3D 引擎**: @react-three/fiber & Drei
*   **状态管理**: Zustand (处理复杂的视觉寻路逻辑)
*   **动画**: @react-spring/three (基于弹簧物理的平滑运动)
*   **后期处理**: Bloom (辉光), SMAA (抗锯齿), Vignette (晕影)
*   **音频**: Tone.js

### 🚀 开始探索

```bash
# 安装依赖
npm install

# 启动，进入幻境
npm start
```

---

*Created with code, math, and a love for impossible spaces.*
