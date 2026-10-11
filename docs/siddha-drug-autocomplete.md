# Siddha drug autocomplete

The prescription Drug Name field includes the 302 medicine names from the
Department of AYUSH **Essential Drugs List Siddha Medicine (2013)**,
ISBN 978-93-81458-11-2. The user supplied `siddha-essential-drugs-list-2013.pdf`.

The source is a scanned PDF. The medicine-name column on PDF pages 10–53
(printed pages 1–44) was read with OCR and checked visually against all 302
entries. Wrapped names were joined with spaces. OCR errors were corrected,
including `Ilakam`, `Ilaneer`, and `Vanni Ilai`. The word
`Thamaraikkizhangu` was rejoined across its line break. Source spellings such
as `Choorarnam` are retained.

`frontend/src/lib/data/siddha-essential-drugs-2013.json` records each source
entry number, medicine name, and PDF page. It includes compound medicines
and the single-ingredient entries in the source table.

Reference suggestions appear for Siddha clinics after two letters. Search
ignores case, spaces, and punctuation. Suggestions sort by the signed-in
doctor's saved prescription count, then the clinic's saved prescription count,
then alphabetically. Unused drugs sort alphabetically. Both PDF names and
active clinic medicines use this ranking before the 30-suggestion limit.
An exact name match appears once and retains the clinic medicine ID.

Search also accepts common English transliterations, such as `Thiribala`,
`tiripala`, and `tiribala` for `Thiripala`; `Choornam`, `sooranam`, and
`soornam` for `Chooranam`; and `Vadasura` or `vadhasura` for `Vatha Sura`.
It tolerates one typo for search keys of 5–8 letters and two for longer keys.
Missing, extra, replaced, and adjacent swapped letters count as typos.
These are general rules applied to every PDF and clinic drug name, including
new pharmacy entries; there is no whitelist of the example spellings.
The same matcher runs for the PDF and the clinic's English, Tamil, and brand
names. Transliteration matching starts at three letters. Typo tolerance starts
at five. Tamil text uses literal matching. Numbered names allow fuzzy letters;
numbers supplied in a fuzzy query must match the medicine's numbers exactly.
Fuzzy keys only determine search matches. They do not merge distinct medicine
names or change pharmacy IDs or saved drug names. Usage ranking is unchanged.

`/api/v1/pharmacy/medicine-suggestions/?search=...` returns active matching
clinic medicines and aggregate usage counts. The server takes the clinic and
doctor from the authenticated session. A drug counts once per prescription,
even when separate dosage lines or punctuation variants repeat its name.
Doctor attribution uses the consultation's `conducted_by` field. Prescriptions
without a known doctor still count for the clinic. Edits and deletions affect
counts on the next search. Search and selection alone do not affect counts.
The endpoint uses the existing clinic and prescription indexes to read history;
it returns counts without patient details or prescription IDs. It does not
truncate pharmacy matches before combining them with the PDF names.

Selecting a reference name saves the drug name with no medicine ID. It does
not create a pharmacy item or change stock. Doctors can still type any name.
The PDF's doses, indications, and contraindications are not imported.

Run `rtk npm run test:medicine-autocomplete` after installing the repository,
frontend, and worker packages and the Playwright Chromium browser. This checks
the source entry count, keyboard and touch selection, custom names, discipline
filtering, prefilled rows, clinic medicine IDs, usage ranking, alphabetical ties,
and ranking before the suggestion limit. It uses an isolated browser
fixture with mocked clinic search responses. It does not write patient records.

Worker runtime tests also verify clinic isolation, doctor attribution,
duplicate dosage lines, edited prescriptions, and complete catalogue matching.
