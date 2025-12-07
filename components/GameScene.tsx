
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { MathUtils, Vector3 } from 'three';
import { damp, damp3 } from 'maath/easing';
import { useGesture } from '@use-gesture/react';
import { useGameStore } from '../store';
import { GameStatus } from '../types';
import { World } from './World';

// --- Atmospheric Physics Particles: Runes ---
const Particles: React.FC = () => {
  const count = 60;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hueOffset = useGameStore(s => s.hueOffset);
  const accent = useGameStore(s => s.activePalette.accent);
  
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
      <meshBasicMaterial color={accent} transparent opacity={0.6} />
    </instancedMesh>
  );
};

// --- Camera Rig with Gesture Support ---
const CameraRig: React.FC = () => {
  const { status, cameraZoom, cameraY } = useGameStore();
  const { camera } = useThree();
  const orthoCam = camera as THREE.OrthographicCamera;
  const lookAtTarget = useRef(new Vector3(0, 0, 0));

  useFrame((state, delta) => {
    if (status === GameStatus.IDLE) {
       const t = state.clock.getElapsedTime() * 0.15;
       const radius = 60;
       const targetX = Math.sin(t) * radius;
       const targetZ = Math.cos(t) * radius;
       damp3(orthoCam.position, [targetX, 40, targetZ], 2, delta);
       damp(orthoCam, 'zoom', 35, 2, delta);
       damp3(lookAtTarget.current, [0, 4, 0], 2, delta); 

    } else if (status === GameStatus.PLAYING) {
       // Interpolate to manual control state
       damp3(orthoCam.position, [30, cameraY, 30], 4, delta);
       damp(orthoCam, 'zoom', cameraZoom, 4, delta);
       damp3(lookAtTarget.current, [0, cameraY - 15, 0], 4, delta); // Adjusted lookAt slightly lower
    }
    
    orthoCam.lookAt(lookAtTarget.current);
    orthoCam.updateProjectionMatrix();
  });
  return null;
};

// --- 3D Vector Ocean ---
const DynamicSea: React.FC = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { waterDeep, waterSurface } = useGameStore(s => s.activePalette);
    const hueOffset = useGameStore(s => s.hueOffset);

    // Apply hue shift to uniform colors manually before passing or via GLSL
    // For simplicity, passing hueOffset to shader
    
    const shaderArgs = useMemo(() => ({
        uniforms: {
            uTime: { value: 0 },
            uColorDeep: { value: new THREE.Color(waterDeep) }, 
            uColorSurface: { value: new THREE.Color(waterSurface) },
            uHueOffset: { value: 0 }
        },
        vertexShader: `
            uniform float uTime;
            varying vec3 vViewPosition;
            varying float vWave;
            // Simplex Noise
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
                vec3 pos = position;
                float noiseFreq = 0.03;
                float noiseAmp = 2.0;
                float wave = snoise(vec2(pos.x * noiseFreq + uTime * 0.1, pos.z * noiseFreq + uTime * 0.15));
                pos.y += wave * noiseAmp;
                vWave = pos.y;
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                vViewPosition = -mvPosition.xyz;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 uColorDeep;
            uniform vec3 uColorSurface;
            uniform float uHueOffset;
            varying float vWave;
            varying vec3 vViewPosition;

            vec3 hueShift(vec3 color, float hue) {
                const vec3 k = vec3(0.57735, 0.57735, 0.57735);
                float cosAngle = cos(hue);
                return vec3(color * cosAngle + cross(k, color) * sin(hue) + k * dot(k, color) * (1.0 - cosAngle));
            }

            void main() {
                vec3 fdx = dFdx(vViewPosition);
                vec3 fdy = dFdy(vViewPosition);
                vec3 normal = normalize(cross(fdx, fdy));
                vec3 lightDir = normalize(vec3(0.5, 0.8, 0.5));
                float diff = max(dot(normal, lightDir), 0.0);
                vec3 baseColor = mix(uColorDeep, uColorSurface, smoothstep(-2.0, 2.0, vWave));
                baseColor = hueShift(baseColor, uHueOffset);
                gl_FragColor = vec4(baseColor * (0.6 + 0.4 * diff), 0.9);
            }
        `
    }), []);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
            materialRef.current.uniforms.uHueOffset.value = hueOffset * Math.PI * 2;
        }
    });

    return (
        <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -8, 0]} receiveShadow>
            <planeGeometry args={[300, 300, 128, 128]} />
            <shaderMaterial ref={materialRef} {...shaderArgs} transparent />
        </mesh>
    );
};

// --- Main Scene Wrapper for Gestures ---
const SceneWrapper: React.FC = () => {
    const { status, setCameraZoom, setCameraY } = useGameStore();

    // Attach gestures to window to allow panning over the entire page without capturing issues.
    // When targeting window, useGesture does NOT return a bind function, it handles events internally.
    useGesture({
        onPinch: ({ offset: [d] }) => {
            if (status === GameStatus.PLAYING) setCameraZoom(d / 50); // Factor to control sensitivity
        },
        onDrag: ({ delta: [dx, dy] }) => {
            if (status === GameStatus.PLAYING) setCameraY(dy * 0.1); // Pan vertically
        }
    }, {
        target: window, 
        eventOptions: { passive: false }
    });

    return (
        <Canvas shadows dpr={[1, 2]} style={{touchAction: 'none'}}>
            <DynamicSea />
            <OrthographicCamera makeDefault position={[50, 50, 50]} zoom={30} near={-100} far={300} />
            <CameraRig />
            
            <ambientLight intensity={0.7} />
            <directionalLight 
                position={[30, 50, 20]} intensity={2.0} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001} 
            >
                <orthographicCamera attach="shadow-camera" args={[-50, 50, -50, 50, 0.1, 100]} />
            </directionalLight>
            <directionalLight position={[-30, 20, -30]} intensity={1.2} />
            
            <Particles />

            <group visible={status !== GameStatus.COMPLETED}>
               <World />
            </group>

            <EffectComposer disableNormalPass>
                <Bloom luminanceThreshold={0.7} mipmapBlur intensity={0.4} radius={0.5} />
                <Vignette eskil={false} offset={0.1} darkness={0.3} />
                <SMAA />
            </EffectComposer>
        </Canvas>
    )
}

export const GameScene: React.FC = () => {
  const { activePalette, hueOffset } = useGameStore();
  
  // Apply hue shift to background gradient via CSS filter
  const filterStyle = { filter: `hue-rotate(${hueOffset * 360}deg)` };

  return (
    <div className="w-full h-full absolute top-0 left-0 transition-colors duration-1000" 
         style={{ background: activePalette.bgGradient, ...filterStyle }}>
      <SceneWrapper />
    </div>
  );
};
