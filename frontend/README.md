# Ruthva frontend

The Next.js UI runs on Cloudflare Workers through OpenNext. `cloudflare-worker.ts` sends `/api/*` requests to the `API` service binding and sends other requests to Next.js.

Use the commands in the [project README](../README.md) to run the frontend and API together.

```sh
rtk npm run ci:check
rtk npm run build:cloudflare
```

Production uses `/api/v1`. Leave `NEXT_PUBLIC_API_URL` unset when you build for Cloudflare. The root development runner sets a local API URL for `next dev`.

Deploy with the [Cloudflare guide](../CLOUDFLARE-DEPLOY.md). `npm run deploy` checks the shared configuration, builds OpenNext, and deploys the frontend Worker.
