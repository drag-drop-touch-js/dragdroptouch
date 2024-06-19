// detect passive event support
// https://github.com/Modernizr/Modernizr/issues/1894
export function supportsPassive(dragRoot: {addEventListener: (...any: any[]) => any }) {
  let supports = false;
  try {
    dragRoot.addEventListener('test', function () {
    }, {
      get passive() {
        supports = true;
        return true;
      }
    });
  } catch {
  }
  return supports
}


export function pointFrom(e: TouchEvent, page = false) {
  const touch = e.touches[0];
  return {x: page ? touch.pageX : touch.clientX, y: page ? touch.pageY : touch.clientY};
}



export function copyProps(dst: Record<string, any>, src: Record<string, any>, props: Array<string>) {
  for (let i = 0; i < props.length; i++) {
    let p = props[i];
    dst[p] = src[p];
  }
}


export function newForwardableEvent(
  type: keyof GlobalEventHandlersEventMap,
  srcEvent: TouchEvent,
  target: HTMLElement) {
  const _kbdProps = ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'];
  const _ptProps = ['pageX', 'pageY', 'clientX', 'clientY', 'screenX', 'screenY', 'offsetX', 'offsetY'];
  const evt =
      new Event(type, {bubbles: true, cancelable: true}) as
        unknown as
        Mutable<MouseEvent, 'button' | 'which' | 'buttons'> & { readonly defaultPrevented: boolean },
    touch = srcEvent.touches[0]
  evt.button = 0;
  evt.which = evt.buttons = 1;
  copyProps(evt, srcEvent, _kbdProps);
  copyProps(evt, touch, _ptProps);
  setOffsetAndLayerProps(evt, target);
  return evt;
}



function setOffsetAndLayerProps(e: Mutable<MouseEvent, `${'client' | 'layer' | 'offset' | 'page'}${'X' | 'Y'}`>, target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  if (e.offsetX === undefined) {
    e.offsetX = e.clientX - rect.x;
    e.offsetY = e.clientY - rect.y;
  }
  if (e.layerX === undefined) {
    e.layerX = e.pageX - rect.left;
    e.layerY = e.pageY - rect.top;
  }
}


export function copyStyle(src: HTMLElement, dst: HTMLElement) {
  // remove potentially troublesome attributes
  removeTroublesomeAttributes(dst);

  // copy canvas content
  if (src instanceof HTMLCanvasElement) {
    let cDst = dst as HTMLCanvasElement;
    cDst.width = src.width;
    cDst.height = src.height;
    cDst.getContext('2d')!.drawImage(src, 0, 0);
  }

  // copy style (without transitions)
  copyComputedStyles(src, dst, k => k.indexOf('transition') < 0);
  dst.style.pointerEvents = 'none';

  // and repeat for all children
  for (let i = 0; i < src.children.length; i++) {
    copyStyle(src.children[i] as HTMLElement, dst.children[i] as HTMLElement);
  }
}


function copyComputedStyles(src: any, dst: any, copyKey?: (k: string) => boolean) {
  let cs = getComputedStyle(src);
  for (let key in cs)
    if (!copyKey || copyKey(key))
      dst.style[key] = cs[key];
}

function removeTroublesomeAttributes(dst: any) {
  ['id', 'class', 'style', 'draggable'].forEach(function (att) {
    dst.removeAttribute(att);
  });
}



type Mutable<T extends { [x: string]: any }, K extends string> = {
  -readonly [P in (keyof T | K)]: T[P]
}