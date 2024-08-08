"use strict";

import {
  copyStyle,
  newForwardableEvent,
  pointFrom,
} from "./drag-drop-touch-util";
import { DragDTO } from "./drag-dto";

const { round } = Math;

type DragDropTouchConfiguration = {
  // A flag that determines whether to allow scrolling
  // when a drag reaches the edges of the screen.
  allowDragScroll: boolean;

  // The number of milliseconds we'll wait before we
  // trigger a context menu event on long press.
  contextMenuDelayMS: number;

  // How see-through should the "drag placeholder",
  // that's attached to the cursor while dragging, be?
  dragImageOpacity: number;

  // The size of the "hot region" at the edge of the
  // screen on which scrolling will be allowed, if
  // the allowDragScroll flag is true (the default).
  dragScrollPercentage: number;

  // The number of pixels to scroll if a drag event
  // occurs within a scrolling hot region.
  dragScrollSpeed: number;

  // How much do we need to touchmove before the code
  // switches to drag mode rather than click mode?
  dragThresholdPixels: number;

  // The flag that tells us whether a long-press should
  // count as a user signal to "pick up an item" for
  // drag and drop purposes.
  isPressHoldMode: boolean;

  // A flag that determines whether the code should ignore
  // the navigator.maxTouchPoints value, which normally
  // tells us whether to expect touch events or not.
  forceListen: boolean;

  // The number of milliseconds we'll wait before we
  // consider an active press to be a "long press".
  pressHoldDelayMS: number;

  // The number of pixels we allow a touch event to
  // drift over the course of a long press start.
  pressHoldMargin: number;

  // The drift in pixels that determines whether a
  // long press starts a long press, or a touch-drag.
  pressHoldThresholdPixels: number;
};

const DefaultConfiguration: DragDropTouchConfiguration = {
  allowDragScroll: true,
  contextMenuDelayMS: 900,
  dragImageOpacity: 0.5,
  dragScrollPercentage: 10,
  dragScrollSpeed: 10,
  dragThresholdPixels: 5,
  forceListen: false,
  isPressHoldMode: false,
  pressHoldDelayMS: 400,
  pressHoldMargin: 25,
  pressHoldThresholdPixels: 0,
};

interface Point {
  x: number;
  y: number;
}

/**
 * Defines a class that adds support for touch-based HTML5 drag/drop operations.
 *
 * The @see:DragDropTouch class listens to touch events and raises the
 * appropriate HTML5 drag/drop events as if the events had been caused
 * by mouse actions.
 *
 * The purpose of this class is to enable using existing, standard HTML5
 * drag/drop code on mobile devices running IOS or Android.
 *
 * To use, include the DragDropTouch.js file on the page. The class will
 * automatically start monitoring touch events and will raise the HTML5
 * drag drop events (`dragstart`, `dragenter`, `dragleave`, `drop`, `dragend`) which
 * should be handled by the application.
 *
 * For details and examples on HTML drag and drop, see
 * https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Drag_operations.
 */
class DragDropTouch {
  private readonly _dragRoot: Document | Element;
  private _dropRoot: Document | ShadowRoot;
  private _dragSource: EventTarget | null;
  private _lastTouch: TouchEvent | null;
  private _lastTarget: EventTarget | null;
  private _ptDown: Point | null;
  private _isDragEnabled: boolean;
  private _isDropZone: boolean;
  private _dataTransfer: DragDTO;
  private _img: HTMLElement | null;
  private _imgCustom: HTMLElement | null;
  private _imgOffset: Point;
  private _pressHoldIntervalId?: ReturnType<typeof setTimeout> | undefined;

  private readonly configuration: DragDropTouchConfiguration;

  /**
   * Deal with shadow DOM elements.
   *
   * Previous implementation used `document.elementFromPoint` to find the dropped upon
   * element. This, however, doesn't "pierce" the shadow DOM. So instead, we can
   * provide a drop tree element to search within. It would be nice if `elementFromPoint`
   * were implemented on this node (arbitrarily), but it only appears on documents and
   * shadow roots. So here we simply walk up the DOM tree until we find that method.
   *
   * In fact this does NOT restrict dropping to just the root provided-- but the whole
   * tree. I'm not sure that this is a general solution, but works for my specific and
   * the general one.
   *
   * @param dragRoot
   * @param options
   */
  constructor(
    dragRoot: Document | Element = document,
    dropRoot: Document | Element = document,
    options?: Partial<DragDropTouchConfiguration>,
  ) {
    this.configuration = { ...DefaultConfiguration, ...(options || {}) };
    this._dragRoot = dragRoot;
    this._dropRoot = dropRoot as any;
    while (
      !(this._dropRoot as any).elementFromPoint &&
      this._dropRoot.parentNode
    )
      this._dropRoot = this._dropRoot.parentNode as any;
    this._dragSource = null;
    this._lastTouch = null;
    this._lastTarget = null;
    this._ptDown = null;
    this._isDragEnabled = false;
    this._isDropZone = false;
    this._dataTransfer = new DragDTO(this);
    this._img = null;
    this._imgCustom = null;
    this._imgOffset = { x: 0, y: 0 };
    this.listen();
  }

  /**
   * ...docs go here...
   * @returns
   */
  listen() {
    if (navigator.maxTouchPoints === 0 && !this.configuration.forceListen) {
      return;
    }

    const opt = { passive: false, capture: false };

    this._dragRoot.addEventListener(
      `touchstart`,
      this._touchstart.bind(this) as EventListener,
      opt,
    );
    this._dragRoot.addEventListener(
      `touchmove`,
      this._touchmove.bind(this) as EventListener,
      opt,
    );
    this._dragRoot.addEventListener(
      `touchend`,
      this._touchend.bind(this) as EventListener,
    );
    this._dragRoot.addEventListener(
      `touchcancel`,
      this._touchend.bind(this) as EventListener,
    );
  }

  /**
   * ...docs go here...
   * @param img
   * @param offsetX
   * @param offsetY
   */
  setDragImage(img: HTMLElement, offsetX: number, offsetY: number) {
    this._imgCustom = img;
    this._imgOffset = { x: offsetX, y: offsetY };
  }

  /**
   * ...docs go here...
   * @param e
   */
  _touchstart(e: TouchEvent) {
    DEBUG: console.log(`touchstart`);
    if (this._shouldHandle(e)) {
      DEBUG: console.log(`handling touch start, resetting state`);
      this._reset();
      let src = this._closestDraggable(e.target as HTMLElement);
      if (src) {
        // give caller a chance to handle the hover/move events
        if (
          e.target &&
          !this._dispatchEvent(e, `mousemove`, e.target) &&
          !this._dispatchEvent(e, `mousedown`, e.target!)
        ) {
          // get ready to start dragging
          this._dragSource = src;
          this._ptDown = pointFrom(e);
          this._lastTouch = e;

          // show context menu if the user hasn't started dragging after a while
          DEBUG: console.log(`setting a contextmenu timeout`);
          setTimeout(() => {
            if (this._dragSource === src && this._img === null) {
              if (this._dispatchEvent(e, `contextmenu`, src)) {
                this._reset();
              }
            }
          }, this.configuration.contextMenuDelayMS);

          if (this.configuration.isPressHoldMode) {
            DEBUG: console.log(`setting a press-hold timeout`);
            this._pressHoldIntervalId = setTimeout(() => {
              this._isDragEnabled = true;
              this._touchmove(e);
            }, this.configuration.pressHoldDelayMS);
          }

          // We need this in case we're dealing with simulated touch events,
          // in which case the touch start + touch end won't have automagically
          // been turned into click events by the browser.
          else if (!e.isTrusted) {
            if (e.target !== this._lastTarget) {
              DEBUG: console.log(`synthetic touch start: saving _lastTarget`);
              this._lastTarget = e.target;
            }
          }
        }
      }
    }
  }

  /**
   * ...docs go here...
   * @param e
   * @returns
   */
  _touchmove(e: TouchEvent) {
    DEBUG: console.log(`touchmove`);

    if (this._shouldCancelPressHoldMove(e)) {
      DEBUG: console.log(`cancel press-hold move`);
      this._reset();
      return;
    }

    if (this._shouldHandleMove(e) || this._shouldHandlePressHoldMove(e)) {
      DEBUG: console.log(`handling touch move`);

      // see if target wants to handle move
      let target = this._getTarget(e)!;
      if (this._dispatchEvent(e, `mousemove`, target)) {
        DEBUG: console.log(`target handled mousemove, returning early.`);
        this._lastTouch = e;
        e.preventDefault();
        return;
      }

      // start dragging
      if (this._dragSource && !this._img && this._shouldStartDragging(e)) {
        DEBUG: console.log(`should start dragging`);
        if (
          this._dispatchEvent(this._lastTouch!, `dragstart`, this._dragSource)
        ) {
          DEBUG: console.log(`target canceled drag event, returning early.`);
          this._dragSource = null;
          return;
        }
        this._createImage(e);
        this._dispatchEvent(e, `dragenter`, target);
      }

      // continue dragging
      if (this._img && this._dragSource) {
        DEBUG: console.log(`continue dragging`);
        this._lastTouch = e;
        e.preventDefault();

        this._dispatchEvent(e, `drag`, this._dragSource);
        if (target !== this._lastTarget) {
          if (this._lastTarget)
            this._dispatchEvent(this._lastTouch, `dragleave`, this._lastTarget);
          this._dispatchEvent(e, `dragenter`, target);
          this._lastTarget = target;
        }
        this._moveImage(e);
        this._isDropZone = this._dispatchEvent(e, `dragover`, target);

        // Allow scrolling if the screen edges were marked as "hot regions".
        if (this.configuration.allowDragScroll) {
          DEBUG: console.log(`synthetic scroll allowed`);
          const delta = this._getHotRegionDelta(e);
          globalThis.scrollBy(delta.x, delta.y);
        }
      }
    }
  }

  /**
   * ...docs go here...
   * @param e
   * @returns
   */
  _touchend(e: TouchEvent) {
    DEBUG: console.log(`touchend`);

    if (!(this._lastTouch && e.target && this._lastTarget)) {
      DEBUG: console.log(`no lastTouch for touchend, resetting state.`);
      this._reset();
      return;
    }

    if (this._shouldHandle(e)) {
      DEBUG: console.log(`handling touch end`);

      if (this._dispatchEvent(this._lastTouch, `mouseup`, e.target)) {
        DEBUG: console.log(`target handled mouseup, returning early.`);
        e.preventDefault();
        return;
      }

      // user clicked the element but didn't drag, so clear the source and simulate a click
      if (!this._img) {
        DEBUG: console.log(`click rather than drag.`);
        this._dragSource = null;
        this._dispatchEvent(this._lastTouch, `click`, e.target);
      }

      // finish dragging
      this._destroyImage();
      if (this._dragSource) {
        DEBUG: console.log(`handling drop.`);
        if (e.type.indexOf(`cancel`) < 0 && this._isDropZone) {
          DEBUG: console.log(`drop was canceled.`);
          this._dispatchEvent(this._lastTouch, `drop`, this._lastTarget);
        }
        this._dispatchEvent(this._lastTouch, `dragend`, this._dragSource);
        this._reset();
      }
    }
  }

  /**
   * ...docs go here...
   * @param e
   * @returns
   */
  _shouldHandle(e: TouchEvent) {
    return e && !e.defaultPrevented && e.touches && e.touches.length < 2;
  }

  /**
   * ...docs go here...
   * @param e
   * @returns
   */
  _shouldHandleMove(e: TouchEvent) {
    return !this.configuration.isPressHoldMode && this._shouldHandle(e);
  }

  /**
   * ...docs go here...
   * @param e
   * @returns
   */
  _shouldHandlePressHoldMove(e: TouchEvent) {
    return (
      this.configuration.isPressHoldMode &&
      this._isDragEnabled &&
      e &&
      e.touches &&
      e.touches.length
    );
  }

  /**
   * ...docs go here...
   * @param e
   * @returns
   */
  _shouldCancelPressHoldMove(e: TouchEvent) {
    return (
      this.configuration.isPressHoldMode &&
      !this._isDragEnabled &&
      this._getDelta(e) > this.configuration.pressHoldMargin
    );
  }

  /**
   * ...docs go here...
   * @param e
   * @returns
   */
  _shouldStartDragging(e: TouchEvent) {
    let delta = this._getDelta(e);
    if (this.configuration.isPressHoldMode) {
      DEBUG: console.log(
        this.configuration.isPressHoldMode,
        delta,
        this.configuration.pressHoldThresholdPixels,
      );
      return delta >= this.configuration.pressHoldThresholdPixels;
    }
    return delta > this.configuration.dragThresholdPixels;
  }

  /**
   * ...docs go here...
   */
  _reset() {
    this._destroyImage();
    this._dragSource = null;
    this._lastTouch = null;
    this._lastTarget = null;
    this._ptDown = null;
    this._isDragEnabled = false;
    this._isDropZone = false;
    this._dataTransfer = new DragDTO(this);
    clearTimeout(this._pressHoldIntervalId);
  }

  /**
   * ...docs go here...
   * @param e
   * @returns
   */
  _getDelta(e: TouchEvent) {
    // if there is no active touch we don't need to calculate anything.
    if (!this._ptDown) return 0;

    // Determine how `far` from the event coordinate our
    // original touch coordinate was.
    const { x, y } = this._ptDown;
    const p = pointFrom(e);
    return ((p.x - x) ** 2 + (p.y - y) ** 2) ** 0.5;
  }

  /**
   * ...docs go here...
   * @param e
   */
  _getHotRegionDelta(e: TouchEvent) {
    const { clientX: x, clientY: y } = e.touches[0];
    const { innerWidth: w, innerHeight: h } = globalThis;
    const { dragScrollPercentage, dragScrollSpeed } = this.configuration;
    const v1 = dragScrollPercentage / 100;
    const v2 = 1 - v1;
    const dx =
      x < w * v1 ? -dragScrollSpeed : x > w * v2 ? +dragScrollSpeed : 0;
    const dy =
      y < h * v1 ? -dragScrollSpeed : y > h * v2 ? +dragScrollSpeed : 0;
    return { x: dx, y: dy };
  }

  /**
   * ...docs go here...
   * @param e
   * @returns
   */
  _getTarget(e: TouchEvent) {
    let pt = pointFrom(e),
      el = this._dropRoot.elementFromPoint(pt.x, pt.y);
    while (el && getComputedStyle(el).pointerEvents == `none`) {
      el = el.parentElement;
    }
    return el;
  }

  /**
   * ...docs go here...
   * @param e
   */
  _createImage(e: TouchEvent) {
    // just in case...
    if (this._img) {
      this._destroyImage();
    }
    // create drag image from custom element or drag source
    let src = this._imgCustom || (this._dragSource as HTMLElement);
    this._img = src.cloneNode(true) as HTMLElement;
    copyStyle(src, this._img);
    this._img.style.top = this._img.style.left = `-9999px`;
    // if creating from drag source, apply offset and opacity
    if (!this._imgCustom) {
      let rc = src.getBoundingClientRect(),
        pt = pointFrom(e);
      this._imgOffset = { x: pt.x - rc.left, y: pt.y - rc.top };
      this._img.style.opacity = `${this.configuration.dragImageOpacity}`;
    }
    // add image to document
    this._moveImage(e);
    document.body.appendChild(this._img);
  }

  /**
   * ...docs go here...
   */
  _destroyImage() {
    if (this._img && this._img.parentElement) {
      this._img.parentElement.removeChild(this._img);
    }
    this._img = null;
    this._imgCustom = null;
  }

  /**
   * ...docs go here...
   * @param e
   */
  _moveImage(e: TouchEvent) {
    requestAnimationFrame(() => {
      if (this._img) {
        let pt = pointFrom(e, true),
          s = this._img.style;
        s.position = `absolute`;
        s.pointerEvents = `none`;
        s.zIndex = `999999`;
        s.left = `${round(pt.x - this._imgOffset.x)}px`;
        s.top = `${round(pt.y - this._imgOffset.y)}px`;
      }
    });
  }

  /**
   * ...docs go here...
   * @param srcEvent
   * @param type
   * @param target
   * @returns
   */
  _dispatchEvent(
    srcEvent: TouchEvent,
    type: keyof GlobalEventHandlersEventMap,
    target: EventTarget,
  ) {
    if (!(srcEvent && target)) return false;
    const evt = newForwardableEvent(type, srcEvent, target as HTMLElement);

    // DragEvents need a data transfer object
    (evt as any).dataTransfer = this._dataTransfer;
    target.dispatchEvent(evt as unknown as Event);
    return evt.defaultPrevented;
  }

  /**
   * ...docs go here...
   * @param el
   * @returns
   */
  _closestDraggable(element: HTMLElement | null) {
    for (let e = element; e !== null; e = e.parentElement) {
      if (e.draggable) {
        return e;
      }
    }
    return null;
  }
}

/**
 * Offer users a setup function rather than the class itself
 *
 * @param dragRoot
 * @param options
 */
export function enableDragDropTouch(
  dragRoot: Document | Element = document,
  dropRoot: Document | Element = document,
  options?: Partial<typeof DefaultConfiguration>,
) {
  new DragDropTouch(dragRoot, dropRoot, options);
}

// Take advantage of ESM's ability to know which URL it's being
// loaded from, by automatically building the singleton class
// instance if we're being loaded with ?autoload as part of the
// import URL.
if (import.meta.url.includes(`?autoload`)) {
  enableDragDropTouch(document, document, {
    forceListen: true,
  });
}

// If we're not autoloading, expose DragDropTouch but not as the
// class itself but as an object with an .enable() function.
else {
  globalThis.DragDropTouch = {
    enable: function (
      dragRoot: Document | Element = document,
      dropRoot: Document | Element = document,
      options?: Partial<typeof DefaultConfiguration>,
    ): void {
      enableDragDropTouch(dragRoot, dropRoot, options);
    },
  };
}
