
import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Group } from 'three';
import { useSpring, animated } from '@react-spring/three';
import { useGameStore } from '../store';
import { GroupType, Axis } from '../types';

export const Player: React.FC = () => {
  const { playerNodeId, level, groupStates } = useGameStore();
  const groupRef = useRef<Group>(null);
  
  // Calculate Target Logic
  const node = level.nodes.find(n => n.id === playerNodeId);
  
  const getDynamicPosition = () => {
      // Default to 0,0,0 if node not found to prevent crash, but should not happen
      if (!node) return new Vector3(0, 0, 0); 

      const state = groupStates[node.groupId];
      if (!state) return new Vector3(...node.localPos);

      const local = new Vector3(...node.localPos);

      if (state.type === GroupType.ROTATOR && state.pivot) {
        const pivot = new Vector3(...state.pivot);
        local.sub(pivot);
        local.applyAxisAngle(new Vector3(0, 1, 0), state.rotationValue * (Math.PI / 2)); 
        local.add(pivot);
      }

      if (state.type === GroupType.SLIDER && state.axis) {
        const axisVec = new Vector3(
           state.axis === Axis.X ? 1 : 0,
           state.axis === Axis.Y ? 1 : 0,
           state.axis === Axis.Z ? 1 : 0
        );
        local.add(axisVec.multiplyScalar(state.offsetValue));
      }

      local.add(new Vector3(...state.initialPos));
      return local;
  }

  const targetPos = getDynamicPosition();
  const [spring, api] = useSpring(() => ({
    position: [targetPos.x, targetPos.y + 0.5, targetPos.z],
    config: { tension: 170, friction: 26 }
  }));

  useEffect(() => {
    // Animate to new position
    // Add a small hop in Y
    const x = targetPos.x;
    const y = targetPos.y + 0.5;
    const z = targetPos.z;
    
    api.start({
        to: [
            { position: [x, y + 0.4, z] }, // Hop up
            { position: [x, y, z] }        // Land
        ],
        config: { duration: 150 }
    });
  }, [playerNodeId, groupStates, api]); // Update when player moves or group moves

  useFrame((state) => {
      if(groupRef.current) {
          // Idle floating
          const t = state.clock.elapsedTime;
          groupRef.current.children[0].position.y = Math.sin(t * 3) * 0.05;
      }
  });

  return (
    <animated.group position={spring.position as any} ref={groupRef}>
        <group>
            {/* Body: Cone */}
            <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
                <coneGeometry args={[0.2, 0.6, 16]} />
                <meshStandardMaterial color="#f472b6" emissive="#be185d" emissiveIntensity={0.2} />
            </mesh>
            {/* Head: Sphere */}
            <mesh castShadow position={[0, 0.7, 0]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshStandardMaterial color="#ffffff" />
            </mesh>
             {/* Crown */}
             <mesh position={[0, 0.88, 0]}>
                 <cylinderGeometry args={[0.1, 0.05, 0.1, 8]} />
                 <meshStandardMaterial color="#fcd34d" metalness={0.8} roughness={0.2} />
             </mesh>
        </group>
        {/* Shadow */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.2, 32]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.4} />
        </mesh>
    </animated.group>
  );
};
