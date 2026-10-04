---
artifact_contract: "ce-handoff/v1"
created_at: "2026-10-04T06:42:00Z"
title: "Ruthva patient app idea handoff"
summary: "Early patient app idea for treatment adherence, with proposed features, a pilot recommendation, evidence limits, and unresolved product decisions."
keywords: ["ruthva", "patient-app", "treatment-adherence", "prescriptions", "medicine-reminders", "visit-diary", "appointments"]
cwd: "/Users/praburajasekaran/local-sites/ruthva-clinic-os"
resume_focus: "Continue evaluating the Ruthva patient app idea and define a focused first version if the user authorizes further work."
repository: "ruthva-clinic-os"
repo_root_sha: "f045ef1f0527f9524ca036c37559ce780ae02b86"
branch: "refactor/cloudflare-hosting"
head: "55c5fb295f8a2e8376d3a2c373c21c0848a12140"
worktree_path: "/Users/praburajasekaran/local-sites/ruthva-clinic-os"
---

# Ruthva patient app idea

## User intent and current status

The user proposed a Ruthva app that every patient downloads. Patients could view prescriptions, receive medicine reminders, book appointments, and record information for their next doctor visit. The user's hypothesis is that these functions could help patients adhere to their treatment plans.

The user asked for an assessment in Poteto Mode. The latest request is to preserve this discussion as a ce-handoff document in `docs`.

The idea is at the discussion stage. The user has not selected a platform, approved a feature scope, or authorized patient-app implementation. Saving this handoff does not indicate acceptance of the assistant's recommendations.

## References and their relevance

- [README.md](../README.md) describes Ruthva's existing clinic functions and current runtime. It identifies Next.js in `frontend` and the Cloudflare TypeScript API in `worker`. It describes `backend` as the original Django source for migration and rollback reference.
- [MedISAFE-BP randomized trial](https://europepmc.org/article/MED/29710289) is the research cited in the assessment. Its abstract reports a small improvement in self-reported medication adherence among people with hypertension. It reports no additional improvement in systolic blood pressure compared with the control group.
- The original user idea and the assistant's proposals are captured below because they do not exist in another product brief or implementation plan from this discussion.

## Assistant assessment

The assistant recommended testing the idea with a small, willing patient group. It recommended optional access rather than requiring every patient to install an app at the start.

The proposed patient promise is to understand today's treatment plan, follow it, and bring useful information to the next visit. Improved adherence remains a hypothesis for Ruthva patients.

The assistant considered the visit diary the strongest product bet. Its proposed value is to capture symptoms, difficulties, and questions when they occur. A brief view before the consultation could help the doctor understand the patient's experience. Neither benefit has been tested at Ruthva.

## Proposed first version

All entries in this table are assistant recommendations, not user-approved requirements.

| Function | Proposed behavior | Reason for the proposal |
| --- | --- | --- |
| Prescription and treatment plan | Show the doctor's current instructions in clear Tamil or English. Include medicine, diet, lifestyle advice, and the follow-up date. | Help the patient understand the plan between visits. |
| Medicine reminders | Let patients choose times that fit their routine. Update or stop reminders when the doctor changes the prescription. | Test whether reminders address missed doses without continuing an outdated schedule. |
| Notes for the next visit | Accept short text or voice notes about symptoms, difficulties, and questions. Present a brief view to the doctor before the consultation. | Help the patient prepare for the visit and keep the doctor's review manageable. |
| Appointments | Initially show the next visit date and allow a booking or rescheduling request. | Test demand before building full scheduling. |

The proposed diary is for review at a stated time. It is not an approved live messaging service. The assistant identified a need to explain when the doctor reviews entries, so patients do not assume continuous monitoring.

The doctor and clinic workflow is part of the product question. A diary that patients use but doctors cannot review within the clinic's workload may not deliver the intended value.

## Platform alternatives discussed

The assistant preferred secure mobile web access with opt-in reminders for the initial pilot. Patients could open the service through a link. Reminder delivery would need testing on the actual phones used by the pilot group.

A native app remains an alternative. The assistant considered it more plausible if patients use the service frequently and phone reminder requirements justify installation and ongoing support.

No platform was selected. No notification mechanism, identity flow, framework, or technical architecture was designed or verified.

## Proposed pilot and evidence limits

The assistant suggested four to six weeks with roughly 20 to 30 willing patients. Those numbers are a proposed feasibility exercise, not a calculated sample size for a clinical study.

Staff would help each participant open their prescription and set the first reminder before leaving the clinic. No recruitment or patient communication has occurred in this discussion.

The proposed observations are:

- Continued use over the pilot period.
- Patient-reported missed doses, with a consistent question and time period.
- Follow-up attendance.
- Staff time for setup, support, and diary review.
- Reasons the patient found the treatment plan difficult to follow.

The assistant suggested asking about confusing instructions, medicine availability, and unpleasant experiences rather than assuming every missed dose comes from forgetfulness.

A small pilot can inform usability and clinic workload. It cannot establish improved health outcomes or a causal adherence benefit. Patient reports and reminder taps also do not verify medicine ingestion.

The cited MedISAFE-BP trial analyzed 411 participants with hypertension over 12 weeks. The between-group adherence score difference was 0.4 on an eight-point scale. These results do not establish effectiveness for AYUSH treatment plans or Ruthva's patient population.

## Open decisions

The following questions were not answered in this session:

- Which patient group and treatment plans would be suitable for an initial pilot?
- Which difficulties actually prevent those patients from following their plans?
- Would patients use a native app, secure web access, or an existing communication channel?
- How would patients access only their own records, and would caregiver access be needed?
- Who would configure reminders and maintain them after prescription changes?
- When would doctors review diary entries, and how much review time could the clinic support?
- Would text or voice notes fit patients' language and accessibility needs?
- What reminder channel would work on the patients' phones and within the clinic's budget?
- Which pilot measures and continuation criteria would the clinic agree to use?

These are product and workflow decisions. The handoff does not select defaults for them.

## Work completed and verification

The assistant completed an initial product assessment and reviewed the MedISAFE-BP abstract through the Europe PMC API. The general web search tool returned an access error, so the research check used Europe PMC instead. A WHO page also returned an access error and was not used to support the recommendation.

The repository README and CodeGraph context were inspected. The graph exposed prescription and treatment-plan models, including advice and Tamil fields in the original Django source. That inspection did not verify a patient-facing experience in the current Cloudflare runtime.

No patient-app code, prototype, design, detailed implementation plan, patient test, or reminder delivery test was produced in this discussion. No app tests were run because this session did not implement app behavior.

The Poteto principles that shaped the assessment were Experience First, which led to optional access and a focused first version, and Prove It Works, which led to measuring patient behavior and clinic workload before expansion.

## Local continuity and possible continuation

The frontmatter records the repository, branch, and commit at capture time. The worktree path is machine-local. Unrelated deployment, email, and login changes were already uncommitted at capture time. This handoff leaves those changes untouched.

This document is a local, uncommitted snapshot in `docs`. It is not published or backed up by this handoff action. Another host needs a transferred or published copy to read it.

A plausible next discussion is to identify the target patients and their treatment difficulties, then agree on the pilot scope and clinic review process. Platform selection can follow those decisions. The current user must confirm or redirect further work when resuming this handoff.
