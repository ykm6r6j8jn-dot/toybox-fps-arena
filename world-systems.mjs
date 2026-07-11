const defaultDoorSettings = Object.freeze({
  width: 5.1,
  height: 2.9,
  thickness: 0.22,
  panelWidth: 2.55,
  panelOffset: 1.26,
  travel: 2.32,
  sensorRadius: 3.15,
  interactRadius: 4.6,
  verticalRange: 3.4,
  openSpeed: 2.85,
  closeSpeed: 1.45
});

function doorDefinition(id, label, x, y, z, overrides = {}) {
  return Object.freeze({ id, label, x, y, z, ...defaultDoorSettings, ...overrides });
}

export const toyboxDoorDefinitions = Object.freeze([
  doorDefinition("aurora-entry", "AURORA TOWER", 74, 1.48, -11.72),
  doorDefinition("metro-entry", "METRO ATRIUM", -48, 1.48, -19.72),
  doorDefinition("north-office-entry", "NORTH OFFICE", 0, 1.48, -75.22),
  doorDefinition("west-arcade-entry", "WEST ARCADE", -80, 1.48, -10.22),
  doorDefinition("east-civic-entry", "EAST CIVIC", 80, 1.48, 25.78),
  doorDefinition("nexus-entry", "NEXUS CENTER", -79, 1.48, -66.72)
]);

export function clampDoorOpenness(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export function createDoorState(definition, now = Date.now()) {
  return {
    id: definition.id,
    openness: 0,
    targetOpen: false,
    holdOpenUntil: 0,
    updatedAt: Number(now) || 0
  };
}

export function stepDoorOpenness(openness, targetOpen, deltaSeconds, definition = defaultDoorSettings) {
  const current = clampDoorOpenness(openness);
  const delta = Math.max(0, Math.min(0.5, Number(deltaSeconds) || 0));
  const speed = targetOpen ? Number(definition.openSpeed) || defaultDoorSettings.openSpeed : Number(definition.closeSpeed) || defaultDoorSettings.closeSpeed;
  const target = targetOpen ? 1 : 0;
  if (current === target || delta <= 0) return current;
  const change = speed * delta;
  return targetOpen ? Math.min(1, current + change) : Math.max(0, current - change);
}

export function distanceToDoor(definition, entity) {
  if (!definition || !entity) return Infinity;
  const x = Number(entity.x);
  const z = Number(entity.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return Infinity;
  return Math.hypot(x - definition.x, z - definition.z);
}

export function doorShouldOpen(definition, entities = [], holdOpenUntil = 0, now = Date.now()) {
  if ((Number(holdOpenUntil) || 0) > (Number(now) || 0)) return true;
  for (const entity of entities) {
    if (!entity || entity.active === false) continue;
    const y = Number.isFinite(Number(entity.y)) ? Number(entity.y) : definition.y;
    if (Math.abs(y - definition.y) > definition.verticalRange) continue;
    if (distanceToDoor(definition, entity) <= definition.sensorRadius) return true;
  }
  return false;
}

export function doorPanelBoxes(definition, openness = 0) {
  const open = clampDoorOpenness(openness);
  const halfWidth = definition.panelWidth / 2;
  const halfHeight = definition.height / 2;
  const halfThickness = definition.thickness / 2;
  const leftX = definition.x - definition.panelOffset - open * definition.travel;
  const rightX = definition.x + definition.panelOffset + open * definition.travel;
  const boxForCenter = (centerX) => ({
    minX: centerX - halfWidth,
    maxX: centerX + halfWidth,
    minY: definition.y - halfHeight,
    maxY: definition.y + halfHeight,
    minZ: definition.z - halfThickness,
    maxZ: definition.z + halfThickness,
    movement: true,
    doorId: definition.id
  });
  return [boxForCenter(leftX), boxForCenter(rightX)];
}

export function nearestInteractableDoor(position, definitions = toyboxDoorDefinitions) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const definition of definitions) {
    const y = Number.isFinite(Number(position?.y)) ? Number(position.y) : definition.y;
    if (Math.abs(y - definition.y) > definition.verticalRange) continue;
    const distance = distanceToDoor(definition, position);
    if (distance <= definition.interactRadius && distance < nearestDistance) {
      nearest = definition;
      nearestDistance = distance;
    }
  }
  return nearest ? { definition: nearest, distance: nearestDistance } : null;
}
