# Quackback product feedback

Ruthva uses [the hosted workspace](https://ruthva-clinic-os.quackback.io/) for product ideas, votes and updates. The existing Feedback button opens the official widget in an iframe. The Ruthva form remains available if Quackback is unavailable or unconfigured. Demo clinics use the Ruthva form.

## Configure the workspace

Use one board named **Product feedback**. Enable **Show on your website** under **Settings → Widget**. Select **Product feedback** as the default board. These settings have been configured in the hosted workspace.

The [free plan](https://quackback.io/pricing) currently includes one board, 50 posts, one admin seat and unlimited portal users. The widget, voting, roadmap and changelog are included. Quackback's GitHub integration requires a paid plan. Ruthva's existing GitHub feedback path still applies to submissions through the Ruthva form.

Open **Settings → Widget → Set it up → Signing secret**. Copy the existing signing secret. Keep it out of Git, browser code, logs and chat. Do not use Ruthva's `JWT_SECRET` or regenerate the Quackback secret as part of installation.

`QUACKBACK_URL` in `worker/wrangler.jsonc` selects this workspace. After deployment approval, store its signing secret on the API Worker.

```sh
rtk npm --prefix worker exec -- wrangler secret put QUACKBACK_WIDGET_SECRET --config worker/wrangler.jsonc
```

For local use, set both values in the ignored `worker/.dev.vars` file.

```dotenv
QUACKBACK_URL=https://ruthva-clinic-os.quackback.io
QUACKBACK_WIDGET_SECRET=<existing widget signing secret>
```

Restart the API after changes to local bindings. If either binding is empty, Ruthva opens its own feedback form. A malformed URL or short signing secret produces an error with a fallback button. Production workspace URLs must be HTTPS origins without credentials, paths, queries or fragments. HTTP loopback origins are accepted only for requests to a local Ruthva API.

## Identity and privacy

`GET /api/v1/feedback/widget/` requires an active Ruthva staff account and clinic. It signs an HS256 JWT with a five-minute expiry. Claims contain the stable `ruthva:user:<id>` subject, staff email and staff name. Request parameters cannot change those claims. Responses use `Cache-Control: no-store`.

The parent sends the signed token through Quackback's `postMessage` protocol. It checks the workspace origin, iframe window and returned staff email before it reveals the iframe. An existing Quackback login with a different email fails this check. Use the Ruthva form, or sign out of that Quackback portal session before retrying. Widget account changes also fail closed.

The signing secret stays on the Worker. Ruthva access and refresh tokens stay in Ruthva. The integration does not load the vendor SDK, capture screenshots, or send patient data, page URLs or clinic metadata to Quackback. The iframe has `referrerPolicy="no-referrer"`.

Product feedback is visible according to the board's access settings. Staff must exclude patient details and clinical screenshots from their posts. This widget is for product feedback, not clinical records.

Closing the panel removes the iframe and token from panel state. Staff or clinic changes remount the panel. A new attempt obtains a fresh signed token. API requests have a ten-second timeout. Widget identity has a fifteen-second timeout. Both failure paths expose the Ruthva form.

## Hosted verification

On 4 October 2026, the deployed widget identified a verified staff account in its test clinic. The widget displayed the staff email and opened the feedback entry view with an empty ideas list. No feedback post was submitted.

API version `d2fdf099-78ef-4c33-ad6f-be57ad9d9109` and frontend version `1362bff2-0a88-47a0-9e74-7d7fb348f339` contain both Quackback and the clinic activation controls from [PR 108](https://github.com/praburajasekaran/ruthva-clinic-os/pull/108). [PR 106](https://github.com/praburajasekaran/ruthva-clinic-os/pull/106) is stacked on that branch.

Later deployments must include both changes and retain `QUACKBACK_URL` and `QUACKBACK_WIDGET_SECRET`. A deployment from a branch without the integration replaces the frontend and can omit the workspace URL even when the secret remains stored.

## Verify locally

Run `rtk npm run check`, `rtk npm test` and `rtk npm run build`. The API runtime tests verify signing, authentication, clinic isolation, demo fallback and URL restrictions.

For browser verification, use an empty local D1 database with synthetic staff records. Set these local bindings. They are fixture values and must stay out of deployed environments.

```dotenv
QUACKBACK_URL=http://localhost:8796
QUACKBACK_WIDGET_SECRET=local-quackback-fixture-secret-at-least-32-characters
```

Start the protocol fixture and local app in separate terminals.

```sh
rtk proxy node worker/scripts/quackback-fixture.mjs
rtk npm run dev
```

Open `http://localhost:8796/control` to choose success, an identity mismatch, rejected identity, wrong message source, wrong message origin, timeout, widget account change or widget close. Open Feedback in a local clinic at `http://localhost:3000`. The fixture verifies the JWT signature before it acknowledges the staff user. Wrong-source and wrong-origin modes send forged acknowledgements from a nested iframe and must remain hidden until timeout.

Also verify a mobile viewport, the fallback form, close and reopen, and logout. The fixture checks the protocol and Ruthva UI. Before rollout, verify the real hosted workspace with its existing secret and a staff account whose email matches the Quackback portal session, or a browser without that portal session.

## Move to self-hosting later

Export hosted posts and conversations before migration. Verify which votes, comments, identities and attachments the export and import retain. Do not assume a complete transfer from an export file alone. Quackback requires PostgreSQL, so revisit the Cloudflare-only requirement before choosing a self-hosted target.

After the import and identity checks pass, change `QUACKBACK_URL` to the new origin and store that instance's widget secret. The Ruthva integration contract stays the same. Existing feedback in Ruthva's D1 database remains separate from Quackback posts.
