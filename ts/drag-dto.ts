type DDT = {
  setDragImage: (img: HTMLElement, offsetX: number, offsetY: number) => void;
};

/**
 * Object used to hold the data that is being dragged during drag and drop operations.
 *
 * It may hold one or more data items of different types. For more information about
 * drag and drop operations and data transfer objects, see
 * <a href="https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer">HTML Drag and Drop API</a>.
 *
 * This object is created automatically by the @see:DragDropTouch and is
 * accessible through the @see:dataTransfer property of all drag events.
 */
export class DragDTO {
  protected _dropEffect: any;
  private _effectAllowed: any;
  private _data: any;
  private _dragDropTouch: any;

  constructor(dragDropTouch: DDT) {
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
  clearData(type: string) {
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
  getData(type: string) {
    let lcType = type.toLowerCase(),
      data = this._data[lcType];
    if (lcType === "text" && data == null) {
      data = this._data["text/plain"]; // getData("text") also gets ("text/plain")
    }
    return data; // @see https://github.com/Bernardo-Castilho/dragdroptouch/pull/61/files
  }

  /**
   * ...docs go here...
   * @param type
   * @param value
   */
  setData(type: string, value: any) {
    this._data[type.toLowerCase()] = value;
  }

  /**
   * ...docs go here...
   * @param img
   * @param offsetX
   * @param offsetY
   */
  setDragImage(img: Element, offsetX: number, offsetY: number) {
    this._dragDropTouch.setDragImage(img, offsetX, offsetY);
  }
}
