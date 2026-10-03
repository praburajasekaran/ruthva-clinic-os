import { createServer } from "node:http";
import { jwtVerify } from "jose";

const port = 8796;
const secret = new TextEncoder().encode(
  "local-quackback-fixture-secret-at-least-32-characters",
);
const modes = [
  "success",
  "mismatch",
  "wrong-source",
  "wrong-origin",
  "timeout",
  "rejected",
  "auth-change",
  "close",
];
let mode = "success";
const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://localhost:${port}`);
  response.setHeader("Cache-Control", "no-store");
  if (url.pathname === "/control") {
    const selected = url.searchParams.get("mode");
    if (modes.includes(selected)) mode = selected;
    response.setHeader("Content-Type", "text/html");
    response.end(
      `<title>Quackback fixture</title><h1>Quackback fixture</h1><p>Current mode: ${mode}</p><form><label>Mode <select name="mode">${modes.map((value) => `<option ${value === mode ? "selected" : ""}>${value}</option>`).join("")}</select></label><button>Set mode</button></form>`,
    );
    return;
  }
  if (url.pathname === "/identify" && request.method === "POST") {
    try {
      let body = "";
      for await (const chunk of request) body += chunk;
      const { payload } = await jwtVerify(JSON.parse(body).ssoToken, secret, {
        algorithms: ["HS256"],
      });
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          id: payload.sub,
          email: payload.email,
          name: payload.name,
        }),
      );
    } catch {
      response.writeHead(403).end();
    }
    return;
  }
  response.setHeader("Content-Type", "text/html");
  if (url.pathname === "/spoof") {
    response.end(
      `<script>parent.parent.postMessage({type:'quackback:identify-result',success:true,user:{email:'feedback-browser@clinic.test'}},'http://localhost:3000')</script>`,
    );
    return;
  }
  response.end(`<!doctype html><title>Quackback fixture widget</title><h1>Product feedback fixture</h1><p id="identity">Waiting for signed identity</p><button onclick="parent.postMessage({type:'quackback:close'},'http://localhost:3000')">Close widget</button><button onclick="parent.postMessage({type:'quackback:auth-change',user:null},'http://localhost:3000')">Change widget account</button><script>
  const mode = ${JSON.stringify(mode)};
  addEventListener('message', async (event) => {
    if (event.source !== parent || event.origin !== 'http://localhost:3000' || event.data?.type !== 'quackback:identify') return;
    const result = await fetch('/identify', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(event.data.data)});
    if (!result.ok || mode === 'rejected') {
      parent.postMessage({type:'quackback:identify-result',success:false},event.origin);
      return;
    }
    const user = await result.json();
    document.getElementById('identity').textContent = 'Signed in as ' + user.email;
    if (mode === 'timeout') return;
    if (mode === 'wrong-source' || mode === 'wrong-origin') {
      const spoof = document.createElement('iframe');
      spoof.src = (mode === 'wrong-origin' ? 'http://127.0.0.1:${port}' : '') + '/spoof';
      document.body.append(spoof);
      return;
    }
    if (mode === 'mismatch') user.email = 'another-staff@clinic.test';
    parent.postMessage({type:'quackback:identify-result',success:true,user},event.origin);
    if (mode === 'auth-change' || mode === 'close') setTimeout(() => {
      parent.postMessage(mode === 'close' ? {type:'quackback:close'} : {type:'quackback:auth-change',user:null},event.origin);
    }, 1000);
  });
  parent.postMessage({type:'quackback:ready'},'http://localhost:3000');
  </script>`);
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Quackback fixture controls at http://localhost:${port}/control`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close());
