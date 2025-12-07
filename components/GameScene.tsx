
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { MathUtils, Vector3 } from 'three';
import { damp, damp3 } from 'maath/easing';
import { useGameStore } from '../store';
import { GameStatus } from '../types';
import { World } from './World';

// --- Atmospheric Physics Particles: Runes ---
const Particles: React.FC = () => {
  const count = 60;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const factor = 20 + Math.random() * 100;
      const speed = 0.005 + Math.random() * 0.01;
      const xFactor = -50 + Math.random() * 100;
      const yFactor = -20 + Math.random() * 40;
      const zFactor = -50 + Math.random() * 100;
      temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: 0, my: 0 });
    }
    return temp;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    particles.forEach((particle, i) => {
      let { t, factor, speed, xFactor, yFactor, zFactor } = particle;
      t = particle.t += speed;
      const s = Math.cos(t);
      
      dummy.position.set(
        xFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
        yFactor + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10,
        zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10
      );
      dummy.scale.setScalar(s * 0.3 + 0.5);
      dummy.rotation.set(s * 5, s * 5, s * 5);
      dummy.updateMatrix();
      
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <octahedronGeometry args={[0.05, 0]} />
      <meshBasicMaterial color="#fcd34d" transparent opacity={0.6} />
    </instancedMesh>
  );
};

// --- Camera Rig ---
const CameraRig: React.FC = () => {
  const { status } = useGameStore();
  const { camera } = useThree();
  const orthoCam = camera as THREE.OrthographicCamera;
  
  const lookAtTarget = useRef(new Vector3(0, 0, 0));

  useFrame((state, delta) => {
    if (status === GameStatus.IDLE) {
       const t = state.clock.getElapsedTime() * 0.15;
       const radius = 60;
       
       const targetX = Math.sin(t) * radius;
       const targetZ = Math.cos(t) * radius;
       const targetY = 35 + Math.sin(t * 0.5) * 5;
       
       damp3(orthoCam.position, [targetX, targetY, targetZ], 2, delta);
       damp(orthoCam, 'zoom', 35, 2, delta);
       damp3(lookAtTarget.current, [0, 4, 0], 2, delta); 

    } else if (status === GameStatus.PLAYING) {
       // Isometric view locked to perfect diagonal
       damp3(orthoCam.position, [30, 30, 30], 3, delta);
       damp(orthoCam, 'zoom', 35, 3, delta);
       damp3(lookAtTarget.current, [0, 2, 0], 4, delta);

    } else if (status === GameStatus.COMPLETED) {
       damp3(orthoCam.position, [0, 80, 0], 1.5, delta);
       damp(orthoCam, 'zoom', 15, 1.5, delta);
    }
    
    orthoCam.lookAt(lookAtTarget.current);
    orthoCam.updateProjectionMatrix();
  });

  return null;
};

// --- Dynamic Low-Poly Ocean ---
const DynamicSea: React.FC = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const shaderArgs = useMemo(() => ({
        uniforms: {
            uTime: { value: 0 },
            uColorDeep: { value: new THREE.Color("#4c1d95") }, // Deep Violet
            uColorSurface: { value: new THREE.Color("#be185d") } // Pink/Red
        },
        vertexShader: `
            uniform float uTime;
            varying float vWave;
            varying vec2 vUv;
            
            // Simplex noise function
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy) );
                vec2 x0 = v - i + dot(i, C.xx);
                vec2 i1;
                i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod289(i);
                vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m ;
                m = m*m ;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                vec3 g;
                g.x  = a0.x  * x0.x  + h.x  * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            void main() {
                vUv = uv;
                vec3 pos = position;
                
                float noiseFreq = 0.05;
                float noiseAmp = 1.5;
                float noise = snoise(vec2(pos.x * noiseFreq + uTime * 0.1, pos.z * noiseFreq + uTime * 0.1));
                
                pos.y += noise * noiseAmp;
                vWave = pos.y;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uColorDeep;
            uniform vec3 uColorSurface;
            varying float vWave;
            
            void main() {
                float mixFactor = smoothstep(-2.0, 2.0, vWave);
                vec3 color = mix(uColorDeep, uColorSurface, mixFactor);
                
                // Add stylized specular highlight
                float highlight = smoothstep(1.8, 2.0, vWave);
                color = mix(color, vec3(1.0, 0.8, 0.9), highlight * 0.3);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `
    }), []);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
    });

    return (
        <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -8, 0]} receiveShadow>
            <planeGeometry args={[300, 300, 64, 64]} />
            <shaderMaterial ref={materialRef} {...shaderArgs} wireframe={false} />
        </mesh>
    );
};

export const GameScene: React.FC = () => {
  const { status } = useGameStore();
  
  return (
    <div className="w-full h-full absolute top-0 left-0 bg-[#2e1065]">
      <Canvas shadows dpr={[1, 2]}>
        <DynamicSea />
        
        <OrthographicCamera 
            makeDefault 
            position={[50, 50, 50]} 
            zoom={20} 
            near={-100} 
            far={300}
        />
        <CameraRig />

        <ambientLight intensity={0.6} color="#e9d5ff" />
        
        {/* Main Sun */}
        <directionalLight 
            position={[30, 50, 20]} 
            intensity={2.5} 
            castShadow 
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0001}
            color="#fbcfe8" 
        >
            <orthographicCamera attach="shadow-camera" args={[-50, 50, -50, 50, 0.1, 100]} />
        </directionalLight>
        
        {/* Fill Light (Purple/Blue) */}
        <directionalLight position={[-30, 20, -30]} intensity={1.5} color="#818cf8" />
        
        <Particles />

        <group visible={status !== GameStatus.COMPLETED}>
           <World />
        </group>

        <EffectComposer disableNormalPass>
            <Bloom 
                luminanceThreshold={0.7} 
                mipmapBlur 
                intensity={0.5} 
                radius={0.6} 
            />
            <Vignette eskil={false} offset={0.1} darkness={0.4} />
            <SMAA />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
