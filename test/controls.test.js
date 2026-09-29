import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera } from 'three';
import { frame, LENGTH } from '../src/circuit.js';
import { steeringDirection } from '../src/controls.js';

// Check the rendered direction, not just whether an input changes a coordinate.
// The same arrow-key bindings are used by the on-screen touch buttons.
for (const [cameraName, distance, height] of [['chase', -8, 3], ['cockpit', -.55, 1.32]]) {
  for (const [key, expectedSign] of [['KeyA', -1], ['ArrowLeft', -1], ['KeyD', 1], ['ArrowRight', 1]]) {
    test(`${key} moves ${expectedSign < 0 ? 'left' : 'right'} on screen in ${cameraName} view`, () => {
      const turn = steeringDirection(new Set([key]));
      for (const s of [0, 60, LENGTH * .18, LENGTH * .35, LENGTH * .5, LENGTH * .72, LENGTH - 1, LENGTH + 60]) {
        const origin = frame(s);
        const camera = new PerspectiveCamera(60, 16 / 9, .15, 6500);
        camera.position.copy(origin.p).addScaledVector(origin.tangent, distance);
        camera.position.y = height;
        const target = frame(s + 20).p;
        target.y = 1.05;
        camera.lookAt(target);
        camera.updateMatrixWorld();
        const before = frame(s + 6, 0).p.project(camera);
        const after = frame(s + 6, turn).p.project(camera);
        assert.ok((after.x - before.x) * expectedSign > 0, `${key} reversed at distance ${s.toFixed(2)} in ${cameraName} view`);
      }
    });
  }
}
