import logging

from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Feedback
from .serializers import FeedbackSerializer
from .services import GitHubService
from .storage import upload_screenshot

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def submit_feedback(request):
    serializer = FeedbackSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    screenshot_url = ""
    screenshot = data.get("screenshot")
    if screenshot:
        screenshot_url = upload_screenshot(screenshot, screenshot.content_type) or ""

    feedback = Feedback.objects.create(
        clinic=request.user.clinic,
        user=request.user,
        category=data["category"],
        title=data["title"],
        description=data.get("description", ""),
        screenshot_url=screenshot_url,
        page_url=data.get("page_url", ""),
        user_role=getattr(request.user, "role", ""),
        browser_info=data.get("browser_info", ""),
    )

    # Best-effort GitHub sync
    gh = GitHubService()
    label = "bug" if feedback.category == "bug" else "enhancement"
    body = (
        f"**Category:** {feedback.get_category_display()}\n"
        f"**Submitted by:** {request.user.email}\n"
        f"**Page:** {feedback.page_url}\n\n"
        f"{feedback.description}"
    )
    if screenshot_url:
        body += f"\n\n**Screenshot:**\n![screenshot]({screenshot_url})"

    result = gh.create_issue(title=feedback.title, body=body, labels=[label])
    if result.ok:
        feedback.github_issue_url = result.data.get("html_url", "")
        feedback.github_issue_number = result.data.get("number")
        feedback.status = Feedback.Status.SYNCED
    else:
        feedback.status = Feedback.Status.FAILED
        logger.warning("GitHub sync failed for feedback %s: %s", feedback.id, result.error)
    feedback.save(update_fields=["github_issue_url", "github_issue_number", "status"])

    return Response({"id": feedback.id, "status": feedback.status}, status=status.HTTP_201_CREATED)
