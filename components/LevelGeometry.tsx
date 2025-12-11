
import React, { useMemo, useEffect } from 'react';
import { BlockType } from '../types';
import * as THREE from 'three';
import { useGameStore } from '../store';

interface GeometryProps {
  type: BlockType;
  isGoal?: boolean;
}

// Helper to shift hue in GLSL
const HUE_SHIFT_GLSL = `
vec3 hueShift(vec3 color, float hue) {
    const vec3 k = vec3(0.57735, 0.57735, 0.57735);
    float cosAngle = cos(hue);
    return vec3(color * cosAngle + cross(k, color) * sin(hue) + k * dot(k, color) * (1.0 - cosAngle));
}
`;

const useContinuousGradient = (isDecor: boolean, isGoal: boolean) => {
    const activePalette = useGameStore(s => s.activePalette);
    const hueOffset = useGameStore(s => s.hueOffset);
    const sceneHeightRange = useGameStore(s => s.sceneHeightRange); // 新增：获取动态高度范围

    // 创建稳定的 uniforms 引用（只在 palette 或高度范围变化时重建）
    const uniforms = useMemo(() => {
        // 检查是否有六面配色系统
        const hasFaceColors = activePalette.buildingFaceColors !== undefined;
        
        return {
            // 三色系统（保留兼容）
            uColorLight: { value: new THREE.Color(activePalette.buildingLight) },
            uColorMid: { value: new THREE.Color(activePalette.buildingMid) },
            uColorDark: { value: new THREE.Color(activePalette.buildingDark) },
            
            // 六面配色系统（纪念碑谷风格）
            uColorTop: { value: new THREE.Color(hasFaceColors ? activePalette.buildingFaceColors!.top : activePalette.buildingLight) },
            uColorBottom: { value: new THREE.Color(hasFaceColors ? activePalette.buildingFaceColors!.bottom : activePalette.buildingDark) },
            uColorRight: { value: new THREE.Color(hasFaceColors ? activePalette.buildingFaceColors!.right : activePalette.buildingMid) },
            uColorLeft: { value: new THREE.Color(hasFaceColors ? activePalette.buildingFaceColors!.left : activePalette.buildingMid) },
            uColorFront: { value: new THREE.Color(hasFaceColors ? activePalette.buildingFaceColors!.front : activePalette.buildingMid) },
            uColorBack: { value: new THREE.Color(hasFaceColors ? activePalette.buildingFaceColors!.back : activePalette.buildingDark) },
            
            // 装饰物依然使用天空渐变
            uDecorColorBottom: { value: new THREE.Color(isDecor ? activePalette.skyBottom : activePalette.buildingDark) }, 
            uDecorColorTop: { value: new THREE.Color(isDecor ? activePalette.skyTop : activePalette.buildingLight) },   
            uMinY: { value: sceneHeightRange.minY }, // 动态高度范围
            uMaxY: { value: sceneHeightRange.maxY }, // 动态高度范围
            
            uGoalColor: { value: new THREE.Color(activePalette.goal) },
            uIsGoal: { value: isGoal ? 1.0 : 0.0 },
            uHueOffset: { value: 0 },  // 初始化为 0，稍后动态更新
            uUseMultiColor: { value: hasFaceColors && !isDecor ? 1.0 : 0.0 }  // 是否启用多色系统
        };
    }, [activePalette, isDecor, isGoal, sceneHeightRange]);  // 添加 sceneHeightRange 依赖

    // 动态更新 hueOffset（不触发重新编译）
    useEffect(() => {
        if (uniforms.uHueOffset) {
            uniforms.uHueOffset.value = hueOffset * Math.PI * 2;
        }
    }, [hueOffset, uniforms]);

    const onBeforeCompile = useMemo(() => (shader: any) => {
        // 关键修复：深拷贝 uniform 对象，确保每个 shader 实例都有独立的 uniforms
        // 避免多个方块共享同一个 uniform 引用导致的全局状态污染
        shader.uniforms.uColorLight = { value: uniforms.uColorLight.value.clone() };
        shader.uniforms.uColorMid = { value: uniforms.uColorMid.value.clone() };
        shader.uniforms.uColorDark = { value: uniforms.uColorDark.value.clone() };
        shader.uniforms.uColorTop = { value: uniforms.uColorTop.value.clone() };
        shader.uniforms.uColorBottom = { value: uniforms.uColorBottom.value.clone() };
        shader.uniforms.uColorRight = { value: uniforms.uColorRight.value.clone() };
        shader.uniforms.uColorLeft = { value: uniforms.uColorLeft.value.clone() };
        shader.uniforms.uColorFront = { value: uniforms.uColorFront.value.clone() };
        shader.uniforms.uColorBack = { value: uniforms.uColorBack.value.clone() };
        shader.uniforms.uDecorColorBottom = { value: uniforms.uDecorColorBottom.value.clone() };
        shader.uniforms.uDecorColorTop = { value: uniforms.uDecorColorTop.value.clone() };
        shader.uniforms.uGoalColor = { value: uniforms.uGoalColor.value.clone() };
        shader.uniforms.uMinY = { value: uniforms.uMinY.value };
        shader.uniforms.uMaxY = { value: uniforms.uMaxY.value };
        shader.uniforms.uIsGoal = { value: uniforms.uIsGoal.value };
        shader.uniforms.uHueOffset = { value: uniforms.uHueOffset.value };
        shader.uniforms.uUseMultiColor = { value: uniforms.uUseMultiColor.value };

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

        shader.fragmentShader = `
            uniform vec3 uColorLight;
            uniform vec3 uColorMid;
            uniform vec3 uColorDark;
            uniform vec3 uColorTop;
            uniform vec3 uColorBottom;
            uniform vec3 uColorRight;
            uniform vec3 uColorLeft;
            uniform vec3 uColorFront;
            uniform vec3 uColorBack;
            uniform vec3 uDecorColorBottom;
            uniform vec3 uDecorColorTop;
            uniform float uMinY;
            uniform float uMaxY;
            uniform float uIsGoal;
            uniform vec3 uGoalColor;
            uniform float uHueOffset;
            uniform float uUseMultiColor;
            varying vec3 vWorldPosition;
            varying vec3 vWorldNormal;
            
            ${HUE_SHIFT_GLSL}
            
            // RGB 转 HSL
            vec3 rgb2hsl(vec3 color) {
                float maxColor = max(max(color.r, color.g), color.b);
                float minColor = min(min(color.r, color.g), color.b);
                float delta = maxColor - minColor;
                
                float h = 0.0;
                float s = 0.0;
                float l = (maxColor + minColor) / 2.0;
                
                if (delta > 0.0001) {
                    s = l < 0.5 ? delta / (maxColor + minColor) : delta / (2.0 - maxColor - minColor);
                    
                    if (maxColor == color.r) {
                        h = (color.g - color.b) / delta + (color.g < color.b ? 6.0 : 0.0);
                    } else if (maxColor == color.g) {
                        h = (color.b - color.r) / delta + 2.0;
                    } else {
                        h = (color.r - color.g) / delta + 4.0;
                    }
                    h /= 6.0;
                }
                
                return vec3(h, s, l);
            }
            
            // HSL 转 RGB
            float hue2rgb(float p, float q, float t) {
                if (t < 0.0) t += 1.0;
                if (t > 1.0) t -= 1.0;
                if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
                if (t < 1.0/2.0) return q;
                if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
                return p;
            }
            
            vec3 hsl2rgb(vec3 hsl) {
                float h = hsl.x;
                float s = hsl.y;
                float l = hsl.z;
                
                if (s == 0.0) {
                    return vec3(l);
                }
                
                float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
                float p = 2.0 * l - q;
                
                float r = hue2rgb(p, q, h + 1.0/3.0);
                float g = hue2rgb(p, q, h);
                float b = hue2rgb(p, q, h - 1.0/3.0);
                
                return vec3(r, g, b);
            }
            
            vec3 adjustSaturation(vec3 color, float adjustment) {
                const vec3 W = vec3(0.2125, 0.7154, 0.0721);
                vec3 intensity = vec3(dot(color, W));
                return mix(intensity, color, 1.0 + adjustment);
            }
            
            ${shader.fragmentShader}
        `;

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>
            
            vec3 finalColor;
            
            if (uUseMultiColor > 0.5) {
                // === 纪念碑谷风格：方块间连续渐变 ===
                
                // 步骤1：硬边判断 - 根据法线确定面的基础颜色
                vec3 n = normalize(vWorldNormal);
                vec3 absN = abs(n);
                
                vec3 baseFaceColor;
                
                if (absN.y > absN.x && absN.y > absN.z) {
                    // Y轴主导：顶面或底面
                    if (n.y > 0.0) {
                        baseFaceColor = uColorTop;      // 顶面
                    } else {
                        baseFaceColor = uColorBottom;   // 底面
                    }
                } else if (absN.x > absN.z) {
                    // X轴主导：左面或右面
                    if (n.x > 0.0) {
                        baseFaceColor = uColorRight;    // 右面
                    } else {
                        baseFaceColor = uColorLeft;     // 左面
                    }
                } else {
                    // Z轴主导：前面或后面
                    if (n.z > 0.0) {
                        baseFaceColor = uColorFront;    // 前面
                    } else {
                        baseFaceColor = uColorBack;     // 后面
                    }
                }
                
                // 步骤2：基于方块的全局高度位置，统一调整整个方块的色调
                // 关键：使用 vWorldPosition.y（当前片元的世界Y坐标）
                // 这样相邻方块之间会形成连续渐变
                
                float yRange = uMaxY - uMinY;
                float heightFactor = (vWorldPosition.y - uMinY) / yRange;
                heightFactor = clamp(heightFactor, 0.0, 1.0);
                
                // 平滑曲线
                heightFactor = smoothstep(0.0, 1.0, heightFactor);
                
                // 转换到 HSL 色彩空间进行调整
                vec3 hsl = rgb2hsl(baseFaceColor);
                
                // 色相偏移：高处偏暖（+20度），低处偏冷（-20度）
                const float HUE_SHIFT_AMOUNT = 0.056; // 约20度
                float hueShift = (heightFactor - 0.5) * HUE_SHIFT_AMOUNT;
                hsl.x = fract(hsl.x + hueShift);
                
                // 饱和度调整：高处略降（更柔和），低处略升（更浓郁）
                const float SAT_VARIATION = 0.20;
                hsl.y = clamp(hsl.y + (0.5 - heightFactor) * SAT_VARIATION, 0.1, 1.0);
                
                // 明度调整：高处明亮，低处深沉（更大范围：40%-160%）
                const float BASE_BRIGHTNESS = 0.40;
                const float GRADIENT_INTENSITY = 1.20;
                float brightnessMult = BASE_BRIGHTNESS + heightFactor * GRADIENT_INTENSITY;
                hsl.z = clamp(hsl.z * brightnessMult, 0.05, 0.95);
                
                // 转换回 RGB
                vec3 gradientColor = hsl2rgb(hsl);
                
                // 轻微饱和度提升
                gradientColor = adjustSaturation(gradientColor, 0.10);
                
                // 最终防护
                gradientColor = clamp(gradientColor, 0.0, 1.0);
                
                // 目标方块混合
                finalColor = mix(gradientColor, uGoalColor, uIsGoal * 0.9);
                
            } else {
                // === 装饰物：同样应用全局高度渐变 ===
                float t = smoothstep(uMinY, uMaxY, vWorldPosition.y);
                vec3 gradientColor = mix(uDecorColorBottom, uDecorColorTop, t);
                
                if (abs(uHueOffset) > 0.001) {
                    gradientColor = hueShift(gradientColor, uHueOffset);
                }
                
                gradientColor = adjustSaturation(gradientColor, 0.3);
                finalColor = mix(gradientColor, uGoalColor, uIsGoal * 0.9);
            }
            
            // 最终防过曝
            finalColor = clamp(finalColor, 0.0, 0.98);
            
            diffuseColor.rgb = finalColor;
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `
            #include <emissivemap_fragment>
            
            // 关键修复：完全覆盖 totalEmissiveRadiance，不依赖任何之前的值
            // 这避免了 GPU 缓存、Three.js 内部状态或帧缓冲残留导致的累积效应
            if (uIsGoal > 0.5) {
                totalEmissiveRadiance = diffuseColor.rgb * 0.8;  // 目标点有自发光
            } else {
                totalEmissiveRadiance = vec3(0.0);  // 普通方块强制清零
            }
            `
        );
    }, [uniforms]);

    return { onBeforeCompile };
};

export const LevelGeometry: React.FC<GeometryProps> = ({ type, isGoal }) => {
  const isDecor = type === BlockType.PILLAR || type === BlockType.DECOR || type === BlockType.SPIRE || type === BlockType.WALL || type === BlockType.ROOF;
  const activePalette = useGameStore(s => s.activePalette);
  
  // 使用渐变 shader 代替单色
  const gradientShader = useContinuousGradient(isDecor, isGoal || false);
  
  // Fallback 颜色（如果 shader 未应用）
  const blockColor = isDecor ? activePalette.buildingMid : activePalette.buildingLight;
  const goalColor = activePalette.goal;
  
  // 创建非索引几何体（启用 Flat Shading 的关键）
  // 注意：只为 CUBE 和主要方块类型创建，装饰元素保持原样
  const createNonIndexedGeometry = useMemo(() => {
    if (type === BlockType.CUBE || type === BlockType.FLOOR || type === BlockType.WALL || type === BlockType.STAIR) {
      const geo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
      // 转换为非索引几何体：每个面有独立的顶点和法线
      const nonIndexedGeo = geo.toNonIndexed();
      return nonIndexedGeo;
    }
    return null;
  }, [type]);
  
  // Define geometries for architectural elements
  return (
    <group>
        {/* Standard Walkable Block or Foundation - 纪念碑谷风格：硬边+面内渐变！ */}
        {(type === BlockType.CUBE || type === BlockType.DECOR || type === BlockType.WALL || type === BlockType.FLOOR) && (
             <mesh castShadow receiveShadow>
                {createNonIndexedGeometry ? (
                  <primitive object={createNonIndexedGeometry} attach="geometry" />
                ) : (
                  <boxGeometry args={[1.01, 1.01, 1.01]} />
                )}
                <meshStandardMaterial 
                   color={isGoal ? goalColor : blockColor}
                   roughness={0.7} 
                   metalness={0.1}
                   toneMapped={true}
                   flatShading={false}
                   emissive={isGoal ? goalColor : "#000000"}
                   emissiveIntensity={isGoal ? 0.3 : 0}
                   onBeforeCompile={gradientShader.onBeforeCompile}
                />
             </mesh>
        )}
        
        {/* Stairs - 纪念碑谷风格：硬边+面内渐变！ */}
        {type === BlockType.STAIR && (
             <mesh castShadow receiveShadow>
                 {createNonIndexedGeometry ? (
                   <primitive object={createNonIndexedGeometry} attach="geometry" />
                 ) : (
                   <boxGeometry args={[1.01, 1.01, 1.01]} />
                 )}
                 <meshStandardMaterial 
                    color={isGoal ? goalColor : blockColor}
                    roughness={0.7} 
                    metalness={0.1}
                    toneMapped={true}
                    flatShading={false}
                    emissive={isGoal ? goalColor : "#000000"}
                    emissiveIntensity={isGoal ? 0.3 : 0}
                    onBeforeCompile={gradientShader.onBeforeCompile}
                 />
             </mesh>
        )}

        {/* Decorative Arch - 应用渐变 */}
        {type === BlockType.ARCH && (
            <group>
                <mesh castShadow receiveShadow>
                     <boxGeometry args={[1.01, 1.01, 0.4]} />
                     <meshStandardMaterial 
                       color={blockColor} 
                       roughness={0.7} 
                       metalness={0.1} 
                       toneMapped={true}
                       flatShading={false}
                       onBeforeCompile={gradientShader.onBeforeCompile}
                     />
                </mesh>
                <mesh position={[0, 0, 0]} castShadow receiveShadow>
                    <torusGeometry args={[0.35, 0.15, 8, 16, Math.PI]} />
                    <meshStandardMaterial 
                      color={blockColor} 
                      roughness={0.7} 
                      metalness={0.1} 
                      toneMapped={true}
                      flatShading={false}
                      onBeforeCompile={gradientShader.onBeforeCompile}
                    />
                </mesh>
            </group>
        )}
        
        {/* Classical Pillar - 应用渐变 */}
        {type === BlockType.PILLAR && (
            <group>
                <mesh castShadow receiveShadow>
                    <cylinderGeometry args={[0.3, 0.3, 1.01, 16]} />
                    <meshStandardMaterial 
                      color={blockColor} 
                      roughness={0.7} 
                      metalness={0.1} 
                      toneMapped={true}
                      flatShading={false}
                      onBeforeCompile={gradientShader.onBeforeCompile}
                    />
                </mesh>
                <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.4, 0.35, 0.1, 8]} />
                    <meshStandardMaterial 
                      color={blockColor} 
                      roughness={0.7} 
                      metalness={0.1} 
                      toneMapped={true}
                      flatShading={false}
                      onBeforeCompile={gradientShader.onBeforeCompile}
                    />
                </mesh>
                 <mesh position={[0, -0.45, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.35, 0.4, 0.1, 8]} />
                    <meshStandardMaterial 
                      color={blockColor} 
                      roughness={0.7} 
                      metalness={0.1} 
                      toneMapped={true}
                      flatShading={false}
                      onBeforeCompile={gradientShader.onBeforeCompile}
                    />
                </mesh>
            </group>
        )}
        
        {/* ROOF (Pyramid) */}
        {type === BlockType.ROOF && (
             <mesh castShadow receiveShadow>
                 <coneGeometry args={[0.72, 1.0, 4]} /> 
                 <meshStandardMaterial color={blockColor} roughness={0.7} metalness={0.1} toneMapped={true}/>
             </mesh>
        )}
        
        {/* SLAB (Half Block) */}
        {type === BlockType.SLAB && (
             <mesh castShadow receiveShadow position={[0, -0.25, 0]}>
                 <boxGeometry args={[1.01, 0.5, 1.01]} />
                 <meshStandardMaterial color={blockColor} roughness={0.7} metalness={0.1} toneMapped={true}/>
             </mesh>
        )}

        {/* MORTISE (Concave Socket) */}
        {type === BlockType.MORTISE && (
             <group>
                {/* Top part */}
                <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
                     <boxGeometry args={[1.01, 0.3, 1.01]} />
                     <meshStandardMaterial color={blockColor} roughness={0.7} metalness={0.1} toneMapped={true}/>
                </mesh>
                {/* Bottom part */}
                <mesh position={[0, -0.35, 0]} castShadow receiveShadow>
                     <boxGeometry args={[1.01, 0.3, 1.01]} />
                     <meshStandardMaterial color={blockColor} roughness={0.7} metalness={0.1} toneMapped={true}/>
                </mesh>
                {/* Back wall (at -X) */}
                <mesh position={[-0.35, 0, 0]} castShadow receiveShadow>
                     <boxGeometry args={[0.3, 0.4, 1.01]} />
                     <meshStandardMaterial color={blockColor} roughness={0.7} metalness={0.1} toneMapped={true}/>
                </mesh>
             </group>
        )}

        {/* TENON (Convex Plug) */}
        {type === BlockType.TENON && (
             <group>
                {/* Base Block */}
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[1.01, 1.01, 1.01]} />
                    <meshStandardMaterial color={blockColor} roughness={0.7} metalness={0.1} toneMapped={true}/>
                </mesh>
                {/* Protrusion (pointing +X) */}
                <mesh position={[0.6, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.4, 0.4, 0.4]} />
                    <meshStandardMaterial color={isGoal ? "#ffffff" : "#fbbf24"} roughness={0.6} toneMapped={false}/>
                </mesh>
             </group>
        )}

        {/* LATTICE (Window) */}
        {type === BlockType.LATTICE && (
            <group>
                {/* Frame Top - Walkable */}
                <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
                    <boxGeometry args={[1.01, 0.1, 1.01]} />
                    <meshStandardMaterial color={blockColor} roughness={0.7} metalness={0.1} toneMapped={true}/>
                </mesh>
                {/* Frame Bottom - Walkable */}
                <mesh position={[0, -0.45, 0]} castShadow receiveShadow>
                    <boxGeometry args={[1.01, 0.1, 1.01]} />
                    <meshStandardMaterial color={blockColor} roughness={0.7} metalness={0.1} toneMapped={true}/>
                </mesh>
                {/* Frame Left */}
                <mesh position={[-0.45, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.1, 1.01, 1.01]} />
                    <meshStandardMaterial color={blockColor} roughness={0.7} metalness={0.1} toneMapped={true}/>
                </mesh>
                {/* Frame Right */}
                <mesh position={[0.45, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.1, 1.01, 1.01]} />
                    <meshStandardMaterial color={blockColor} roughness={0.7} metalness={0.1} toneMapped={true}/>
                </mesh>
                {/* Grid Pattern */}
                <group scale={[0.8, 0.8, 1]}>
                    <mesh rotation={[0,0,Math.PI/4]} castShadow receiveShadow>
                        <boxGeometry args={[1.2, 0.05, 0.2]} />
                        <meshStandardMaterial color={blockColor} roughness={0.7} metalness={0.1} toneMapped={true}/>
                    </mesh>
                    <mesh rotation={[0,0,-Math.PI/4]} castShadow receiveShadow>
                        <boxGeometry args={[1.2, 0.05, 0.2]} />
                        <meshStandardMaterial color={blockColor} roughness={0.7} metalness={0.1} toneMapped={true}/>
                    </mesh>
                </group>
            </group>
        )}

        {/* PAVILION ROOF (Chinese Style) */}
        {type === BlockType.PAVILION_ROOF && (
             <group>
                 {/* Main Roof Body */}
                 <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
                     <coneGeometry args={[0.8, 0.6, 4]} /> 
                     <meshStandardMaterial color={blockColor} roughness={0.7} metalness={0.1} toneMapped={true}/>
                 </mesh>
                 {/* Eaves (Curved look via flattened wider cone) */}
                 <mesh castShadow receiveShadow position={[0, -0.1, 0]}>
                     <coneGeometry args={[1.0, 0.3, 4]} />
                     <meshStandardMaterial color={blockColor} roughness={0.7} metalness={0.1} toneMapped={true}/>
                 </mesh>
                 {/* Top Finial */}
                 <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
                     <sphereGeometry args={[0.15]} />
                     <meshStandardMaterial color={isGoal ? "#ffffff" : "#fbbf24"} roughness={0.3} toneMapped={true}/>
                 </mesh>
             </group>
        )}

        {/* Dome (Goal or Decoration) */}
        {type === BlockType.DOME && (
             <group>
                 <mesh position={[0, 0, 0]} castShadow receiveShadow>
                     <cylinderGeometry args={[0.45, 0.45, 0.6, 16]} />
                     <meshStandardMaterial color={blockColor} roughness={0.7} metalness={0.1} toneMapped={true}/>
                 </mesh>
                 <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                     <sphereGeometry args={[0.45, 16, 16, 0, Math.PI * 2, 0, Math.PI/2]} />
                     <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.6} emissive="#fbbf24" emissiveIntensity={0.5} />
                 </mesh>
             </group>
        )}

        {isGoal && (
            <group position={[0, 1.4, 0]}>
                <mesh>
                    <octahedronGeometry args={[0.25, 0]} />
                    <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={4} toneMapped={false} />
                </mesh>
                <pointLight distance={5} intensity={3} color="#ffffff" />
            </group>
        )}
    </group>
  );
};
