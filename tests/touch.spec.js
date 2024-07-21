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
        globalThis.simulatedTouch.tap(element);
      },
      { sourceSelector }
    );
  }

  async function touchDragEntry(sourceSelector, targetSelector) {
    await page.evaluate(
      async ({ sourceSelector, targetSelector }) => {
        const from = document.querySelector(sourceSelector);
        const to = document.querySelector(targetSelector);
        globalThis.simulatedTouch.drag(from, to);
      },
      { sourceSelector, targetSelector }
    );
  }

  /**
   * Touch events
   */
  test.describe(`drag events`, () => {
    test(`drag the left-most element onto the right-most element`, async () => {
      // code goes here
      expect(1).toBe(1);
    });
  });
});
