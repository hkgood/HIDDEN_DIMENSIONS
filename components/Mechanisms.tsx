import React, { useRef, useState, useMemo } from 'react';
import { Group, Vector3, MathUtils } from 'three';
import { useSpring, animated } from '@react-spring/three';
import { useGesture } from '@use-gesture/react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store';
import { GroupType, Axis } from '../types';

// --- Physics Decoration: Hanging Lantern ---
const PhysicsDangler: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    const groupRef = useRef<Group>(null);
    const ropeRef = useRef<Group>(null);
    const previousWorldPos = useRef(new Vector3());
    const velocity = useRef(new Vector3());
    const angle = useRef({ x: 0, z: 0 });

    useFrame((state, delta) => {
        if (!groupRef.current || !ropeRef.current) return;

        const currentWorldPos = new Vector3();
        groupRef.current.getWorldPosition(currentWorldPos);
        
        const disp = currentWorldPos.clone().sub(previousWorldPos.current);
        const vel = disp.multiplyScalar(1/delta);
        
        velocity.current.lerp(vel, delta * 5);
        previousWorldPos.current.copy(currentWorldPos);

        const targetAngleX = velocity.current.z * 0.1; 
        const targetAngleZ = -velocity.current.x * 0.1; 

        angle.current.x = MathUtils.damp(angle.current.x, targetAngleX, 2, delta);
        angle.current.z = MathUtils.damp(angle.current.z, targetAngleZ, 2, delta);

        const time = state.clock.elapsedTime;
        const windX = Math.sin(time * 2) * 0.05;
        const windZ = Math.cos(time * 1.5) * 0.05;

        ropeRef.current.rotation.x = angle.current.x + windX;
        ropeRef.current.rotation.z = angle.current.z + windZ;
    });

    return (
        <group ref={groupRef} position={position}>
            <group ref={ropeRef}>
                <mesh position={[0, -0.25, 0]}>
                    <cylinderGeometry args={[0.01, 0.01, 0.5]} />
                    <meshStandardMaterial color="#475569" />
                </mesh>
                <mesh position={[0, -0.5, 0]} castShadow>
                    <octahedronGeometry args={[0.15, 0]} />
                    <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
                </mesh>
            </group>
        </group>
    );
};

// --- New Gear Handle ---
const RotatorHandle = ({ onClick, active }: { onClick: () => void, active: boolean }) => (
    <group onClick={(e) => { e.stopPropagation(); onClick(); }} position={[0, 0, 0]}>
        {/* Central Hub */}
        <mesh position={[0, 0, 0]}>
             <cylinderGeometry args={[0.4, 0.4, 0.2, 16]} />
             <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Spokes */}
        {[0, 1, 2, 3].map(i => (
            <mesh key={i} rotation={[0, i * (Math.PI/2), 0]}>
                <boxGeometry args={[1.2, 0.1, 0.1]} />
                <meshStandardMaterial color="#f59e0b" />
            </mesh>
        ))}
         {/* Highlight Ring */}
         <mesh rotation={[Math.PI/2, 0, 0]}>
             <torusGeometry args={[0.6, 0.05, 8, 32]} />
             <meshStandardMaterial color="#fcd34d" emissive="#fcd34d" emissiveIntensity={0.5} />
         </mesh>
    </group>
);

const SliderHandle = ({ position }: { position: [number, number, number] }) => (
    <mesh position={position}>
        <sphereGeometry args={[0.2]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.8} />
    </mesh>
);

export const MechanismGroup: React.FC<{ 
    groupId: string; 
    children: React.ReactNode; 
}> = ({ groupId, children }) => {
    const { groupStates, interactGroup } = useGameStore();
    
    const state = groupStates[groupId] || {
        id: groupId,
        type: GroupType.STATIC,
        initialPos: [0, 0, 0],
        rotationValue: 0,
        offsetValue: 0,
        axis: Axis.Z 
    };

    const [isDragging, setIsDragging] = useState(false);

    const { rotation, position } = useSpring({
        rotation: state.type === GroupType.ROTATOR 
            ? [state.rotationValue * (Math.PI / 2), 0, 0] 
            : [0, 0, 0],
        position: state.type === GroupType.SLIDER
            ? (() => {
                const vec = [0, 0, 0];
                const axisIdx = state.axis === Axis.X ? 0 : state.axis === Axis.Y ? 1 : 2;
                vec[axisIdx] = state.offsetValue;
                vec[0] += state.initialPos[0];
                vec[1] += state.initialPos[1];
                vec[2] += state.initialPos[2];
                return vec as [number, number, number];
            })()
            : state.initialPos,
        config: { tension: 120, friction: 14 }
    });

    const bind = useGesture({
        onDrag: ({ delta, event }) => {
            if (state.type !== GroupType.SLIDER) return;
            event.stopPropagation();
            const sensitivity = 0.02;
            // Map drag to axis
            let val = 0;
            if (state.axis === Axis.Y) val = -delta[1] * sensitivity;
            else if (state.axis === Axis.X) val = delta[0] * sensitivity;
            else val = -delta[1] * sensitivity;
            
            interactGroup(groupId, val);
            setIsDragging(true);
        },
        onDragEnd: () => {
            if (state.type === GroupType.SLIDER) {
                 const val = Math.round(state.offsetValue);
                 const diff = val - state.offsetValue;
                 interactGroup(groupId, diff);
            }
            setIsDragging(false);
        }
    });

    if (state.type === GroupType.ROTATOR) {
        const px = state.pivot ? state.pivot[0] : 0;
        const py = state.pivot ? state.pivot[1] : 0;
        const pz = state.pivot ? state.pivot[2] : 0;

        return (
            <group position={state.initialPos}>
                <group position={[px, py, pz]}>
                    <animated.group rotation={rotation as any}>
                        <group position={[-px, -py, -pz]}>
                            {children}
                        </group>
                        {/* Gear Handle placed at pivot */}
                         <RotatorHandle 
                            active={false} 
                            onClick={() => interactGroup(groupId, 1)} 
                        />
                    </animated.group>
                </group>
            </group>
        );
    }

    if (state.type === GroupType.SLIDER) {
        return (
            <animated.group position={position as any} {...bind()} className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}>
                {children}
                {/* Handle on top of slider */}
                <SliderHandle position={[0.5, 1.5, 0.5]} />
            </animated.group>
        )
    }

    // Static
    return <group position={state.initialPos}>{children}</group>;
};