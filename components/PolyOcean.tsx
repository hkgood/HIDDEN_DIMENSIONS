import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store';

/**
 * 🌊 Low-Poly Ocean Component - Production Grade
 * 
 * 高性能低多边形海洋渲染系统，具有智能颜色过渡
 * 
 * 核心特性：
 * - 色相连续性算法：确保任何切换都平滑无跳变
 * - 分层颜色管理：基础层（主题色）+ 动态层（色相漂移）
 * - 智能过渡策略：场景切换 vs 自动演化采用不同策略
 * - 性能优化：颜色预计算、避免不必要的 HSL 转换
 * - 内存安全：完善的定时器清理和 ref 管理
 * 
 * @author Rocky - Refactored for Production
 */

// ============================================
// 🎨 类型定义
// ============================================

/** 海洋波浪配置 */
export interface OceanConfig {
  speed: number;   // 波浪速度 (0-3)
  height: number;  // 波浪高度 (0-4)
  density: number; // 波浪密度 (0.5-3)
}

/** 过渡类型枚举 */
enum TransitionType {
  SCENE_CHANGE = 'scene_change',  // 场景切换：色相保持连续，基础颜色切换
  AUTO_DRIFT = 'auto_drift',      // 自动漂移：色相缓慢演化
  INITIAL = 'initial'             // 初始化：立即设置
}

/** 颜色状态接口 */
interface ColorState {
  deep: THREE.Color;     // 深水区颜色
  surface: THREE.Color;  // 水面颜色
  hue: number;          // 色相偏移 (0-1)
}

// ============================================
// 🎨 常量定义
// ============================================

/** 海洋色相固定偏移（65度），用于与场景3D元素形成对比 */
const OCEAN_HUE_OFFSET = 0.18;

// ============================================
// 🧮 纯函数工具集
// ============================================

/**
 * 计算色相环上的最短距离
 * 处理 0-1 循环边界，确保始终选择最短路径
 * 
 * @param from - 起始色相 (0-1)
 * @param to - 目标色相 (0-1)
 * @returns 最短距离，带方向 (-0.5 到 0.5)
 */
const getShortestHueDistance = (from: number, to: number): number => {
  let diff = to - from;
  // 处理循环边界：如果距离超过半圈，走另一边更短
  if (diff > 0.5) diff -= 1;
  else if (diff < -0.5) diff += 1;
  return diff;
};

/**
 * 色相连续性插值
 * 
 * @param current - 当前色相
 * @param target - 目标色相
 * @param delta - 时间增量
 * @param speed - 过渡速度 (0-1)
 * @returns 新的色相值
 */
const lerpHueContinuous = (
  current: number, 
  target: number, 
  delta: number, 
  speed: number
): number => {
  const distance = getShortestHueDistance(current, target);
  const step = distance * delta * speed;
  return (current + step + 1) % 1; // 确保 0-1 范围
};

/**
 * 提升颜色饱和度和明度
 * 确保海洋颜色始终鲜艳明亮
 * 
 * @param color - 输入颜色
 * @param minSaturation - 饱和度下限 (0-1)
 * @param minLightness - 明度下限 (0-1)
 * @returns 增强后的颜色
 */
const enhanceColor = (
  color: THREE.Color, 
  minSaturation: number = 0.9, 
  minLightness: number = 0.75
): THREE.Color => {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  
  const enhancedSaturation = Math.max(hsl.s, minSaturation);
  const enhancedLightness = Math.max(hsl.l, minLightness);
  
  return new THREE.Color().setHSL(hsl.h, enhancedSaturation, enhancedLightness);
};

/**
 * 应用色相偏移到颜色
 * 
 * @param baseColor - 基础颜色
 * @param hueShift - 色相偏移量 (0-1)
 * @param oceanOffset - 海洋固定偏移 (0-1)
 * @param complementaryOffset - 互补色偏移 (0 或 0.5)
 * @returns 应用偏移后的颜色
 */
const applyHueShift = (
  baseColor: THREE.Color,
  hueShift: number,
  oceanOffset: number = 0.18,
  complementaryOffset: number = 0
): THREE.Color => {
  const hsl = { h: 0, s: 0, l: 0 };
  baseColor.getHSL(hsl);
  
  const finalHue = (hsl.h + hueShift + oceanOffset + complementaryOffset) % 1;
  
  return new THREE.Color().setHSL(finalHue, hsl.s, hsl.l);
};

// ============================================
// 🎨 主组件
// ============================================

// 🔑 全局单例标记：确保只有一个实例在渲染
let activeInstanceId: string | null = null;

export const PolyOcean: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // 🔬 调试：生成实例ID
  const instanceId = useRef(Math.random().toString(36).substr(2, 6));
  
  // 🔑 立即标记这个实例为活跃实例（在任何渲染之前）
  if (activeInstanceId === null) {
    activeInstanceId = instanceId.current;
  }
  
  // 🔑 标记这个实例为活跃实例
  useEffect(() => {
    activeInstanceId = instanceId.current;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/34ca350b-168d-460d-b354-3288821e2015',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PolyOcean.tsx:INSTANCE_MOUNT',message:'PolyOcean instance mounted',data:{instanceId:instanceId.current,isActive:true},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'MULTI_INSTANCE'})}).catch(()=>{});
    // #endregion
    
    return () => {
      // 如果这个实例是活跃实例，清除标记
      if (activeInstanceId === instanceId.current) {
        activeInstanceId = null;
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/34ca350b-168d-460d-b354-3288821e2015',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PolyOcean.tsx:INSTANCE_UNMOUNT',message:'PolyOcean instance unmounted',data:{instanceId:instanceId.current},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'MULTI_INSTANCE'})}).catch(()=>{});
      // #endregion
    };
  }, []);
  // #endregion
  
  // 从 store 获取主题配置
  const { activePalette, oceanConfig } = useGameStore();
  
  // ============================================
  // 📊 颜色状态管理（使用 Ref 避免重渲染）
  // ============================================
  
  // 当前渲染颜色（每帧 lerp 更新）
  // 🔑 修复：初始化时不使用随机色相，而是从palette的实际颜色开始（色相=0）
  // 这样即使创建新实例，也能从正确的颜色开始，避免跳变
  const currentStateRef = useRef<ColorState>({
    deep: enhanceColor(new THREE.Color(activePalette.waterDeep)),
    surface: enhanceColor(new THREE.Color(activePalette.waterSurface)),
    hue: 0  // 从0开始，而不是随机值
  });
  
  // 目标颜色（过渡的终点）
  const targetStateRef = useRef<ColorState>({
    deep: enhanceColor(new THREE.Color(activePalette.waterDeep)),
    surface: enhanceColor(new THREE.Color(activePalette.waterSurface)),
    hue: currentStateRef.current.hue
  });
  
  // 色相偏移状态（用于 React 触发更新，但不用于渲染）
  const [, setHueVersion] = useState(0);
  
  // 30秒自动漂移定时器
  const autoSwitchTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 上一次的 palette 引用（用于检测变化）
  const prevPaletteRef = useRef(activePalette);
  
  // 🔑 关键：缓存上一帧实际渲染的最终颜色（消除竞态条件）
  const lastRenderedColorRef = useRef<{
    deep: THREE.Color;
    surface: THREE.Color;
  } | null>(null);
  
  // ============================================
  // 🎯 核心逻辑：颜色过渡管理器
  // ============================================
  
  /**
   * 🔬 从当前几何体采样真实渲染颜色（方案1：同步采样）
   * 直接读取GPU缓冲区的顶点颜色，100%准确，零延迟
   */
  const getCurrentRenderedColor = useCallback((): { deep: THREE.Color, surface: THREE.Color } | null => {
    if (!meshRef.current) return null;
    
    const colorAttr = meshRef.current.geometry.attributes.color;
    if (!colorAttr) return null;
    
    const count = colorAttr.count;
    
    // 采样策略：深水区（底部20%）和浅水区（顶部80%）
    // 选择中心位置避免边缘效应
    const deepSampleIdx = Math.floor(count * 0.2);    // 底部20%
    const surfaceSampleIdx = Math.floor(count * 0.8); // 顶部80%
    
    const deepColor = new THREE.Color(
      colorAttr.getX(deepSampleIdx),
      colorAttr.getY(deepSampleIdx),
      colorAttr.getZ(deepSampleIdx)
    );
    
    const surfaceColor = new THREE.Color(
      colorAttr.getX(surfaceSampleIdx),
      colorAttr.getY(surfaceSampleIdx),
      colorAttr.getZ(surfaceSampleIdx)
    );
    
    return { deep: deepColor, surface: surfaceColor };
  }, []);

  /**
   * 触发颜色过渡
   * 
   * @param type - 过渡类型
   */
  const triggerTransition = useCallback((type: TransitionType) => {
    const current = currentStateRef.current;
    
    switch (type) {
      case TransitionType.SCENE_CHANGE: {
        // 🔑 场景切换：立即应用新颜色（无过渡动画）
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/34ca350b-168d-460d-b354-3288821e2015',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PolyOcean.tsx:SCENE_CHANGE_INSTANT',message:'Scene change - instant color switch',data:{newDeep:activePalette.waterDeep,newSurface:activePalette.waterSurface},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'INSTANT'})}).catch(()=>{});
        // #endregion
        
        // 计算新场景的颜色
        const newDeep = enhanceColor(new THREE.Color(activePalette.waterDeep));
        const newSurface = enhanceColor(new THREE.Color(activePalette.waterSurface));
        const newHue = 0; // 色相归零，使用调色板的原始颜色
        
        // 立即设置当前状态 = 目标状态（无过渡）
        currentStateRef.current = {
          deep: newDeep.clone(),
          surface: newSurface.clone(),
          hue: newHue
        };
        
        targetStateRef.current = {
          deep: newDeep.clone(),
          surface: newSurface.clone(),
          hue: newHue
        };
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/34ca350b-168d-460d-b354-3288821e2015',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PolyOcean.tsx:SCENE_CHANGE_COMPLETE',message:'Instant color applied',data:{deepHex:newDeep.getHexString(),surfaceHex:newSurface.getHexString(),hue:newHue},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'INSTANT'})}).catch(()=>{});
        // #endregion
        
        break;
      }
      
      case TransitionType.AUTO_DRIFT: {
        // 自动漂移：色相缓慢演化（30-72度）
        const driftAmount = 0.083 + Math.random() * 0.117; // 30-72度
        const newHue = (current.hue + driftAmount) % 1;
        
        // 🔑 基础颜色保持不变，只是色相漂移
        // 必须从 current 拷贝，因为 target 可能已经和 current 是同一对象
        targetStateRef.current = {
          deep: current.deep.clone(),
          surface: current.surface.clone(),
          hue: newHue
        };
        
        console.log('🌊 Auto Drift:', {
          from: `H:${Math.round(current.hue * 360)}°`,
          to: `H:${Math.round(newHue * 360)}°`,
          drift: `+${Math.round(driftAmount * 360)}°`
        });
        
        break;
      }
      
      case TransitionType.INITIAL: {
        // 初始化：从palette的实际颜色开始（色相=0），确保第一帧就是正确的颜色
        const initDeep = enhanceColor(new THREE.Color(activePalette.waterDeep));
        const initSurface = enhanceColor(new THREE.Color(activePalette.waterSurface));
        const initHue = 0;  // 从0开始，不要随机
        
        currentStateRef.current = {
          deep: initDeep,
          surface: initSurface,
          hue: initHue
        };
        
        // 🔑 关键修复：深拷贝颜色对象，避免引用共享
        targetStateRef.current = {
          deep: initDeep.clone(),
          surface: initSurface.clone(),
          hue: initHue
        };
        
        break;
      }
    }
    
    // 🔑 已禁用自动漂移：静止时保持当前颜色
    // 清理旧的定时器（如果存在）
    if (autoSwitchTimerRef.current) {
      clearTimeout(autoSwitchTimerRef.current);
      autoSwitchTimerRef.current = null;
    }
    
    // ❌ 自动漂移已禁用
    // autoSwitchTimerRef.current = setTimeout(() => {
    //   triggerTransition(TransitionType.AUTO_DRIFT);
    // }, 30000); // 30秒后自动漂移
    
    // 触发 React 更新（用于调试，实际渲染不依赖）
    setHueVersion(v => v + 1);
    
  }, [activePalette]);
  
  // ============================================
  // 🎣 生命周期管理
  // ============================================
  
  // 监听场景切换
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/34ca350b-168d-460d-b354-3288821e2015',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PolyOcean.tsx:USEEFFECT_FIRED',message:'useEffect executed',data:{paletteName:activePalette.name,waterDeep:activePalette.waterDeep,waterSurface:activePalette.waterSurface,isReferenceEqual:prevPaletteRef.current===activePalette},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // 检测 palette 的颜色值是否真的变化了（而不是对象引用）
    const prevWaterDeep = prevPaletteRef.current?.waterDeep;
    const prevWaterSurface = prevPaletteRef.current?.waterSurface;
    const currentWaterDeep = activePalette.waterDeep;
    const currentWaterSurface = activePalette.waterSurface;
    
    if (prevWaterDeep !== currentWaterDeep || prevWaterSurface !== currentWaterSurface) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/34ca350b-168d-460d-b354-3288821e2015',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PolyOcean.tsx:USEEFFECT_PALETTE_CHANGE',message:'Palette COLOR changed in useEffect',data:{oldDeep:prevWaterDeep,newDeep:currentWaterDeep,oldSurface:prevWaterSurface,newSurface:currentWaterSurface,hasCachedColor:!!lastRenderedColorRef.current},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      prevPaletteRef.current = activePalette;
      triggerTransition(TransitionType.SCENE_CHANGE);
    }
  }, [activePalette.waterDeep, activePalette.waterSurface, activePalette, triggerTransition]);
  
  // 组件挂载时初始化
  useEffect(() => {
    triggerTransition(TransitionType.INITIAL);
    
    // 清理定时器
    return () => {
      if (autoSwitchTimerRef.current) {
        clearTimeout(autoSwitchTimerRef.current);
        autoSwitchTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // ============================================
  // 🏗️ 几何体生成（只在挂载时执行一次）
  // ============================================
  
  const { geometry, initialPositions } = useMemo(() => {
    // 创建平面几何体：180x180 大小，100x100 分段
    const geo = new THREE.PlaneGeometry(180, 180, 100, 100);
    
    // 转换为非索引几何体，实现低多边形平面着色效果
    const nonIndexedGeo = geo.toNonIndexed();
    const count = nonIndexedGeo.attributes.position.count;
    
    // 保存初始位置用于波浪动画
    const initialPos = new Float32Array(nonIndexedGeo.attributes.position.array);
    
    // 初始化顶点颜色缓冲
    const colors = new Float32Array(count * 3);
    nonIndexedGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return { geometry: nonIndexedGeo, initialPositions: initialPos };
  }, []);
  
  // ============================================
  // 🎬 每帧渲染（动画循环）
  // ============================================
  
  useFrame((state, delta) => {
    // 🔑 关键修复：只允许活跃实例渲染，丢弃旧实例的渲染
    if (activeInstanceId !== instanceId.current) {
      return; // 这个实例不是活跃实例，跳过渲染
    }
    
    if (!meshRef.current) return;
    
    const current = currentStateRef.current;
    const target = targetStateRef.current;
    
    // --- 1️⃣ 平滑过渡色相（使用连续性算法）---
    // 计算：5秒 = 300帧（60fps），达到99%完成度需要 alpha ≈ 0.0153
    // 0.0153 / 0.01667 ≈ 0.92
    const TRANSITION_SPEED = 0.92; // 真正的 5 秒完成过渡（99%完成度）
    current.hue = lerpHueContinuous(current.hue, target.hue, delta, TRANSITION_SPEED);
    
    // --- 2️⃣ 平滑过渡基础颜色（RGB 空间 lerp）---
    const lerpAlpha = delta * TRANSITION_SPEED;
    current.deep.lerp(target.deep, lerpAlpha);
    current.surface.lerp(target.surface, lerpAlpha);
    
    // --- 3️⃣ 预计算最终渲染颜色（避免在顶点循环中重复计算）---
    
    // 深水区颜色（色相偏移）
    const deepShifted = applyHueShift(current.deep, current.hue, OCEAN_HUE_OFFSET, 0);
    const deepHSL = { h: 0, s: 0, l: 0 };
    deepShifted.getHSL(deepHSL);
    deepHSL.s = Math.max(deepHSL.s, 0.9);
    deepHSL.l = Math.max(deepHSL.l, 0.75);
    
    // 水面颜色（互补色偏移 +180度）
    const surfaceShifted = applyHueShift(current.surface, current.hue, OCEAN_HUE_OFFSET, 0.5);
    const surfaceHSL = { h: 0, s: 0, l: 0 };
    surfaceShifted.getHSL(surfaceHSL);
    surfaceHSL.s = Math.max(surfaceHSL.s, 0.9);
    surfaceHSL.l = Math.max(surfaceHSL.l, 0.75);
    
    // --- 4️⃣ 波浪动画和顶点着色 ---
    const time = state.clock.getElapsedTime();
    const posAttr = meshRef.current.geometry.attributes.position;
    const colAttr = meshRef.current.geometry.attributes.color;
    const count = posAttr.count;
    
    const { height: heightMult, density, speed } = oceanConfig;
    
    // 顶点循环
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      
      const x = initialPositions[ix];
      const y = initialPositions[iy];
      
      // 🌊 波浪叠加（7层波浪创造复杂动态）
      let z = 0;
      z += Math.sin((x * 0.08 + y * 0.05) * density + time * speed) * 1.2;
      z += Math.sin((x * -0.1 + y * 0.15) * density + time * speed * 1.3) * 0.8;
      z += Math.cos((x * 0.3 + y * 0.2) * density + time * speed * 2.5) * 0.3;
      z += Math.sin((x * 0.12 - y * 0.08) * density + time * speed * 0.7 + 1.5) * 0.6;
      z += Math.cos((x * 0.18 + y * 0.22) * density + time * speed * 1.8 + 3.7) * 0.4;
      z += Math.sin((x * 0.04 + y * 0.03) * density + time * speed * 0.5 + 2.1) * 0.5;
      z += Math.sin(x * 0.25 + time * 0.3) * Math.cos(y * 0.17 + time * 0.2) * 0.2;
      
      const finalZ = z * heightMult;
      posAttr.setZ(i, finalZ);
      
      // 🎨 动态顶点着色（空间渐变 + 波浪调制）
      const nx = (x + 90) / 180;
      const ny = (y + 90) / 180;
      
      // 纵向渐变 + Smoothstep + 抖动（消除色带）
      let spatialT = 1 - ny;
      spatialT = spatialT * spatialT * (3 - 2 * spatialT); // Smoothstep
      spatialT = Math.pow(spatialT, 0.6);
      
      const dither = (Math.sin(x * 1.7 + y * 2.3) + Math.cos(x * 2.1 - y * 1.9)) * 0.01;
      spatialT = Math.max(0, Math.min(1, spatialT + dither));
      
      // HSL 空间插值
      const baseH = deepHSL.h + (surfaceHSL.h - deepHSL.h) * spatialT;
      const baseS = deepHSL.s + (surfaceHSL.s - deepHSL.s) * spatialT;
      const baseL = deepHSL.l + (surfaceHSL.l - deepHSL.l) * spatialT;
      
      // 波浪高度调制（波峰更鲜艳，波谷更暗）
      const heightFactor = Math.max(-0.5, Math.min(0.5, finalZ / Math.max(heightMult * 2, 0.1)));
      
      let saturationMod = 0;
      let lightnessMod = 0;
      
      if (heightFactor > 0) {
        saturationMod = heightFactor * 0.35;
        lightnessMod = -heightFactor * 0.1;
      } else {
        saturationMod = heightFactor * 0.2;
        lightnessMod = heightFactor * 0.25;
      }
      
      const finalS = Math.max(0, Math.min(1, baseS + saturationMod));
      const finalL = Math.max(0.2, Math.min(0.95, baseL + lightnessMod));
      
      // 转换回 RGB 并写入缓冲
      const finalColor = new THREE.Color().setHSL(baseH, finalS, finalL);
      colAttr.setXYZ(i, finalColor.r, finalColor.g, finalColor.b);
    }
    
    // 标记更新
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
    
    // 🔑 关键：缓存这一帧实际渲染的最终颜色
    // 用于下次场景切换时确保无跳变（使用屏幕上真实显示的颜色）
    const finalDeepColor = new THREE.Color().setHSL(deepHSL.h, deepHSL.s, deepHSL.l);
    const finalSurfaceColor = new THREE.Color().setHSL(surfaceHSL.h, surfaceHSL.s, surfaceHSL.l);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/34ca350b-168d-460d-b354-3288821e2015',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PolyOcean.tsx:CACHE_UPDATE',message:'Frame rendered, cache updated',data:{deepHex:finalDeepColor.getHexString(),surfaceHex:finalSurfaceColor.getHexString(),currentHue:current.hue,time:time.toFixed(2),instanceId:instanceId.current},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    lastRenderedColorRef.current = {
      deep: finalDeepColor,
      surface: finalSurfaceColor
    };
  });
  
  // ============================================
  // 🎨 渲染
  // ============================================
  
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -8, 0]}
      receiveShadow
      castShadow
    >
      <meshStandardMaterial
        vertexColors
        flatShading
        roughness={0.5}
        metalness={0.0}
        emissive="#000000"
        emissiveIntensity={0}
        onBeforeCompile={(shader) => {
          // 降低阴影对比度，让阴影区域更亮
          shader.fragmentShader = shader.fragmentShader.replace(
            'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
            `
            outgoingLight = mix(outgoingLight, vec3(1.0), 0.25);
            gl_FragColor = vec4( outgoingLight, diffuseColor.a );
            `
          );
        }}
      />
    </mesh>
  );
};
