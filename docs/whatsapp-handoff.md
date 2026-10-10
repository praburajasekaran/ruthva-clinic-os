# WhatsApp messages from signed-in accounts

Ruthva prepares prescription text and follow-up reminders for the user's signed-in WhatsApp account. The user reviews the message in Ruthva, opens WhatsApp, checks the sender and recipient, and presses Send there.

Ruthva cannot press Send through a WhatsApp link or confirm delivery. The feature does not connect a WhatsApp Business provider.

## Account and service capabilities

| Workflow | Supported behavior | Sender and costs |
| --- | --- | --- |
| Signed-in account handoff | A `wa.me` link carries the reviewed recipient and message. WhatsApp requires the user to send it. | The account selected in WhatsApp sends the message. Ruthva does not choose a clinic sender number or call a paid messaging provider. The user's network plan applies. |
| Existing journey integration | The local adapter starts a journey, reads its status, confirms a visit, and accepts journey risk events. It exposes no prescription send method, message receipt, or delivery webhook. | The checked-in Worker configuration has an empty `RUTHVA_API_URL`. A live service's WhatsApp capabilities, sender number, and fees remain unverified. |
| WhatsApp Business provider | No provider is connected by this change. Automatic delivery would require a separate provider integration. | The sender, account setup, and messaging fees depend on that provider. |

The verified handoff uses the signed-in account requested in issue [#80](https://github.com/praburajasekaran/ruthva-clinic-os/issues/80). Provider delivery remains outside the verified capability.

## Consent and review

Doctors and clinic admins can record patient consent or opt-out in the message dialog. Consent covers prescription text and reminders from this handoff workflow. An opt-out blocks both preparation and new handoffs. A renewed grant requires a separate confirmation in the dialog.

Consent is stored per clinic and patient. The record includes the actor and time of the latest preference change. Existing journey consent does not silently grant consent for the new handoff.

Each prepared message stores its recipient, full text, reviewing actor, and content version. The version includes the normalized recipient and generated text. Preparation and handoff compare the current version with the reviewed version. A change requires another review. Repeated preparation of the same version returns the same record.

The handoff cannot recall a message already open in WhatsApp. Staff must check WhatsApp before reopening a message whose send status is unknown. Ruthva blocks another handoff after staff report that version sent.

## Visible states

| Stored state | Staff label | Meaning |
| --- | --- | --- |
| `prepared` | Prepared. Send unconfirmed. | Ruthva saved the reviewed message. |
| `handoff_requested` | WhatsApp handoff requested. Send unconfirmed. | Ruthva returned the WhatsApp URL. This does not prove that WhatsApp loaded or that the user sent the message. |
| `staff_reported_sent` | Staff reported sent. Delivery unconfirmed. | A staff member confirmed that they pressed Send. This is not a provider receipt. |
| `opted_out` preference | Patient opted out. WhatsApp messages are blocked. | A new message cannot be prepared or handed off without renewed consent. |

A blocked popup displays an error and leaves the message prepared. API failures display an error. The user can retry after correcting the failure. Ruthva has no queued, provider-sent, or delivered state for this workflow. Reminder records do not change visit confirmation or journey state.

## Prescription text and reminders

The prescription dialog contains the saved medication dose, frequency, food timing, duration, homeopathic potency, dilution scale, pellet count, procedures, advice, and follow-up instructions. Tamil text is preserved. The message is text, not an attached prescription PDF.

The WhatsApp follow-up section lists up to 100 active patients' prescriptions with overdue follow-ups or follow-ups through the next seven days. Dates use Asia/Kolkata. Reminders refer to the prescription's follow-up date. Procedure dates appear in prescription text but do not create separate reminders. Staff review and send each reminder. There is no automatic WhatsApp scheduler.

The recipient uses `whatsapp_number`, with `phone` as the fallback when that field is blank. Indian mobile numbers with ten digits receive country code `91`. International numbers accept a country code, optional leading `+` or `00`, spaces, parentheses, and hyphens. Invalid contacts block preparation. Messages longer than 6,000 characters remain visible in the preview, but handoff is blocked to avoid truncation. The print view remains available for the full prescription.

## Deployment and verification

Migration `worker/migrations/0006_whatsapp_handoffs.sql` creates the consent and message records. The migration must be applied before the updated API serves messaging requests. Local migration passed. No production migration or deployment was performed for this change.

The Worker runtime tests exercise consent, opt-out, review, concurrent repeated preparation, recipient encoding, stale content, clinic isolation, role permissions, staff reporting, dose fields, Tamil text, and long-message handling.

Browser checks use a synthetic clinic and patient. The complete target message matched the visible preview. Popup failure recovery, saved staff status, opt-out, the reminder queue, and a 390-pixel mobile dialog were checked. Outbound WhatsApp navigation was intercepted. No real recipient received a message. A signed-in WhatsApp client and real delivery remain unverified.
