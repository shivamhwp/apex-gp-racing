export function steeringDirection(keys) {
  const left = keys.has('KeyA') || keys.has('ArrowLeft');
  const right = keys.has('KeyD') || keys.has('ArrowRight');
  // The circuit normal is (tangent.z, 0, -tangent.x): positive lateral
  // offsets point to the driver's left in both forward-facing cameras.
  return Number(left) - Number(right);
}
