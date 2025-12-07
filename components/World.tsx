
import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, MathUtils } from 'three';
import { useGesture } from '@use-gesture/react';
import { useGameStore } from '../store';
import { audioService } from '../services/audio';
import { LevelGeometry } from './LevelGeometry';
import { MechanismGroup } from './Mechanisms';
import { Player } from './Player';

export const World: React.FC = () => {
  const { level, globalRotationIndex, movePlayer, setGlobalRotationIndex, status } = useGameStore();
  const groupRef = useRef<Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRotation = useRef(0);

  const bind = useGesture({
    onDrag: ({ delta: [dx], down, movement: [mx] }) => {
        if (status !== 'PLAYING') return;
        setIsDragging(down);
        if (down) {
            const scale = 0.005;
            const currentBase = globalRotationIndex * (-Math.PI / 2);
            dragRotation.current = currentBase + mx * scale;
            if (groupRef.current) groupRef.current.rotation.y = dragRotation.current;
        }
    },
    onDragEnd: ({ movement: [mx] }) => {
        if (status !== 'PLAYING') return;
        const scale = 0.005;
        const totalRotation = globalRotationIndex * (-Math.PI / 2) + mx * scale;
        const exactIndex = -totalRotation / (Math.PI / 2);
        const snappedIndex = Math.round(exactIndex);
        if (snappedIndex !== globalRotationIndex) audioService.playMechanism('rotate');
        setGlobalRotationIndex(snappedIndex);
        setIsDragging(false);
    }
  });

  const targetRotationY = globalRotationIndex * (-Math.PI / 2);

  useFrame((state, delta) => {
    if (groupRef.current && !isDragging) {
        groupRef.current.rotation.y = MathUtils.damp(
            groupRef.current.rotation.y,
            targetRotationY,
            8,
            delta
        );
    }
  });

  return (
    <group>
      {/* Interaction Plane: Moved FAR DOWN so it does not block clicks on blocks */}
      <mesh {...bind() as any} position={[0, -50, 0]} rotation={[-Math.PI / 2, 0, 0]}>
         <planeGeometry args={[500, 500]} />
         <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <group ref={groupRef} position={[0, -2, 0]}>
            {level.groups.map(group => {
                const groupNodes = level.nodes.filter(n => n.groupId === group.id);
                return (
                    <MechanismGroup key={group.id} groupId={group.id}>
                        {groupNodes.map(node => (
                            <group 
                                key={node.id} 
                                position={node.localPos} 
                                rotation={node.rotation ? [node.rotation[0], node.rotation[1], node.rotation[2]] : [0,0,0]}
                                onClick={(e) => { 
                                    e.stopPropagation(); // CRITICAL: Stop event from hitting drag plane
                                    movePlayer(node.id); 
                                }}
                            >
                                <LevelGeometry type={node.type} isGoal={node.isGoal} />
                            </group>
                        ))}
                    </MechanismGroup>
                )
            })}
            <Player />
      </group>
    </group>
  );
};
