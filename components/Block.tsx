import React, { useMemo } from 'react';
import { Vector3 } from 'three';
import * as THREE from 'three';
import { useGameStore } from '../store';
import '../types';

interface BlockProps {
  position: [number, number, number];
  isGoal?: boolean;
  onClick?: () => void;
  isWalkable: boolean;
}

export const Block: React.FC<BlockProps> = ({ position, isGoal, onClick }) => {
  // 从 store 获取三色系统
  const activePalette = useGameStore(s => s.activePalette);
  
  // 创建带渐变的材质 shader
  const customMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.7,
      metalness: 0.1,
      toneMapped: true,
    });

    // 自定义 shader：添加垂直渐变效果
    material.onBeforeCompile = (shader) => {
      // 注入 uniforms
      shader.uniforms.uColorLight = { value: new THREE.Color(activePalette.buildingLight) };
      shader.uniforms.uColorMid = { value: new THREE.Color(activePalette.buildingMid) };
      shader.uniforms.uColorDark = { value: new THREE.Color(activePalette.buildingDark) };
      shader.uniforms.uGoalColor = { value: new THREE.Color(activePalette.goal) };
      shader.uniforms.uIsGoal = { value: isGoal ? 1.0 : 0.0 };

      // 修改 Vertex Shader：传递世界坐标
      shader.vertexShader = `
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `
        #include <worldpos_vertex>
        vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        `
      );

      // 修改 Fragment Shader：实现渐变逻辑
      shader.fragmentShader = `
        uniform vec3 uColorLight;
        uniform vec3 uColorMid;
        uniform vec3 uColorDark;
        uniform vec3 uGoalColor;
        uniform float uIsGoal;
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        
        ${shader.fragmentShader}
      `;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        
        vec3 finalColor;
        
        if (uIsGoal > 0.5) {
          // 目标方块：使用目标颜色 + 发光
          finalColor = uGoalColor;
        } else {
          // === 方案 A：简单垂直渐变 + 三色着色 ===
          
          // 1. 垂直渐变（基于世界 Y 坐标）
          // 假设方块高度为 1，中心在 position.y
          // vWorldPosition.y 范围大约是 [position.y - 0.5, position.y + 0.5]
          float blockHeight = 1.0;
          float localY = fract(vWorldPosition.y + 0.5); // 归一化到 [0, 1]
          
          // 使用 smoothstep 创建柔和渐变
          float gradientT = smoothstep(0.0, 1.0, localY);
          
          // 从底部（暗色）到顶部（亮色）的基础渐变
          vec3 verticalGradient = mix(uColorDark, uColorLight, gradientT);
          
          // 2. 基于法线的光照调制（增强立体感）
          // 模拟从右上方来的光照（类似纪念碑谷）
          vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
          float NdotL = dot(normalize(vWorldNormal), lightDir);
          
          // 将法线信息映射到 [0, 1]
          float lightFactor = NdotL * 0.5 + 0.5;
          
          // 使用 smoothstep 创建平滑的三色效果
          float lightWeight = smoothstep(0.4, 0.7, lightFactor);   // 亮面权重
          float darkWeight = smoothstep(0.6, 0.3, lightFactor);     // 暗面权重
          
          // 混合三色：暗 -> 中 -> 亮
          vec3 shadedColor = mix(
            mix(verticalGradient * 0.7, verticalGradient, darkWeight),  // 暗面稍微降低亮度
            verticalGradient * 1.15,                                       // 亮面稍微提升亮度
            lightWeight
          );
          
          // 3. 轻微的色彩调整（增强饱和度）
          const vec3 luminanceWeight = vec3(0.2125, 0.7154, 0.0721);
          float lum = dot(shadedColor, luminanceWeight);
          finalColor = mix(vec3(lum), shadedColor, 1.15); // 饱和度提升 15%
          
          // 防止过曝
          finalColor = clamp(finalColor, 0.0, 0.95);
        }
        
        diffuseColor.rgb = finalColor;
        `
      );

      // 添加自发光（仅目标方块）
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        if (uIsGoal > 0.5) {
          totalEmissiveRadiance = uGoalColor * 0.6;
        } else {
          totalEmissiveRadiance = vec3(0.0);
        }
        `
      );
    };

    return material;
  }, [activePalette, isGoal]);

  // 装饰底座颜色（使用暗色）
  const decorColor = activePalette.buildingDark;
  
  return (
    <group position={new Vector3(...position)}>
      {/* 主方块：带渐变效果 */}
      <mesh 
        onClick={(e) => { e.stopPropagation(); onClick?.(); }} 
        receiveShadow 
        castShadow
      >
        <boxGeometry args={[1.01, 1.01, 1.01]} />
        <primitive object={customMaterial} attach="material" />
      </mesh>
      
      {/* 装饰底座：使用单一暗色，增强对比 */}
      <mesh position={[0, -0.5, 0]} scale={[0.8, 0.1, 0.8]} receiveShadow castShadow>
         <boxGeometry args={[1, 1, 1]} />
         <meshStandardMaterial 
           color={decorColor} 
           roughness={0.8}
           metalness={0.1}
         />
      </mesh>
    </group>
  );
};