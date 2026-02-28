from django.template.loader import render_to_string

from clinics.logo_security import is_logo_url_allowed
from weasyprint import HTML


def generate_prescription_pdf(prescription):
    clinic = prescription.clinic
    clinic_logo_url = clinic.logo_url if is_logo_url_allowed(clinic.logo_url) else ""
    context = {
        "prescription": prescription,
        "patient": prescription.consultation.patient,
        "consultation": prescription.consultation,
        "clinic": clinic,
        "clinic_logo_url": clinic_logo_url,
        "conducted_by": prescription.consultation.conducted_by,
        "medications": prescription.medications.all(),
        "procedures": prescription.procedures.all(),
    }
    html_string = render_to_string("prescriptions/pdf.html", context)
    return HTML(string=html_string).write_pdf()
