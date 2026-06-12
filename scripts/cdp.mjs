// Tiny CDP driver for verifying the running app through WebView2 remote debugging.
// Usage: node scripts/cdp.mjs <command> [args...]
//   shot <file.png>        - capture viewport screenshot
//   eval "<expr>"          - evaluate JS, print result (awaits promises)
//   click "<selector>"     - click first matching element
//   clicktext "<text>"     - click first button/element whose text includes <text>
//   text "<selector>"      - print innerText of first match
import { writeFileSync } from "node:fs";

const PORT = process.env.CDP_PORT ?? "9223";

async function getTarget() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json`);
  const targets = await res.json();
  const page = targets.find((t) => t.type === "page" && !t.url.startsWith("devtools"));
  if (!page) throw new Error("no page target. targets: " + targets.map((t) => t.url).join(", "));
  return page;
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    ws.onopen = () =>
      resolve({
        send: (method, params = {}) =>
          new Promise((res, rej) => {
            const mid = ++id;
            pending.set(mid, { res, rej });
            ws.send(JSON.stringify({ id: mid, method, params }));
          }),
        close: () => ws.close(),
      });
    ws.onerror = (e) => reject(new Error("ws error: " + e.message));
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message));
        else res(msg.result);
      }
    };
  });
}

const evalJs = async (cdp, expression) => {
  const r = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails, null, 2));
  return r.result.value;
};

const [, , cmd, ...args] = process.argv;
const target = await getTarget();
const cdp = await connect(target.webSocketDebuggerUrl);

try {
  if (cmd === "shot") {
    const r = await cdp.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(args[0], Buffer.from(r.data, "base64"));
    console.log("saved", args[0]);
  } else if (cmd === "eval") {
    console.log(JSON.stringify(await evalJs(cdp, args[0]), null, 2));
  } else if (cmd === "click") {
    console.log(
      await evalJs(
        cdp,
        `(() => { const el = document.querySelector(${JSON.stringify(args[0])}); if (!el) return "NOT FOUND"; el.click(); return "clicked"; })()`
      )
    );
  } else if (cmd === "clicktext") {
    console.log(
      await evalJs(
        cdp,
        `(() => {
          const needle = ${JSON.stringify(args[0])}.toLowerCase();
          const els = [...document.querySelectorAll("button, a, [role=button]")];
          const el = els.find((e) => (e.textContent || "").toLowerCase().includes(needle)) ||
                     [...document.querySelectorAll("*")].reverse().find((e) => e.children.length === 0 && (e.textContent || "").toLowerCase().includes(needle));
          if (!el) return "NOT FOUND";
          el.click();
          return "clicked: " + (el.textContent || "").trim().slice(0, 60);
        })()`
      )
    );
  } else if (cmd === "text") {
    console.log(
      await evalJs(
        cdp,
        `(() => { const el = document.querySelector(${JSON.stringify(args[0])}); return el ? el.innerText.slice(0, 3000) : "NOT FOUND"; })()`
      )
    );
  } else {
    console.log("unknown command");
  }
} finally {
  cdp.close();
}
