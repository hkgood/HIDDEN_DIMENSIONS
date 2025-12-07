
import React, { useMemo } from 'react';
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

    const uniforms = useMemo(() => ({
        uColorBottom: { value: new THREE.Color(isDecor ? activePalette.skyBottom : activePalette.blockBottom) }, 
        uColorTop: { value: new THREE.Color(isDecor ? activePalette.skyTop : activePalette.blockTop) },   
        uMinY: { value: -10.0 },
        uMaxY: { value: 90.0 }, 
        uGoalColor: { value: new THREE.Color(activePalette.goal) },
        uIsGoal: { value: isGoal ? 1.0 : 0.0 },
        uHueOffset: { value: hueOffset * Math.PI * 2 }
    }), [activePalette, isDecor, isGoal, hueOffset]);

    const onBeforeCompile = useMemo(() => (shader: THREE.Shader) => {
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
            uniform vec3 uColorBottom;
            uniform vec3 uColorTop;
            uniform float uMinY;
            uniform float uMaxY;
            uniform float uIsGoal;
            uniform vec3 uGoalColor;
            uniform float uHueOffset;
            varying vec3 vWorldPosition;
            
            ${HUE_SHIFT_GLSL}
            
            ${shader.fragmentShader}
        `;

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>
            float t = smoothstep(uMinY, uMaxY, vWorldPosition.y);
            vec3 gradientColor = mix(uColorBottom, uColorTop, t);
            
            // Apply Random Hue Shift
            gradientColor = hueShift(gradientColor, uHueOffset);
            
            vec3 finalColor = mix(gradientColor, uGoalColor, uIsGoal * 0.9);
            
            diffuseColor.rgb = finalColor;
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `
            #include <emissivemap_fragment>
            float glow = 0.5 + 0.5 * smoothstep(uMinY, uMaxY, vWorldPosition.y);
            float intensity = uIsGoal > 0.5 ? 3.0 : (0.8 * glow);
            totalEmissiveRadiance += diffuseColor.rgb * intensity;
            `
        );
    }, [uniforms]);

    return { onBeforeCompile };
};

export const LevelGeometry: React.FC<GeometryProps> = ({ type, isGoal }) => {
  const isDecor = type === BlockType.PILLAR || type === BlockType.DECOR || type === BlockType.SPIRE || type === BlockType.WALL;
  const { onBeforeCompile } = useContinuousGradient(isDecor, !!isGoal);

  // Define geometries for architectural elements
  return (
    <group>
        {/* Standard Walkable Block or Foundation */}
        {(type === BlockType.CUBE || type === BlockType.DECOR || type === BlockType.WALL || type === BlockType.FLOOR) && (
             <mesh castShadow receiveShadow>
                <boxGeometry args={[1.01, 1.01, 1.01]} />
                <meshStandardMaterial 
                   roughness={0.2} 
                   metalness={0.1}
                   onBeforeCompile={onBeforeCompile}
                   toneMapped={false}
                />
             </mesh>
        )}

        {/* Decorative Arch */}
        {type === BlockType.ARCH && (
            <group>
                {/* Frame */}
                <mesh castShadow receiveShadow>
                     <boxGeometry args={[1.01, 1.01, 0.4]} />
                     <meshStandardMaterial roughness={0.2} onBeforeCompile={onBeforeCompile} toneMapped={false}/>
                </mesh>
                <mesh position={[0, 0, 0]} castShadow receiveShadow>
                    <torusGeometry args={[0.35, 0.15, 8, 16, Math.PI]} />
                    <meshStandardMaterial roughness={0.2} onBeforeCompile={onBeforeCompile} toneMapped={false}/>
                </mesh>
            </group>
        )}
        
        {/* Classical Pillar */}
        {type === BlockType.PILLAR && (
            <group>
                <mesh castShadow receiveShadow>
                    <cylinderGeometry args={[0.3, 0.3, 1.01, 16]} />
                    <meshStandardMaterial roughness={0.2} onBeforeCompile={onBeforeCompile} toneMapped={false}/>
                </mesh>
                {/* Capital/Base */}
                <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.4, 0.35, 0.1, 8]} />
                    <meshStandardMaterial roughness={0.2} onBeforeCompile={onBeforeCompile} toneMapped={false}/>
                </mesh>
                 <mesh position={[0, -0.45, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.35, 0.4, 0.1, 8]} />
                    <meshStandardMaterial roughness={0.2} onBeforeCompile={onBeforeCompile} toneMapped={false}/>
                </mesh>
            </group>
        )}

        {/* Dome (Goal or Decoration) */}
        {type === BlockType.DOME && (
             <group>
                 <mesh position={[0, 0, 0]} castShadow receiveShadow>
                     <cylinderGeometry args={[0.45, 0.45, 0.6, 16]} />
                     <meshStandardMaterial roughness={0.2} onBeforeCompile={onBeforeCompile} toneMapped={false}/>
                 </mesh>
                 <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                     <sphereGeometry args={[0.45, 16, 16, 0, Math.PI * 2, 0, Math.PI/2]} />
                     <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.2} emissive="#fbbf24" emissiveIntensity={0.5} />
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
