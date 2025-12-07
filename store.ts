
import { create } from 'zustand';
import { Vector3 } from 'three';
import { GameNode, LevelGroup, GroupType, BlockType, LevelData, GameStatus, Axis } from './types';
import { audioService } from './services/audio';

// --- Level Design: "The Crystalline Labyrinth" (Massive Expansion) ---
// A complex, multi-tiered maze requiring extensive vertical movement and perspective shifts.

const GROUPS: LevelGroup[] = [
  { id: 'base', type: GroupType.STATIC, initialPos: [0, 0, 0] },
  
  // Elevator A (West Wing) - Goes from Basement to Ground
  { id: 'lift_a', type: GroupType.SLIDER, initialPos: [-5, -4, 0], axis: Axis.Y, limit: [0, 4] },
  
  // Elevator B (East Wing) - Goes from Ground to High
  { id: 'lift_b', type: GroupType.SLIDER, initialPos: [5, 4, 0], axis: Axis.Y, limit: [-4, 0] },
  
  // Rotator X (South Bridge) - Connects Hub to South Tower
  { id: 'rot_x', type: GroupType.ROTATOR, initialPos: [0, 0, 4], pivot: [0, 0, 0] },
  
  // Rotator Z (North Phantom) - Connects High Hub to Goal
  { id: 'rot_z', type: GroupType.ROTATOR, initialPos: [0, 8, -4], pivot: [0, 0, 0] },
];

const NODES: GameNode[] = [];
let nodeIdCounter = 0;

const addNode = (
  x: number, y: number, z: number, 
  groupId: string, 
  type: BlockType = BlockType.CUBE, 
  isWalkable: boolean = true,
  isGoal: boolean = false
) => {
  NODES.push({
    id: nodeIdCounter++,
    localPos: [x, y, z],
    groupId,
    type,
    isWalkable,
    isGoal
  });
};

// --- LEVEL CONSTRUCTION ---

// 1. THE BASEMENT (Y=-4)
// Starting Area
addNode(0, -4, 0, 'base', BlockType.CUBE); // START
addNode(0, -4, 1, 'base', BlockType.CUBE);
addNode(0, -4, 2, 'base', BlockType.CUBE);
addNode(1, -4, 2, 'base', BlockType.CUBE);
addNode(2, -4, 2, 'base', BlockType.CUBE);
addNode(2, -4, 1, 'base', BlockType.CUBE);
addNode(2, -4, 0, 'base', BlockType.CUBE); // Loop back
addNode(1, -4, 0, 'base', BlockType.ARCH);

// Path to Elevator A (West)
addNode(-1, -4, 0, 'base', BlockType.CUBE);
addNode(-2, -4, 0, 'base', BlockType.CUBE);
addNode(-3, -4, 0, 'base', BlockType.CUBE);
addNode(-4, -4, 0, 'base', BlockType.ARCH);

// Elevator A Base
addNode(0, 0, 0, 'lift_a', BlockType.CUBE); // The Platform

// 2. THE GROUND FLOOR (Y=0)
// Landing for Elevator A
addNode(-5, 0, 1, 'base', BlockType.CUBE); // Exit from Lift A
addNode(-5, 0, 2, 'base', BlockType.CUBE);
addNode(-4, 0, 2, 'base', BlockType.CUBE);
addNode(-3, 0, 2, 'base', BlockType.CUBE);
addNode(-2, 0, 2, 'base', BlockType.CUBE); // Connection path

// Central Hub (Ground)
for(let x=-1; x<=1; x++) {
    for(let z=-1; z<=1; z++) {
        addNode(x, 0, z, 'base', BlockType.CUBE);
    }
}
addNode(0, 0, 0, 'base', BlockType.PILLAR, false); // Center decor

// Connection to South Rotator (Rot X)
addNode(0, 0, 2, 'base', BlockType.CUBE);
addNode(0, 0, 3, 'base', BlockType.ARCH);

// Rotator X Mechanism (Pivot at 0,0,4)
addNode(0, 0, 0, 'rot_x', BlockType.ROTATOR);
addNode(0, -1, 0, 'rot_x', BlockType.CUBE); // Arm down
addNode(0, 1, 0, 'rot_x', BlockType.CUBE);  // Arm up
addNode(-1, 0, 0, 'rot_x', BlockType.CUBE); // Arm Left
addNode(1, 0, 0, 'rot_x', BlockType.CUBE);  // Arm Right

// South Tower (Reachable via Rotator X)
addNode(0, 1, 6, 'base', BlockType.CUBE); // Gap at Z=5. Rotator at Z=4. Arm Up connects? 
// If Rotator X is at [0,0,4]. Arm Up is [0,1,4]. South Tower is [0,1,6].
// Gap is 2. Needs Perspective.

// Path to East Wing (Elevator B)
addNode(2, 0, 0, 'base', BlockType.CUBE);
addNode(3, 0, 0, 'base', BlockType.CUBE);
addNode(4, 0, 0, 'base', BlockType.ARCH);

// Elevator B Base (Starts at Y=4, comes down to Y=0)
addNode(0, 0, 0, 'lift_b', BlockType.CUBE); 

// 3. THE HIGH LAYER (Y=4)
// Landing for Elevator B (At Y=4)
addNode(5, 4, 1, 'base', BlockType.CUBE);
addNode(5, 4, 2, 'base', BlockType.CUBE);
addNode(4, 4, 2, 'base', BlockType.CUBE);
addNode(3, 4, 2, 'base', BlockType.CUBE);
addNode(2, 4, 2, 'base', BlockType.CUBE);

// High Central Ring
addNode(0, 4, 0, 'base', BlockType.PILLAR, false); // Center
addNode(1, 4, 1, 'base', BlockType.CUBE);
addNode(1, 4, -1, 'base', BlockType.CUBE);
addNode(-1, 4, -1, 'base', BlockType.CUBE);
addNode(-1, 4, 1, 'base', BlockType.CUBE);
addNode(0, 4, 1, 'base', BlockType.CUBE);
addNode(0, 4, -1, 'base', BlockType.CUBE); // Path to North

// North Bridge (Towards Phantom Rotator)
addNode(0, 4, -2, 'base', BlockType.CUBE);
addNode(0, 4, -3, 'base', BlockType.CUBE); // Stand here.
// Rotator Z is at [0, 8, -4].
// Player is at [0, 4, -3].
// Need to get to Goal at [0, 8, -6]?

// 4. THE PHANTOM ROTATOR (Y=8, Z=-4)
addNode(0, 0, 0, 'rot_z', BlockType.ROTATOR);
addNode(0, -1, 0, 'rot_z', BlockType.CUBE); // [0, 7, -4]
addNode(0, -2, 0, 'rot_z', BlockType.CUBE); // [0, 6, -4]
addNode(0, -3, 0, 'rot_z', BlockType.CUBE); // [0, 5, -4]
addNode(0, -4, 0, 'rot_z', BlockType.CUBE); // [0, 4, -4] - Matches height of North Bridge!

// 5. THE GOAL PEAK (Y=8, Z=-6)
addNode(0, 8, -6, 'base', BlockType.CUBE);
addNode(0, 9, -6, 'base', BlockType.DOME, true, true); // GOAL

// 6. DECORATION & FILLER (To make it massive)
// Fill voids with Lattice/Spire
for(let y=-3; y<8; y+=2) {
    addNode(-5, y, -5, 'base', BlockType.LATTICE, false);
    addNode(5, y, -5, 'base', BlockType.LATTICE, false);
    addNode(5, y, 5, 'base', BlockType.LATTICE, false);
    addNode(-5, y, 5, 'base', BlockType.LATTICE, false);
}
addNode(0, 8, 0, 'base', BlockType.SPIRE, false);
addNode(0, -4, -4, 'base', BlockType.DECOR, false);
addNode(4, -4, 4, 'base', BlockType.DECOR, false);


const LEVEL_DATA: LevelData = {
  nodes: NODES,
  groups: GROUPS,
  startNode: 0
};

// --- Helper: World Position Calculation ---
const getWorldPosition = (node: GameNode, groupStates: Record<string, GroupState>) => {
  const state = groupStates[node.groupId];
  if (!state) return new Vector3(...node.localPos);

  const local = new Vector3(...node.localPos);
  
  if (state.type === GroupType.ROTATOR && state.pivot) {
    const pivot = new Vector3(...state.pivot);
    local.sub(pivot);
    const rotAxis = new Vector3(0, 1, 0); 
    local.applyAxisAngle(rotAxis, state.rotationValue * (Math.PI / 2)); 
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
};

// --- Store ---

export interface GroupState {
  id: string;
  type: GroupType;
  initialPos: [number, number, number];
  pivot?: [number, number, number];
  axis?: Axis;
  rotationValue: number;
  offsetValue: number;
}

interface GameState {
  status: GameStatus;
  level: LevelData;
  groupStates: Record<string, GroupState>;
  playerNodeId: number;
  globalRotationIndex: number; 
  isRotatingView: boolean;

  initGame: () => void;
  rotateView: (direction: 'left' | 'right') => void;
  setGlobalRotationIndex: (index: number) => void;
  interactGroup: (groupId: string, delta: number) => void;
  movePlayer: (targetNodeId: number) => void;
  checkWinCondition: () => void;
}

const INITIAL_GROUP_STATES: Record<string, GroupState> = {};
GROUPS.forEach(g => {
  INITIAL_GROUP_STATES[g.id] = {
    id: g.id,
    type: g.type,
    initialPos: g.initialPos,
    pivot: g.pivot,
    axis: g.axis,
    rotationValue: 0,
    offsetValue: 0
  };
});

export const useGameStore = create<GameState>((set, get) => ({
  status: GameStatus.IDLE,
  level: LEVEL_DATA,
  groupStates: INITIAL_GROUP_STATES,
  playerNodeId: 0,
  globalRotationIndex: 0,
  isRotatingView: false,

  initGame: async () => {
    await audioService.initialize();
    set({ 
      status: GameStatus.PLAYING, 
      playerNodeId: LEVEL_DATA.startNode, 
      groupStates: JSON.parse(JSON.stringify(INITIAL_GROUP_STATES)),
      globalRotationIndex: 0 
    });
  },

  rotateView: (direction) => {
    const { globalRotationIndex, isRotatingView, status } = get();
    if (isRotatingView || status !== GameStatus.PLAYING) return;

    audioService.playMechanism('rotate');
    const newIndex = direction === 'left' ? globalRotationIndex + 1 : globalRotationIndex - 1;
    set({ isRotatingView: true, globalRotationIndex: newIndex });
    setTimeout(() => set({ isRotatingView: false }), 800);
  },

  setGlobalRotationIndex: (index: number) => {
      set({ globalRotationIndex: index });
  },

  interactGroup: (groupId, delta) => {
    const { groupStates, status } = get();
    if (status !== GameStatus.PLAYING) return;
    
    const group = groupStates[groupId];
    if (!group) return;

    const newStates = { ...groupStates };

    if (group.type === GroupType.ROTATOR) {
        const newRot = Math.round(group.rotationValue + delta);
        newStates[groupId] = { ...group, rotationValue: newRot };
        audioService.playMechanism('rotate');
    } 
    else if (group.type === GroupType.SLIDER) {
        const limit = LEVEL_DATA.groups.find(g => g.id === groupId)?.limit || [0, 0];
        let newOffset = group.offsetValue + delta;
        const min = Math.min(limit[0], limit[1]);
        const max = Math.max(limit[0], limit[1]);
        newOffset = Math.max(min, Math.min(max, newOffset));
        newStates[groupId] = { ...group, offsetValue: newOffset };
        if (Math.random() > 0.8) audioService.playMechanism('slide');
    }

    set({ groupStates: newStates });
  },

  movePlayer: (targetNodeId) => {
    const { playerNodeId, level, groupStates, globalRotationIndex, status } = get();
    if (status !== GameStatus.PLAYING || playerNodeId === targetNodeId) return;

    const worldPositions = new Map<number, Vector3>();
    level.nodes.forEach(n => {
        worldPositions.set(n.id, getWorldPosition(n, groupStates));
    });

    const getNeighbors = (currentId: number): number[] => {
        const currentPos = worldPositions.get(currentId)!;
        const neighbors: number[] = [];

        level.nodes.forEach(potential => {
            if (potential.id === currentId) return;
            if (!potential.isWalkable) return;

            const targetPos = worldPositions.get(potential.id)!;
            
            // Standard Physical Adjacency
            const dist = currentPos.distanceTo(targetPos);
            if (Math.abs(dist - 1.0) < 0.15) {
                neighbors.push(potential.id);
                return;
            }

            // Visual "Impossible" Adjacency
            const rawIndex = Math.round(globalRotationIndex);
            const viewIndex = ((rawIndex % 4) + 4) % 4;

            let isConnected = false;
            
            const cx = Math.round(currentPos.x * 10) / 10;
            const cy = Math.round(currentPos.y * 10) / 10;
            const cz = Math.round(currentPos.z * 10) / 10;
            
            const tx = Math.round(targetPos.x * 10) / 10;
            const ty = Math.round(targetPos.y * 10) / 10;
            const tz = Math.round(targetPos.z * 10) / 10;

            const dx = Math.abs(cx - tx);
            const dy = Math.abs(cy - ty);
            const dz = Math.abs(cz - tz);

            const THRESHOLD = 0.2;

            if (viewIndex === 0) { // Front (No Z)
                 if (dx < THRESHOLD && Math.abs(dy - 1.0) < THRESHOLD) isConnected = true; 
                 if (dy < THRESHOLD && Math.abs(dx - 1.0) < THRESHOLD) isConnected = true; 
            }
            else if (viewIndex === 1) { // Right (No X)
                 if (dz < THRESHOLD && Math.abs(dy - 1.0) < THRESHOLD) isConnected = true;
                 if (dy < THRESHOLD && Math.abs(dz - 1.0) < THRESHOLD) isConnected = true;
            }
            else if (viewIndex === 2) { // Back (No Z)
                 if (dx < THRESHOLD && Math.abs(dy - 1.0) < THRESHOLD) isConnected = true;
                 if (dy < THRESHOLD && Math.abs(dx - 1.0) < THRESHOLD) isConnected = true;
            }
            else if (viewIndex === 3) { // Left (No X)
                 if (dz < THRESHOLD && Math.abs(dy - 1.0) < THRESHOLD) isConnected = true;
                 if (dy < THRESHOLD && Math.abs(dz - 1.0) < THRESHOLD) isConnected = true;
            }

            if (isConnected) {
                neighbors.push(potential.id);
            }
        });
        return neighbors;
    };

    const queue: number[][] = [[playerNodeId]];
    const visited = new Set<number>();
    visited.add(playerNodeId);
    
    let path: number[] | null = null;

    while (queue.length > 0) {
      const currentPath = queue.shift()!;
      const curr = currentPath[currentPath.length - 1];

      if (curr === targetNodeId) {
        path = currentPath;
        break;
      }

      const n = getNeighbors(curr);
      for (const neighbor of n) {
        if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push([...currentPath, neighbor]);
        }
      }
    }

    if (path) {
        const step = (idx: number) => {
            if (idx >= path!.length) {
                get().checkWinCondition();
                return;
            }
            const nextId = path![idx];
            set({ playerNodeId: nextId });
            audioService.playStep(idx);
            setTimeout(() => step(idx + 1), 300);
        };
        step(1);
    }
  },

  checkWinCondition: () => {
    const { playerNodeId, level } = get();
    const node = level.nodes.find(n => n.id === playerNodeId);
    if (node?.isGoal) {
        set({ status: GameStatus.COMPLETED });
        audioService.playWin();
    }
  }
}));
