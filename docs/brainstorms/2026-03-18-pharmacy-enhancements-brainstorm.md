# Pharmacy Module Enhancements Brainstorm

**Date:** 2026-03-18
**Status:** Ready for planning

## What We're Building

Enhancing the existing pharmacy module with three additions:

1. **Brand name field on Medicine** — stores the manufacturer/company (e.g., "Kottakkal Arya Vaidya Sala" for "Ashwagandha Churnam"). Searchable in autocomplete so doctors can find medicines by brand too.

2. **Batch number & expiry date on StockEntry** — each stock purchase records its own batch and expiry. Enables per-batch tracking and FEFO (First Expiry First Out) awareness. More accurate than storing on Medicine since different stock entries of the same medicine can have different expiry dates.

3. **Expiry alerts on pharmacy page** — show medicines with stock entries expiring within 30 days, displayed alongside the existing low-stock alerts section.

## Why This Approach

- The pharmacy module is already well-built with CRUD, stock management, dispensing, and autocomplete
- Brand name is a simple field addition — no structural change needed
- Batch/expiry on StockEntry (not Medicine) is industry-standard and supports multiple batches per medicine
- Expiry alerts follow the same pattern as the existing low-stock alerts endpoint

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Brand name location | `Medicine` model | Brand is a property of the medicine itself, not per-stock-entry |
| Brand searchable? | Yes | Added to `search_fields` and autocomplete display |
| Batch/expiry location | `StockEntry` model | Different purchases can have different batches and expiry dates |
| Expiry alerts location | Pharmacy page | Alongside existing low-stock alerts for consistency |
| Expiry threshold | 30 days | Standard pharmaceutical alert window |

## Scope

### Backend
- Add `brand_name` (CharField, blank, max_length=255) to `Medicine`
- Add `brand_name` to `MedicineViewSet.search_fields`
- Add `batch_number` (CharField, blank) and `expiry_date` (DateField, null/blank) to `StockEntry`
- Add `GET /pharmacy/medicines/expiring-soon/` endpoint — returns medicines with stock entries expiring within 30 days
- Update serializers to include new fields
- Single migration for all model changes

### Frontend
- `MedicineForm`: add brand name input field
- `MedicineCatalogTable`: show brand name as subtitle (like Tamil name)
- `MedicineAutocomplete`: include brand name in dropdown display
- `StockAdjustmentForm`: add batch number and expiry date inputs
- Pharmacy page: add expiry alerts section (similar to low-stock pattern)

### Out of Scope
- FEFO dispensing logic (auto-picking oldest expiry first) — future enhancement
- Batch-level stock tracking (tracking quantity per batch vs total) — future enhancement
- Expiry alerts on main dashboard — future enhancement
- Brand as a separate model/entity — unnecessary complexity for now

## Resolved Questions

- Brand name is a simple text field on Medicine, not a separate entity
- Batch/expiry goes on StockEntry for per-purchase accuracy
- Expiry alerts show on pharmacy page, not dashboard
- Brand is searchable in autocomplete
