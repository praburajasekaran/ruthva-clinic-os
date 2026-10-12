# Demo and onboard the first doctor

Use [ruthva.com](https://ruthva.com). Allow about 20 minutes for the demo, then finish the doctor's settings and sample print.

## Demo the daily workflow

Use a separate clinic with synthetic patients for the demonstration. The built-in `demo@ruthva.com` account and code `123456` are read-only. Use a verified normal account when demonstrating saves.

1. Open **Home**. Show **Patients**, **Visits**, **Medicines**, **Therapies**, and the follow-up list.
2. Select **Start visit**. Register a synthetic patient or find a returning patient. Show allergies, medical history, and previous visits.
3. Record a consultation. Add complaints, diagnosis, vitals, and the relevant assessment. Select **Save & Write Rx**.
4. Add a medicine with its dose, frequency, timing, and duration. Show medicine suggestions. Add advice and a clinical follow-up date. Select **Save & Print**.
5. Show the prescription on the doctor's letterhead. Return to visit completion. Reopen the patient and confirm that the saved visit and prescription remain.
6. If the clinic dispenses medicines, show stock and one dispensing action. Refresh and confirm that stock changed once.
7. If the doctor uses therapies, create a treatment plan and record a session. Otherwise skip this part of the demo.
8. Show **Follow-ups**. Assign an assistant call and record its outcome. Explain that assistant retry dates are separate from the doctor's clinical return date.

Do not promise automatic email reminders during the demo. The configured production Cron Trigger is disabled. WhatsApp handoffs require a person to review the message and press Send in WhatsApp.

The doctor must check any generated patient summary against the saved medical record before using it.

## Onboard the doctor

Have the doctor's email inbox, clinic address, phone number, registration number, qualifications, paper size, and a sheet of letterhead available.

1. Open [Register your clinic](https://ruthva.com/signup).
2. Enter the doctor's name and her own email address.
3. Select her discipline.
4. Select **Create account**.
5. Enter the six-digit code from her inbox. Codes expire after ten minutes.
6. Select **Verify & continue**.
7. Enter the clinic name, phone number, address, city, PIN code, and doctor registration number.
8. Select **Complete setup**.
9. Confirm the clinic name on Home and an empty patient list.
10. Open **Settings**, then **Profile**. Save the doctor's qualifications.
11. Configure letterhead printing using the steps below.
12. Sign out and sign in with a fresh emailed code. Confirm that the clinic and settings persist.

If the email is already registered, use [Sign in](https://ruthva.com/login). Do not create a second clinic for the same doctor. If setup is unfinished, continue onboarding in the original browser tab so its selected discipline remains available.

The free plan starts with a limit of 200 active patients. It allows one doctor, one admin, and one therapist, including accepted staff and pending invitations. The owner consumes the doctor slot. Confirm capacity in **Team** before inviting staff.

## Print on her letterhead

1. Open **Settings**, then **Clinic**.
2. Find **Prescription Settings**.
3. Set **Prescription letterhead** to **Pre-printed**. This hides the app's clinic header and logo on paper and in downloaded PDFs.
4. Set **Paper size** to the size of her stationery.
5. Set **Top margin** to the space needed by her printed header. Selecting Pre-printed initially sets 52 mm.
6. Adjust **Bottom margin** if her stationery has a footer.
7. Select **Save clinic settings**.
8. Reopen a prescription and select **Print**.
9. In the browser print dialog, turn off **Headers and footers**. Use 100% scale and the selected paper size.
10. Print one sample on her actual letterhead. Adjust the margins if the content overlaps her header or footer.

Margins allow 5 to 100 mm. The clinic header can still appear on the screen with a note that it is hidden during printing. The physical sample is the final alignment check.

## End the first session

Confirm that the doctor can find the patient, read the prescription, print it, and sign in again. Keep demonstration records in the separate demo clinic. Take another backup after onboarding with `rtk npm run backup:cloudflare`.

See [the readiness report](doctor-demo-readiness.md) for verified checks and remaining limits. See [database recovery](cloudflare-backup.md) for backup and restore commands.
