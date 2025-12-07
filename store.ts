
import { create } from 'zustand';
import { Vector3 } from 'three';
import { GameNode, LevelGroup, GroupType, BlockType, LevelData, GameStatus, Axis } from './types';
import { audioService } from './services/audio';

// --- THEME ENGINE ---
export interface Palette {
    name: string;
    bgGradient: string; 
    skyTop: string;     
    skyBottom: string;  
    blockTop: string;   
    blockBottom: string; 
    waterDeep: string;
    waterSurface: string;
    goal: string;
    accent: string;
}

export const PALETTES: Palette[] = [
    {
        name: 'Celestial Prism',
        bgGradient: 'linear-gradient(to bottom, #1e1b4b, #4c1d95)',
        skyTop: '#4c1d95', skyBottom: '#1e1b4b',
        blockTop: '#22d3ee', blockBottom: '#4c1d95',
        waterDeep: '#312e81', waterSurface: '#db2777',
        goal: '#fbbf24', accent: '#22d3ee'
    },
    {
        name: 'Sunset Alchemy',
        bgGradient: 'linear-gradient(to bottom, #be123c, #fb923c)',
        skyTop: '#fb923c', skyBottom: '#881337',
        blockTop: '#fcd34d', blockBottom: '#9f1239',
        waterDeep: '#4c0519', waterSurface: '#fb7185',
        goal: '#ffffff', accent: '#fcd34d'
    },
    {
        name: 'Mint Architecture',
        bgGradient: 'linear-gradient(to bottom, #065f46, #34d399)',
        skyTop: '#34d399', skyBottom: '#064e3b',
        blockTop: '#a7f3d0', blockBottom: '#065f46',
        waterDeep: '#022c22', waterSurface: '#10b981',
        goal: '#f0fdf4', accent: '#34d399'
    },
    {
        name: 'Neon Void',
        bgGradient: 'linear-gradient(to bottom, #000000, #2e1065)',
        skyTop: '#c026d3', skyBottom: '#000000',
        blockTop: '#e879f9', blockBottom: '#4c1d95',
        waterDeep: '#000000', waterSurface: '#7e22ce',
        goal: '#22d3ee', accent: '#e879f9'
    },
    {
        name: 'Royal Gold',
        bgGradient: 'linear-gradient(to bottom, #451a03, #d97706)',
        skyTop: '#d97706', skyBottom: '#451a03',
        blockTop: '#fde68a', blockBottom: '#92400e',
        waterDeep: '#451a03', waterSurface: '#f59e0b',
        goal: '#ffffff', accent: '#fde68a'
    }
];

// --- WORLD GENERATOR ---
const WorldGenerator = {
    _nodes: [] as GameNode[],
    _groups: [] as LevelGroup[],
    _nodeId: 0,

    reset() {
        this._nodes = [];
        this._groups = [];
        this._nodeId = 0;
    },

    addNode(x: number, y: number, z: number, groupId: string, type: BlockType = BlockType.CUBE, isWalkable: boolean = true, isGoal: boolean = false, rotation: [number, number, number] = [0,0,0]) {
        // De-duplicate
        const existing = this._nodes.find(n => 
            n.groupId === groupId && 
            Math.abs(n.localPos[0] - x) < 0.1 && 
            Math.abs(n.localPos[1] - y) < 0.1 && 
            Math.abs(n.localPos[2] - z) < 0.1
        );
        if (existing) {
             // Overwrite non-walkable with walkable
             if (!existing.isWalkable && isWalkable) {
                 existing.isWalkable = true;
                 existing.type = type;
             }
             return;
        }

        this._nodes.push({
            id: this._nodeId++,
            localPos: [x, y, z],
            groupId,
            type,
            isWalkable,
            isGoal,
            rotation
        });
    },

    // --- ARCHITECTURAL HELPERS ---

    // Drops a pillar from (x,y,z) down to floor Y=-2
    dropPillar(x: number, y: number, z: number, groupId: string) {
        if (y <= 0) return;
        // Top cap (Arch or Block) handled by caller usually, but let's add the column
        for(let i = y - 1; i >= -2; i--) {
            this.addNode(x, i, z, groupId, BlockType.PILLAR, false);
        }
    },

    // Draws a solid platform
    addPlatform(x: number, y: number, z: number, w: number, d: number, groupId: string) {
        for(let i=0; i<w; i++) {
            for(let j=0; j<d; j++) {
                this.addNode(x+i, y, z+j, groupId, BlockType.CUBE, true);
                // Foundation
                this.addNode(x+i, y-1, z+j, groupId, BlockType.DECOR, false);
            }
        }
    },

    // Draws a line of blocks (linear interpolation)
    addStrip(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, groupId: string) {
        const dist = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), Math.abs(z2 - z1));
        if (dist === 0) {
            this.addNode(x1, y1, z1, groupId, BlockType.CUBE, true);
            return;
        }
        for (let i = 0; i <= dist; i++) {
            const t = i / dist;
            const x = Math.round(x1 + (x2 - x1) * t);
            const y = Math.round(y1 + (y2 - y1) * t);
            const z = Math.round(z1 + (z2 - z1) * t);
            
            // Use STAIR type if it's a diagonal slope (change in Y AND change in X/Z)
            // If it is purely vertical, keep it as CUBE (ladder)
            let type = BlockType.CUBE;
            if (Math.abs(y2 - y1) > 0.1 && (Math.abs(x2 - x1) > 0.1 || Math.abs(z2 - z1) > 0.1)) {
                type = BlockType.STAIR;
            }

            this.addNode(x, y, z, groupId, type, true);
        }
    },

    // ALGORITHM 1: THE GRAND AQUEDUCT
    // High wandering paths supported by massive pillars and arches
    generateAqueduct() {
        this.reset();
        this._groups.push({ id: 'base', type: GroupType.STATIC, initialPos: [0, 0, 0] });
        
        // Base platform
        this.addPlatform(-2, 0, -2, 5, 5, 'base');

        let cx = 0, cy = 0, cz = 0;
        const totalSteps = 24;
        
        // Path logic: Move orthogonally, but maintain height or climb slightly
        // Every few steps, build a support structure
        
        for(let i=0; i<totalSteps; i++) {
            // Decision: Continue, Turn, or Climb?
            const move = Math.floor(Math.random() * 6); // 0,1: X, 2,3: Z, 4: Up, 5: Bridge
            let nx = cx, ny = cy, nz = cz;

            if (move <= 1) nx += (move === 0 ? 1 : -1);
            else if (move <= 3) nz += (move === 2 ? 1 : -1);
            else if (move === 4) ny += 1;
            
            // Constrain bounds
            nx = Math.max(-6, Math.min(6, nx));
            nz = Math.max(-6, Math.min(6, nz));
            ny = Math.max(0, Math.min(12, ny)); // Height limit

            // Draw Block
            this.addNode(nx, ny, nz, 'base', BlockType.CUBE);
            
            // If we moved horizontally and we are high up, maybe drop a pillar
            if ((nx !== cx || nz !== cz) && ny > 3 && Math.random() > 0.3) {
                // Use ARCH block for the connection point
                this.addNode(nx, ny, nz, 'base', BlockType.ARCH);
                this.dropPillar(nx, ny, nz, 'base');
            }

            cx = nx; cy = ny; cz = nz;
        }

        // Add Goal
        this.addNode(cx, cy+1, cz, 'base', BlockType.DOME, true, true);
        // Ensure goal has support
        this.dropPillar(cx, cy, cz, 'base');
    },

    // ALGORITHM 2: THE TOWER OF BABEL
    // A dense, solid core with a spiral path clinging to the outside
    generateBabel() {
        this.reset();
        this._groups.push({ id: 'base', type: GroupType.STATIC, initialPos: [0, 0, 0] });

        const coreRadius = 2; // 4x4 core
        const height = 18;
        
        // 1. Build The Core (Monolith)
        for(let y= -2; y < height; y++) {
            for(let x = -coreRadius; x <= coreRadius; x++) {
                for(let z = -coreRadius; z <= coreRadius; z++) {
                    // Make it roughly cylindrical
                    if (Math.abs(x) + Math.abs(z) <= 3) {
                         this.addNode(x, y, z, 'base', BlockType.DECOR, false);
                    }
                }
            }
        }

        // 2. Carve/Add The Spiral Path
        // Path wraps around the core radius
        let angle = 0;
        let y = 0;
        const pathRadius = coreRadius + 1; // Just outside core
        
        while (y < height) {
            const x = Math.round(Math.cos(angle) * pathRadius);
            const z = Math.round(Math.sin(angle) * pathRadius);
            
            // Add walking block
            this.addNode(x, y, z, 'base', BlockType.CUBE, true);
            
            // Add decorative railing/support sometimes
            if (y > 0) this.addNode(x, y-1, z, 'base', BlockType.ARCH, false);

            angle += 0.3; // Tight spiral
            if (Math.random() > 0.5) y++; // Sometimes climb
            else angle += 0.2; // Sometimes flat
        }
        
        // Goal at top
        this.addNode(0, height, 0, 'base', BlockType.DOME, true, true);
    },

    // ALGORITHM 3: HANGING GARDENS
    // Symmetrical terraces connected by stairs
    generateGardens() {
        this.reset();
        this._groups.push({ id: 'base', type: GroupType.STATIC, initialPos: [0, 0, 0] });

        const levels = [0, 5, 10]; // Terrace heights
        
        // 1. Build Terraces
        levels.forEach((y, i) => {
            const size = 3 - i; // Get smaller as we go up
            // Center Platform
            for(let x = -size; x <= size; x++) {
                for(let z = -size; z <= size; z++) {
                    // Don't fill corners for interest
                    if (Math.abs(x) === size && Math.abs(z) === size) {
                        this.addNode(x, y, z, 'base', BlockType.PILLAR, false); // Corner pillar
                    } else {
                        this.addNode(x, y, z, 'base', BlockType.CUBE, true);
                    }
                    
                    // Foundation
                    this.addNode(x, y-1, z, 'base', BlockType.DECOR, false);
                }
            }
            
            // Drop pillars from corners
             const corner = size;
             this.dropPillar(corner, y, corner, 'base');
             this.dropPillar(-corner, y, corner, 'base');
             this.dropPillar(corner, y, -corner, 'base');
             this.dropPillar(-corner, y, -corner, 'base');
        });

        // 2. Connect Terraces with Stairs
        // Connect Level 0 to 1
        this.addStrip(0, 0, 2,  0, 5, 2, 'base'); // Front stairs?
        // Connect Level 1 to 2
        this.addStrip(2, 5, 0,  2, 10, 0, 'base'); // Side stairs?

        // Goal on top
        this.addNode(0, 11, 0, 'base', BlockType.DOME, true, true);
    },


    getResult() {
        return {
            nodes: this._nodes,
            groups: this._groups,
            startNode: 0
        };
    }
}


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
  
  // Customization
  activePalette: Palette;
  hueOffset: number; // 0 to 1
  archetype: string;

  // Camera State
  cameraZoom: number;
  cameraY: number;

  initGame: () => void;
  regenerateWorld: () => void;
  rotateView: (direction: 'left' | 'right') => void;
  setGlobalRotationIndex: (index: number) => void;
  interactGroup: (groupId: string, delta: number) => void;
  movePlayer: (targetNodeId: number) => void;
  checkWinCondition: () => void;
  
  // Camera Actions
  setCameraZoom: (d: number) => void;
  setCameraY: (d: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  status: GameStatus.IDLE,
  level: { nodes: [], groups: [], startNode: 0 },
  groupStates: {},
  playerNodeId: 0,
  globalRotationIndex: 0,
  isRotatingView: false,
  
  activePalette: PALETTES[0],
  hueOffset: 0,
  archetype: 'Grand Aqueduct',
  
  cameraZoom: 35,
  cameraY: 10, // Lower camera Y to center compact levels

  initGame: async () => {
    await audioService.initialize();
    get().regenerateWorld();
    set({ status: GameStatus.PLAYING });
  },

  regenerateWorld: () => {
      // 1. Pick Algorithm
      const algos = ['Grand Aqueduct', 'Tower of Babel', 'Hanging Gardens'];
      const pick = algos[Math.floor(Math.random() * algos.length)];
      
      if (pick === 'Grand Aqueduct') WorldGenerator.generateAqueduct();
      else if (pick === 'Tower of Babel') WorldGenerator.generateBabel();
      else WorldGenerator.generateGardens();

      const newLevel = WorldGenerator.getResult();
      
      // 2. Pick Palette & Shift
      const pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      const hue = Math.random(); // 0 to 1

      // 3. Reset States
      const states: Record<string, GroupState> = {};
      newLevel.groups.forEach(g => {
          states[g.id] = {
              id: g.id,
              type: g.type,
              initialPos: g.initialPos,
              pivot: g.pivot,
              axis: g.axis,
              rotationValue: 0,
              offsetValue: 0
          };
      });

      // Find lowest walkable node for start
      let startNode = newLevel.nodes[0]?.id || 0;
      let minY = 999;
      newLevel.nodes.forEach(n => {
          if (n.isWalkable && n.localPos[1] < minY) {
              minY = n.localPos[1];
              startNode = n.id;
          }
      });

      set({
          level: newLevel,
          groupStates: states,
          playerNodeId: startNode,
          globalRotationIndex: 0,
          activePalette: pal,
          hueOffset: hue,
          archetype: pick,
          status: GameStatus.PLAYING
      });
  },

  setCameraZoom: (delta) => {
      set(s => ({ cameraZoom: Math.max(10, Math.min(100, s.cameraZoom + delta)) }));
  },
  
  setCameraY: (delta) => {
      set(s => ({ cameraY: Math.max(-20, Math.min(100, s.cameraY + delta)) }));
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
        // Find limit from Level Data
        const levelGroup = get().level.groups.find(g => g.id === groupId);
        const limit = levelGroup?.limit || [0, 100];
        
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

    // Helper to calc world pos
    const getWorldPosition = (node: GameNode) => {
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
         const axisVec = new Vector3(state.axis === Axis.X ? 1 : 0, state.axis === Axis.Y ? 1 : 0, state.axis === Axis.Z ? 1 : 0);
         local.add(axisVec.multiplyScalar(state.offsetValue));
      }
      local.add(new Vector3(...state.initialPos));
      return local;
    };

    const worldPositions = new Map<number, Vector3>();
    level.nodes.forEach(n => worldPositions.set(n.id, getWorldPosition(n)));

    const getNeighbors = (currentId: number): number[] => {
        const currentPos = worldPositions.get(currentId)!;
        const neighbors: number[] = [];

        level.nodes.forEach(potential => {
            if (potential.id === currentId) return;
            if (!potential.isWalkable) return;

            const targetPos = worldPositions.get(potential.id)!;
            const dist = currentPos.distanceTo(targetPos);
            if (Math.abs(dist - 1.0) < 0.15) {
                neighbors.push(potential.id);
                return;
            }

            // Visual Check
            const rawIndex = Math.round(globalRotationIndex);
            const viewIndex = ((rawIndex % 4) + 4) % 4;
            let isConnected = false;
            
            const dx = Math.abs(currentPos.x - targetPos.x);
            const dy = Math.abs(currentPos.y - targetPos.y);
            const dz = Math.abs(currentPos.z - targetPos.z);
            const THRESHOLD = 0.4;

            if (viewIndex === 0) { // Front
                 if (dx < THRESHOLD && Math.abs(dy - 1.0) < THRESHOLD) isConnected = true; 
                 if (dy < THRESHOLD && Math.abs(dx - 1.0) < THRESHOLD) isConnected = true; 
            }
            else if (viewIndex === 1) { // Right
                 if (dz < THRESHOLD && Math.abs(dy - 1.0) < THRESHOLD) isConnected = true;
                 if (dy < THRESHOLD && Math.abs(dz - 1.0) < THRESHOLD) isConnected = true;
            }
            else if (viewIndex === 2) { // Back
                 if (dx < THRESHOLD && Math.abs(dy - 1.0) < THRESHOLD) isConnected = true;
                 if (dy < THRESHOLD && Math.abs(dx - 1.0) < THRESHOLD) isConnected = true;
            }
            else if (viewIndex === 3) { // Left
                 if (dz < THRESHOLD && Math.abs(dy - 1.0) < THRESHOLD) isConnected = true;
                 if (dy < THRESHOLD && Math.abs(dz - 1.0) < THRESHOLD) isConnected = true;
            }

            if (isConnected) neighbors.push(potential.id);
        });
        return neighbors;
    };

    // BFS
    const queue: number[][] = [[playerNodeId]];
    const visited = new Set<number>();
    visited.add(playerNodeId);
    let path: number[] | null = null;

    while (queue.length > 0) {
      const currentPath = queue.shift()!;
      const curr = currentPath[currentPath.length - 1];
      if (curr === targetNodeId) { path = currentPath; break; }
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
            if (idx >= path!.length) { get().checkWinCondition(); return; }
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
