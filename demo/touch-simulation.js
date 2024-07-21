function simulate(eventType, element, { x, y }) {
  const touch = {
    clientX: x,
    clientY: y,
  };

  const event = new Event(eventType, {
    bubbles: true,
    cancelable: true,
    target: element,
    ...touch,
  });

  // We can't bind these through the Event constructor,
  // so we force the issue by using low level JS.
  Object.defineProperty(event, `touches`, {
    value: [touch],
    writable: false,
  });

  element.dispatchEvent(event);
}

export /* async */ function drag(from, to) {
  const { left, width, top } = from.getBoundingClientRect();
  const touch = { x: left + width / 2, y: top + 1, target: from };
  simulate("touchstart", from, touch);

  // simulate a dragging track
  const steps = 10;
  const [dx, dy] = (function (l, t) {
    const { left, top } = to.getBoundingClientRect();
    return [left - l, top - t].map((v) => v / steps);
  })(left, top);

  return new Promise((resolve) => {
    (function drag(i = 0) {
      if (i === steps - 1) {
        simulate("touchend", to, touch);
        setTimeout(resolve, 10);
      }
      touch.x += dx;
      touch.y += dy;
      touch.target = document;
      simulate("touchmove", to, touch);
      setTimeout(() => drag(i + 1), 100 / steps);
    })();
  });
}

export /* async */ function tap(element) {
  const { left, width, top } = element.getBoundingClientRect();
  const touch = { x: left + width / 2, y: top + 1, target: element };
  simulate("touchstart", element, touch);

  return new Promise((resolve) => {
    setTimeout(function () {
      simulate("touchend", element, touch);
      setTimeout(resolve, 10);
    }, 100);
  });
}
