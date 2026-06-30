import * as THREE from "three";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function lookDirection(yaw, pitch = 0) {
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
  return direction.normalize();
}

function movementBasis(yaw) {
  const forward = lookDirection(yaw);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
  return { forward, right };
}

function minimapForward(yaw) {
  return {
    x: -Math.sin(yaw),
    z: -Math.cos(yaw)
  };
}

function near(actual, expected, label) {
  assert(Math.abs(actual - expected) < 0.001, `${label}: expected ${expected}, got ${actual}`);
}

{
  const { forward, right } = movementBasis(0);
  near(forward.x, 0, "yaw0 forward x");
  near(forward.z, -1, "yaw0 forward z");
  near(right.x, 1, "yaw0 right x");
  near(right.z, 0, "yaw0 right z");
}

{
  const { forward } = movementBasis(Math.PI / 2);
  near(forward.x, -1, "yaw+90 forward x");
  near(forward.z, 0, "yaw+90 forward z");
}

{
  const { forward } = movementBasis(-Math.PI / 2);
  near(forward.x, 1, "yaw-90 forward x");
  near(forward.z, 0, "yaw-90 forward z");
}

{
  const north = minimapForward(0);
  near(north.x, 0, "minimap yaw0 x");
  near(north.z, -1, "minimap yaw0 z");
  const west = minimapForward(Math.PI / 2);
  near(west.x, -1, "minimap yaw+90 x");
  near(west.z, 0, "minimap yaw+90 z");
  const east = minimapForward(-Math.PI / 2);
  near(east.x, 1, "minimap yaw-90 x");
  near(east.z, 0, "minimap yaw-90 z");
}

const colliders = [
  new THREE.Box3(new THREE.Vector3(1.2, 0.2, -0.9), new THREE.Vector3(2.4, 1.8, 0.9))
];
const radius = 0.24;

function collides(position) {
  const playerBox = new THREE.Box3(
    new THREE.Vector3(position.x - radius, 0.2, position.z - radius),
    new THREE.Vector3(position.x + radius, 1.8, position.z + radius)
  );
  return colliders.some((box) => box.intersectsBox(playerBox));
}

function slideMove(position, wish) {
  const next = position.clone();
  const nextX = next.clone();
  nextX.x += wish.x;
  if (!collides(nextX)) next.x = nextX.x;

  const nextZ = next.clone();
  nextZ.z += wish.z;
  if (!collides(nextZ)) next.z = nextZ.z;
  return next;
}

{
  const start = new THREE.Vector3(0.7, 1.6, 0.7);
  const end = slideMove(start, new THREE.Vector3(0.8, 0, -0.7));
  assert(end.z < start.z, "slide move should preserve open-axis movement instead of fully sticking");
  assert(!collides(end), "slide result should not be inside collider");
}

console.log("control physics passed: movement basis and slide collision are correct");
