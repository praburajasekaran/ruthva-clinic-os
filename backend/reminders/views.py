import logging

from django.conf import settings
from django.core.management import call_command
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

logger = logging.getLogger(__name__)

CRON_SECRET = getattr(settings, "CRON_SECRET", "")


@csrf_exempt
@require_POST
def cron_send_reminders(request):
    """HTTP endpoint for cron-job.org to trigger follow-up reminders."""
    token = request.headers.get("X-Cron-Secret", "")

    if not CRON_SECRET or token != CRON_SECRET:
        return JsonResponse({"error": "unauthorized"}, status=401)

    try:
        call_command("send_followup_reminders")
        return JsonResponse({"status": "ok"})
    except Exception:
        logger.exception("Cron: send_followup_reminders failed")
        return JsonResponse({"error": "internal error"}, status=500)
