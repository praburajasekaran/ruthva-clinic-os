# Pharmacy

A clinic maintains its medicine catalog, records purchases, checks stock history, and dispenses medicines against a prescription.

## Sub-features

- `pharmacy-create` persists a medicine's name, category, dosage form, and price.
- `pharmacy-stock` adds stock and records a ledger entry.
- `pharmacy-search` finds the saved medicine and opens its detail.
- `pharmacy-dispense` reduces stock through prescription dispensing.

## How to get to it (user POV)

- Choose the sidebar's `Pharmacy` link to open `/pharmacy`.
- Choose `Add Medicine` to open the catalog form.
- Click a medicine's catalog row. It is not a name link. Route: `/pharmacy/{medicine ID}`.
- Choose `Add Stock` on medicine detail, then submit `Add`.
- Open a saved prescription and choose its dispensing control to open the dispensing modal.

## Driving it with agent-browser

Preconditions:

- Normal clinic, not demo. For dispensing, use a saved prescription whose medication has the catalog medicine's ID. Create the catalog medicine before the prescription. Select its suggestion in the prescription autocomplete; typing the same name alone does not link it.
- The initial catalog is empty. Use `Verification medicine` as the fixture name.

- **Create.** Run `ruthva_browser find role link click --name Pharmacy` and `ruthva_browser find role button click --name "Add Medicine"`. Snapshot the form. Its Name, Category, Dosage Form, Unit Price, and Reorder Level labels are not attached to inputs; fill/select their current refs. Enter `Verification medicine`, select the displayed clinic-appropriate category and dosage form, price `10`, and reorder level `5`. Choose `ruthva_browser find role button click --name Create`. The catalog must include the medicine after a reload. Capture `ruthva_capture pharmacy-create-after` and compare its row in `ruthva_data`.
- **Search/open.** Run `ruthva_browser find placeholder "Search medicines..." fill "Verification medicine"`, then take a full `ruthva_browser snapshot`. Click the matching medicine name cell's current ref to open its row. `snapshot -i` omits these cells. Capture `pharmacy-search-detail` with its name, current stock, and price visible.
- **Add stock.** Choose `ruthva_browser find role button click --name "Add Stock"`. Snapshot its Quantity field and fill that ref with `20`; the default Type is Purchase. Fill `ruthva_browser find placeholder "e.g., BN-2026-001" fill VERIFY-BATCH-001` and `ruthva_browser find placeholder "Optional notes..." fill "Verification purchase"`. Choose `ruthva_browser find role button click --name Add`. Reload medicine detail; stock must be `20` and history must show quantity `20`, the purchase type, and saved batch/notes. Capture `pharmacy-stock-after` and compare the medicine and stock-entry rows with `ruthva_data`.
- **Dispense.** Open the saved prescription and choose `Dispense`. This button appears only when a medication is linked to the catalog. The modal contains the already-linked medicines and quantity fields; it has no medicine selector. Take `snapshot -i`, enter quantity `2` in the matching medicine's current quantity ref, and submit `Confirm Dispense`. Wait for `Dispensing History`, then reload and capture the prescription. Reopen medicine detail through its catalog row; stock must decrease from `20` to `18`. Capture both views and compare `ruthva_data` before and after: medicine stock, a ledger change of `-2`, and the dispensing record/item must refer to this prescription and catalog ID. If Dispense is absent, return to the prescription editor, select the actual catalog suggestion, save, and reopen; do not call an internal write endpoint.

Use the shell functions defined in SKILL.md. Save before and after stock observations separately; one final number cannot prove the stock transition.

## Gotchas

- Several legacy form labels lack associations. Take a fresh snapshot for each opened form; guessed `find label` commands can fail.
- `Add Stock` quantities must be positive. Batch and expiry fields appear only for Purchase.
- Same-named medicines can create ambiguous search results. Use the record ID and clinic identity as well as the name.
- Insufficient-stock rollback and concurrent dispensing need the existing worker runtime tests as well as UI proof.
- Saving a medicine does not prove a purchase, dispensing, or usage dashboard. Capture those paths separately.
