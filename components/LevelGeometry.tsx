
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

    // 创建稳定的 uniforms 引用（只在 palette 变化时重建）
    const uniforms = useMemo(() => ({
        // 三色系统
        uColorLight: { value: new THREE.Color(activePalette.buildingLight) },
        uColorMid: { value: new THREE.Color(activePalette.buildingMid) },
        uColorDark: { value: new THREE.Color(activePalette.buildingDark) },
        
        // 装饰物依然使用天空渐变
        uColorBottom: { value: new THREE.Color(isDecor ? activePalette.skyBottom : activePalette.buildingDark) }, 
        uColorTop: { value: new THREE.Color(isDecor ? activePalette.skyTop : activePalette.buildingLight) },   
        uMinY: { value: -10.0 },
        uMaxY: { value: 90.0 }, 
        
        uGoalColor: { value: new THREE.Color(activePalette.goal) },
        uIsGoal: { value: isGoal ? 1.0 : 0.0 },
        uHueOffset: { value: 0 },  // 初始化为 0，稍后动态更新
        uUseTriColor: { value: isDecor ? 0.0 : 1.0 }
    }), [activePalette, isDecor, isGoal]);  // 移除 hueOffset 依赖

    // 动态更新 hueOffset（不触发重新编译）
    useEffect(() => {
        if (uniforms.uHueOffset) {
            uniforms.uHueOffset.value = hueOffset * Math.PI * 2;
        }
    }, [hueOffset, uniforms]);

    const onBeforeCompile = useMemo(() => (shader: any) => {
        Object.assign(shader.uniforms, uniforms);

        shader.vertexShader = `
            varying vec3 vWorldPosition;
            ${shader.vertexShader}
        `;

        shader.vertexShader = shader.vertexShader.replace(
            '#include <worldpos_vertex>',
            `
            #include <worldpos_vertex>
            vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
            `
        );

        shader.fragmentShader = `
            uniform vec3 uColorLight;
            uniform vec3 uColorMid;
            uniform vec3 uColorDark;
            uniform vec3 uColorBottom;
            uniform vec3 uColorTop;
            uniform float uMinY;
            uniform float uMaxY;
            uniform float uIsGoal;
            uniform vec3 uGoalColor;
            uniform float uHueOffset;
            uniform float uUseTriColor;
            varying vec3 vWorldPosition;
            
            ${HUE_SHIFT_GLSL}
            
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
            
            if (uUseTriColor > 0.5) {
                // === Monument Valley 三色着色法（改进版：平滑过渡）===
                // 光源方向：右上前方（模拟经典45度光照）
                vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
                
                // 计算法线与光源的夹角
                float NdotL = dot(normalize(vNormal), lightDir);
                
                // 使用 smoothstep 实现平滑的三色过渡（消除层纹）
                float lightWeight = smoothstep(0.2, 0.5, NdotL);      // 亮色权重
                float darkWeight = smoothstep(-0.1, -0.4, NdotL);     // 暗色权重
                
                // 三色混合：暗 -> 中 -> 亮
                vec3 baseColor = mix(
                    mix(uColorDark, uColorMid, 1.0 - darkWeight),  // 暗到中
                    uColorLight,                                     // 中到亮
                    lightWeight
                );
                
                // Apply Hue Shift (if needed)
                baseColor = hueShift(baseColor, uHueOffset);
                
                // 轻微饱和度提升（保持色彩纯净）
                baseColor = adjustSaturation(baseColor, 0.15);
                
                // 激进防过曝：强制将颜色限制在安全范围
                // 1. 限制最大RGB分量
                float maxComponent = max(max(baseColor.r, baseColor.g), baseColor.b);
                if (maxComponent > 0.85) {
                    baseColor *= (0.85 / maxComponent);  // 从 0.95 降至 0.85
                }
                
                // 2. 进一步降低整体亮度（Tone Down）
                baseColor *= 0.92;  // 全局降低 8%
                
                finalColor = mix(baseColor, uGoalColor, uIsGoal * 0.9);
            } else {
                // === 装饰物保留原有渐变 ===
                float t = smoothstep(uMinY, uMaxY, vWorldPosition.y);
                vec3 gradientColor = mix(uColorBottom, uColorTop, t);
                gradientColor = hueShift(gradientColor, uHueOffset);
                gradientColor = adjustSaturation(gradientColor, 0.5);
                finalColor = mix(gradientColor, uGoalColor, uIsGoal * 0.9);
            }
            
            diffuseColor.rgb = finalColor;
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `
            #include <emissivemap_fragment>
            // 赋值而不是累加，避免逐帧累积
            if (uIsGoal > 0.5) {
                totalEmissiveRadiance = diffuseColor.rgb * 0.8;  // 目标点有明显发光
            }
            // 普通方块无自发光（totalEmissiveRadiance 保持为 0）
            `
        );
    }, [uniforms]);

    return { onBeforeCompile };
};

export const LevelGeometry: React.FC<GeometryProps> = ({ type, isGoal }) => {
  const isDecor = type === BlockType.PILLAR || type === BlockType.DECOR || type === BlockType.SPIRE || type === BlockType.WALL || type === BlockType.ROOF;
  const { onBeforeCompile } = useContinuousGradient(isDecor, !!isGoal);

  // Define geometries for architectural elements
  return (
    <group>
        {/* Standard Walkable Block or Foundation */}
        {(type === BlockType.CUBE || type === BlockType.DECOR || type === BlockType.WALL || type === BlockType.FLOOR) && (
             <mesh castShadow receiveShadow>
                <boxGeometry args={[1.01, 1.01, 1.01]} />
                <meshStandardMaterial 
                   roughness={0.3} 
                   metalness={0.05}
                   onBeforeCompile={onBeforeCompile}
                   toneMapped={true}
                />
             </mesh>
        )}
        
        {/* Stairs */}
        {type === BlockType.STAIR && (
             <mesh castShadow receiveShadow>
                 {/* Visual ramp but logical block */}
                 <boxGeometry args={[1.01, 1.01, 1.01]} /> 
                 {/* Ideally this would be a ramp geometry, keeping box for simplicity of seamless shader */}
                 <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
             </mesh>
        )}

        {/* Decorative Arch */}
        {type === BlockType.ARCH && (
            <group>
                <mesh castShadow receiveShadow>
                     <boxGeometry args={[1.01, 1.01, 0.4]} />
                     <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
                </mesh>
                <mesh position={[0, 0, 0]} castShadow receiveShadow>
                    <torusGeometry args={[0.35, 0.15, 8, 16, Math.PI]} />
                    <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
                </mesh>
            </group>
        )}
        
        {/* Classical Pillar */}
        {type === BlockType.PILLAR && (
            <group>
                <mesh castShadow receiveShadow>
                    <cylinderGeometry args={[0.3, 0.3, 1.01, 16]} />
                    <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
                </mesh>
                {/* Capital/Base */}
                <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.4, 0.35, 0.1, 8]} />
                    <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
                </mesh>
                 <mesh position={[0, -0.45, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.35, 0.4, 0.1, 8]} />
                    <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
                </mesh>
            </group>
        )}
        
        {/* ROOF (Pyramid) */}
        {type === BlockType.ROOF && (
             <mesh castShadow receiveShadow>
                 <coneGeometry args={[0.72, 1.0, 4]} /> 
                 <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
             </mesh>
        )}
        
        {/* SLAB (Half Block) */}
        {type === BlockType.SLAB && (
             <mesh castShadow receiveShadow position={[0, -0.25, 0]}>
                 <boxGeometry args={[1.01, 0.5, 1.01]} />
                 <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
             </mesh>
        )}

        {/* MORTISE (Concave Socket) */}
        {type === BlockType.MORTISE && (
             <group>
                {/* Top part */}
                <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
                     <boxGeometry args={[1.01, 0.3, 1.01]} />
                     <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
                </mesh>
                {/* Bottom part */}
                <mesh position={[0, -0.35, 0]} castShadow receiveShadow>
                     <boxGeometry args={[1.01, 0.3, 1.01]} />
                     <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
                </mesh>
                {/* Back wall (at -X) */}
                <mesh position={[-0.35, 0, 0]} castShadow receiveShadow>
                     <boxGeometry args={[0.3, 0.4, 1.01]} />
                     <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
                </mesh>
             </group>
        )}

        {/* TENON (Convex Plug) */}
        {type === BlockType.TENON && (
             <group>
                {/* Base Block */}
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[1.01, 1.01, 1.01]} />
                    <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
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
                    <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
                </mesh>
                {/* Frame Bottom - Walkable */}
                <mesh position={[0, -0.45, 0]} castShadow receiveShadow>
                    <boxGeometry args={[1.01, 0.1, 1.01]} />
                    <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
                </mesh>
                {/* Frame Left */}
                <mesh position={[-0.45, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.1, 1.01, 1.01]} />
                    <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
                </mesh>
                {/* Frame Right */}
                <mesh position={[0.45, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.1, 1.01, 1.01]} />
                    <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
                </mesh>
                {/* Grid Pattern */}
                <group scale={[0.8, 0.8, 1]}>
                    <mesh rotation={[0,0,Math.PI/4]} castShadow receiveShadow>
                        <boxGeometry args={[1.2, 0.05, 0.2]} />
                        <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
                    </mesh>
                    <mesh rotation={[0,0,-Math.PI/4]} castShadow receiveShadow>
                        <boxGeometry args={[1.2, 0.05, 0.2]} />
                        <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
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
                     <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
                 </mesh>
                 {/* Eaves (Curved look via flattened wider cone) */}
                 <mesh castShadow receiveShadow position={[0, -0.1, 0]}>
                     <coneGeometry args={[1.0, 0.3, 4]} />
                     <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
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
                     <meshStandardMaterial roughness={0.3} onBeforeCompile={onBeforeCompile} toneMapped={true}/>
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
