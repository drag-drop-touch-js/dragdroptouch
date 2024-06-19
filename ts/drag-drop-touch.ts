//https://github.com/Bernardo-Castilho/dragdroptouch/blob/master/DragDropTouch.js
'use strict';

import {copyStyle, newForwardableEvent, pointFrom, supportsPassive} from "./drag-drop-touch-util";
import {DragDTO} from "./drag-dto";

const DefaultConfiguration = {
  dragImageOpacity: '0.5',
  dragThresholdPixels: 5,
  isPressHoldMode: false,

  contextMenuDelayMS: 900,
  pressHoldDelayMS: 400,
  pressHoldMargin: 25,
  pressHoldThresholdPixels: 0,

} as const;


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
export class DragDropTouch {

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
  private _pressHoldIntervalId?: number | NodeJS.Timeout;

  private readonly configuration: typeof DefaultConfiguration;


  constructor(dragRoot: Document | Element = document, dropTree: Document | Element = document, options?: Partial<typeof DefaultConfiguration>) {
    this._dragRoot = dragRoot;

    this.configuration = {...DefaultConfiguration, ...(options || {})}

    // Deal with shadow DOM elements.
    // Previous implementation used `document.elementFromPoint` to find the dropped upon
    // element. This, however, doesn't "pierce" the shadow DOM. So instead, we can
    // provide a drop tree element to search within. It would be nice if `elementFromPoint`
    // were implemented on this node (arbitrarily), but it only appears on documents and
    // shadow roots. So here we simply walk up the DOM tree until we find that method.
    // In fact this does NOT restrict dropping to just the root provided-- but the
    // whole tree. I'm not sure that this is a general solution, but works for my specific
    // and the general one.
    this._dropRoot = dropTree as any
    while (!(this._dropRoot as any).elementFromPoint && this._dropRoot.parentNode)
      this._dropRoot = this._dropRoot.parentNode as any
    this._dragSource = null;
    this._lastTouch = null;
    this._lastTarget = null;
    this._ptDown = null;
    this._isDragEnabled = false;
    this._isDropZone = false;
    this._dataTransfer = new DragDTO(this);
    this._img = null;
    this._imgCustom = null;
    this._imgOffset = {x: 0, y: 0};
    // this._pressHoldIntervalId = null;
    this.listen();
  }


  listen() {
    if (!navigator.maxTouchPoints) return

    const opt = supportsPassive(this._dragRoot)
      ? {passive: false, capture: false}
      : false;

    this._dragRoot.addEventListener('touchstart', this._touchstart.bind(this) as EventListener, opt);
    this._dragRoot.addEventListener('touchmove', this._touchmove.bind(this) as EventListener, opt);
    this._dragRoot.addEventListener('touchend', this._touchend.bind(this) as EventListener);
    this._dragRoot.addEventListener('touchcancel', this._touchend.bind(this) as EventListener);
  }


  setDragImage(img: HTMLElement, offsetX: number, offsetY: number) {
    this._imgCustom = img;
    this._imgOffset = {x: offsetX, y: offsetY};
  }

  _touchstart(e: TouchEvent) {

    if (this._shouldHandle(e)) {
      this._reset();
      let src = this._closestDraggable(e.target as Node);
      if (src) {
        // give caller a chance to handle the hover/move events
        if (e.target &&
          !this._dispatchEvent(e, 'mousemove', e.target) &&
          !this._dispatchEvent(e, 'mousedown', e.target!)) {
          // get ready to start dragging
          this._dragSource = src;
          this._ptDown = pointFrom(e);
          this._lastTouch = e;

          // do not prevent default (so input elements keep working)
          //e.preventDefault();

          // show context menu if the user hasn't started dragging after a while
          setTimeout(() => {
            if (this._dragSource === src && this._img === null) {
              if (this._dispatchEvent(e, 'contextmenu', src)) {
                this._reset();
              }
            }
          }, this.configuration.contextMenuDelayMS);
          if (this.configuration.isPressHoldMode) {
            this._pressHoldIntervalId = setTimeout(() => {
              this._isDragEnabled = true;
              this._touchmove(e);
            }, this.configuration.pressHoldDelayMS);
          }
        }
      }
    }
  }

  _touchmove(e: TouchEvent) {

    if (this._shouldCancelPressHoldMove(e)) {
      this._reset();
      return;
    }
    if (this._shouldHandleMove(e) || this._shouldHandlePressHoldMove(e)) {

      // see if target wants to handle move
      let target = this._getTarget(e)!;
      if (this._dispatchEvent(e, 'mousemove', target)) {
        this._lastTouch = e;
        e.preventDefault();
        return;
      }

      // start dragging
      if (this._dragSource && !this._img && this._shouldStartDragging(e)) {
        if (this._dispatchEvent(this._lastTouch!, 'dragstart', this._dragSource)) {
          // target canceled the drag event
          this._dragSource = null;
          return;
        }
        this._createImage(e);
        this._dispatchEvent(e, 'dragenter', target);
      }

      // continue dragging
      if (this._img && this._dragSource) {
        this._lastTouch = e;
        e.preventDefault(); // prevent scrolling
        this._dispatchEvent(e, 'drag', this._dragSource);
        if (target !== this._lastTarget) {
          if (this._lastTarget)
            this._dispatchEvent(this._lastTouch, 'dragleave', this._lastTarget);
          this._dispatchEvent(e, 'dragenter', target);
          this._lastTarget = target;
        }
        this._moveImage(e);
        this._isDropZone = this._dispatchEvent(e, 'dragover', target)
        //|| this._dispatchEvent(e, 'dragover', this._dragSource);
      }
    }
  }

  _touchend(e: TouchEvent) {
    if (!(this._lastTouch && e.target && this._lastTarget)) return // TODO check this new logic

    if (this._shouldHandle(e)) {
      if (this._dispatchEvent(this._lastTouch, 'mouseup', e.target)) {
        e.preventDefault();
        return;
      }

      // user clicked the element but didn't drag, so clear the source and simulate a click
      if (!this._img) {
        this._dragSource = null;
        this._dispatchEvent(this._lastTouch, 'click', e.target);
      }

      // finish dragging
      this._destroyImage();
      if (this._dragSource) {
        if (e.type.indexOf('cancel') < 0 && this._isDropZone) {
          this._dispatchEvent(this._lastTouch, 'drop', this._lastTarget);
        }
        this._dispatchEvent(this._lastTouch, 'dragend', this._dragSource);
        this._reset();
      }
    }
  }

  _shouldHandle(e: TouchEvent) {
    return e &&
      !e.defaultPrevented &&
      e.touches && e.touches.length < 2;
  }

  _shouldHandleMove(e: TouchEvent) {
    return !this.configuration.isPressHoldMode && this._shouldHandle(e);
  }

  _shouldHandlePressHoldMove(e: TouchEvent) {
    return this.configuration.isPressHoldMode &&
      this._isDragEnabled && e && e.touches && e.touches.length;
  }

  _shouldCancelPressHoldMove(e: TouchEvent) {
    return this.configuration.isPressHoldMode && !this._isDragEnabled &&
      this._getDelta(e) > this.configuration.pressHoldMargin;
  }

  _shouldStartDragging(e: TouchEvent) {
    let delta = this._getDelta(e);
    return delta > this.configuration.dragThresholdPixels ||
      (this.configuration.isPressHoldMode && delta >= this.configuration.pressHoldThresholdPixels);
  }

  _reset() {
    this._destroyImage();
    this._dragSource = null;
    this._lastTouch = null;
    this._lastTarget = null;
    this._ptDown = null;
    this._isDragEnabled = false;
    this._isDropZone = false;
    this._dataTransfer = new DragDTO(this);
    clearInterval(this._pressHoldIntervalId);
  }


  _getDelta(e: TouchEvent) {
    if (!this._ptDown) return 0; // Added by NDP  OK? TODO
    if (this.configuration.isPressHoldMode && !this._ptDown) {
      return 0;
    }
    let p = pointFrom(e);
    return Math.abs(p.x - this._ptDown.x) + Math.abs(p.y - this._ptDown.y);
  }

  _getTarget(e: TouchEvent) {
    let pt = pointFrom(e),
      el = this._dropRoot.elementFromPoint(pt.x, pt.y);
    while (el && getComputedStyle(el).pointerEvents == 'none') {
      el = el.parentElement;
    }
    return el;
  }

  _createImage(e: TouchEvent) {
    // just in case...
    if (this._img) {
      this._destroyImage();
    }
    // create drag image from custom element or drag source
    let src = this._imgCustom || this._dragSource as HTMLElement;
    this._img = src.cloneNode(true) as HTMLElement;
    copyStyle(src, this._img);
    this._img.style.top = this._img.style.left = '-9999px';
    // if creating from drag source, apply offset and opacity
    if (!this._imgCustom) {
      let rc = src.getBoundingClientRect(),
        pt = pointFrom(e);
      this._imgOffset = {x: pt.x - rc.left, y: pt.y - rc.top};
      this._img.style.opacity = this.configuration.dragImageOpacity;
    }
    // add image to document
    this._moveImage(e);
    document.body.appendChild(this._img);
  }

  _destroyImage() {
    if (this._img && this._img.parentElement) {
      this._img.parentElement.removeChild(this._img);
    }
    this._img = null;
    this._imgCustom = null;
  }

  _moveImage(e: TouchEvent) {
    requestAnimationFrame(() => {
      if (this._img) {
        let pt = pointFrom(e, true),
          s = this._img.style;
        s.position = 'absolute';
        s.pointerEvents = 'none';
        s.zIndex = '999999';
        s.left = Math.round(pt.x - this._imgOffset.x) + 'px';
        s.top = Math.round(pt.y - this._imgOffset.y) + 'px';
      }
    });
  }
  _dispatchEvent(srcEvent: TouchEvent, type: keyof GlobalEventHandlersEventMap, target: EventTarget) {

    if (!(srcEvent && target))
      return false;
    const evt = newForwardableEvent(type, srcEvent, target as HTMLElement);

    // DragEvents need a data transfer object
    (evt as any).dataTransfer = this._dataTransfer;
    target.dispatchEvent(evt as unknown as Event);
    return evt.defaultPrevented;
  }


  _closestDraggable(el: Node | null) {
    for (; el; el = el.parentElement) {
      if (/*e.hasAttribute('draggable') &&*/ (el as any).draggable) {
        return el;
      }
    }
    return null;
  }
}

dr