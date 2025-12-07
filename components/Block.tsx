import React from 'react';
import { Vector3 } from 'three';
import { Edges } from '@react-three/drei';
import '../types';

interface BlockProps {
  position: [number, number, number];
  isGoal?: boolean;
  onClick?: () => void;
  isWalkable: boolean;
}

export const Block: React.FC<BlockProps> = ({ position, isGoal, onClick }) => {
  // Pastel colors based on block type
  const color = isGoal ? '#FDFD96' : '#FFD1DC'; // Yellow for goal, Pink for path
  
  return (
    <group position={new Vector3(...position)}>
      <mesh onClick={(e) => { e.stopPropagation(); onClick?.(); }} receiveShadow castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.8}
          metalness={0.1}
        />
        {/* Adds the comic/outline style */}
        <Edges color="#aaa" threshold={15} />
      </mesh>
      
      {/* Decorative smaller block below to give "floating" feel if needed */}
      <mesh position={[0, -0.5, 0]} scale={[0.8, 0.1, 0.8]} receiveShadow>
         <boxGeometry args={[1, 1, 1]} />
         <meshStandardMaterial color="#c0a0b0" />
      </mesh>
    </group>
  );
};