
import { create } from 'zustand';
import { Vector3 } from 'three';
import { GameNode, LevelGroup, GroupType, BlockType, LevelData, GameStatus, Axis } from './types';
import { audioService } from './services/audio';
import { allThemes, themeMap, getRandomTheme, type ColorPalette, type ThemeName } from './theme/colorPalettes';

// --- THEME ADAPTER ---
// 将新的ColorPalette适配为Store需要的简单结构 (Legacy Support while migrating)
// 也可以直接在Store里存新的结构。我们这里选择扩展 Store，但为了兼容 LevelGeometry 现有的 shader，我们做一个 mapping.

export interface LegacyPalette {
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
    // 新增：三色系统
    buildingLight: string;
    buildingMid: string;
    buildingDark: string;
}

const mapThemeToLegacy = (theme: ColorPalette): LegacyPalette => {
    // 简单的渐变逻辑：取 Background sky[0] 和 sky[last]
    const skyColors = Array.isArray(theme.background.sky) ? theme.background.sky : [theme.background.sky, theme.background.sky];
    const skyTop = skyColors[0];
    const skyBottom = skyColors[skyColors.length - 1];
    
    // Block gradient: primary[0] to primary[1]
    const blockTop = theme.primary[1] || theme.primary[0];
    const blockBottom = theme.primary[0];

    // Better Ocean Mapping
    const waterDeep = Array.isArray(theme.background.sky) ? theme.background.sky[0] : theme.background.sky;
    const waterSurface = theme.background.horizon || (Array.isArray(theme.background.sky) ? theme.background.sky[theme.background.sky.length-1] : theme.background.sky);

    return {
        name: theme.name,
        bgGradient: `linear-gradient(to bottom, ${skyBottom}, ${skyTop})`,
        skyTop,
        skyBottom,
        blockTop,
        blockBottom,
        waterDeep,
        waterSurface,
        goal: theme.accent[1] || '#FFD700',
        accent: theme.accent[0],
        // 新增：三色系统
        buildingLight: theme.buildingColors.light,
        buildingMid: theme.buildingColors.mid,
        buildingDark: theme.buildingColors.dark
    };
}

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

    // NEW: MORTISE & TENON (Chinese Joinery)
    generateMortiseTest() {
        this.reset();
        this._groups.push({ id: 'base', type: GroupType.STATIC, initialPos: [0, 0, 0] });
        
        // Platform A (Start) - Ends at x=0
        this.addPlatform(-2, 0, -1, 3, 3, 'base'); // -2 to 0
        // Mortise Socket at x=0, z=0
        // Orientation: Default (Open to Right/X+)
        this.addNode(0, 0, 0, 'base', BlockType.MORTISE, true, false, [0, 0, 0]);

        // Platform B (Goal) - Starts at x=4
        this.addPlatform(4, 0, -1, 3, 3, 'base'); // 4 to 6
        this.addNode(5, 1, 0, 'base', BlockType.DOME, true, true);
        // Mortise Socket at x=4, z=0
        // Orientation: Rotated 180 (Open to Left/X-)
        this.addNode(4, 0, 0, 'base', BlockType.MORTISE, true, false, [0, Math.PI, 0]);

        // The "Tenon" Rotator Group
        // Center at x=2, z=0
        this._groups.push({ 
            id: 'rotator', 
            type: GroupType.ROTATOR, 
            initialPos: [2, 0, 0], 
            pivot: [0, 0, 0],
            axis: Axis.Y 
        });

        // Beam logic:
        // Center
        this.addNode(0, 0, 0, 'rotator', BlockType.CUBE, true);
        // Left End (Tenon pointing Left)
        // Local x=-1. Geometry points Right, so rotate 180.
        this.addNode(-1, 0, 0, 'rotator', BlockType.TENON, true, false, [0, Math.PI, 0]);
        // Right End (Tenon pointing Right)
        // Local x=1. Geometry points Right.
        this.addNode(1, 0, 0, 'rotator', BlockType.TENON, true, false, [0, 0, 0]);
        
        // Add a Lattice Window on the side for flavor
        this.addNode(0, 1, -1, 'base', BlockType.LATTICE, false, false, [0, 0, 0]);
        this.addNode(4, 1, -1, 'base', BlockType.LATTICE, false, false, [0, 0, 0]);
    },

    // NEW: GARDEN WINDOW (Exquisite Version)
    generateGardenWindow() {
        this.reset();
        this._groups.push({ id: 'base', type: GroupType.STATIC, initialPos: [0, 0, 0] });
        const g = 'base';

        // 1. The Moon Gate Wall (Start)
        // A high wall with a circular opening. 
        // Player starts on a platform BEHIND the wall (relative to camera), looking through.
        
        // Base Platform
        this.addPlatform(-2, 0, -2, 4, 4, g);
        
        // The Great Wall
        // Wall spans Z: -4 to 4. X: 2.
        for(let z=-3; z<=3; z++) {
            for(let y=0; y<5; y++) {
                // Leave a hole in the middle (Moon Gate)
                // Center roughly (2, 2, 0). Radius 1.5.
                const dist = Math.sqrt(Math.pow(y-2, 2) + Math.pow(z-0, 2));
                if (dist > 1.5) {
                     this.addNode(2, y, z, g, BlockType.WALL, false);
                }
            }
        }
        // Top of wall
        for(let z=-3; z<=3; z++) this.addNode(2, 5, z, g, BlockType.PAVILION_ROOF, false);

        // The Lattice Frame inside the hole (Walkable frame)
        this.addNode(2, 0, 0, g, BlockType.LATTICE, true); // Bottom of window frame - Walkable
        // Sides of window
        this.addNode(2, 1, -1, g, BlockType.LATTICE, false);
        this.addNode(2, 1, 1, g, BlockType.LATTICE, false);
        this.addNode(2, 2, 0, g, BlockType.LATTICE, false); // Top

        // Player Access to Window
        // Stairs leading up to the window frame from X=0
        this.addNode(1, 0, 0, g, BlockType.STAIR, true, false, [0, 0, 0]); // X+ Up
        // Platform at Y=1, X=2 (The Window Sill)
        this.addNode(2, 1, 0, g, BlockType.LATTICE, true); 

        // 2. The Distant Pavilion (Goal)
        // Far away in X (Depth). X = 8.
        // Must align with Window Sill (Y=1) in Side View (Z-Y projection).
        // Side View: Z axis is horizontal. Y axis is vertical.
        // Window Sill is at Z=0, Y=1.
        // Goal Platform must be at Z=0, Y=1 to appear connected in Side View.
        
        this.addPlatform(8, 1, -2, 4, 4, g); // Centered at Z=0, Y=1.
        
        // Decorate the Distant Pavilion
        // Pillars
        this.addNode(8, 2, -2, g, BlockType.PILLAR, false);
        this.addNode(11, 2, -2, g, BlockType.PILLAR, false);
        this.addNode(8, 2, 1, g, BlockType.PILLAR, false);
        this.addNode(11, 2, 1, g, BlockType.PILLAR, false);
        // Roof
        for(let x=8; x<=11; x++) {
            for(let z=-2; z<=1; z++) {
                this.addNode(x, 3, z, g, BlockType.PAVILION_ROOF, false);
            }
        }
        
        // The Goal
        this.addNode(9, 1, 0, g, BlockType.DOME, true, true);
        
        // 3. The "Garden" in between (Visual Filler)
        // To make the gap look real in 3D but disappear in 2D.
        // We can place low-lying "Water" or "Bush" blocks at Y=-2.
        for(let x=3; x<8; x++) {
            this.addNode(x, -2, 0, g, BlockType.DECOR, false); // Water/Ground
        }
    },

    // NEW: THE INK SCROLL (Exquisite Version: The Folding Landscape)
    generateInkScroll() {
        this.reset();
        this._groups.push({ id: 'base', type: GroupType.STATIC, initialPos: [0, 0, 0] });
        const g = 'base';

        // 1. Start Platform (Inkstone)
        this.addPlatform(-4, 0, 0, 3, 3, g);
        this.dropPillar(-4, 0, 0, g);

        // 2. Goal Platform (Mountain Peak)
        // High up: Y=4. Far right: X=4.
        this.addPlatform(4, 4, 0, 3, 3, g);
        this.addNode(5, 5, 1, g, BlockType.DOME, true, true);
        this.dropPillar(4, 4, 0, g);

        // 3. The Scroll Mechanism (Rotator)
        // A large, complex structure that rotates around the center (0, 2, 0)
        this._groups.push({
            id: 'scroll_mech',
            type: GroupType.ROTATOR,
            initialPos: [0, 2, 0], // Center of the void
            pivot: [0, 0, 0],
            axis: Axis.Z, // Rotates in the vertical plane (X-Y)
            rotationValue: 0 
        });
        const r = 'scroll_mech';

        // Shape: A large "S" or "Z" shape that connects (-4,0) to (4,4) only at specific angle.
        // Current Pos: (0,2). 
        // Start Connection Point: (-3, 0). Relative to pivot (0,2) -> (-3, -2).
        // Goal Connection Point: (3, 4). Relative to pivot (0,2) -> (3, 2).
        
        // Let's build a cross shape "+"
        // Vertical Arm: x=0, y=-3 to 3.
        for(let y=-3; y<=3; y++) this.addNode(0, y, 0, r, BlockType.CUBE, true);
        
        // Horizontal Arm: x=-3 to 3, y=0.
        for(let x=-3; x<=3; x++) this.addNode(x, 0, 0, r, BlockType.CUBE, true);
        
        // Add "Paper" decoration (Lattice)
        this.addNode(-1, 1, 0, r, BlockType.LATTICE, false);
        this.addNode(1, -1, 0, r, BlockType.LATTICE, false);

        // Logic:
        // Initial (Rot=0): 
        // Horizontal Arm spans X: -3 to 3. 
        // Global X: 0-3 = -3. 0+3 = 3.
        // Start Platform ends at X=-2. Gap is 1. (My jump logic handles 1?) 
        // Wait, addPlatform(-4, 0, 0, 3, 3). X range: -4 to -2. Center -3.
        // Edge is X=-2.
        // Rotator Horizontal Left Tip: X=-3.
        // Distance 1. Passable.
        
        // Goal Platform starts at X=4.
        // Rotator Horizontal Right Tip: X=3.
        // Distance 1. Passable.
        
        // BUT height! 
        // Start Y=0. Rotator Y=2 (Center). Horizontal Arm Y=2.
        // Delta Y = 2. Too high.
        // Vertical Arm Bottom Tip: Y = 2 + (-3) = -1. 
        // Start Y=0. Delta Y=1. Passable? Maybe.
        
        // Vertical Arm Top Tip: Y = 2 + 3 = 5.
        // Goal Y=4. Delta Y=1. Passable.
        
        // So at Rot=0 (Cross Upright):
        // Start (Y=0) -> Rotator Bottom (Y=-1). OK.
        // Rotator Top (Y=5) -> Goal (Y=4). OK.
        // Player climbs up the Vertical Arm?
        // Vertical Arm is x=0. 
        // Player steps from (-2,0) to (0,-1)? 
        // Dist = sqrt(2^2 + 1^2) = 2.2. Too far.
        
        // We need L-shapes.
        // Let's make a "Staircase" that forms when rotated.
        
        // Design: The mechanism is a "Cloud Ladder".
        // It has blocks at specific offsets.
        // When rotated 90 deg, they align to form a stair.
        
        // Let's stick to a simpler visual but complex interaction.
        // The "Scroll" is a bridge.
        // We need to connect (-2, 0) to (4, 4).
        // Delta X = 6. Delta Y = 4.
        // A straight line?
        
        // Let's build a bridge that works at 45 degrees? No, 90 degree snaps.
        // How about:
        // Rotator has a path A and path B.
        // Path A connects Start to... Dead End.
        // Rotate.
        // Path B connects Start to Center.
        // Rotate.
        // Path C connects Center to Goal.
        
        // Let's build a single massive "Character" (Kanji/Hanzi) shape.
        // Like "工" or "王".
        
        // Let's use the "Cross" but make the ends recognizable.
        // Center (0,0) [Local]
        this.addNode(0, 0, 0, r, BlockType.CUBE, true);
        
        // Arm 1 (Left-Down): (-1, 0), (-2, 0), (-2, -1), (-2, -2).
        // Connects to Start (Y=0, X=-2) when at (-2,-2) relative to Pivot(0,2) -> (-2, 0).
        // So if Pivot is (0,2). Local (-2, -2) -> Global (-2, 0).
        // Matches Start Platform!
        this.addNode(-1, 0, 0, r, BlockType.CUBE, true);
        this.addNode(-2, 0, 0, r, BlockType.CUBE, true);
        this.addNode(-2, -1, 0, r, BlockType.CUBE, true);
        this.addNode(-2, -2, 0, r, BlockType.CUBE, true);
        
        // Arm 2 (Right-Up): (1, 0), (2, 0), (2, 1), (2, 2).
        // Connects to Goal (Y=4, X=4).
        // Pivot (0,2). Local (2,2) -> Global (2, 4).
        // Matches Goal Platform Y=4! But X? Global X=2.
        // Goal starts at X=4. Gap 2. Too far.
        // Need Local X=4.
        this.addNode(1, 0, 0, r, BlockType.CUBE, true);
        this.addNode(2, 0, 0, r, BlockType.CUBE, true);
        this.addNode(3, 0, 0, r, BlockType.CUBE, true);
        this.addNode(4, 0, 0, r, BlockType.CUBE, true); // Extend to X=4
        this.addNode(4, 1, 0, r, BlockType.CUBE, true);
        this.addNode(4, 2, 0, r, BlockType.CUBE, true);
        
        // So at Rot=0:
        // Left Tip at (-2, -2) -> Global (-2, 0). Connects!
        // Right Tip at (4, 2) -> Global (4, 4). Connects!
        // Path is contiguous from Left Tip to Right Tip?
        // (-2,-2) -> (-2,-1) -> (-2,0) -> (-1,0) -> (0,0) -> ... -> (4,0) -> (4,1) -> (4,2).
        // YES. A zigzag path.
        
        // BUT, we want the player to ROTATE it to solve.
        // So Rot=0 should be BROKEN.
        // Set initial rotation to 1 (90 deg).
        // At 90 deg:
        // Left Tip (-2, -2) becomes (2, -2). Global (2, 0). Nowhere near start.
        // It's a wall in the sky.
        // Player rotates to 0 -> Path forms.
        
        // Add "Ink" aesthetics (Black blocks, White accents) via Theme.
    },

    // NEW: REFLECTION OF THE MOON (Exquisite Version: The Water Temple)
    generateMoonReflection() {
        this.reset();
        this._groups.push({ id: 'base', type: GroupType.STATIC, initialPos: [0, 0, 0] });
        const g = 'base';

        // 1. Reality (Upper)
        // Main Temple Floor
        this.addPlatform(-2, 0, -2, 5, 5, g); 
        // Broken Bridge leading out
        this.addNode(3, 0, 0, g, BlockType.CUBE, true);
        this.addNode(4, 0, 0, g, BlockType.CUBE, true);
        // GAP at X=5, 6.
        // Goal Island
        this.addPlatform(7, 0, -1, 3, 3, g);
        this.addNode(8, 1, 0, g, BlockType.DOME, true, true);
        
        // Archways (Decor)
        this.addNode(0, 1, -2, g, BlockType.ARCH, false);
        this.addNode(0, 1, 2, g, BlockType.ARCH, false);

        // 2. Reflection (Lower)
        // Y = -1, -2...
        // The Reflection of the Main Floor is PARTIAL.
        // Only the rim is solid. Center is empty.
        for(let x=-2; x<=2; x++) {
            this.addNode(x, -1, -2, g, BlockType.CUBE, true);
            this.addNode(x, -1, 2, g, BlockType.CUBE, true);
        }
        for(let z=-2; z<=2; z++) {
            this.addNode(-2, -1, z, g, BlockType.CUBE, true);
            this.addNode(2, -1, z, g, BlockType.CUBE, true);
        }
        
        // The Reflection Bridge
        // It BRIDGES the gap that exists above.
        // Above: Gap X=5,6.
        // Below: Bridge exists at X=5,6.
        this.addNode(5, -1, 0, g, BlockType.CUBE, true);
        this.addNode(6, -1, 0, g, BlockType.CUBE, true);
        
        // 3. Portals (Water Surface Transitions)
        // Transition 1: At the end of Reality Bridge (X=4).
        // Player walks to (4,0,0).
        // Needs to drop to (4,-1,0). 
        // Add Water at (4,0,0) and (4,-1,0).
        this.addNode(4, 0, 0, g, BlockType.WATER, true);
        this.addNode(4, -1, 0, g, BlockType.WATER, true);
        
        // Transition 2: At the Goal Island (X=7).
        // Player arrives at (7,-1,0) in reflection.
        // Needs to pop up to (7,0,0).
        this.addNode(7, -1, 0, g, BlockType.WATER, true);
        this.addNode(7, 0, 0, g, BlockType.WATER, true);
        
        // 4. Parallax Trick (Optional)
        // Maybe a Rotator that exists in Reflection but affects Reality?
        // No, let's keep it to "Dimension Jumping".
        
        // Decor: Inverted Pillars
        this.addNode(8, -2, -1, g, BlockType.PILLAR, false);
        this.addNode(8, -3, -1, g, BlockType.PILLAR, false);
    },

    // NEW: THE BAGUA MAZE (Rotating Environment)
    generateBaguaMaze() {
        this.reset();
        this._groups.push({ id: 'base', type: GroupType.STATIC, initialPos: [0, 0, 0] });
        
        // Central Hub (Octagon-ish)
        this.addPlatform(-1, 0, -1, 3, 3, 'base');
        
        // 4 Satellite Islands (N, S, E, W)
        // North (Z-)
        this.addPlatform(-1, 0, -5, 3, 3, 'base');
        // South (Z+)
        this.addPlatform(-1, 0, 3, 3, 3, 'base');
        // East (X+) with Goal
        this.addPlatform(3, 0, -1, 3, 3, 'base');
        this.addNode(4, 1, 0, 'base', BlockType.DOME, true, true);
        // West (X-) with Start? Player starts at 0,0,0 (Center).
        this.addPlatform(-5, 0, -1, 3, 3, 'base');

        // The Rotator Ring
        // Instead of rotating the bridge, we rotate the WHOLE OUTER RING around the center?
        // Or rotate the Center to align bridges?
        // Let's rotate the Center Hub which has the bridges attached.
        
        this._groups.push({
            id: 'center_dial',
            type: GroupType.ROTATOR,
            initialPos: [0, 0, 0],
            pivot: [0, 0, 0],
            axis: Axis.Y
        });
        
        // Bridges on the Dial
        // L-shaped bridge? 
        // A straight bridge extending North.
        this.addNode(0, 0, -2, 'center_dial', BlockType.CUBE, true);
        this.addNode(0, 0, -3, 'center_dial', BlockType.CUBE, true); // Reaches Z=-3. North Island starts at Z=-4.
        
        // A bridge extending West.
        this.addNode(-2, 0, 0, 'center_dial', BlockType.CUBE, true);
        this.addNode(-3, 0, 0, 'center_dial', BlockType.CUBE, true);
        
        // No bridge South or East initially.
        
        // Logic:
        // Player starts Center.
        // Rotator at 0: Connects North (-3 vs -4, dist 1) and West.
        // Player goes North. Finds switch?
        // Player needs to go East (Goal).
        // Needs to rotate Dial -90 deg (or 270).
        // Then the "North Bridge" (0,0,-3) becomes (3,0,0) -> Connects to East (starts 3,0,-1)?
        // Wait, East platform is at X=3..5, Z=-1..1.
        // Rotated Bridge tip is at X=3, Z=0.
        // East Platform edge is X=3.
        // Overlap!
        
        // Visuals
        this.addNode(0, 0, 0, 'center_dial', BlockType.FLOOR, true); // Center piece
        this.addNode(0, 1, 0, 'center_dial', BlockType.PILLAR, false); // Axis
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

// 海洋配置
export interface OceanConfig {
  speed: number;        // 波浪速度 (0-3)
  height: number;       // 波浪高度 (0-4)
  density: number;      // 波浪密度/频率 (0.5-3)
}

// 音色信息
export interface TimbreInfo {
  name: string;         // 英文名称
  nameCN: string;       // 中文名称
  type: string;         // 音色类型
}

interface GameState {
  status: GameStatus;
  level: LevelData;
  groupStates: Record<string, GroupState>;
  playerNodeId: number;
  globalRotationIndex: number; 
  isRotatingView: boolean;
  
  // Customization
  activePalette: LegacyPalette;
  theme: ColorPalette; // Store full theme object
  hueOffset: number; // 0 to 1
  archetype: string;
  timbre: TimbreInfo;  // 当前音色信息

  // Camera State
  cameraZoom: number;
  cameraY: number;

  // Ocean Configuration
  oceanConfig: OceanConfig;

  initGame: () => void;
  regenerateWorld: (targetArchetype?: string) => void;
  rotateView: (direction: 'left' | 'right') => void;
  setGlobalRotationIndex: (index: number) => void;
  interactGroup: (groupId: string, delta: number) => void;
  movePlayer: (targetNodeId: number) => void;
  checkWinCondition: () => void;
  
  // Camera Actions
  setCameraZoom: (d: number) => void;
  setCameraY: (d: number) => void;

  // Ocean Actions
  setOceanConfig: (config: Partial<OceanConfig>) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  status: GameStatus.IDLE,
  level: { nodes: [], groups: [], startNode: 0 },
  groupStates: {},
  playerNodeId: 0,
  globalRotationIndex: 0,
  isRotatingView: false,
  
  activePalette: mapThemeToLegacy(themeMap.warmCoral),
  theme: themeMap.warmCoral,
  hueOffset: 0,
  archetype: 'Grand Aqueduct',
  timbre: { name: 'Crystal Bells', nameCN: '水晶钟琴', type: 'bells' },
  
  cameraZoom: 35,
  cameraY: 10,

  // 海洋默认配置
  oceanConfig: {
    speed: 0.4,
    height: 1.2,
    density: 2.0,
  }, 

  initGame: async () => {
    await audioService.initialize();
    // 获取音色信息
    const timbreInfo = audioService.getTimbreInfo();
    set({ timbre: timbreInfo });
    get().regenerateWorld();
    set({ status: GameStatus.PLAYING });
  },

  regenerateWorld: (targetArchetype) => {
      // 1. Pick Algorithm
      const algos = ['The Parthenon', 'Jade Pagoda', 'Habitat 67', 'Grand Aqueduct', 'Tower of Babel', 'Hanging Gardens', 'Mortise Lock'];
      const pick = targetArchetype || algos[Math.floor(Math.random() * algos.length)];
      
      if (pick === 'Grand Aqueduct') WorldGenerator.generateAqueduct();
      else if (pick === 'Tower of Babel') WorldGenerator.generateBabel();
      else if (pick === 'Hanging Gardens') WorldGenerator.generateGardens();
      else if (pick === 'The Parthenon') WorldGenerator.generateParthenon();
      else if (pick === 'Jade Pagoda') WorldGenerator.generatePagoda();
      else if (pick === 'Mortise Lock') WorldGenerator.generateMortiseTest();
      else if (pick === 'Garden Window') WorldGenerator.generateGardenWindow();
      else if (pick === 'The Ink Scroll') WorldGenerator.generateInkScroll();
      else if (pick === 'Moon Reflection') WorldGenerator.generateMoonReflection();
      else if (pick === 'Bagua Maze') WorldGenerator.generateBaguaMaze();
      else WorldGenerator.generateHabitat();

      const newLevel = WorldGenerator.getResult();
      
      // 2. Pick Palette & Shift
      let selectedTheme = getRandomTheme();
      
      // Blacklist dark/low-saturation themes to avoid gray appearance
      const darkThemes = ['darkVoid', 'deepOcean'];
      while (darkThemes.includes(Object.keys(themeMap).find(k => themeMap[k as ThemeName] === selectedTheme) || '')) {
          selectedTheme = getRandomTheme();
      }
      
      // Force specific themes for specific levels for "Exquisite" feel
      if (pick === 'Garden Window') selectedTheme = themeMap.cherryBlossom;
      else if (pick === 'The Ink Scroll') selectedTheme = themeMap.emeraldForest; // Ink style often green/black or use DeepOcean
      else if (pick === 'Moon Reflection') selectedTheme = themeMap.deepOcean;
      else if (pick === 'Bagua Maze') selectedTheme = themeMap.purpleTwilight;
      else if (pick === 'Mortise Lock') selectedTheme = themeMap.desertRuins;
      else if (pick === 'Inferno Realm') selectedTheme = themeMap.inferno; // If we add this level
      
      const pal = mapThemeToLegacy(selectedTheme);
      const hue = 0; // Disable random hue for now to respect strict themes

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
          theme: selectedTheme,
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
  },

  setOceanConfig: (config: Partial<OceanConfig>) => {
    set(s => ({ oceanConfig: { ...s.oceanConfig, ...config } }));
  }
}));
