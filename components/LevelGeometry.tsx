
import React, { useMemo } from 'react';
import { BlockType } from '../types';
import * as THREE from 'three';

// --- VISUAL OVERHAUL: Continuous World Gradient + GLOW + SEAMLESS ---
// Blocks color themselves based on their world Y position and emit light.
// Edges removed by using standard boxGeometry.

interface GeometryProps {
  type: BlockType;
  isGoal?: boolean;
}

// Custom hook to modify standard material
const useContinuousGradient = (isDecor: boolean, isGoal: boolean) => {
    const uniforms = useMemo(() => ({
        uColorBottom: { value: new THREE.Color(isDecor ? "#1e1b4b" : "#4c1d95") }, // Dark Violet
        uColorTop: { value: new THREE.Color(isDecor ? "#4338ca" : "#22d3ee") },   // Cyan/Blue
        uMinY: { value: -5.0 },
        uMaxY: { value: 12.0 },
        uGoalColor: { value: new THREE.Color("#fbbf24") },
        uIsGoal: { value: isGoal ? 1.0 : 0.0 }
    }), [isDecor, isGoal]);

    const onBeforeCompile = useMemo(() => (shader: THREE.Shader) => {
        shader.uniforms.uColorBottom = uniforms.uColorBottom;
        shader.uniforms.uColorTop = uniforms.uColorTop;
        shader.uniforms.uMinY = uniforms.uMinY;
        shader.uniforms.uMaxY = uniforms.uMaxY;
        shader.uniforms.uGoalColor = uniforms.uGoalColor;
        shader.uniforms.uIsGoal = uniforms.uIsGoal;

        // Inject uniform definitions
        shader.vertexShader = `
            varying vec3 vWorldPosition;
            ${shader.vertexShader}
        `;

        // Capture world position in vertex shader
        shader.vertexShader = shader.vertexShader.replace(
            '#include <worldpos_vertex>',
            `
            #include <worldpos_vertex>
            vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
            `
        );

        // Inject uniforms in fragment shader
        shader.fragmentShader = `
            uniform vec3 uColorBottom;
            uniform vec3 uColorTop;
            uniform float uMinY;
            uniform float uMaxY;
            uniform float uIsGoal;
            uniform vec3 uGoalColor;
            varying vec3 vWorldPosition;
            ${shader.fragmentShader}
        `;

        // Override color calculation
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>
            float t = smoothstep(uMinY, uMaxY, vWorldPosition.y);
            vec3 gradientColor = mix(uColorBottom, uColorTop, t);
            
            // Apply goal override
            vec3 finalColor = mix(gradientColor, uGoalColor, uIsGoal * 0.8);
            
            diffuseColor.rgb = finalColor;
            `
        );

        // Inject Emissive Logic for Glow
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `
            #include <emissivemap_fragment>
            // Glow intensity varies by height and type
            float glow = 0.5 + 0.5 * smoothstep(uMinY, uMaxY, vWorldPosition.y);
            float intensity = uIsGoal > 0.5 ? 2.0 : (0.4 * glow);
            
            totalEmissiveRadiance += diffuseColor.rgb * intensity;
            `
        );
    }, [uniforms]);

    return { onBeforeCompile };
};

export const LevelGeometry: React.FC<GeometryProps> = ({ type, isGoal }) => {
  const isDecor = type === BlockType.PILLAR || type === BlockType.DECOR || type === BlockType.SPIRE;
  const { onBeforeCompile } = useContinuousGradient(isDecor, !!isGoal);

  return (
    <group>
        {/* Main Block Body - SEAMLESS (No RoundedBox) */}
        <mesh castShadow receiveShadow>
             <boxGeometry args={[1, 1, 1]} />
             <meshStandardMaterial 
                roughness={0.1} 
                metalness={0.2}
                onBeforeCompile={onBeforeCompile}
                toneMapped={false} // Allow colors to exceed 1.0 for Bloom
             />
        </mesh>

        {/* Walkable Top Highlight (Optional, keeps path clear) */}
        {!isDecor && !isGoal && (
             <mesh position={[0, 0.501, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
                <planeGeometry args={[0.9, 0.9]} />
                <meshStandardMaterial 
                    color="#ffffff" 
                    transparent 
                    opacity={0.1}
                    roughness={0.1} 
                />
            </mesh>
        )}

        {/* Architectural Details based on Type */}
        {type === BlockType.ARCH && (
            <mesh position={[0, 0, 0.2]}>
                <boxGeometry args={[0.6, 0.8, 0.82]} />
                <meshStandardMaterial color="#1e1b4b" />
            </mesh>
        )}
        
        {type === BlockType.DOME && (
             <mesh position={[0, 0.5, 0]}>
                 <sphereGeometry args={[0.45, 16, 16, 0, Math.PI * 2, 0, Math.PI/2]} />
                 <meshStandardMaterial color="#fcd34d" metalness={0.6} roughness={0.2} emissive="#fcd34d" emissiveIntensity={0.5} />
             </mesh>
        )}

        {type === BlockType.SPIRE && (
             <mesh position={[0, 1, 0]} castShadow>
                 <coneGeometry args={[0.3, 1, 4]} />
                 <meshStandardMaterial color="#4338ca" metalness={0.5} roughness={0.2} />
             </mesh>
        )}
        
        {isGoal && (
            <group position={[0, 1.2, 0]}>
                <mesh>
                    <octahedronGeometry args={[0.3, 0]} />
                    <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={3} toneMapped={false} />
                </mesh>
                <pointLight distance={5} intensity={3} color="#fbbf24" />
            </group>
        )}
    </group>
  );
};
