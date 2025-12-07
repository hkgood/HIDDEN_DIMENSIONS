
import { Vector3 } from 'three';

export enum BlockType {
  CUBE = 'CUBE',
  STAIR = 'STAIR',
  ARCH = 'ARCH',
  ROUNDED = 'ROUNDED',
  PORTAL = 'PORTAL',
  WATER = 'WATER',
  PILLAR = 'PILLAR',
  ROTATOR = 'ROTATOR',
  DOME = 'DOME',
  SPIRE = 'SPIRE',
  LATTICE = 'LATTICE',
  DECOR = 'DECOR',
  FLOOR = 'FLOOR',
  WALL = 'WALL'
}

export enum GroupType {
  STATIC = 'STATIC',
  ROTATOR = 'ROTATOR',
  SLIDER = 'SLIDER'
}

export enum Axis {
  X = 'x',
  Y = 'y',
  Z = 'z'
}

export interface GameNode {
  id: number;
  localPos: [number, number, number]; // Position relative to its group
  groupId: string;
  type: BlockType;
  isWalkable: boolean;
  isGoal?: boolean;
  portalTargetId?: number; // If this is a portal, where does it go?
  rotation?: [number, number, number]; // Visual rotation of the block itself
}

export interface LevelGroup {
  id: string;
  type: GroupType;
  initialPos: [number, number, number];
  pivot?: [number, number, number]; // For rotators
  axis?: Axis; // For sliders
  limit?: [number, number]; // For sliders [min, max]
}

export interface LevelData {
  nodes: GameNode[];
  groups: LevelGroup[];
  startNode: number;
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  COMPLETED = 'COMPLETED'
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      cylinderGeometry: any;
      sphereGeometry: any;
      planeGeometry: any;
      meshBasicMaterial: any;
      coneGeometry: any;
      circleGeometry: any;
      octahedronGeometry: any;
      dodecahedronGeometry: any;
      instancedMesh: any;
      fogExp2: any;
      ambientLight: any;
      hemisphereLight: any;
      directionalLight: any;
      orthographicCamera: any;
      shaderMaterial: any;
      primitive: any;
      pointLight: any;
      spotLight: any;
      shadowMaterial: any; 
      ocean: any;
      torusGeometry: any;
      [elemName: string]: any;
    }
  }
}
