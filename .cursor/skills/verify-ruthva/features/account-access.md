# Account access

A doctor verifies an email, sets up a clinic, and signs in. Demo access lets a visitor inspect three disciplines with read-only permissions.

## Sub-features

- `account-signup` requests and consumes a signup OTP.
- `account-onboard` creates the verified doctor's clinic.
- `account-login` consumes a normal login OTP and restores the correct clinic.
- `account-unknown-email` displays the conditional registration message.
- `account-demo` signs in through both demo entry points and changes discipline.
- `account-logout` removes browser access to authenticated pages.
- `account-admin-access` denies the clinic-account administration page to an ordinary clinic owner.
- `account-admin-activation` changes clinic status when a verified platform admin is available.

## How to get to it (user POV)

- Open `/login`, or choose `Sign in` on the public landing page.
- Choose `Register your clinic` below the login form, or open `/signup`.
- After signup verification, the app opens `/onboarding`.
- Enter `demo@ruthva.com` on the login form for demo access.
- Choose `Try Demo` on the login form for the same demo verification step.
- Choose the sidebar's `Sign out` control after login.
- A platform admin's normal login opens `/admin/clinics`; an entitled user can also choose the sidebar's `Ruthva admin` link. Clinic ownership alone does not grant this access.

## Driving it with agent-browser

Preconditions:

- Fresh run; `doctor` passes. `doctor@clinic.test` is not registered.
- For normal login, finish signup and onboarding first.
- Positive admin activation requires a verified platform-admin account and a separate synthetic clinic with a verified active owner. The current helper does not configure `RUTHVA_ADMIN_EMAIL` or create superusers. Exercise the ordinary-owner denial here; mark activation skipped unless those prerequisites are supplied in an isolated environment. Do not grant entitlement with SQL or token injection.

- **Signup.** Run `ruthva_browser open /login`, then `ruthva_browser find role link click --name "Register your clinic"`. On `/signup`, use `ruthva_browser fill '#first_name' Verification`, `ruthva_browser fill '#last_name' Doctor`, and `ruthva_browser fill '#email' doctor@clinic.test`. Choose `ruthva_browser find role button click --name Siddha`, then `ruthva_browser find role button click --name "Create account"`. Wait with `ruthva_browser wait '#code'`. `ruthva_capture account-signup-request` must show the verification form. Run `ruthva_inbox doctor@clinic.test`, type the returned code with `ruthva_browser fill '#code'` followed by that code, and choose `ruthva_browser find role button click --name "Verify & continue"`. `ruthva_browser wait --url '**/onboarding'` proves the route transition.
- **Onboarding.** Fill `#clinic_name` with `Verification Clinic`, `#phone` with `9000000000`, `#address_line1` with `1 Test Street`, `#city` with `Chennai`, `#pin_code` with `600001`, and `#registration_number` with `VERIFY-001`, using `ruthva_browser fill` for each. Choose `ruthva_browser find role button click --name "Complete setup"`. Wait for `**/dashboard`. Capture the clinic identity and run `ruthva_data`; the user's `email_verified_at` must be populated and the user must belong to the saved clinic.
- **Normal login.** Choose `ruthva_browser find role button click --name "Sign out"`. Open `/login`, fill `#email` with `doctor@clinic.test`, choose `Send login code`, and wait for `#code`. Read `ruthva_inbox doctor@clinic.test`, fill `#code` with that new code, and choose `Verify`. Wait for `**/dashboard`. The browser must show `Verification Clinic` after a reload. Save `account-login-after` and read D1 with `ruthva_data`.
- **Unknown email.** Sign out, fill `#email` with `unknown@clinic.test`, and choose `Send login code`. `Check your email` must say `If unknown@clinic.test is registered, we sent a login code.` The local inbox has no email for that address. Return with `ruthva_browser find role button click --name Back`.
- **Demo email entry.** Run `ruthva_browser fill '#email' demo@ruthva.com`, `ruthva_browser find role button click --name "Send login code"`, `ruthva_browser wait '#code'`, `ruthva_browser fill '#code' 123456`, and `ruthva_browser find role button click --name Verify`. Wait for `**/dashboard`. On desktop, `ruthva_browser select 'aside:not([role="dialog"]) select' demo-siddha` changes to Sivanethram Demo Clinic; use the same selector with `demo-homeopathy` for Hahnemann Demo Clinic and `demo-ayurveda` for Dhanvantari Demo Clinic. Re-snapshot after each reload. Capture each discipline separately. Demo patients start empty; a normal-clinic write recipe is invalid here.
- **Demo button entry.** From `/login`, run `ruthva_browser find role button click --name "Try Demo"`, wait for `#code`, enter `123456`, and choose `Verify`. Capture `account-demo-button` separately; email entry proof does not cover this button.
- **Logout.** Choose `Sign out`, then use `ruthva_browser open /patients`. The app must return to `/login`. Capture `account-logout-protected-route`.
- **Admin boundary.** While signed in as the normal owner doctor, run `ruthva_browser open /admin/clinics`, then `ruthva_browser wait --text "Ruthva admin access is required"`. Capture `account-admin-denied`. Choose the `Return to your clinic` link and require the original clinic identity. This verifies denial, not positive activation.
- **Admin activation (conditional).** With the platform-admin prerequisite satisfied, enter through its login redirect or `Ruthva admin`. The page shows `All clinics`, `Active`, `Inactive`, and `Needs verification` filters and a clinic search. Select the separate synthetic clinic's status action from a fresh snapshot, then confirm the action in its dialog. Require the resulting active/inactive notice, reload the list, and compare the clinic's `is_active` value in read-only D1 observations. Activation requires a verified active owner; deactivation must prevent that clinic's ordinary users from authenticating. Capture the admin and affected-user paths separately. This recipe remains unverified by the current helper.

Commands abbreviated as `ruthva_browser`, `ruthva_capture`, `ruthva_inbox`, and `ruthva_data` mean the full helper invocation in the index, with `RUTHVA_RUN` followed by the listed arguments. Obtain a code from this run's inbox; never reuse a previous run's code.

## Gotchas

- `TEST_EMAIL=capture` alone supplies no readable OTP; this harness captures the existing SES HTTP boundary instead.
- OTPs expire after 10 minutes and are consumed once. The API limits requests to five per email and ten per local IP per hour. A fresh isolated run resets the database's limit state.
- `First Name` and `Last Name` share a group label. Stable IDs avoid guessing their accessible names.
- Signup does not create a clinic until onboarding. Unverified or inactive accounts cannot use normal authenticated routes.
- Platform-admin checks and clinic-owner checks are different. The admin page and `worker/src/admin.ts` require platform-admin entitlement. An inactive clinic's login refusal must include the support contacts supplied by the API; do not confuse that refusal with an unknown-email response.
- The local email request and OTP consumption prove local behavior; no real email delivery is claimed.
- The DOM includes a hidden mobile sidebar and a desktop sidebar. Do not wait on unscoped sidebar text or `select 'select'`; use the desktop selector above or a current visible snapshot ref. A route wait plus a fresh snapshot avoids the hidden copy.
