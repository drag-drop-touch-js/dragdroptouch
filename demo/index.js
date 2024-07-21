// Set up automagical touch-to-drag-event rewriting
import "./../dist/drag-drop-touch.esm.js?autoload";

// The rest of the code doesn't know anything about touch
// events, it's written as normal drag-and-drop handlers.
let draggable = null;
const cols = document.querySelectorAll(`#columns .column`);

cols.forEach((col) => {
  col.addEventListener(`dragstart`, handleDragStart);
  col.addEventListener(`dragenter`, handleDragEnter);
  col.addEventListener(`dragover`, handleDragOver);
  col.addEventListener(`dragleave`, handleDragLeave);
  col.addEventListener(`drop`, handleDrop);
  col.addEventListener(`dragend`, handleDragEnd);
});

function handleDragStart({ target, dataTransfer }) {
  if (target.className.includes(`column`)) {
    draggable = target;
    draggable.classList.add(`dragging`);

    dataTransfer.effectAllowed = `move`;
    dataTransfer.setData(`text`, draggable.innerHTML);

    // customize drag image for one of the panels
    const haveDragFn = dataTransfer.setDragImage instanceof Function;
    if (haveDragFn && target.textContent.includes(`X`)) {
      let img = new Image();
      img.src = `dragimage.jpg`;
      dataTransfer.setDragImage(img, img.width / 2, img.height / 2);
    }
  }
}

function handleDragOver(evt) {
  if (draggable) {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = `move`;
  }
}

function handleDragEnter({ target }) {
  if (draggable) {
    target.classList.add(`over`);
  }
}

function handleDragLeave({ target }) {
  if (draggable) {
    target.classList.remove(`over`);
  }
}

function handleDragEnd() {
  draggable = null;
  cols.forEach((col) => col.classList.remove(`over`));
}

function handleDrop(evt) {
  if (draggable === null) return;

  evt.stopPropagation();
  evt.stopImmediatePropagation();
  evt.preventDefault();

  if (draggable !== this) {
    swapDom(draggable, this);
  }
}

// https://stackoverflow.com/questions/9732624/how-to-swap-dom-child-nodes-in-javascript
function swapDom(a, b) {
  let aParent = a.parentNode;
  let bParent = b.parentNode;
  let aHolder = document.createElement(`div`);
  let bHolder = document.createElement(`div`);
  aParent.replaceChild(aHolder, a);
  bParent.replaceChild(bHolder, b);
  aParent.replaceChild(b, aHolder);
  bParent.replaceChild(a, bHolder);
}
