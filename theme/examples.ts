/**
 * 🎨 主题系统使用示例
 * 
 * 展示如何在实际项目中使用色板系统
 */

import * as THREE from 'three';
import { ThemeColorManager, type ThemeName } from './colorPalettes';
import { createGradientTexture, getColorByHeight, addEmissive } from './threeColors';
import { applyThemeToDocument } from './cssColors';

// ============================================
// 示例 1: 基础场景设置
// ============================================

export function setupBasicScene(scene: THREE.Scene, themeName: ThemeName = 'warmCoral') {
  const colorManager = new ThemeColorManager(themeName);
  
  // 设置天空背景（单色或渐变）
  const skyColors = colorManager.getSkyColors();
  if (skyColors.length === 1) {
    scene.background = skyColors[0];
  } else {
    // 创建天空球渐变
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyColors = colorManager.getTheme().background.sky as string[];
    const skyTexture = createGradientTexture(skyColors, 512, 512);
    const skyMaterial = new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide
    });
    const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skyMesh);
  }
  
  // 设置雾效
  const { color: fogColor, opacity } = colorManager.getFogColor();
  scene.fog = new THREE.FogExp2(fogColor, 0.015 * opacity);
  
  // 添加环境光
  const ambientLight = new THREE.AmbientLight(
    colorManager.getAmbientLightColor(),
    0.6
  );
  scene.add(ambientLight);
  
  // 添加方向光
  const directionalLight = new THREE.DirectionalLight(
    colorManager.getDirectionalLightColor(),
    0.8
  );
  directionalLight.position.set(10, 20, 10);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  
  return colorManager;
}

// ============================================
// 示例 2: 创建主题化的建筑块
// ============================================

export function createThemedBlock(
  colorManager: ThemeColorManager,
  position: [number, number, number],
  colorIndex: number = 0
) {
  const geometry = new THREE.BoxGeometry(2, 2, 2);
  
  // 根据索引选择颜色
  const color = colorManager.getPrimaryColor(colorIndex);
  
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.7,
    metalness: 0.1,
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  
  return mesh;
}

// ============================================
// 示例 3: 创建发光的交互元素
// ============================================

export function createGlowingInteractive(
  colorManager: ThemeColorManager,
  position: [number, number, number]
) {
  const geometry = new THREE.SphereGeometry(0.5, 32, 32);
  
  // 使用强调色并添加发光效果
  const accentColor = colorManager.getInteractiveColor();
  const emissiveProps = addEmissive(
    '#' + accentColor.getHexString(),
    0.6
  );
  
  const material = new THREE.MeshStandardMaterial({
    ...emissiveProps,
    roughness: 0.3,
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  
  // 添加点光源增强发光效果
  const pointLight = new THREE.PointLight(accentColor, 1, 10);
  pointLight.position.copy(mesh.position);
  
  return { mesh, light: pointLight };
}

// ============================================
// 示例 4: 创建目标点
// ============================================

export function createGoalPoint(
  colorManager: ThemeColorManager,
  position: [number, number, number]
) {
  const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 32);
  
  const goalColor = colorManager.getGoalColor();
  const material = new THREE.MeshStandardMaterial({
    color: goalColor,
    emissive: goalColor,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.5,
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.x = Math.PI / 2;
  
  // 添加光晕
  const glowGeometry = new THREE.RingGeometry(0.4, 0.6, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: goalColor,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.rotation.x = Math.PI / 2;
  mesh.add(glow);
  
  return mesh;
}

// ============================================
// 示例 5: 创建高度分层的塔楼
// ============================================

export function createLayeredTower(
  colorManager: ThemeColorManager,
  position: [number, number, number],
  height: number = 10
) {
  const group = new THREE.Group();
  const colors = colorManager.getTheme().primary;
  
  for (let y = 0; y < height; y++) {
    const segmentHeight = 2;
    const geometry = new THREE.BoxGeometry(2, segmentHeight, 2);
    
    // 根据高度选择颜色
    const color = getColorByHeight(y * segmentHeight, 0, height * segmentHeight, colors);
    
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
    });
    
    const segment = new THREE.Mesh(geometry, material);
    segment.position.y = y * segmentHeight;
    segment.castShadow = true;
    segment.receiveShadow = true;
    
    group.add(segment);
  }
  
  group.position.set(...position);
  return group;
}

// ============================================
// 示例 6: 动态主题切换
// ============================================

export class ThemeSwitcher {
  private scene: THREE.Scene;
  private colorManager: ThemeColorManager;
  private objects: THREE.Object3D[] = [];
  
  constructor(scene: THREE.Scene, initialTheme: ThemeName = 'warmCoral') {
    this.scene = scene;
    this.colorManager = new ThemeColorManager(initialTheme);
    this.applyTheme();
  }
  
  /**
   * 切换到新主题
   */
  switchTheme(themeName: ThemeName) {
    this.colorManager.setTheme(themeName);
    this.applyTheme();
    applyThemeToDocument(themeName);
  }
  
  /**
   * 应用当前主题到场景
   */
  private applyTheme() {
    // 更新背景
    const skyColors = this.colorManager.getSkyColors();
    this.scene.background = skyColors[0];
    
    // 更新雾效
    const { color: fogColor, opacity } = this.colorManager.getFogColor();
    this.scene.fog = new THREE.FogExp2(fogColor, 0.015 * opacity);
    
    // 更新光照
    const lights = this.scene.children.filter(
      obj => obj instanceof THREE.Light
    ) as THREE.Light[];
    
    lights.forEach(light => {
      if (light instanceof THREE.AmbientLight) {
        light.color = this.colorManager.getAmbientLightColor();
      } else if (light instanceof THREE.DirectionalLight) {
        light.color = this.colorManager.getDirectionalLightColor();
      }
    });
  }
  
  /**
   * 平滑过渡主题（带动画）
   */
  async transitionToTheme(themeName: ThemeName, duration: number = 1000) {
    const oldTheme = this.colorManager.getTheme();
    const newColorManager = new ThemeColorManager(themeName);
    const newTheme = newColorManager.getTheme();
    
    const startTime = Date.now();
    
    return new Promise<void>((resolve) => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        
        // 插值背景颜色
        const oldBg = this.colorManager.getSkyColors()[0];
        const newBg = newColorManager.getSkyColors()[0];
        const currentBg = oldBg.clone().lerp(newBg, t);
        this.scene.background = currentBg;
        
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          this.switchTheme(themeName);
          resolve();
        }
      };
      
      animate();
    });
  }
}

// ============================================
// 示例 7: 完整关卡设置
// ============================================

export function setupCompleteLevel(
  scene: THREE.Scene,
  levelIndex: number
) {
  // 根据关卡索引自动选择主题
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
  
  const themeName = themes[levelIndex % themes.length];
  const colorManager = setupBasicScene(scene, themeName);
  
  // 创建地面
  const groundGeometry = new THREE.PlaneGeometry(50, 50);
  const groundColor = colorManager.getGroundColor() || colorManager.getPrimaryColor(0);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: groundColor,
    roughness: 0.8,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  
  // 创建一些建筑块
  for (let i = 0; i < 5; i++) {
    const x = (Math.random() - 0.5) * 20;
    const z = (Math.random() - 0.5) * 20;
    const block = createThemedBlock(colorManager, [x, 1, z], i % 4);
    scene.add(block);
  }
  
  // 创建目标点
  const goal = createGoalPoint(colorManager, [0, 2, 0]);
  scene.add(goal);
  
  // 创建一座塔
  const tower = createLayeredTower(colorManager, [10, 0, 10], 8);
  scene.add(tower);
  
  // 应用主题到 UI
  applyThemeToDocument(themeName);
  
  return { colorManager, themeName };
}

// ============================================
// 示例 8: React Hook 集成
// ============================================

import { useState, useEffect } from 'react';

export function useTheme(initialTheme: ThemeName = 'warmCoral') {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(initialTheme);
  const [colorManager] = useState(() => new ThemeColorManager(initialTheme));
  
  useEffect(() => {
    // 应用主题到文档
    applyThemeToDocument(currentTheme);
  }, [currentTheme]);
  
  const changeTheme = (newTheme: ThemeName) => {
    colorManager.setTheme(newTheme);
    setCurrentTheme(newTheme);
  };
  
  return {
    currentTheme,
    colorManager,
    changeTheme,
  };
}

// React 组件使用示例
// export function GameComponent() {
//   const { currentTheme, colorManager, changeTheme } = useTheme('warmCoral');
//   
//   return (
//     <div>
//       <select onChange={(e) => changeTheme(e.target.value as ThemeName)}>
//         <option value="warmCoral">暖橙梦境</option>
//         <option value="deepOcean">深海秘境</option>
//         {/* ... 其他主题 */}
//       </select>
//     </div>
//   );
// }

