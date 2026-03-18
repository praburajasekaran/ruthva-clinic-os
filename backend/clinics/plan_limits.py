PLAN_LIMITS = {
    "free": {
        "doctors": 1,
        "therapists": 1,
        "admins": 1,
        "patients": 200,
    },
    "pro": {
        "doctors": 10,
        "therapists": 10,
        "admins": 10,
        "patients": 10000,
    },
}


def get_role_limit(plan, role):
    """Get the limit for a role on a given plan. Role should be singular (e.g., 'doctor')."""
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    plural = role + "s" if not role.endswith("s") else role
    return limits.get(plural, 0)


def get_patient_limit(plan):
    """Get the patient limit for a given plan."""
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    return limits.get("patients", 200)
