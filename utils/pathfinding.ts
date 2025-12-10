/**
 * 顶级游戏寻路系统 - 严格物理连接 + 精准视错觉
 * 
 * 核心原则：
 * 1. 默认只能在物理相邻的方块上行走
 * 2. 高度变化需要楼梯/斜坡支持
 * 3. 视错觉桥接需要严格的屏幕对齐 + 标记节点
 * 4. 完整的碰撞检测，禁止穿越方块
 */

import { Vector3 } from 'three';
import { GameNode, BlockType } from '../types';

// 全局调试开关（从 store 导入）
let DEBUG_MODE = false;

export function setPathfindingDebug(enabled: boolean) {
  DEBUG_MODE = enabled;
}

/**
 * 相机视角定义
 * 0: 前视图 (Front)   - 看 -Z 方向
 * 1: 右视图 (Right)   - 看 -X 方向  
 * 2: 后视图 (Back)    - 看 +Z 方向
 * 3: 左视图 (Left)    - 看 +X 方向
 */
export type CameraView = 0 | 1 | 2 | 3;

/**
 * 移动类型枚举
 */
export enum MoveType {
  WALK = 'WALK',           // 平地行走
  CLIMB_UP = 'CLIMB_UP',   // 上楼梯/斜坡
  JUMP_DOWN = 'JUMP_DOWN', // 跳下
  OPTICAL = 'OPTICAL'      // 视错觉桥接
}

/**
 * 邻接关系
 */
interface AdjacencyInfo {
  isAdjacent: boolean;
  moveType: MoveType;
  distance: number;
}

// ============================================================================
// 工具函数：投影与距离计算
// ============================================================================

/**
 * 将3D世界坐标投影到2D屏幕坐标（正交投影）
 */
export function projectToScreen(position: Vector3, cameraView: CameraView): { x: number; y: number; depth: number } {
    const normalizedView = ((cameraView % 4) + 4) % 4 as CameraView;
    
    switch (normalizedView) {
        case 0: // 前视图: 看向 -Z，消除Z轴
            return {
                x: position.x,
                y: position.y,
                depth: -position.z
            };
        
        case 1: // 右视图: 看向 -X，消除X轴
            return {
                x: position.z,
                y: position.y,
                depth: -position.x
            };
        
        case 2: // 后视图: 看向 +Z，消除Z轴
            return {
                x: -position.x,
                y: position.y,
                depth: position.z
            };
        
        case 3: // 左视图: 看向 +X，消除X轴
            return {
                x: -position.z,
                y: position.y,
                depth: position.x
            };
    }
}

/**
 * 计算屏幕空间距离
 */
export function screenDistance(posA: Vector3, posB: Vector3, cameraView: CameraView): number {
    const screenA = projectToScreen(posA, cameraView);
    const screenB = projectToScreen(posB, cameraView);
    
    const dx = screenA.x - screenB.x;
    const dy = screenA.y - screenB.y;
    
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 计算深度差异
 */
export function depthGap(posA: Vector3, posB: Vector3, cameraView: CameraView): number {
    const screenA = projectToScreen(posA, cameraView);
    const screenB = projectToScreen(posB, cameraView);
    
    return Math.abs(screenA.depth - screenB.depth);
}

// ============================================================================
// 核心：物理邻接检查
// ============================================================================

/**
 * 检查两个方块是否物理相邻（真实3D空间）
 * 
 * 相邻定义：
 * - 水平距离（XZ平面）≈ 1.0（±0.15容错）
 * - 共享边界或顶点
 */
function checkPhysicalAdjacency(posA: Vector3, posB: Vector3): AdjacencyInfo {
    const dx = Math.abs(posA.x - posB.x);
    const dy = posA.y - posB.y; // 注意：不取绝对值，保留方向
    const dz = Math.abs(posA.z - posB.z);
    
    // 计算水平距离（忽略Y轴）
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
    
    // 容错范围
    const ADJACENT_THRESHOLD = 1.15; // 相邻阈值
    const MIN_ADJACENT = 0.85;       // 最小相邻距离
    
    // 不相邻：水平距离太远
    if (horizontalDist > ADJACENT_THRESHOLD || horizontalDist < MIN_ADJACENT) {
        return { isAdjacent: false, moveType: MoveType.WALK, distance: horizontalDist };
    }
    
    // 检查高度差
    const absHeightDiff = Math.abs(dy);
    
    // 情况1：平地行走（高度差很小）
    if (absHeightDiff <= 0.1) {
        return { isAdjacent: true, moveType: MoveType.WALK, distance: horizontalDist };
    }
    
    // 情况2：上升（需要楼梯）
    if (dy > 0.1 && dy <= 1.1) {
        return { isAdjacent: true, moveType: MoveType.CLIMB_UP, distance: horizontalDist };
    }
    
    // 情况3：下降（可以跳下，但不能太高）
    if (dy < -0.1 && dy >= -2.1) {
        return { isAdjacent: true, moveType: MoveType.JUMP_DOWN, distance: horizontalDist };
    }
    
    // 高度差太大，不可通行
    return { isAdjacent: false, moveType: MoveType.WALK, distance: horizontalDist };
}

/**
 * 验证高度过渡是否合法
 * 
 * 规则：
 * - 平地行走：无需验证
 * - 上楼：目标方块必须是 STAIR 或 RAMP
 * - 下楼：允许，但不能太高
 */
function validateHeightTransition(
    moveType: MoveType,
    targetNode: GameNode
): boolean {
    if (moveType === MoveType.WALK) {
        return true; // 平地行走，无需验证
    }
    
    if (moveType === MoveType.CLIMB_UP) {
        // 上升必须有楼梯或斜坡
        return targetNode.type === BlockType.STAIR || targetNode.type === BlockType.RAMP;
    }
    
    if (moveType === MoveType.JUMP_DOWN) {
        return true; // 下降允许（已经在邻接检查中限制了高度）
    }
    
    return false;
}

// ============================================================================
// 视错觉桥接系统
// ============================================================================

/**
 * 检查视错觉桥接
 * 
 * 严格条件：
 * 1. 两个节点都标记为 isOpticalBridge
 * 2. 屏幕距离 < 0.3（非常精确的对齐）
 * 3. 高度差 ≤ 1.0
 * 4. 深度差 > 2.0（确保是视错觉，而非真实相邻）
 */
function checkOpticalBridge(
    nodeA: GameNode,
    nodeB: GameNode,
    posA: Vector3,
    posB: Vector3,
    cameraView: CameraView
): boolean {
    // 必须两个节点都标记为视错觉桥接点
    if (!nodeA.isOpticalBridge || !nodeB.isOpticalBridge) {
        return false;
    }
    
    const screenDist = screenDistance(posA, posB, cameraView);
    const heightDiff = Math.abs(posA.y - posB.y);
    const depthDiff = depthGap(posA, posB, cameraView);
    
    // 严格条件
    const SCREEN_THRESHOLD = 0.3;  // 更严格的对齐要求
    const DEPTH_THRESHOLD = 2.0;   // 必须有足够的深度差异
    
    const isAligned = screenDist < SCREEN_THRESHOLD;
    const isReasonableHeight = heightDiff <= 1.0;
    const isReallyFar = depthDiff > DEPTH_THRESHOLD;
    
    return isAligned && isReasonableHeight && isReallyFar;
}

// ============================================================================
// 碰撞检测系统
// ============================================================================

/**
 * 检查路径是否与不可行走的方块碰撞
 * 
 * 方法：沿路径插值检查
 */
function checkPathCollision(
    startPos: Vector3,
    endPos: Vector3,
    allNodes: GameNode[],
    worldPositions: Map<number, Vector3>
): boolean {
    // 简化版：检查路径中点附近是否有不可行走方块
    const midPoint = new Vector3().lerpVectors(startPos, endPos, 0.5);
    
    for (const node of allNodes) {
        if (node.isWalkable) continue; // 跳过可行走方块
        
        const nodePos = worldPositions.get(node.id);
        if (!nodePos) continue;
        
        // 检查中点是否太接近不可行走方块
        const dist = midPoint.distanceTo(nodePos);
        if (dist < 0.4) {
            return true; // 发生碰撞
        }
    }
    
    return false; // 无碰撞
}

// ============================================================================
// 寻路算法：BFS
// ============================================================================

/**
 * 获取一个节点的所有可到达邻居
 */
function getNeighbors(
    currentNode: GameNode,
    currentPos: Vector3,
    allNodes: GameNode[],
    worldPositions: Map<number, Vector3>,
    walkableNodes: Set<number>,
    cameraView: CameraView
): number[] {
    const neighbors: number[] = [];
    
    for (const potentialNode of allNodes) {
        // 跳过自己和不可行走的节点
        if (potentialNode.id === currentNode.id || !walkableNodes.has(potentialNode.id)) {
            continue;
        }
        
        const potentialPos = worldPositions.get(potentialNode.id);
        if (!potentialPos) continue;
        
        // === 策略1：物理邻接检查 ===
        const adjacency = checkPhysicalAdjacency(currentPos, potentialPos);
        
        if (adjacency.isAdjacent) {
            // 验证高度过渡
            if (validateHeightTransition(adjacency.moveType, potentialNode)) {
                // 检查碰撞
                const hasCollision = checkPathCollision(
                    currentPos, 
                    potentialPos, 
                    allNodes, 
                    worldPositions
                );
                
                if (!hasCollision) {
                    if (DEBUG_MODE) {
                      console.log(`[寻路] ✅ 物理连接: ${currentNode.id} -> ${potentialNode.id}, 类型: ${adjacency.moveType}`);
                    }
                    neighbors.push(potentialNode.id);
                    continue; // 找到物理连接，跳过视错觉检查
                } else {
                    if (DEBUG_MODE) {
                      console.log(`[寻路] ❌ 碰撞阻挡: ${currentNode.id} -> ${potentialNode.id}`);
                    }
                }
            } else {
                if (DEBUG_MODE) {
                  console.log(`[寻路] ❌ 高度过渡失败: ${currentNode.id} -> ${potentialNode.id}, 类型: ${adjacency.moveType}, 目标类型: ${potentialNode.type}`);
                }
            }
        }
        
        // === 策略2：视错觉桥接检查 ===
        const isOpticalConnected = checkOpticalBridge(
            currentNode,
            potentialNode,
            currentPos,
            potentialPos,
            cameraView
        );
        
        if (isOpticalConnected) {
            if (DEBUG_MODE) {
              console.log(`[寻路] ✨ 视错觉连接: ${currentNode.id} -> ${potentialNode.id}`);
            }
            neighbors.push(potentialNode.id);
        }
    }
    
    return neighbors;
}

/**
 * 使用BFS寻找从起点到终点的路径
 * 
 * @param startNodeId - 起点节点ID
 * @param targetNodeId - 目标节点ID  
 * @param allNodes - 所有节点数据（包含类型信息）
 * @param worldPositions - 所有节点的世界坐标映射
 * @param walkableNodes - 所有可行走的节点ID集合
 * @param cameraView - 当前相机视角
 * @returns 路径数组（节点ID），如果不可达则返回null
 */
export function findPath(
    startNodeId: number,
    targetNodeId: number,
    allNodes: GameNode[],
    worldPositions: Map<number, Vector3>,
    walkableNodes: Set<number>,
    cameraView: CameraView
): number[] | null {
    if (startNodeId === targetNodeId) {
        return [startNodeId];
    }
    
    // 构建节点ID到节点的映射
    const nodeMap = new Map<number, GameNode>();
    allNodes.forEach(node => nodeMap.set(node.id, node));
    
    const startNode = nodeMap.get(startNodeId);
    if (!startNode) return null;
    
    const queue: number[][] = [[startNodeId]];
    const visited = new Set<number>();
    visited.add(startNodeId);
    
    while (queue.length > 0) {
        const currentPath = queue.shift()!;
        const currentId = currentPath[currentPath.length - 1];
        
        // 找到目标
        if (currentId === targetNodeId) {
            return currentPath;
        }
        
        const currentNode = nodeMap.get(currentId);
        const currentPos = worldPositions.get(currentId);
        if (!currentNode || !currentPos) continue;
        
        // 获取邻居
        const neighbors = getNeighbors(
            currentNode,
            currentPos,
            allNodes,
            worldPositions,
            walkableNodes,
            cameraView
        );
        
        for (const neighborId of neighbors) {
            if (!visited.has(neighborId)) {
                visited.add(neighborId);
                queue.push([...currentPath, neighborId]);
            }
        }
    }
    
    return null; // 不可达
}

// ============================================================================
// 可达区域计算（用于可视化）
// ============================================================================

/**
 * 计算从起点出发的所有可达节点
 * 
 * @returns 可达节点ID的集合
 */
export function findReachableNodes(
    startNodeId: number,
    allNodes: GameNode[],
    worldPositions: Map<number, Vector3>,
    walkableNodes: Set<number>,
    cameraView: CameraView,
    maxDepth: number = 100 // 防止无限递归
): Set<number> {
    const reachable = new Set<number>();
    reachable.add(startNodeId);
    
    const nodeMap = new Map<number, GameNode>();
    allNodes.forEach(node => nodeMap.set(node.id, node));
    
    const startNode = nodeMap.get(startNodeId);
    if (!startNode) return reachable;
    
    const queue: { id: number; depth: number }[] = [{ id: startNodeId, depth: 0 }];
    const visited = new Set<number>();
    visited.add(startNodeId);
    
    while (queue.length > 0) {
        const { id: currentId, depth } = queue.shift()!;
        
        if (depth >= maxDepth) continue;
        
        const currentNode = nodeMap.get(currentId);
        const currentPos = worldPositions.get(currentId);
        if (!currentNode || !currentPos) continue;
        
        const neighbors = getNeighbors(
            currentNode,
            currentPos,
            allNodes,
            worldPositions,
            walkableNodes,
            cameraView
        );
        
        for (const neighborId of neighbors) {
            if (!visited.has(neighborId)) {
                visited.add(neighborId);
                reachable.add(neighborId);
                queue.push({ id: neighborId, depth: depth + 1 });
            }
        }
    }
    
    return reachable;
}

// ============================================================================
// 调试工具
// ============================================================================

/**
 * 调试：打印连接信息
 */
export function debugConnection(
    nodeA: GameNode,
    nodeB: GameNode,
    posA: Vector3,
    posB: Vector3,
    cameraView: CameraView
) {
    const adjacency = checkPhysicalAdjacency(posA, posB);
    const screenDist = screenDistance(posA, posB, cameraView);
    const depthDiff = depthGap(posA, posB, cameraView);
    const isOptical = checkOpticalBridge(nodeA, nodeB, posA, posB, cameraView);
    
    if (DEBUG_MODE) {
        console.log(`[寻路调试]
    节点: ${nodeA.id} -> ${nodeB.id}
    物理相邻: ${adjacency.isAdjacent ? '✅' : '❌'}
    移动类型: ${adjacency.moveType}
    水平距离: ${adjacency.distance.toFixed(2)}
    高度差: ${(posA.y - posB.y).toFixed(2)}
    屏幕距离: ${screenDist.toFixed(2)}
    深度差异: ${depthDiff.toFixed(2)}
    视错觉桥: ${isOptical ? '✅' : '❌'}
    `);
    }
}
