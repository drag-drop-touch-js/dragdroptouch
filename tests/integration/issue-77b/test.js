import { enableDragDropTouch } from "../../../dist/drag-drop-touch.esm.min.js";

import * as simulatedTouch from "../touch-simulation.js";
globalThis.simulatedTouch = simulatedTouch;

globalThis.enablePressHold = (threshold = 0) => {
  enableDragDropTouch(document, document, {
    isPressHoldMode: true,
    pressHoldThresholdPixels: threshold,
  });
};

document.addEventListener(`dragover`, (e) => e.preventDefault());

document.addEventListener(`drop`, (e) => {
  e.preventDefault();
  document.getElementById(`result`).textContent =
    e.dataTransfer.getData(`text/plain`);
});

document.addEventListener(`dragstart`, (e) =>
  e.dataTransfer.setData(`text/plain`, `we dragged a ${e.target.tagName}`)
);
