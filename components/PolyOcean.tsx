import React, { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store';
import { GameStatus } from '../types';

/**
 * Low-Poly Ocean 组件
 * 
 * 渲染一个低多边形风格的动态海洋作为场景背景
 * - 使用顶点动画创建波浪效果
 * - 动态顶点着色实现渐变和泡沫效果
 * - 整合项目的 palette 和 hueOffset 系统
 */

// 海洋配置接口
export interface OceanConfig {
  speed: number;        // 波浪速度 (0-3)
  height: number;       // 波浪高度 (0-4)
  density: number;      // 波浪密度/频率 (0.5-3)
}

export const PolyOcean: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // 从 store 获取主题配置
  const { activePalette, hueOffset, oceanConfig, status } = useGameStore();
  
  // IDLE 状态的随机色相偏移（组件挂载时生成）
  const [idleHueOffset] = useState(() => Math.random());
  
  // 当前实际使用的色相偏移（用于动画过渡）
  const [currentHueOffset, setCurrentHueOffset] = useState(idleHueOffset);
  
  // 锁定的过渡目标（避免中途 hueOffset 变化导致二次跳变）
  const [targetHueOffset, setTargetHueOffset] = useState(idleHueOffset);
  
  // 监听状态变化，锁定过渡目标
  useEffect(() => {
    if (status === GameStatus.IDLE) {
      // IDLE 状态：目标是随机颜色
      setTargetHueOffset(idleHueOffset);
    } else if (status === GameStatus.PLAYING) {
      // PLAYING 状态：锁定当前 hueOffset 作为目标，之后不再改变
      setTargetHueOffset(hueOffset);
    }
  }, [status]); // 只监听 status，不监听 hueOffset 避免二次跳变
  
  // 基础颜色（从 palette 提取）
  const BASE_DEEP = useMemo(() => new THREE.Color(activePalette.waterDeep), [activePalette.waterDeep]);
  const BASE_SURFACE = useMemo(() => new THREE.Color(activePalette.waterSurface), [activePalette.waterSurface]);

  // 生成几何体 - 只在组件挂载时生成一次
  const { geometry, initialPositions } = useMemo(() => {
    // 创建平面几何体：120x120 大小，100x100 分段（多边形更小更细腻）
    const geo = new THREE.PlaneGeometry(120, 120, 100, 100);
    
    // 关键：转换为非索引几何体，使每个面有独立的法线
    // 这样可以实现低多边形的平面着色效果
    const nonIndexedGeo = geo.toNonIndexed();
    
    const count = nonIndexedGeo.attributes.position.count;
    
    // 保存初始位置，用于动画计算
    const initialPositions = new Float32Array(nonIndexedGeo.attributes.position.array);
    
    // 初始化顶点颜色缓冲
    const colors = new Float32Array(count * 3);
    nonIndexedGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return { geometry: nonIndexedGeo, initialPositions };
  }, []);

  // 每帧更新动画
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // 平滑过渡色相偏移
    // 使用锁定的目标，避免 hueOffset 变化导致二次跳变
    setCurrentHueOffset(prev => {
      const diff = targetHueOffset - prev;
      // 处理色相环的最短路径（0-1循环）
      let shortestDiff = diff;
      if (Math.abs(diff) > 0.5) {
        shortestDiff = diff > 0 ? diff - 1 : diff + 1;
      }
      // 使用 lerp 平滑过渡（速度：0.5 = 约2秒完成过渡）
      return (prev + shortestDiff * delta * 0.5 + 1) % 1;
    });

    const time = state.clock.getElapsedTime();
    const posAttr = meshRef.current.geometry.attributes.position;
    const colAttr = meshRef.current.geometry.attributes.color;
    const count = posAttr.count;

    // 从配置中获取参数
    const heightMult = oceanConfig.height;
    const density = oceanConfig.density;
    const speed = oceanConfig.speed;

    // --- 双色相渐变系统（互补色） ---
    // 海洋使用独立的色相偏移，与场景形成对比
    const OCEAN_HUE_OFFSET = 0.18; // 基础偏移：65度
    
    // 获取 HSL 格式的颜色（用于插值），并强制提升饱和度和明度
    const getShiftedHSL = (base: THREE.Color, extraHueShift: number = 0) => {
      const hsl = { h: 0, s: 0, l: 0 };
      base.getHSL(hsl);
      // 使用当前动画中的色相偏移（平滑过渡）
      const finalHue = (hsl.h + currentHueOffset + OCEAN_HUE_OFFSET + extraHueShift) % 1;
      
      // 强制提升饱和度和明度，避免暗淡的颜色
      const finalSaturation = Math.max(hsl.s, 0.7);  // 饱和度下限 70%
      const finalLightness = Math.max(hsl.l, 0.6);   // 明度下限 60%（明显更亮）
      
      return { h: finalHue, s: finalSaturation, l: finalLightness };
    };

    // 深色区域：保持基础偏移
    const hslDeep = getShiftedHSL(BASE_DEEP, 0);
    // 浅色区域：互补色偏移 +0.5（180度），创造极强的色相对比
    // 例如：蓝色 ↔ 橙色，红色 ↔ 青色，绿色 ↔ 品红
    const hslSurface = getShiftedHSL(BASE_SURFACE, 0.5);

    // --- 顶点循环：计算每个顶点的位置和颜色 ---
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      
      const x = initialPositions[ix];
      const y = initialPositions[iy];

      // --- 波浪叠加 - 增加随机性和复杂度 ---
      let z = 0;
      
      // 1. 大范围起伏（主波浪 - 斜向移动）
      z += Math.sin((x * 0.08 + y * 0.05) * density + time * speed) * 1.2;
      
      // 2. 交叉波浪（不同方向的波纹）
      z += Math.sin((x * -0.1 + y * 0.15) * density + time * speed * 1.3) * 0.8;
      
      // 3. 细节噪声（快速移动的表面细节）
      z += Math.cos((x * 0.3 + y * 0.2) * density + time * speed * 2.5) * 0.3;
      
      // 4. 随机性波浪 1（使用不同的相位偏移）
      z += Math.sin((x * 0.12 - y * 0.08) * density + time * speed * 0.7 + 1.5) * 0.6;
      
      // 5. 随机性波浪 2（更高频率）
      z += Math.cos((x * 0.18 + y * 0.22) * density + time * speed * 1.8 + 3.7) * 0.4;
      
      // 6. 低频大波浪（缓慢的起伏）
      z += Math.sin((x * 0.04 + y * 0.03) * density + time * speed * 0.5 + 2.1) * 0.5;
      
      // 7. 噪声扰动（打破规律性）
      const noiseX = Math.sin(x * 0.25 + time * 0.3) * Math.cos(y * 0.17 + time * 0.2);
      z += noiseX * 0.2;

      const finalZ = z * heightMult;
      posAttr.setZ(i, finalZ);

      // --- 动态顶点着色 - 增强渐变效果和层次感 ---
      
      // 1. 计算渐变位置 (0 到 1)
      const nx = (x + 60) / 120; // 归一化 x
      const ny = (y + 60) / 120; // 归一化 y
      
      // --- 双层渐变系统：空间决定色相，波浪决定质感 ---
      
      // 1. 纯空间渐变 - 只基于位置，决定色相
      const diagonalGrad = 1 - ny; // 纵向渐变：后（近）→ 前（远）
      
      // 对角渐变对比度增强
      let spatialT = diagonalGrad * diagonalGrad * (3 - 2 * diagonalGrad); // Smoothstep
      spatialT = Math.pow(spatialT, 0.6); // 强对比
      spatialT = Math.max(0.0, Math.min(1.0, spatialT));
      
      // 2. HSL 空间插值 - 得到该位置的基础颜色
      const baseH = hslDeep.h + (hslSurface.h - hslDeep.h) * spatialT;
      const baseS = hslDeep.s + (hslSurface.s - hslDeep.s) * spatialT;
      const baseL = hslDeep.l + (hslSurface.l - hslDeep.l) * spatialT;
      
      // 3. 波浪高度调制 - 只影响饱和度和明度
      const heightFactorRaw = finalZ / Math.max(heightMult * 2, 0.1);
      const heightFactor = Math.max(-0.5, Math.min(0.5, heightFactorRaw));
      
      // 波峰：更亮更鲜艳
      // 波谷：更暗更灰
      const saturationMod = heightFactor * 0.15; // 饱和度变化 ±15%
      const lightnessMod = heightFactor * 0.2;   // 明度变化 ±20%
      
      // 应用调制（色相H保持不变！）
      const finalH = baseH; // 色相完全由位置决定
      const finalS = Math.max(0, Math.min(1, baseS + saturationMod));
      const finalL = Math.max(0, Math.min(1, baseL + lightnessMod));
      
      // 4. 转换回 RGB
      const finalColor = new THREE.Color().setHSL(finalH, finalS, finalL);
      const r = finalColor.r;
      const g = finalColor.g;
      const b = finalColor.b;

      colAttr.setXYZ(i, r, g, b);
    }

    // 标记需要更新
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    
    // 重新计算法线（用于光照）
    meshRef.current.geometry.computeVertexNormals();
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]} // 水平放置
      position={[0, -8, 0]} // 在游戏世界下方
      receiveShadow
      castShadow
    >
      <meshStandardMaterial
        vertexColors // 使用顶点颜色
        flatShading  // 平面着色（低多边形风格）
        roughness={0.8} // 增加粗糙度，减少反光对颜色的干扰
        metalness={0.0} // 完全非金属，让顶点颜色更纯粹
        emissive="#000000" // 无自发光
        emissiveIntensity={0}
      />
    </mesh>
  );
};

