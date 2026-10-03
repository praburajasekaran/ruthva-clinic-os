declare module "*.open-next/worker.js" {
  const worker: { fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> };
  export default worker;
}
