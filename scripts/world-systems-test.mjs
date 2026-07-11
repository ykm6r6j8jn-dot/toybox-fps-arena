import assert from "node:assert/strict";
import {
  createDoorState,
  doorPanelBoxes,
  doorShouldOpen,
  nearestInteractableDoor,
  stepDoorOpenness,
  toyboxDoorDefinitions
} from "../world-systems.mjs";

assert.equal(toyboxDoorDefinitions.length, 6, "all accessible interiors must share authoritative door definitions");
assert.equal(new Set(toyboxDoorDefinitions.map((door) => door.id)).size, toyboxDoorDefinitions.length, "door ids must be unique");

const door = toyboxDoorDefinitions[0];
const state = createDoorState(door, 1000);
assert.deepEqual(state, { id: door.id, openness: 0, targetOpen: false, holdOpenUntil: 0, updatedAt: 1000 });
assert.equal(doorShouldOpen(door, [{ x: door.x, y: door.y, z: door.z + 2 }], 0, 1000), true);
assert.equal(doorShouldOpen(door, [{ x: door.x, y: door.y + 5, z: door.z }], 0, 1000), false);
assert.equal(doorShouldOpen(door, [], 1200, 1000), true, "manual hold must keep the door open");

assert.ok(Math.abs(stepDoorOpenness(0, true, 0.2, door) - 0.57) < 1e-9);
assert.equal(stepDoorOpenness(0.95, true, 0.2, door), 1);
assert.equal(stepDoorOpenness(0.2, false, 0.2, door), 0);

const closed = doorPanelBoxes(door, 0);
const open = doorPanelBoxes(door, 1);
assert.equal(closed.length, 2);
assert.ok(closed[0].maxX >= closed[1].minX, "closed panels must overlap enough to prevent a projectile seam");
assert.ok(open[0].maxX < closed[0].maxX - 2, "left panel must slide away from the opening");
assert.ok(open[1].minX > closed[1].minX + 2, "right panel must slide away from the opening");
assert.ok(open[1].minX - open[0].maxX > 4.5, "fully open door must clear the player path");

const nearby = nearestInteractableDoor({ x: door.x, y: door.y, z: door.z + 4 });
assert.equal(nearby?.definition.id, door.id);
assert.equal(nearestInteractableDoor({ x: 0, y: 30, z: 0 }), null);

console.log("world systems passed: shared doors have deterministic sensing, motion, collision boxes, and interaction range");
