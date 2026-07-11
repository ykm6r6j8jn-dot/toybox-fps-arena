const PLAYER_EYE_HEIGHT = 1.6;
const UPPER_FLOOR_SURFACE_OFFSET = 0.16;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function freezePoint(point) {
  return Object.freeze({ x: point.x, z: point.z });
}

function towerDefinition(definition) {
  const tower = {
    ...definition,
    bounds: Object.freeze({ ...definition.bounds }),
    entryOutside: freezePoint(definition.entryOutside),
    entryInside: freezePoint(definition.entryInside),
    spiral: Object.freeze({ ...definition.spiral }),
    elevator: Object.freeze({ ...definition.elevator })
  };
  return Object.freeze(tower);
}

export const toyboxTowerDefinitions = Object.freeze([
  towerDefinition({
    id: "aurora",
    label: "AURORA TOWER",
    floorHeight: 5.5,
    maxFloor: 4,
    bounds: { minX: 63.75, maxX: 84.25, minZ: -32.25, maxZ: -11.45 },
    entryOutside: { x: 74, z: -9.7 },
    entryInside: { x: 74, z: -15.2 },
    spiral: {
      x: 69.2,
      z: -24.2,
      radius: 2.35,
      width: 1.86,
      startAngle: -Math.PI * 0.78,
      totalAngle: Math.PI * 1.82
    },
    elevator: {
      id: "aurora-lift",
      label: "AURORA SKY LIFT",
      x: 79.7,
      z: -29.15,
      width: 2.7,
      depth: 3.45,
      frontZ: -27.15,
      speed: 4.35
    }
  }),
  towerDefinition({
    id: "nexus",
    label: "NEXUS CENTER",
    floorHeight: 5.5,
    maxFloor: 5,
    bounds: { minX: -86.25, maxX: -71.75, minZ: -81.25, maxZ: -66.45 },
    entryOutside: { x: -79, z: -64.8 },
    entryInside: { x: -79, z: -69.3 },
    spiral: {
      x: -82,
      z: -74.25,
      radius: 2.35,
      width: 1.86,
      startAngle: -Math.PI * 0.78,
      totalAngle: Math.PI * 1.82
    },
    elevator: {
      id: "nexus-lift",
      label: "NEXUS SKY LIFT",
      x: -75.2,
      z: -78.55,
      width: 2.55,
      depth: 3.35,
      frontZ: -76.55,
      speed: 4.5
    }
  })
]);

export const toyboxElevatorDefinitions = Object.freeze(toyboxTowerDefinitions.map((tower) => Object.freeze({
  ...tower.elevator,
  towerId: tower.id,
  floorHeight: tower.floorHeight,
  maxFloor: tower.maxFloor
})));

export function floorEyeY(definition, floor) {
  const normalizedFloor = clamp(Math.round(finite(floor)), 0, definition.maxFloor);
  if (normalizedFloor === 0) return PLAYER_EYE_HEIGHT;
  return PLAYER_EYE_HEIGHT + normalizedFloor * definition.floorHeight + UPPER_FLOOR_SURFACE_OFFSET;
}

export function nearestTowerFloor(definition, y) {
  const height = finite(y, PLAYER_EYE_HEIGHT);
  let nearest = 0;
  let nearestDistance = Infinity;
  for (let floor = 0; floor <= definition.maxFloor; floor += 1) {
    const distance = Math.abs(height - floorEyeY(definition, floor));
    if (distance < nearestDistance) {
      nearest = floor;
      nearestDistance = distance;
    }
  }
  return nearest;
}

export function towerAtPosition(position, padding = 0) {
  const x = finite(position?.x, Infinity);
  const z = finite(position?.z, Infinity);
  const extra = Math.max(0, finite(padding));
  return toyboxTowerDefinitions.find((tower) => (
    x >= tower.bounds.minX - extra &&
    x <= tower.bounds.maxX + extra &&
    z >= tower.bounds.minZ - extra &&
    z <= tower.bounds.maxZ + extra
  )) || null;
}

export function spiralRoutePoint(definition, floorProgress, laneOffset = 0) {
  const progress = clamp(finite(floorProgress), 0, definition.maxFloor);
  const spiral = definition.spiral;
  const radius = spiral.radius + clamp(finite(laneOffset), -spiral.width * 0.28, spiral.width * 0.28);
  const angle = spiral.startAngle + spiral.totalAngle * progress;
  return {
    x: spiral.x + Math.cos(angle) * radius,
    y: PLAYER_EYE_HEIGHT + progress * definition.floorHeight + Math.min(1, progress) * UPPER_FLOOR_SURFACE_OFFSET,
    z: spiral.z + Math.sin(angle) * radius,
    yaw: Math.atan2(-Math.sin(angle), Math.cos(angle)),
    progress
  };
}

export function stepFloorProgress(current, target, deltaSeconds, levelsPerSecond = 0.34) {
  const from = finite(current);
  const to = finite(target);
  const maximumStep = clamp(finite(deltaSeconds), 0, 0.25) * Math.max(0.05, finite(levelsPerSecond, 0.34));
  if (Math.abs(to - from) <= maximumStep) return to;
  return from + Math.sign(to - from) * maximumStep;
}

export function createElevatorState(definition, now = Date.now()) {
  return {
    id: definition.id,
    platformY: floorEyeY(definition, 0),
    currentFloor: 0,
    targetFloor: 0,
    moving: false,
    direction: 0,
    arrivedAt: finite(now),
    updatedAt: finite(now)
  };
}

export function setElevatorTarget(state, definition, floor) {
  const targetFloor = clamp(Math.round(finite(floor)), 0, definition.maxFloor);
  state.targetFloor = targetFloor;
  state.moving = Math.abs(floorEyeY(definition, targetFloor) - finite(state.platformY, floorEyeY(definition, state.currentFloor))) > 0.001;
  state.direction = state.moving ? Math.sign(targetFloor - state.currentFloor || floorEyeY(definition, targetFloor) - state.platformY) : 0;
  return state;
}

export function stepElevatorState(state, definition, now = Date.now()) {
  const currentTime = finite(now);
  const elapsed = clamp((currentTime - finite(state.updatedAt, currentTime)) / 1000, 0, 0.25);
  const targetY = floorEyeY(definition, state.targetFloor);
  const currentY = finite(state.platformY, floorEyeY(definition, state.currentFloor));
  const distance = targetY - currentY;
  const maximumStep = Math.max(0.1, finite(definition.speed, 4.4)) * elapsed;
  if (Math.abs(distance) <= Math.max(0.001, maximumStep)) {
    state.platformY = targetY;
    state.currentFloor = state.targetFloor;
    state.moving = false;
    state.direction = 0;
    if (Math.abs(distance) > 0.001) state.arrivedAt = currentTime;
  } else {
    state.platformY = currentY + Math.sign(distance) * maximumStep;
    state.moving = true;
    state.direction = Math.sign(distance);
  }
  state.updatedAt = currentTime;
  return state;
}

export function elevatorInteractionContext(position, definition, state) {
  if (!position || !definition || !state) return null;
  const x = finite(position.x, Infinity);
  const y = finite(position.y, PLAYER_EYE_HEIGHT);
  const z = finite(position.z, Infinity);
  const cabinDistance = Math.hypot(x - definition.x, z - definition.z);
  const insideCabin = (
    Math.abs(x - definition.x) <= definition.width / 2 + 0.38 &&
    Math.abs(z - definition.z) <= definition.depth / 2 + 0.1 &&
    Math.abs(y - state.platformY) <= 1.35
  );
  if (insideCabin) {
    return {
      kind: "ride",
      floor: nearestTowerFloor(definition, state.platformY),
      distance: cabinDistance
    };
  }

  const floor = nearestTowerFloor(definition, y);
  const floorY = floorEyeY(definition, floor);
  const landingDistance = Math.hypot(x - definition.x, z - definition.frontZ);
  if (
    Math.abs(y - floorY) <= 1.2 &&
    Math.abs(x - definition.x) <= definition.width / 2 + 1.05 &&
    Math.abs(z - definition.frontZ) <= 2.15
  ) {
    if (!state.moving && state.currentFloor === floor) return null;
    return { kind: "call", floor, distance: landingDistance };
  }
  return null;
}

export function nearestInteractableElevator(position, states, definitions = toyboxElevatorDefinitions) {
  let nearest = null;
  for (const definition of definitions) {
    const state = states instanceof Map ? states.get(definition.id) : states?.[definition.id];
    const context = elevatorInteractionContext(position, definition, state);
    if (!context || (nearest && context.distance >= nearest.distance)) continue;
    nearest = { definition, state, ...context };
  }
  return nearest;
}

export function elevatorTargetForInteraction(context, definition, state, direction = 1) {
  if (!context) return state.targetFloor;
  if (context.kind === "call") return context.floor;
  const step = finite(direction, 1) < 0 ? -1 : 1;
  const floor = state.currentFloor + step;
  if (floor > definition.maxFloor) return 0;
  if (floor < 0) return definition.maxFloor;
  return floor;
}

export function isOnElevatorPlatform(position, definition, platformY, verticalTolerance = 0.5) {
  return Boolean(position) &&
    Math.abs(finite(position.x, Infinity) - definition.x) <= definition.width / 2 - 0.12 &&
    Math.abs(finite(position.z, Infinity) - definition.z) <= definition.depth / 2 - 0.12 &&
    Math.abs(finite(position.y, -Infinity) - finite(platformY)) <= Math.max(0.1, finite(verticalTolerance, 0.5));
}

export function elevatorPlatformBox(definition, platformY, thickness = 0.2) {
  const surfaceY = finite(platformY, PLAYER_EYE_HEIGHT) - PLAYER_EYE_HEIGHT;
  const platformThickness = clamp(finite(thickness, 0.2), 0.08, 0.5);
  return {
    minX: definition.x - definition.width / 2,
    maxX: definition.x + definition.width / 2,
    minY: surfaceY - platformThickness,
    maxY: surfaceY + 0.025,
    minZ: definition.z - definition.depth / 2,
    maxZ: definition.z + definition.depth / 2,
    movement: false,
    elevatorId: definition.id
  };
}
