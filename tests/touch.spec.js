import { expect, test } from "@playwright/test";

async function bootstrapPage(browser, options = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.on("console", (msg) => console.log(msg.text()));
  await page.goto(`http://localhost:8000`);
  return page;
}

test.describe(`touch events`, () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await bootstrapPage(browser, {
      hasTouch: true,
    });
  });

  async function listenForEvent(qs, eventType) {
    return page.evaluate((eventType) => {
      return new Promise((resolve) => {
        document.querySelector(qs).addEventListener(eventType, ({ type }) => {
          // fill this it
          resolve({ type });
        });
      });
    }, eventType);
  }

  async function touchEntry(sourceSelector) {
    await page.evaluate(
      async ({ sourceSelector }) => {
        const element = document.querySelector(sourceSelector);
        await globalThis.simulatedTouch.tap(element);
      },
      { sourceSelector }
    );
  }

  async function touchDragEntry(sourceSelector, targetSelector) {
    await page.evaluate(
      async ({ sourceSelector, targetSelector }) => {
        const from = document.querySelector(sourceSelector);
        const to = document.querySelector(targetSelector);
        await globalThis.simulatedTouch.drag(from, to);
      },
      { sourceSelector, targetSelector }
    );
  }

  test(`drag the left-most element onto its adjacent element`, async () => {
    const from = `[draggable]:nth-child(1) header`;
    const to = `[draggable]:nth-child(2) header`;

    const e1 = page.locator(from);
    const e2 = page.locator(to);

    expect(await e1.textContent()).toBe(`Input`);
    expect(await e2.textContent()).toBe(`TextArea`);

    await touchDragEntry(from, to);

    const e3 = page.locator(from);
    const e4 = page.locator(to);

    expect(await e3.textContent()).toBe(`TextArea`);
    expect(await e4.textContent()).toBe(`Input`);
  });

  test(`drag the left-most element onto the right-most element`, async () => {
    const from = `[draggable]:first-child header`;
    const to = `[draggable]:last-child header`;

    const e1 = page.locator(from);
    const e2 = page.locator(to);

    expect(await e1.textContent()).toBe(`Input`);
    expect(await e2.textContent()).toBe(`Image`);

    await touchDragEntry(from, to);

    const e3 = page.locator(from);
    const e4 = page.locator(to);

    expect(await e3.textContent()).toBe(`Image`);
    expect(await e4.textContent()).toBe(`Input`);
  });

  test(`drag the right-most element by touch-dragging the image`, async () => {
    const from = `[draggable]:last-child img`;
    const to = `[draggable]:first-child header`;
    await touchDragEntry(from, to);

    const e1 = page.locator(from.replace(`img`, `header`));
    const e2 = page.locator(to);

    expect(await e1.textContent()).toBe(`Input`);
    expect(await e2.textContent()).toBe(`Image`);
  });
});
