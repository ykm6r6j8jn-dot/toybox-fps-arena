import assert from "node:assert/strict";
import {
  createElevatorState,
  elevatorInteractionContext,
  elevatorPlatformBox,
  elevatorTargetForInteraction,
  floorEyeY,
  isOnElevatorPlatform,
  nearestInteractableElevator,
  nearestTowerFloor,
  setElevatorTarget,
  spiralRoutePoint,
  stepElevatorState,
  stepFloorProgress,
  stepVerticalHeight,
  towerAtPosition,
  toyboxElevatorDefinitions,
  toyboxTowerDefinitions
} from "../vertical-systems.mjs";

const near = (actual, expected, epsilon = 0.0001) => assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${expected}, received ${actual}`);

assert.equal(toyboxTowerDefinitions.length, 2);
assert.equal(toyboxElevatorDefinitions.length, 2);
assert.equal(new Set(toyboxTowerDefinitions.map((tower) => tower.id)).size, 2);
assert.equal(new Set(toyboxElevatorDefinitions.map((elevator) => elevator.id)).size, 2);

const aurora = toyboxTowerDefinitions[0];
assert.equal(towerAtPosition({ x: 74, z: -22 })?.id, "aurora");
assert.equal(towerAtPosition({ x: 0, z: 0 }), null);
near(floorEyeY(aurora, 0), 1.6);
near(floorEyeY(aurora, 1), 7.26);
near(floorEyeY(aurora, 4), 23.76);
assert.equal(nearestTowerFloor(aurora, 12.7), 2);

const routeStart = spiralRoutePoint(aurora, 0);
const routeEnd = spiralRoutePoint(aurora, 4);
near(routeStart.y, 1.6);
near(routeEnd.y, 23.76);
assert.ok(Math.hypot(routeStart.x - aurora.spiral.x, routeStart.z - aurora.spiral.z) > 2.3);
assert.ok(Math.hypot(routeEnd.x - aurora.spiral.x, routeEnd.z - aurora.spiral.z) > 2.3);
near(stepFloorProgress(0, 2, 0.1), 0.034);
near(stepFloorProgress(1.99, 2, 0.1), 2);
near(stepVerticalHeight(1.6, 7.26, 0.1), 1.94);
near(stepVerticalHeight(7.2, 7.26, 0.1), 7.26);

const elevator = toyboxElevatorDefinitions[0];
const state = createElevatorState(elevator, 1000);
assert.equal(state.currentFloor, 0);
assert.equal(state.platformY, 1.6);
setElevatorTarget(state, elevator, 2);
assert.equal(state.targetFloor, 2);
assert.equal(state.moving, true);
stepElevatorState(state, elevator, 1100);
near(state.platformY, 1.6 + elevator.speed * 0.1);
assert.equal(state.direction, 1);
for (let now = 1200; now <= 5000; now += 100) stepElevatorState(state, elevator, now);
assert.equal(state.currentFloor, 2);
assert.equal(state.moving, false);
near(state.platformY, floorEyeY(elevator, 2));

const inside = elevatorInteractionContext({ x: elevator.x, y: state.platformY, z: elevator.z }, elevator, state);
assert.equal(inside?.kind, "ride");
assert.equal(elevatorTargetForInteraction(inside, elevator, state), 3);
assert.equal(
  elevatorInteractionContext({ x: elevator.x, y: floorEyeY(elevator, 2), z: elevator.frontZ }, elevator, state),
  null,
  "an arrived lift must only depart after the player boards"
);
const landing = elevatorInteractionContext({ x: elevator.x, y: floorEyeY(elevator, 4), z: elevator.frontZ }, elevator, state);
assert.equal(landing?.kind, "call");
assert.equal(elevatorTargetForInteraction(landing, elevator, state), 4);
assert.equal(nearestInteractableElevator({ x: elevator.x, y: state.platformY, z: elevator.z }, new Map([[elevator.id, state]]))?.definition.id, elevator.id);
assert.equal(isOnElevatorPlatform({ x: elevator.x, y: state.platformY, z: elevator.z }, elevator, state.platformY), true);
assert.equal(isOnElevatorPlatform({ x: elevator.x + 4, y: state.platformY, z: elevator.z }, elevator, state.platformY), false);
const platformBox = elevatorPlatformBox(elevator, state.platformY);
assert.equal(platformBox.elevatorId, elevator.id);
assert.equal(platformBox.movement, false);
assert.ok(platformBox.minY < floorEyeY(elevator, 2) - 1.6 && platformBox.maxY > floorEyeY(elevator, 2) - 1.6);

console.log("vertical systems passed: tower floors, spiral routes, elevator authority, projectile boxes, and interaction ranges are deterministic");
