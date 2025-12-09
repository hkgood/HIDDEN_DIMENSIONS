
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
import { PolyOcean } from './PolyOcean';

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

// --- Main Scene Wrapper for Gestures ---
const SceneWrapper: React.FC = () => {
    const { status, setCameraZoom } = useGameStore();

    // Attach gestures to window to allow panning over the entire page without capturing issues.
    // When targeting window, useGesture does NOT return a bind function, it handles events internally.
    useGesture({
        onPinch: ({ offset: [d] }) => {
            if (status === GameStatus.PLAYING) setCameraZoom(d / 50); // Factor to control sensitivity
        }
    }, {
        target: window, 
        eventOptions: { passive: false }
    });

    return (
        <Canvas shadows dpr={[1, 2]} style={{touchAction: 'none'}}>
            <PolyOcean />
            <OrthographicCamera makeDefault position={[50, 50, 50]} zoom={30} near={-100} far={300} />
            <CameraRig />
            
            <ambientLight intensity={0.5} />
            <directionalLight 
                position={[30, 50, 20]} intensity={1.1} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001} 
            >
                <orthographicCamera attach="shadow-camera" args={[-50, 50, -50, 50, 0.1, 100]} />
            </directionalLight>
            <directionalLight position={[-30, 20, -30]} intensity={0.8} />
            
            <Particles />

            {/* 世界场景：只在游戏进行时显示 - World only visible during gameplay */}
            <group visible={status === GameStatus.PLAYING}>
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
