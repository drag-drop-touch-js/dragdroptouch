# DragDropTouch

Polyfill that enables HTML5 drag drop support on mobile (touch) devices.

The HTML5 specification includes support for drag and drop operations.
Unfortunately, this specification is based on mouse events, rather than
pointer events, and so most mobile browsers do not implement it. As such,
applications that rely on HTML5 drag and drop have reduced functionality
when running on mobile devices.

The `DragDropTouch` class is a polyfill that translates touch events into
standard HTML5 drag drop events. If you add the polyfill to your pages,
drag and drop operations should work on mobile devices just like they
do on the desktop.

## Demo

- [Click here to play with the demo](https://drag-drop-touch-js.github.io/dragdroptouch/demo/)

This demo should work on desktop as well as on mobile devices, including
iPads and Android tablets. To test this on a desktop, turn on "responsive
design mode", which is both a button in the browser developer tools, as
well as the hot-key <code>ctrl-shift-M</code> on Windows and Linux, or
<code>cmd-shift-M</code> on Mac.

## How to "install"

Add the `drag-drop-touch.esm.js` or `drag-drop-touch.esm.min.js` polyfill
script to your page to enable drag and drop on devices with touch input:

```html
<script src="drag-drop-touch.esm.min.js?autoload" type="module"></script>
```

Note the `?autoload` query argument on the `src` URL: this loads the polyfill
and immediately enables it so that you do not need to write any code yourself.
If omitted, the library will instead set up a `window.DragDropTouch` object
with a single function, `DragDropTouch.enable(dragRoot, dropRoot, options)`.
All three arguments are optional. If left off, `DragDropTouch.enable()` simply
polyfills the entire page. If you only want the polyfill to apply to specific
elements though, you can call the `enable` function once for each set of
elements that need polyfilling.

Also note the `type="module"`, which is required. If left off, you'll probably
get a browser error similar to:

```
Uncaught SyntaxError: import.meta may only appear in a module
```

## Using a CDN url

```html
<script
  src="https://drag-drop-touch-js.github.io/dragdroptouch/dist/drag-drop-touch.esm.min.js"
  type="module"
></script>
```

## Using a JS ESM import

As an ES module, you can also use this polyfill as an import in other scripts:

```js
import { enableDragDropTouch } from "./drag-drop-touch.esm.min.js";

// Set up the default full page polyfill:
enableDragDropTouch();

// Or, explicitly polyfill only certain elements
enableDragDropTouch(dragRootElement, dropRootElement);

// Or even explicitly polyfill only certain elements with non-default behaviour
const options = {
  // ...
};
enableDragDropTouch(dragRootElement, dropRootElement, options);
```

## Polyfill behaviour

The **DragDropTouch** polyfill attaches listeners to the document's touch events:

- On **touchstart**, it checks whether the target element has the draggable
  attribute or is contained in an element that does. If that is the case, it
  saves a reference to the "drag source" element and prevents the default
  handling of the event.
- On **touchmove**, it checks whether the touch has moved a certain threshold
  distance from the origin. If that is the case, it raises the **dragstart**
  event and continues monitoring moves to fire **dragenter** and **dragleave**.
- On **touchend**, it raises the **dragend** and **drop** events.

To avoid interfering with the automatic browser translation of some touch events
into mouse events, the polyfill performs a few additional tasks:

- Raise the **mousemove**, **mousedown**, **mouseup**, and **click** events when
  the user touches a draggable element but doesn't start dragging,
- Raise the **dblclick** event when there's a new touchstart right after a click,
  and
- Raise the **contextmenu** event when the touch lasts a while but the user doesn't
  start dragging the element.

## Overriding polyfill behaviour

The following options can be passed into the enabling function to change how the
polyfill works:

- **allowDragScroll** is a flag that determines whether to allow scrolling when
  a drag reaches the edges of the screen. This can be either `true` or `false`,
  and is `true` by default.
- **contextMenuDelayMS** is the number of milliseconds we'll wait before the
  polyfill triggers a context menu event on long press. This value is 900 by
  default.
- **dragImageOpacity** determines how see-through the "drag placeholder", that's
  attached to the cursor while dragging, should be. This value is a number in
  the interval [0, 1], where 0 means fully transparent, and 1 means fully opaque.
  This value is 0.5 by default.
- **dragScrollPercentage** is the size of the "hot region" at the edge of the
  screen as a percentage value on which scrolling will be allowed, if the
  **allowDragScroll** flag is true (which is its default value). This value is
  10 by default.
- **dragScrollSpeed** is the number of pixels to scroll if a drag event occurs
  within a scrolling hot region. This value is 10 by default.
- **dragThresholdPixels** is the number of pixels that a touchmove needs to
  actually move before the polyfill switches to drag mode rather than click mode.
  This value is 5 by default
- **isPressHoldMode** is a flag that tells the polyfill whether a a long-press
  is required before polyfilling drag events. This value can be either `true` or
  `false`, and is `false` by default.
- **forceListen** is a flag that determines whether the polyfill should be
  enabled irrespective of whether the browser indicates that it's running on
  a touch-enabled device or not. This value is `true` by default.
- **pressHoldDelayMS**: is the number of milliseconds the polyfill will wait
  before it considers an active press to be a "long press". This value is 400
  by default.
- **pressHoldMargin** is the number of pixels we allow a touch event to drift
  over the course of a long press start. This value is 25 by default.
- **pressHoldThresholdPixels** is the drift in pixels that determines whether
  a long press actually starts a long press, or starts a touch-drag instead.
  This value is 0 by default.

## Thanks

- Thanks to Eric Bidelman for the great tutorial on HTML5 drag and drop:
  [Native HTML5 Drag and Drop](http://www.html5rocks.com/en/tutorials/dnd/basics/).
- Thanks also to Chris Wilson and Paul Kinlan for their article on mouse and touch events:
  [Touch And Mouse](http://www.html5rocks.com/en/mobile/touchandmouse/).
- Thanks to Tim Ruffles for his iOS shim code which was inspiring:
  [iOS DragDrop Shim](https://github.com/timruffles/ios-html5-drag-drop-shim).

## License

[MIT License](./LICENSE)

## For developers

If you wish to work on this library, fork and clone the repository, then run
`npm install` to install all the dependency, followed by a one-time
`npm run dev:setup`, which will install the necessary components for running
the integration tests.

### Running tests

This repository uses the standard `npm test` command to run build and
integration tests. Build testing consists of linting the source code using `tsc`,
auto-formatting it using `prettier`, and compiling it into three bundles (debug, normal, and minified) using `esbuild`. Integration tests are found in the
`tests/touch.spec.js` file, using Playwright as test runner.

### Manual testing

To manually test in the browser, you can run `npm start` and then open the
URL that is printed to the console once the initial build tasks have finished.
This runs a local server that lets you run the demo page, but with the
`drag-drop-touch.esm.min.js` replaced by a `drag-drop-touch.debug.esm.js`
instead, which preserves  all debug statements used in the TypeScript source.

To add your own debug statements, use the `DEBUG:` label followed by either
a normal statement, or multiple statements wrapped in a new block.
