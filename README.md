# DragDropTouch

Polyfill that enables HTML5 drag and drop support on mobile (touch) devices.

The HTML5 specification includes support for drag and drop operations. 
Unfortunately, most mobile browsers do not implement it, so applications
that rely on HTML5 drag and drop have reduced functionality when running
on mobile devices.

The DragDropTouch class is a polyfill that translates touch events into
standard HTML5 drag drop events. If you add the polyfill to your pages,
drag and drop operations should work on mobile devices just like they 
do on the desktop.

## Demo

- [Run Demo](http://bernardo-castilho.github.io/DragDropTouch/demo/index.htm)

The demo should work on desktop as well as on mobile devices, including
iPads and Android tablets.

The top section of the demo is based on a well-known HTML5 drag and drop sample 
from [html5rocks](http://www.html5rocks.com/en/tutorials/dnd/basics/).

The following sections demonstrate how the polyfill works with 
standards-based components that use HTML5 drag and drop. You can use
touch to resize and reorder grid columns, data groups, and pivot
fields.

## Install

You can install this polyfill via NPM using the following command:

```cmd
npm i --save drag-drop-touch
```

Alternatively, download `DragDropTouch.js` and add it to your HTML:

```html
<script src="DragDropTouch.js"></script>
```

## Polyfill behaviour

The **DragDropTouch** polyfill attaches listeners to the document's touch events:

- On **touchstart**, it checks whether the target element has the draggable attribute 
  or is contained in an element that does. If that is the case, it saves a reference 
  to the "drag source" element and prevents the default handling of the event.
- On **touchmove**, it checks whether the touch has moved a certain threshold distance
  from the origin. If that is the case, it raises the **dragstart** event and continues
  monitoring moves to fire **dragenter** and **dragleave**.
- On **touchend**, it raises the **dragend** and **drop** events.

To avoid interfering with the automatic browser translation of some touch events into 
mouse events, the polyfill performs a few additional tasks: 

- Raise the **mousemove**, **mousedown**, **mouseup**, and **click** events when the 
  user touches a draggable element but doesn't start dragging,
- Raise the **dblclick** event when there's a new touchstart right after a click, and
- Raise the **contextmenu** event when the touch lasts a while but the user doesn't 
  start dragging the element.

## Thanks

Thanks to Bernardo Castilho, who pretty much wrote this entire polyfill apart from a couple of tweaks: [DragDropTouch](https://github.com/Bernardo-Castilho).

Thanks to Eric Bidelman for the great tutorial on HTML5 drag and drop: [Native HTML5 Drag and Drop](http://www.html5rocks.com/en/tutorials/dnd/basics/).

Thanks also to Chris Wilson and Paul Kinlan for their article on mouse and touch events: [Touch And Mouse](http://www.html5rocks.com/en/mobile/touchandmouse/).

Finally, thanks to Tim Ruffles for his iOS shim code which was inspiring: [iOS DragDrop Shim](https://github.com/timruffles/ios-html5-drag-drop-shim).

## License

[MIT License](https://opensource.org/licenses/MIT)
