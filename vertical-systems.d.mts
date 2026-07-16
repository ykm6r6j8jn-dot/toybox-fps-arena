export type TowerDefinition = Readonly<{
  id: string;
  label: string;
  floorHeight: number;
  maxFloor: number;
  bounds: Readonly<{ minX: number; maxX: number; minZ: number; maxZ: number }>;
  entryOutside: Readonly<{ x: number; z: number }>;
  entryInside: Readonly<{ x: number; z: number }>;
  spiral: Readonly<{
    x: number;
    z: number;
    radius: number;
    width: number;
    startAngle: number;
    totalAngle: number;
  }>;
  elevator: Readonly<ElevatorDefinition>;
}>;

export type ElevatorDefinition = {
  id: string;
  label: string;
  towerId?: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  frontZ: number;
  speed: number;
  floorHeight: number;
  maxFloor: number;
};

export type ElevatorState = {
  id: string;
  platformY: number;
  currentFloor: number;
  targetFloor: number;
  moving: boolean;
  direction: number;
  arrivedAt: number;
  updatedAt: number;
};

export type ElevatorInteraction = {
  kind: "ride" | "call";
  floor: number;
  distance: number;
};

export const toyboxTowerDefinitions: readonly TowerDefinition[];
export const toyboxElevatorDefinitions: readonly Readonly<ElevatorDefinition>[];
export function floorEyeY(definition: { floorHeight: number; maxFloor: number }, floor: number): number;
export function nearestTowerFloor(definition: { floorHeight: number; maxFloor: number }, y: number): number;
export function towerAtPosition(position: { x: number; z: number }, padding?: number): TowerDefinition | null;
export function spiralRoutePoint(
  definition: TowerDefinition,
  floorProgress: number,
  laneOffset?: number
): { x: number; y: number; z: number; yaw: number; progress: number };
export function stepFloorProgress(current: number, target: number, deltaSeconds: number, levelsPerSecond?: number): number;
export function stepVerticalHeight(current: number, target: number, deltaSeconds: number, metersPerSecond?: number): number;
export function createElevatorState(definition: ElevatorDefinition, now?: number): ElevatorState;
export function setElevatorTarget(state: ElevatorState, definition: ElevatorDefinition, floor: number): ElevatorState;
export function stepElevatorState(state: ElevatorState, definition: ElevatorDefinition, now?: number): ElevatorState;
export function elevatorInteractionContext(
  position: { x: number; y: number; z: number },
  definition: ElevatorDefinition,
  state: ElevatorState
): ElevatorInteraction | null;
export function nearestInteractableElevator(
  position: { x: number; y: number; z: number },
  states: Map<string, ElevatorState> | Record<string, ElevatorState>,
  definitions?: readonly ElevatorDefinition[]
): ({ definition: ElevatorDefinition; state: ElevatorState } & ElevatorInteraction) | null;
export function elevatorTargetForInteraction(
  context: ElevatorInteraction | null,
  definition: ElevatorDefinition,
  state: ElevatorState,
  direction?: number
): number;
export function isOnElevatorPlatform(
  position: { x: number; y: number; z: number },
  definition: ElevatorDefinition,
  platformY: number,
  verticalTolerance?: number
): boolean;
export function elevatorPlatformBox(
  definition: ElevatorDefinition,
  platformY: number,
  thickness?: number
): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  movement: false;
  elevatorId: string;
};
