export type DoorDefinition = Readonly<{
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  thickness: number;
  panelWidth: number;
  panelOffset: number;
  travel: number;
  sensorRadius: number;
  interactRadius: number;
  verticalRange: number;
  openSpeed: number;
  closeSpeed: number;
}>;

export type DoorState = {
  id: string;
  openness: number;
  targetOpen: boolean;
  holdOpenUntil: number;
  updatedAt: number;
};

export type DoorCollisionBox = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  movement: boolean;
  doorId: string;
};

export const toyboxDoorDefinitions: readonly DoorDefinition[];
export function clampDoorOpenness(value: number): number;
export function createDoorState(definition: DoorDefinition, now?: number): DoorState;
export function stepDoorOpenness(openness: number, targetOpen: boolean, deltaSeconds: number, definition?: DoorDefinition): number;
export function distanceToDoor(definition: DoorDefinition, entity: { x: number; z: number }): number;
export function doorShouldOpen(
  definition: DoorDefinition,
  entities?: Array<{ x: number; y?: number; z: number; active?: boolean }>,
  holdOpenUntil?: number,
  now?: number
): boolean;
export function doorPanelBoxes(definition: DoorDefinition, openness?: number): DoorCollisionBox[];
export function nearestInteractableDoor(
  position: { x: number; y?: number; z: number },
  definitions?: readonly DoorDefinition[]
): { definition: DoorDefinition; distance: number } | null;
