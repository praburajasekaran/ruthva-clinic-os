"""Capture the original Django schema and serializer contracts for the Workers port."""
import importlib
import json
import os
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import django

django.setup()

from django.apps import apps
from django.db import connection, models
from django.urls import get_resolver
from rest_framework import serializers

out = ROOT / "worker"
(out / "migrations").mkdir(parents=True, exist_ok=True)
(out / "src").mkdir(exist_ok=True)
app_names = {"clinics", "users", "patients", "consultations", "prescriptions", "treatments", "pharmacy", "reminders", "integrations", "feedback"}
all_models = list(apps.get_models())
with connection.schema_editor() as editor:
    for model in all_models:
        editor.create_model(model)
model_tables = {model._meta.db_table: model for model in apps.get_models(include_auto_created=True)}
definitions = []
for name, definition in connection.cursor().execute("SELECT name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type DESC,name"):
    model = model_tables.get(name)
    if model:
        for field in model._meta.fields:
            if not field.is_relation:
                continue
            action = "CASCADE" if field.remote_field.on_delete == models.CASCADE else "SET NULL" if field.remote_field.on_delete == models.SET_NULL else "RESTRICT"
            pattern = rf'("{field.column}"[^,]*?REFERENCES "{field.related_model._meta.db_table}" \("{field.target_field.column}"\))(?= DEFERRABLE)'
            definition = re.sub(pattern, rf'\1 ON DELETE {action}', definition)
    definitions.append(definition + ";")
sql = "\n".join(definitions)
(out / "migrations/0001_clinic_schema.sql").write_text(sql + "\n")
shape = {}
for model in all_models:
    if model._meta.app_label not in app_names:
        continue
    fields = {}
    for field in model._meta.fields:
        default = field.get_default() if field.has_default() and not callable(field.default) else None
        fields[field.name] = {
            "column": field.column,
            "type": field.get_internal_type(),
            "nullable": field.null,
            "blank": field.blank,
            "maxLength": field.max_length,
            "decimalPlaces": getattr(field, "decimal_places", None),
            "maxDigits": getattr(field, "max_digits", None),
            "choices": [str(choice[0]) for choice in field.choices] if field.choices else [],
            "default": default,
            "factory": "uuid" if field.get_internal_type() == "UUIDField" else "json" if field.get_internal_type() == "JSONField" else "now" if getattr(field, "auto_now", False) or getattr(field, "auto_now_add", False) else None,
            "auto": field.primary_key or not field.editable,
            "target": field.related_model._meta.db_table if field.is_relation else None,
            "min": next((v.limit_value for v in field.validators if v.__class__.__name__ == "MinValueValidator"), None),
            "max": next((v.limit_value for v in field.validators if v.__class__.__name__ == "MaxValueValidator"), None),
        }
    shape[model._meta.db_table] = {"fields": fields, "ordering": model._meta.ordering}
(out / "src/model-shape.json").write_text(json.dumps(shape, indent=2, default=str) + "\n")
parents = {
    "patients_medicalhistory": ("patient_id", "patients_patient"),
    "patients_familyhistory": ("patient_id", "patients_patient"),
    "prescriptions_medication": ("prescription_id", "prescriptions_prescription"),
    "prescriptions_procedureentry": ("prescription_id", "prescriptions_prescription"),
    "treatments_treatmentblock": ("treatment_plan_id", "treatments_treatmentplan"),
    "treatments_treatmentsession": ("treatment_block_id", "treatments_treatmentblock"),
    "treatments_sessionfeedback": ("treatment_session_id", "treatments_treatmentsession"),
    "pharmacy_stockentry": ("medicine_id", "pharmacy_medicine"),
    "pharmacy_dispensingitem": ("dispensing_record_id", "pharmacy_dispensingrecord"),
}

def tenant_expression(table, alias):
    if table == "clinics_clinic":
        return f"{alias}.id"
    if "clinic" in shape[table]["fields"]:
        return f"{alias}.clinic_id"
    if table not in parents:
        return None
    column, parent = parents[table]
    inner = alias + "p"
    return f"(SELECT {tenant_expression(parent, inner)} FROM {parent} {inner} WHERE {inner}.id={alias}.{column})"

guards = []
for table, model in shape.items():
    current = tenant_expression(table, "NEW")
    if current is None:
        continue
    for name, field in model["fields"].items():
        target = field["target"]
        if not target or field["column"] == "clinic_id":
            continue
        related = tenant_expression(target, "related")
        if related is None:
            continue
        expression = f"(SELECT {related} FROM {target} related WHERE related.id=NEW.{field['column']})"
        for event in ("INSERT", "UPDATE"):
            guards.append(f"CREATE TRIGGER tenant_{table}_{name}_{event.lower()} BEFORE {event} ON {table}\nWHEN {current}<>{expression}\nBEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;")
(out / "migrations/0004_tenant_guards.sql").write_text("\n".join(guards) + "\n")
contracts = {}
for app in sorted(app_names):
    try:
        module = importlib.import_module(f"{app}.serializers")
    except ModuleNotFoundError:
        continue
    for name, cls in vars(module).items():
        if not isinstance(cls, type) or not issubclass(cls, serializers.BaseSerializer) or cls.__module__ != module.__name__:
            continue
        try:
            fields = cls().fields
            contracts[name] = {name: {"type": field.__class__.__name__, "required": field.required, "readOnly": field.read_only, "writeOnly": field.write_only, "nullable": field.allow_null, "source": field.source, "maxLength": getattr(field, "max_length", None), "blank": getattr(field, "allow_blank", None), "choices": list(getattr(field, "choices", {})), "min": getattr(field, "min_value", None), "max": getattr(field, "max_value", None)} for name, field in fields.items()}
        except (AssertionError, TypeError, AttributeError):
            continue
(out / "src/serializer-shape.json").write_text(json.dumps(contracts, indent=2) + "\n")

routes = []
def walk(patterns, prefix=""):
    for entry in patterns:
        path = prefix + str(entry.pattern)
        if hasattr(entry, "url_patterns"):
            walk(entry.url_patterns, path)
        elif path.startswith("api/"):
            callback = entry.callback
            cls = getattr(callback, "cls", None)
            actions = getattr(callback, "actions", {})
            methods = list(actions) or [method.upper() for method in getattr(cls, "http_method_names", []) if hasattr(cls, method)]
            routes.append({"path": path, "methods": methods, "name": entry.name, "actions": actions})
walk(get_resolver().url_patterns)
(out / "original-routes.json").write_text(json.dumps(routes, indent=2) + "\n")
print(f"Captured {len(shape)} models, {len(contracts)} serializers, and {len(routes)} route patterns.")
