
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
        const existing = this._nodes.find(n => 
            n.groupId === groupId && 
            Math.abs(n.localPos[0] - x) < 0.1 && 
            Math.abs(n.localPos[1] - y) < 0.1 && 
            Math.abs(n.localPos[2] - z) < 0.1
        );
        if (existing) {
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

    dropPillar(x: number, y: number, z: number, groupId: string) {
        if (y <= 0) return;
        for(let i = y - 1; i >= -2; i--) {
            this.addNode(x, i, z, groupId, BlockType.PILLAR, false);
        }
    },

    addPlatform(x: number, y: number, z: number, w: number, d: number, groupId: string) {
        for(let i=0; i<w; i++) {
            for(let j=0; j<d; j++) {
                this.addNode(x+i, y, z+j, groupId, BlockType.CUBE, true);
                this.addNode(x+i, y-1, z+j, groupId, BlockType.DECOR, false);
            }
        }
    },

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
            
            let type = BlockType.CUBE;
            if (Math.abs(y2 - y1) > 0.1 && (Math.abs(x2 - x1) > 0.1 || Math.abs(z2 - z1) > 0.1)) {
                type = BlockType.STAIR;
            }
            this.addNode(x, y, z, groupId, type, true);
        }
    },

    // --- ALGORITHMS ---

    generateAqueduct() {
        this.reset();
        this._groups.push({ id: 'base', type: GroupType.STATIC, initialPos: [0, 0, 0] });
        this.addPlatform(-2, 0, -2, 5, 5, 'base');
        let cx = 0, cy = 0, cz = 0;
        const totalSteps = 24;
        for(let i=0; i<totalSteps; i++) {
            const move = Math.floor(Math.random() * 6);
            let nx = cx, ny = cy, nz = cz;
            if (move <= 1) nx += (move === 0 ? 1 : -1);
            else if (move <= 3) nz += (move === 2 ? 1 : -1);
            else if (move === 4) ny += 1;
            nx = Math.max(-6, Math.min(6, nx));
            nz = Math.max(-6, Math.min(6, nz));
            ny = Math.max(0, Math.min(12, ny));
            this.addNode(nx, ny, nz, 'base', BlockType.CUBE);
            if ((nx !== cx || nz !== cz) && ny > 3 && Math.random() > 0.3) {
                this.addNode(nx, ny, nz, 'base', BlockType.ARCH);
                this.dropPillar(nx, ny, nz, 'base');
            }
            cx = nx; cy = ny; cz = nz;
        }
        this.addNode(cx, cy+1, cz, 'base', BlockType.DOME, true, true);
        this.dropPillar(cx, cy, cz, 'base');
    },

    generateBabel() {
        this.reset();
        this._groups.push({ id: 'base', type: GroupType.STATIC, initialPos: [0, 0, 0] });
        const coreRadius = 2; 
        const height = 18;
        for(let y= -2; y < height; y++) {
            for(let x = -coreRadius; x <= coreRadius; x++) {
                for(let z = -coreRadius; z <= coreRadius; z++) {
                    if (Math.abs(x) + Math.abs(z) <= 3) {
                         this.addNode(x, y, z, 'base', BlockType.DECOR, false);
                    }
                }
            }
        }
        let angle = 0;
        let y = 0;
        const pathRadius = coreRadius + 1;
        while (y < height) {
            const x = Math.round(Math.cos(angle) * pathRadius);
            const z = Math.round(Math.sin(angle) * pathRadius);
            this.addNode(x, y, z, 'base', BlockType.CUBE, true);
            if (y > 0) this.addNode(x, y-1, z, 'base', BlockType.ARCH, false);
            angle += 0.3;
            if (Math.random() > 0.5) y++;
            else angle += 0.2;
        }
        this.addNode(0, height, 0, 'base', BlockType.DOME, true, true);
    },

    generateGardens() {
        this.reset();
        this._groups.push({ id: 'base', type: GroupType.STATIC, initialPos: [0, 0, 0] });
        const levels = [0, 5, 10];
        levels.forEach((y, i) => {
            const size = 3 - i; 
            for(let x = -size; x <= size; x++) {
                for(let z = -size; z <= size; z++) {
                    if (Math.abs(x) === size && Math.abs(z) === size) {
                        this.addNode(x, y, z, 'base', BlockType.PILLAR, false);
                    } else {
                        this.addNode(x, y, z, 'base', BlockType.CUBE, true);
                    }
                    this.addNode(x, y-1, z, 'base', BlockType.DECOR, false);
                }
            }
             const corner = size;
             this.dropPillar(corner, y, corner, 'base');
             this.dropPillar(-corner, y, corner, 'base');
             this.dropPillar(corner, y, -corner, 'base');
             this.dropPillar(-corner, y, -corner, 'base');
        });
        this.addStrip(0, 0, 2,  0, 5, 2, 'base');
        this.addStrip(2, 5, 0,  2, 10, 0, 'base');
        this.addNode(0, 11, 0, 'base', BlockType.DOME, true, true);
    },

    // NEW: PARTHENON (Classical Temple)
    generateParthenon() {
        this.reset();
        this._groups.push({ id: 'base', type: GroupType.STATIC, initialPos: [0, 0, 0] });
        
        const w = 8, d = 12; // Dimensions
        // Stylobate (Base)
        this.addPlatform(-4, 0, -6, 9, 13, 'base');
        
        // Peristyle (Columns)
        for(let x = -4; x <= 4; x+=2) {
            this.addNode(x, 1, -6, 'base', BlockType.PILLAR, false);
            this.addNode(x, 1, 6, 'base', BlockType.PILLAR, false);
            this.addNode(x, 2, -6, 'base', BlockType.SLAB, false); // Architrave
            this.addNode(x, 2, 6, 'base', BlockType.SLAB, false);
        }
        for(let z = -4; z <= 4; z+=2) {
            this.addNode(-4, 1, z, 'base', BlockType.PILLAR, false);
            this.addNode(4, 1, z, 'base', BlockType.PILLAR, false);
             this.addNode(-4, 2, z, 'base', BlockType.SLAB, false);
            this.addNode(4, 2, z, 'base', BlockType.SLAB, false);
        }

        // Roof (Pediments)
        for(let z = -6; z <= 6; z++) {
            this.addNode(0, 3, z, 'base', BlockType.ROOF, false, false, [0, Math.PI/4, 0]);
        }
        
        // Path through the ruins
        this.addStrip(-4, 1, 6,  0, 1, 0, 'base');
        this.addStrip(0, 1, 0,   4, 1, -6, 'base');
        this.addStrip(4, 1, -6,  0, 4, -6, 'base'); // Climb to roof
        
        this.addNode(0, 4, -6, 'base', BlockType.DOME, true, true);
    },

    // NEW: JADE PAGODA (Asian Tower)
    generatePagoda() {
        this.reset();
        this._groups.push({ id: 'base', type: GroupType.STATIC, initialPos: [0, 0, 0] });
        
        const levels = [0, 4, 8, 12];
        levels.forEach((y, i) => {
            const size = 3 - Math.floor(i*0.5);
            // Floor
            for(let x=-size; x<=size; x++) {
                for(let z=-size; z<=size; z++) {
                    this.addNode(x, y, z, 'base', BlockType.CUBE, true);
                }
            }
            // Overhanging Eaves (Slabs)
            const eave = size + 1;
            for(let x=-eave; x<=eave; x++) {
                for(let z=-eave; z<=eave; z++) {
                    if (Math.abs(x)===eave || Math.abs(z)===eave) {
                        this.addNode(x, y+0.5, z, 'base', BlockType.SLAB, false);
                    }
                }
            }
            // Central support
            if (i < levels.length - 1) {
                this.addNode(0, y+1, 0, 'base', BlockType.PILLAR, false);
                this.addNode(0, y+2, 0, 'base', BlockType.PILLAR, false);
                this.addNode(0, y+3, 0, 'base', BlockType.PILLAR, false);
            }
        });

        // Spiral Staircase connecting levels
        let angle = 0;
        for(let y=0; y<12; y++) {
            const x = Math.round(Math.cos(angle) * 3);
            const z = Math.round(Math.sin(angle) * 3);
            this.addNode(x, y, z, 'base', BlockType.CUBE, true);
            angle += 0.8;
        }

        this.addNode(0, 12, 0, 'base', BlockType.DOME, true, true);
    },

    // NEW: HABITAT 67 (Brutalist Modules)
    generateHabitat() {
        this.reset();
        this._groups.push({ id: 'base', type: GroupType.STATIC, initialPos: [0, 0, 0] });
        
        // Helper to make a room module
        const makeModule = (bx: number, by: number, bz: number) => {
             this.addPlatform(bx, by, bz, 2, 2, 'base');
             this.addNode(bx, by+1, bz, 'base', BlockType.WALL, false); // Wall
        }

        const modules = [
            [0,0,0], [2,1,0], [-2,1,0], [0,2,2], [0,2,-2],
            [2,3,2], [-2,3,-2], [0,4,0], [1,5,1]
        ];

        modules.forEach(m => makeModule(m[0]*2, m[1]*2, m[2]*2));

        // Connect them
        for(let i=0; i<modules.length-1; i++) {
            const a = modules[i];
            const b = modules[i+1];
            this.addStrip(a[0]*2, a[1]*2, a[2]*2, b[0]*2, b[1]*2, b[2]*2, 'base');
        }
        
        this.addNode(1*2, 5*2+1, 1*2, 'base', BlockType.DOME, true, true);
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
  cameraY: 10, 

  initGame: async () => {
    await audioService.initialize();
    get().regenerateWorld();
    set({ status: GameStatus.PLAYING });
  },

  regenerateWorld: () => {
      // 1. Pick Algorithm
      const algos = ['The Parthenon', 'Jade Pagoda', 'Habitat 67', 'Grand Aqueduct', 'Tower of Babel', 'Hanging Gardens'];
      const pick = algos[Math.floor(Math.random() * algos.length)];
      
      if (pick === 'Grand Aqueduct') WorldGenerator.generateAqueduct();
      else if (pick === 'Tower of Babel') WorldGenerator.generateBabel();
      else if (pick === 'Hanging Gardens') WorldGenerator.generateGardens();
      else if (pick === 'The Parthenon') WorldGenerator.generateParthenon();
      else if (pick === 'Jade Pagoda') WorldGenerator.generatePagoda();
      else WorldGenerator.generateHabitat();

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
