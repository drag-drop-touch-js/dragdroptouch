import express from "express";
import { readdirSync, watch } from "node:fs";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const PORT = process.env.PORT ?? 8000;
process.env.PORT = PORT;

const HOSTNAME = process.env.HOSTNAME ?? `localhost`;
process.env.HOSTNAME = HOSTNAME;

const testing = process.argv.includes(`--test`);
const debug = process.argv.includes(`--debug`);
const npm = process.platform === `win32` ? `npm.cmd` : `npm`;

// Set up the core server
const app = express();
app.use((req, res, next) => {
  res.setHeader("Surrogate-Control", "no-store");
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Expires", "0");
  next();
});

app.set("etag", false);
app.use((req, res, next) => {
  if (!testing || (testing && debug)) {
    console.log(`[${new Date().toISOString()}] ${req.url}`);
  }
  next();
});

// static routes
app.use(`/`, (req, res, next) => {
  const { url } = req;
  if (url === `/`) {
    if (testing) return res.redirect(`/tests/integration`);
    return res.redirect(`/demo`);
  }
  if (
    url.includes(`/dist/drag-drop-touch.esm.min.js`) &&
    (!testing || (testing && debug))
  ) {
    return res.redirect(url.replace(`esm.min.js`, `debug.esm.js`));
  }
  next();
});
app.use(`/`, express.static(`.`));
app.use((req, res) => {
  if (req.query.preview) {
    res.status(404).send(`Preview not found`);
  } else {
    res.status(404).send(`${req.url} not found`);
  }
});

// Run the server, and trigger a client bundle rebuild every time script.js changes.
app.listen(PORT, () => {
  // Generate the server address notice
  const msg = `=   Server running on http://${HOSTNAME}:${PORT}   =`;
  const line = `=`.repeat(msg.length);
  const mid = `=${` `.repeat(msg.length - 2)}=`;
  console.log([``, line, mid, msg, mid, line, ``].join(`\n`));

  // are we running tests?
  if (testing) {
    const runner = spawn(npm, [`run`, `test:integration`], {
      stdio: `inherit`,
    });
    runner.on(`close`, () => process.exit());
    runner.on(`error`, () => process.exit(1));
  }

  // we're not, run in watch mode
  else {
    try {
      watchForRebuild();
    } catch (e) {
      console.error(e);
    }
  }
});

/**
 * There's a few files we want to watch in order to rebuild the browser bundle.
 */
function watchForRebuild() {
  let rebuilding = false;

  async function rebuild() {
    if (rebuilding) return;
    rebuilding = true;
    console.log(`rebuilding`);
    const start = Date.now();
    spawnSync(npm, [`run`, `build`], { stdio: `inherit` });
    console.log(`Build took ${Date.now() - start}ms`), 8;
    setTimeout(() => (rebuilding = false), 500);
  }

  function watchList(list) {
    list.forEach((filename) => watch(resolve(filename), () => rebuild()));
  }

  watchList(readdirSync(`./ts`).map((v) => `./ts/${v}`));
}
