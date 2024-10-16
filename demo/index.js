import { codeToHtml } from "https://esm.sh/shiki@1.0.0";

/**
 * Swap two DOM nodes.
 * @param {HTMLElement} a The first node.
 * @param {HTMLElement} b The second node.
 * @see https://stackoverflow.com/questions/9732624/how-to-swap-dom-child-nodes-in-javascript
 */
function swapDom(a, b) {
    if (!a || !b) return;

    const aParent = a.parentNode;
    const bParent = b.parentNode;
    const aHolder = document.createElement(`div`);
    const bHolder = document.createElement(`div`);

    aParent.replaceChild(aHolder, a);
    bParent.replaceChild(bHolder, b);
    aParent.replaceChild(b, aHolder);
    bParent.replaceChild(a, bHolder);
}

let draggableColumn = null;
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
        draggableColumn = target;
        draggableColumn.classList.add(`dragging`);

        dataTransfer.effectAllowed = `move`;
        dataTransfer.setData(`text`, draggableColumn.innerHTML);

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
    if (draggableColumn) {
        evt.preventDefault();
        evt.dataTransfer.dropEffect = `move`;
    }
}

function handleDragEnter({ target }) {
    if (draggableColumn) {
        target.classList.add(`over`);
    }
}

function handleDragLeave({ target }) {
    if (draggableColumn) {
        target.classList.remove(`over`);
    }
}

function handleDragEnd() {
    draggableColumn = null;
    cols.forEach((col) => col.classList.remove(`over`));
}

function handleDrop(evt) {
    if (draggableColumn === null) return;

    evt.stopPropagation();
    evt.stopImmediatePropagation();
    evt.preventDefault();

    if (draggableColumn !== this) {
        swapDom(draggableColumn, this);
    }
}

function enableDragForTasks() {
    /** @type {HTMLElement | null} */
    let currentlyDraggedTask = null;

    const tasks = document.querySelectorAll(`#tasks .task`);
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks.item(i);
        task.addEventListener("dragenter", () => {
            if (currentlyDraggedTask === task) return;

            task.classList.add("drag-over");
        });
        task.addEventListener("drop", (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            task.classList.remove("drag-over");

            if (currentlyDraggedTask !== task) {
                swapDom(currentlyDraggedTask, task);
            }
        });
        task.addEventListener("dragleave", () => {
            task.classList.remove("drag-over");
        });
        task.addEventListener("dragover", (event) => event.preventDefault());
        task.addEventListener("dragstart", () => {
            currentlyDraggedTask = task;
        });
        task.addEventListener("dragend", () => {
            currentlyDraggedTask = null;
        });
    }
}

enableDragForTasks();

function enableDragForKanbanBoard() {
    let currentlyDraggedTask = null;

    const blocks = document.querySelectorAll(`#kanban-board .block`);
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const tasks = block.querySelectorAll(".task");

        for (let j = 0; j < tasks.length; j++) {
            const task = tasks[j];

            task.addEventListener("dragstart", () => {
                currentlyDraggedTask = task;
            });

            task.addEventListener("dragend", () => {
                currentlyDraggedTask = null;
            });

            task.addEventListener("dragover", (event) => {
                event.preventDefault();
                task.classList.add("drag-over");
            });

            task.addEventListener("dragleave", () => {
                task.classList.remove("drag-over");
            });

            task.addEventListener("drop", (event) => {
                event.preventDefault();
                event.stopPropagation();

                task.classList.remove("drag-over");
                blocks.forEach((block) => block.classList.remove("drag-over"));

                if (currentlyDraggedTask && currentlyDraggedTask !== task) {
                    swapDom(currentlyDraggedTask, task);
                }
            });
        }

        block.addEventListener("dragover", (event) => {
            event.preventDefault();
            block.classList.add("drag-over");
        });

        block.addEventListener("dragleave", () => {
            block.classList.remove("drag-over");
        });

        block.addEventListener("drop", (event) => {
            event.preventDefault();
            event.stopPropagation();

            block.classList.remove("drag-over");

            if (currentlyDraggedTask) {
                const ul = block.querySelector("ul");
                const tasks = block.querySelectorAll(".task");
        
                // Get mouse position
                const mouseY = event.clientY;
        
                // Loop through tasks and find the correct position
                let inserted = false;
                for (let i = 0; i < tasks.length; i++) {
                    const task = tasks[i];
                    
                    // Get the task's bounding rectangle
                    const taskRect = task.getBoundingClientRect();
                    
                    // Calculate the midpoint of the task
                    const taskMidY = taskRect.top + taskRect.height / 2;
                    
                    // If mouse is above the midpoint, insert before
                    if (mouseY < taskMidY) {
                        ul.insertBefore(currentlyDraggedTask, task);
                        inserted = true;
                        break;
                    }
                }
        
                // If not inserted above any task, append at the end
                if (!inserted) {
                    ul.appendChild(currentlyDraggedTask);
                }
            }
        });
    }
}

enableDragForKanbanBoard();

/** Change the current year in the copyright. */
const currentYear = new Date().getFullYear();
const copyrights = document.querySelectorAll(`.current-year`);
for (let i = 0; i < copyrights.length; i++) {
    copyrights.item(i).innerHTML = currentYear;
}

/** Handle opening and closing the menu on mobile. */
const navigationContainer = document.querySelector(`#navigation-menu`);
const menuButton = document.querySelector(`#menu-button`);
const backgroundOverlay = document.querySelector(`#background-overlay`);
const closeButton = document.querySelector(`#close-button`);

menuButton.addEventListener("click", () => {
    navigationContainer.classList.toggle("open");
});

backgroundOverlay.addEventListener("click", () => {
    navigationContainer.classList.remove("open");
});

closeButton.addEventListener("click", () => {
    navigationContainer.classList.remove("open");
});

/** Close the menu when a link is clicked. */
const menuLinks = navigationContainer.getElementsByTagName("a");
for (let i = 0; i < menuLinks.length; i++) {
    menuLinks.item(i).addEventListener("click", () => {
        navigationContainer.classList.remove("open");
    });
}

/** Highlight the code with Shiki. */
const downloadPolyfillCode = document.querySelector(`#download-polyfill-code`);
downloadPolyfillCode.innerHTML = await codeToHtml(
    `<script
    src="drag-drop-touch.esm.min.js?autoload"
    type="module"
></script>`,
    {
        lang: "javascript",
        theme: "catppuccin-latte",
    }
);

const importMetaErrorCode = document.querySelector(`#import-meta-error-code`);
importMetaErrorCode.innerHTML = await codeToHtml(
    `Uncaught SyntaxError: import.meta may only appear in a module`,
    {
        lang: "html",
        theme: "catppuccin-latte",
    }
);

const cdnURLCode = document.querySelector(`#cdn-url-code`);
cdnURLCode.innerHTML = await codeToHtml(
    `<script
    src="https://drag-drop-touch-js.github.io/dragdroptouch/dist/drag-drop-touch.esm.min.js"
    type="module"
></script>`,
    {
        lang: "javascript",
        theme: "catppuccin-latte",
    }
);

const esmCode = document.querySelector(`#esm-code`);
esmCode.innerHTML = await codeToHtml(
    `import { enableDragDropTouch } from "./drag-drop-touch.esm.min.js";

// Set up the default full page polyfill:
enableDragDropTouch();

// Or, explicitly polyfill only certain elements
enableDragDropTouch(dragRootElement, dropRootElement);

// Or even explicitly polyfill only certain elements with non-default behaviour
const options = {
    // ...
};
enableDragDropTouch(dragRootElement, dropRootElement, options);`,
    {
        lang: "javascript",
        theme: "catppuccin-latte",
    }
);
