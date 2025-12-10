
import React, { useRef, useEffect, useState, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Group } from 'three';
import { useSpring, animated } from '@react-spring/three';
import { useGameStore } from '../store';
import { GroupType, Axis } from '../types';

// 移动类型枚举
enum MoveType {
  WALK = 'WALK',
  CLIMB_UP = 'CLIMB_UP',
  JUMP_DOWN = 'JUMP_DOWN'
}

const PlayerComponent: React.FC = () => {
  const playerNodeId = useGameStore(state => state.playerNodeId);
  const level = useGameStore(state => state.level);
  const groupStates = useGameStore(state => state.groupStates);
  
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<any>(null);
  const [currentMoveType, setCurrentMoveType] = useState<MoveType>(MoveType.WALK);
  
  // 🔧 使用 ref 存储当前位置（不会因为组件重新渲染而丢失）
  const currentPositionRef = useRef<Vector3 | null>(null);
  const hasInitialized = useRef(false);
  
  const [spring, api] = useSpring(() => ({
    position: [0, 0.5, 0],
    config: { tension: 170, friction: 26 }
  }));

  // 🔧 核心：只在 playerNodeId 改变时计算并更新位置
  useEffect(() => {
    // 计算目标位置
    const node = level.nodes.find(n => n.id === playerNodeId);
    if (!node) {
      return;
    }
    
    const state = groupStates[node.groupId];
    let local = new Vector3(...node.localPos);
    
    if (state) {
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
    }
    
    const targetX = local.x;
    const targetY = local.y + 0.5;
    const targetZ = local.z;
    
    // 🔧 初始化：第一次加载时直接设置位置
    if (!hasInitialized.current) {
      currentPositionRef.current = new Vector3(targetX, targetY, targetZ);
      api.start({ position: [targetX, targetY, targetZ], immediate: true });
      hasInitialized.current = true;
      return;
    }
    
    // 🔧 移动动画：从当前位置到目标位置
    const prevPos = currentPositionRef.current;
    if (!prevPos) {
      currentPositionRef.current = new Vector3(targetX, targetY, targetZ);
      api.start({ position: [targetX, targetY, targetZ], immediate: true });
      return;
    }
    
    const heightDiff = targetY - prevPos.y;
    
    // 判断移动类型
    let moveType = MoveType.WALK;
    if (Math.abs(heightDiff) > 0.2) {
      if (heightDiff > 0) {
        moveType = MoveType.CLIMB_UP;
      } else {
        moveType = MoveType.JUMP_DOWN;
      }
    }
    
    setCurrentMoveType(moveType);
    
    // 根据移动类型选择不同的动画
    switch (moveType) {
      case MoveType.WALK:
        api.start({
            to: [
                { position: [targetX, targetY + 0.15, targetZ] },
                { position: [targetX, targetY, targetZ] }
            ],
            config: { duration: 150 }
        });
        break;
        
      case MoveType.CLIMB_UP:
        api.start({
            to: [
                { position: [targetX, targetY - 0.3, targetZ] },
                { position: [targetX, targetY + 0.2, targetZ] },
                { position: [targetX, targetY, targetZ] }
            ],
            config: { duration: 200 }
        });
        break;
        
      case MoveType.JUMP_DOWN:
        const fallHeight = Math.abs(heightDiff);
        api.start({
            to: [
                { position: [prevPos.x, prevPos.y + 0.2, prevPos.z] },
                { position: [targetX, targetY + 0.1, targetZ] },
                { position: [targetX, targetY - 0.1, targetZ] },
                { position: [targetX, targetY, targetZ] }
            ],
            config: { duration: Math.min(300, 150 + fallHeight * 50) }
        });
        break;
    }
    
    // 🔧 更新当前位置
    currentPositionRef.current.set(targetX, targetY, targetZ);
  }, [playerNodeId, api, level.nodes, groupStates]);

  useFrame((state) => {
      if (groupRef.current && bodyRef.current) {
          const t = state.clock.elapsedTime;
          const bodyFloat = Math.sin(t * 3) * 0.05;
          
          bodyRef.current.position.y = bodyFloat;
          
          // 根据移动类型添加不同的身体动画
          if (currentMoveType === MoveType.WALK) {
            bodyRef.current.rotation.y = Math.sin(t * 2) * 0.1;
          } else if (currentMoveType === MoveType.CLIMB_UP) {
            bodyRef.current.rotation.x = Math.sin(t * 4) * 0.05;
            bodyRef.current.rotation.y = Math.sin(t * 2) * 0.05;
          } else if (currentMoveType === MoveType.JUMP_DOWN) {
            bodyRef.current.rotation.z = Math.sin(t * 3) * 0.1;
          } else {
            bodyRef.current.rotation.y = Math.sin(t * 2) * 0.1;
          }
      }
  });

  const position = spring.position as any;
  
  return (
    // @ts-ignore
    <animated.group position={position} ref={groupRef}>
        <group ref={bodyRef}>
            {/* 左腿 - Left Leg (露出在裙摆下方) */}
            <mesh castShadow receiveShadow position={[-0.08, -0.1, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.2, 8]} />
                <meshStandardMaterial color="#000000" />
            </mesh>
            
            {/* 右腿 - Right Leg (露出在裙摆下方) */}
            <mesh castShadow receiveShadow position={[0.08, -0.1, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.2, 8]} />
                <meshStandardMaterial color="#000000" />
            </mesh>

            {/* 裙子 - Skirt: 缩短高度并上移，与头部略有重叠 */}
            <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
                <coneGeometry args={[0.24, 0.4, 16]} />
                <meshStandardMaterial 
                    color="#f472b6" 
                    emissive="#ec4899" 
                    emissiveIntensity={0.4}
                />
            </mesh>
            
            {/* 头部 - Head: 上移以配合裙子重叠 */}
            <mesh castShadow position={[0, 0.7, 0]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshStandardMaterial color="#ffffff" />
            </mesh>
            
            {/* 皇冠 - Crown */}
            <mesh position={[0, 0.88, 0]}>
                <cylinderGeometry args={[0.1, 0.05, 0.1, 8]} />
                <meshStandardMaterial color="#fcd34d" metalness={0.8} roughness={0.2} />
            </mesh>
        </group>
        
        {/* 阴影 - Shadow */}
        <mesh position={[0, -0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.22, 32]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.4} />
        </mesh>
    </animated.group>
  );
};

// 🔧 使用 React.memo 防止父组件重新渲染时 Player 也重新渲染
export const Player = memo(PlayerComponent, (prevProps, nextProps) => {
  // Player 没有 props，所以永远返回 true（不重新渲染）
  return true;
});
