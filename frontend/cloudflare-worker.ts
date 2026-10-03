import worker from "./.open-next/worker.js";

export default {
  async fetch(request: Request, env: { API: { fetch(request: Request): Promise<Response> } }, ctx: unknown) {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/api/")) return env.API.fetch(request);
    return worker.fetch(request, env, ctx);
  },
};
