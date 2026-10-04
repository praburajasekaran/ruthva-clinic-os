# Review clinic feedback

Clinic staff select **Feedback** to send a **Bug Report** or **Feature Request**. The form has visible **Upload image** and **Capture screen** controls. It accepts PNG, JPEG, GIF, and WebP screenshots under 5 MB.

Ruthva saves requests in the existing D1 `feedback_feedback` table and stores screenshots in private R2 objects. Optional GitHub issue sync does not control whether a request appears in the admin inbox. The stored `status` field describes that sync, not whether a report is resolved.

The verified platform admin opens **Feedback** beside **Clinic accounts**. Category filters select bug reports or feature requests. Search matches the title, description, clinic name, or staff email. Each page contains at most 25 requests, ordered by creation time and ID, newest first. **View details** shows the description, clinic, submitter, received time, reported page, and screenshot.

`GET /api/v1/admin/feedback/` accepts `category`, `search`, and `page`. `GET /api/v1/admin/feedback/<id>/screenshot/` returns the saved image after platform-admin authentication. Screenshots have no public URL. The UI fetches them with the normal bearer token and releases its temporary image URL when the dialog closes. The existing clinic-scoped media endpoint retains its authentication and clinic checks.

## Verify the inbox

1. Use a writable local clinic account to submit a bug report with a harmless screenshot.
2. Sign in as the verified local platform admin and open **Feedback**.
3. Select **Bug reports** and confirm the title, clinic, and submitter.
4. Select **View details** and confirm the description and image.
5. Submit a feature request and confirm that **Feature requests** shows it.
6. Confirm that ordinary clinic staff cannot access the admin list or admin screenshot endpoint.

The runtime tests exercise native submission, exact screenshot bytes, platform-admin access, clinic isolation, category filters, literal search, pagination, invalid images, and the retired widget route.

## Retired external feedback

Ruthva no longer loads the Quackback widget or creates its signed identity tokens. Its URL and signing-key bindings were removed from application configuration. The unused signing secret was removed from the API Worker.

The existing **Registration form** feature request was copied once into the D1 inbox with its original title, description, author, clinic, and source link. Its received time records the import. The hosted workspace at `https://ruthva-clinic-os.quackback.io/` retains the original post and its vote. New hosted posts are not synchronized into Ruthva.
