# Email verification and Ruthva clinic controls

New accounts become usable only after email verification. Ruthva admin can activate or deactivate an entire clinic, including its staff. The user selected whole-clinic control.

## Feature checklist

1. [x] `how` over the affected subsystem.
2. [x] `architect` for parallel design exploration.
   - The user's AGENTS instructions require sequential work in the main thread. Two designs were compared here.
3. [x] Write the throughput checkpoint as four todo items.
4. [x] Delegate code-writing to a subagent using your configured feature model with a specific scope.
   - Delegation is replaced by direct ownership under the user's AGENTS instructions.
5. [x] Verify on the matching surface.
6. [ ] Rebase into small, ordered commits. Stack follow-ups.
7. [x] If the design is contested, `interrogate` before shipping.
   - n/a: The design uses existing account and clinic boundaries. Review still checks privilege escalation and verification bypasses.
8. [ ] Run **Opening a PR**.

## Traced account flow

Before this change, the signup page called `initiate-signup`, which stored a pending signup and sent an SES code. `verify-signup-otp` consumed the code and created an active user. Onboarding created the clinic. The legacy `signup` route created an active clinic, user, and tokens without a code. Invitations proved email access through their one-time token. SSO authenticated an existing user through the upstream service.

`tokenUser` reloads the account for every authenticated request. The API middleware then reloads the clinic and checks `is_active`. Refresh and login routes also check the clinic. Profile updates currently allow email changes. Clinic owners cannot update clinic activation through the profile serializer.

## Design choice

| Design | Effect | Decision |
| --- | --- | --- |
| Replace user and clinic flags with a new account-state model | Moves all existing authorization and migration callers to a new model. | Reject. This adds a second ownership model for the current requirement. |
| Retain clinic activation and add email proof plus a user session version | Reuses current tenant checks and distinguishes email ownership from administrative suspension. | Choose. Account creation must consume proof, and token issuance checks proof centrally. |

The account data shape is `email_verified_at: string | null`, `session_version: number`, and the existing user and clinic activation flags. Clinic access requires a verified, active user and an active clinic. Demo access remains an explicit read-only exception. Pending signups do not create users.

The legacy signup route requires a pending signup code. It consumes that code in the same transaction as user and clinic creation. Password login, SSO, and token refresh cannot bypass the verification requirement. Changing an account's email clears its verification and revokes its sessions.

Ruthva admin authorization requires verified email ownership and either the trusted `is_superuser` flag or the configured `RUTHVA_ADMIN_EMAIL`. Clinic role `admin` does not grant platform access. The configured admin email must come from the user's answer. No first-signup or email-domain promotion is allowed.

The admin API lists clinic account metadata without patient records. Its status update accepts a strict boolean, requires a verified active owner before activation, records the change, and revokes ordinary clinic sessions. Repeat requests do not add audit rows or revoke sessions again. Admin sessions remain available to restore a clinic, including the admin's own clinic.

## Throughput checkpoint

- [x] **Blocking first steps.** Inspect signup and authorization. Establish the feature branch and decide clinic scope. Wait for the user's admin identity before configuring it remotely.
- [x] **Independent workstreams.** API, UI, and tests have separate files. Reads run together. Mutations run sequentially in the main thread.
- [x] **Shared mutable state.** One D1 transaction owns clinic status, session revocation, and audit rows. The existing checkout and its uncommitted work remain intact.
- [x] **Smallest safe decomposition.** One owner implements this coupled authorization change. Verify the API before checking the admin UI and deployment.

## Verification

Check unverified signup, invalid and expired codes, token issuance, email changes, and invitation acceptance. Check normal-user and clinic-admin rejection from the platform API. Check verified-owner activation, whole-clinic suspension, existing access and refresh tokens, repeat requests, and audit records. Check the admin UI with a synthetic clinic and ordinary-user denial. Deploy only after these checks pass.

The feature branch is `feat/email-verification-clinic-admin` in the managed `account-activation` worktree. The previous staging configuration and OTP wording fix were copied into this worktree to preserve the deployed behavior.

Fourteen workerd API scenarios pass. They cover both signup routes, forged privilege fields, unverified access, password login, SSO, refresh, email changes, concurrent verification, whole-clinic suspension, concurrent status retries, audit counts, and admin restoration of their own clinic. Five migration tests pass. Legacy imports retain null email proof and session version zero.

Worker type checking, frontend type checking and lint, and the OpenNext build pass. The existing custom-font lint warning remains. The worktree uses its own locked dependencies because shared dependency symlinks caused OpenNext to include native Sharp binaries in the Worker bundle.

The local Cloudflare preview passes browser sign-in and admin routing, search by owner email, deactivation, reactivation, and ordinary-owner denial. The activation control stays disabled for a clinic with an unverified owner. Screenshots are in `.audit/clinic-admin-preview.jpg` and `.audit/clinic-admin-denied.jpg`.

A private D1 export was saved before remote migration. Migration `0005_account_activation.sql` is applied to staging. `RUTHVA_ADMIN_EMAIL` is configured to `ekalaivan@gmail.com`, as confirmed by the user.

API version `336b897f-f37a-487f-81ec-2144e88d8966` and frontend version `6c06c096-2dbe-4ff5-951e-5a2954d90599` are deployed. Twenty-four live checks pass. They cover SES simulator requests, consumed signup proof, invitation proof, platform permission, suspension, owner and staff session revocation, refresh rejection, audit idempotence, and a new staff login after reactivation. The remote Worker has the private admin identity secret and no `TEST_EMAIL` binding.

The deployed browser passes synthetic admin OTP login, admin routing, search, clinic deactivation, and clinic reactivation. `.audit/clinic-admin-staging-inactive.jpg` shows the verified inactive clinic and its Activate control. The three synthetic accounts are now inactive, the temporary superuser flag is removed, and the synthetic clinic is inactive. The temporary OTP file was removed. The live test did not change other clinics.

The confirmed admin email has no staging account yet. The user must register that exact address and verify the emailed code. No name, discipline, password, or account was created for the user. SES simulator acceptance does not verify human inbox placement.
