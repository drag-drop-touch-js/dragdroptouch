// ts/drag-drop-touch-util.ts
function pointFrom(e, page = false) {
  const touch = e.touches[0];
  return {
    x: page ? touch.pageX : touch.clientX,
    y: page ? touch.pageY : touch.clientY
  };
}
function copyProps(dst, src, props) {
  for (let i = 0; i < props.length; i++) {
    let p = props[i];
    dst[p] = src[p];
  }
}
function newForwardableEvent(type, srcEvent, target) {
  const _kbdProps = ["altKey", "ctrlKey", "metaKey", "shiftKey"];
  const _ptProps = [
    "pageX",
    "pageY",
    "clientX",
    "clientY",
    "screenX",
    "screenY",
    "offsetX",
    "offsetY"
  ];
  const evt = new Event(type, {
    bubbles: true,
    cancelable: true
  }), touch = srcEvent.touches[0];
  evt.button = 0;
  evt.which = evt.buttons = 1;
  copyProps(evt, srcEvent, _kbdProps);
  copyProps(evt, touch, _ptProps);
  setOffsetAndLayerProps(evt, target);
  return evt;
}
function setOffsetAndLayerProps(e, target) {
  const rect = target.getBoundingClientRect();
  if (e.offsetX === void 0) {
    e.offsetX = e.clientX - rect.x;
    e.offsetY = e.clientY - rect.y;
  }
  if (e.layerX === void 0) {
    e.layerX = e.pageX - rect.left;
    e.layerY = e.pageY - rect.top;
  }
}
function copyStyle(src, dst) {
  removeTroublesomeAttributes(dst);
  if (src instanceof HTMLCanvasElement) {
    let cDst = dst;
    cDst.width = src.width;
    cDst.height = src.height;
    cDst.getContext("2d").drawImage(src, 0, 0);
  }
  copyComputedStyles(src, dst);
  dst.style.pointerEvents = "none";
  for (let i = 0; i < src.children.length; i++) {
    copyStyle(src.children[i], dst.children[i]);
  }
}
function copyComputedStyles(src, dst) {
  let cs = getComputedStyle(src);
  for (let key of cs) {
    if (key.includes("transition")) continue;
    dst.style[key] = cs[key];
  }
  Object.keys(dst.dataset).forEach((key) => delete dst.dataset[key]);
}
function removeTroublesomeAttributes(dst) {
  ["id", "class", "style", "draggable"].forEach(function(att) {
    dst.removeAttribute(att);
  });
}

// ts/drag-dto.ts
var DragDTO = class {
  _dropEffect;
  _effectAllowed;
  _data;
  _dragDropTouch;
  constructor(dragDropTouch) {
    this._dropEffect = "move";
    this._effectAllowed = "all";
    this._data = {};
    this._dragDropTouch = dragDropTouch;
  }
  get dropEffect() {
    return this._dropEffect;
  }
  set dropEffect(value) {
    this._dropEffect = value;
  }
  get effectAllowed() {
    return this._effectAllowed;
  }
  set effectAllowed(value) {
    this._effectAllowed = value;
  }
  get types() {
    return Object.keys(this._data);
  }
  /**
   * ...docs go here...
   * @param type
   */
  clearData(type) {
    if (type !== null) {
      delete this._data[type.toLowerCase()];
    } else {
      this._data = {};
    }
  }
  /**
   * ...docs go here...
   * @param type
   * @returns
   */
  getData(type) {
    let lcType = type.toLowerCase(), data = this._data[lcType];
    if (lcType === "text" && data == null) {
      data = this._data["text/plain"];
    }
    return data;
  }
  /**
   * ...docs go here...
   * @param type
   * @param value
   */
  setData(type, value) {
    this._data[type.toLowerCase()] = value;
  }
  /**
   * ...docs go here...
   * @param img
   * @param offsetX
   * @param offsetY
   */
  setDragImage(img, offsetX, offsetY) {
    this._dragDropTouch.setDragImage(img, offsetX, offsetY);
  }
};

// ts/drag-drop-touch.ts
var { round } = Math;
var DefaultConfiguration = {
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
  pressHoldThresholdPixels: 0
};
var DragDropTouch = class {
  _dragRoot;
  _dropRoot;
  _dragSource;
  _lastTouch;
  _lastTarget;
  _ptDown;
  _isDragEnabled;
  _isDropZone;
  _dataTransfer;
  _img;
  _imgCustom;
  _imgOffset;
  _pressHoldIntervalId;
  configuration;
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
  constructor(dragRoot = document, dropRoot = document, options) {
    this.configuration = { ...DefaultConfiguration, ...options || {} };
    this._dragRoot = dragRoot;
    this._dropRoot = dropRoot;
    while (!this._dropRoot.elementFromPoint && this._dropRoot.parentNode)
      this._dropRoot = this._dropRoot.parentNode;
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
      this._touchstart.bind(this),
      opt
    );
    this._dragRoot.addEventListener(
      `touchmove`,
      this._touchmove.bind(this),
      opt
    );
    this._dragRoot.addEventListener(
      `touchend`,
      this._touchend.bind(this)
    );
    this._dragRoot.addEventListener(
      `touchcancel`,
      this._touchend.bind(this)
    );
  }
  /**
   * ...docs go here...
   * @param img
   * @param offsetX
   * @param offsetY
   */
  setDragImage(img, offsetX, offsetY) {
    this._imgCustom = img;
    this._imgOffset = { x: offsetX, y: offsetY };
  }
  /**
   * ...docs go here...
   * @param e
   */
  _touchstart(e) {
    if (this._shouldHandle(e)) {
      this._reset();
      let src = this._closestDraggable(e.target);
      if (src) {
        if (e.target && !this._dispatchEvent(e, `mousemove`, e.target) && !this._dispatchEvent(e, `mousedown`, e.target)) {
          this._dragSource = src;
          this._ptDown = pointFrom(e);
          this._lastTouch = e;
          setTimeout(() => {
            if (this._dragSource === src && this._img === null) {
              if (this._dispatchEvent(e, `contextmenu`, src)) {
                this._reset();
              }
            }
          }, this.configuration.contextMenuDelayMS);
          if (this.configuration.isPressHoldMode) {
            this._pressHoldIntervalId = setTimeout(() => {
              this._isDragEnabled = true;
              this._touchmove(e);
            }, this.configuration.pressHoldDelayMS);
          } else if (!e.isTrusted) {
            if (e.target !== this._lastTarget) {
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
  _touchmove(e) {
    if (this._shouldCancelPressHoldMove(e)) {
      this._reset();
      return;
    }
    if (this._shouldHandleMove(e) || this._shouldHandlePressHoldMove(e)) {
      let target = this._getTarget(e);
      if (this._dispatchEvent(e, `mousemove`, target)) {
        this._lastTouch = e;
        e.preventDefault();
        return;
      }
      if (this._dragSource && !this._img && this._shouldStartDragging(e)) {
        if (this._dispatchEvent(this._lastTouch, `dragstart`, this._dragSource)) {
          this._dragSource = null;
          return;
        }
        this._createImage(e);
        this._dispatchEvent(e, `dragenter`, target);
      }
      if (this._img && this._dragSource) {
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
        if (this.configuration.allowDragScroll) {
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
  _touchend(e) {
    if (!(this._lastTouch && e.target && this._lastTarget)) {
      this._reset();
      return;
    }
    if (this._shouldHandle(e)) {
      if (this._dispatchEvent(this._lastTouch, `mouseup`, e.target)) {
        e.preventDefault();
        return;
      }
      if (!this._img) {
        this._dragSource = null;
        this._dispatchEvent(this._lastTouch, `click`, e.target);
      }
      this._destroyImage();
      if (this._dragSource) {
        if (e.type.indexOf(`cancel`) < 0 && this._isDropZone) {
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
  _shouldHandle(e) {
    return e && !e.defaultPrevented && e.touches && e.touches.length < 2;
  }
  /**
   * ...docs go here...
   * @param e
   * @returns
   */
  _shouldHandleMove(e) {
    return !this.configuration.isPressHoldMode && this._shouldHandle(e);
  }
  /**
   * ...docs go here...
   * @param e
   * @returns
   */
  _shouldHandlePressHoldMove(e) {
    return this.configuration.isPressHoldMode && this._isDragEnabled && e && e.touches && e.touches.length;
  }
  /**
   * ...docs go here...
   * @param e
   * @returns
   */
  _shouldCancelPressHoldMove(e) {
    return this.configuration.isPressHoldMode && !this._isDragEnabled && this._getDelta(e) > this.configuration.pressHoldMargin;
  }
  /**
   * ...docs go here...
   * @param e
   * @returns
   */
  _shouldStartDragging(e) {
    let delta = this._getDelta(e);
    if (this.configuration.isPressHoldMode) {
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
  _getDelta(e) {
    if (!this._ptDown) return 0;
    const { x, y } = this._ptDown;
    const p = pointFrom(e);
    return ((p.x - x) ** 2 + (p.y - y) ** 2) ** 0.5;
  }
  /**
   * ...docs go here...
   * @param e
   */
  _getHotRegionDelta(e) {
    const { clientX: x, clientY: y } = e.touches[0];
    const { innerWidth: w, innerHeight: h } = globalThis;
    const { dragScrollPercentage, dragScrollSpeed } = this.configuration;
    const v1 = dragScrollPercentage / 100;
    const v2 = 1 - v1;
    const dx = x < w * v1 ? -dragScrollSpeed : x > w * v2 ? +dragScrollSpeed : 0;
    const dy = y < h * v1 ? -dragScrollSpeed : y > h * v2 ? +dragScrollSpeed : 0;
    return { x: dx, y: dy };
  }
  /**
   * ...docs go here...
   * @param e
   * @returns
   */
  _getTarget(e) {
    let pt = pointFrom(e), el = this._dropRoot.elementFromPoint(pt.x, pt.y);
    while (el && getComputedStyle(el).pointerEvents == `none`) {
      el = el.parentElement;
    }
    return el;
  }
  /**
   * ...docs go here...
   * @param e
   */
  _createImage(e) {
    if (this._img) {
      this._destroyImage();
    }
    let src = this._imgCustom || this._dragSource;
    this._img = src.cloneNode(true);
    copyStyle(src, this._img);
    this._img.style.top = this._img.style.left = `-9999px`;
    if (!this._imgCustom) {
      let rc = src.getBoundingClientRect(), pt = pointFrom(e);
      this._imgOffset = { x: pt.x - rc.left, y: pt.y - rc.top };
      this._img.style.opacity = `${this.configuration.dragImageOpacity}`;
    }
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
  _moveImage(e) {
    requestAnimationFrame(() => {
      if (this._img) {
        let pt = pointFrom(e, true), s = this._img.style;
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
  _dispatchEvent(srcEvent, type, target) {
    if (!(srcEvent && target)) return false;
    const evt = newForwardableEvent(type, srcEvent, target);
    evt.dataTransfer = this._dataTransfer;
    target.dispatchEvent(evt);
    return evt.defaultPrevented;
  }
  /**
   * ...docs go here...
   * @param el
   * @returns
   */
  _closestDraggable(element) {
    for (let e = element; e !== null; e = e.parentElement) {
      if (e.draggable) {
        return e;
      }
    }
    return null;
  }
};
function enableDragDropTouch(dragRoot = document, dropRoot = document, options) {
  new DragDropTouch(dragRoot, dropRoot, options);
}
if (import.meta.url.includes(`?autoload`)) {
  enableDragDropTouch(document, document, {
    forceListen: true
  });
} else {
  globalThis.DragDropTouch = {
    enable: function(dragRoot = document, dropRoot = document, options) {
      enableDragDropTouch(dragRoot, dropRoot, options);
    }
  };
}
export {
  enableDragDropTouch
};
