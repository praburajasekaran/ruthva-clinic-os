import logging
from dataclasses import dataclass

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

GITHUB_TIMEOUT = 10  # seconds


@dataclass
class GitHubResponse:
    ok: bool
    data: dict | None = None
    error: str | None = None


class GitHubService:
    """HTTP client for creating GitHub Issues from user feedback."""

    def __init__(self):
        self.token = settings.GITHUB_TOKEN
        self.repo = settings.GITHUB_FEEDBACK_REPO  # "owner/repo"
        self.base_url = f"https://api.github.com/repos/{self.repo}"

    def _headers(self):
        return {
            "Authorization": f"token {self.token}",
            "Accept": "application/vnd.github.v3+json",
        }

    def create_issue(self, title: str, body: str, labels: list[str]) -> GitHubResponse:
        if not self.token or not self.repo:
            return GitHubResponse(ok=False, error="GitHub integration not configured")

        try:
            resp = requests.post(
                f"{self.base_url}/issues",
                json={"title": title, "body": body, "labels": labels},
                headers=self._headers(),
                timeout=GITHUB_TIMEOUT,
            )
            if resp.status_code == 201:
                return GitHubResponse(ok=True, data=resp.json())
            return GitHubResponse(
                ok=False,
                error=f"GitHub API error: {resp.status_code}",
            )
        except requests.Timeout:
            logger.error("GitHub API timeout creating issue")
            return GitHubResponse(ok=False, error="GitHub API timeout")
        except requests.ConnectionError:
            logger.error("GitHub API connection error")
            return GitHubResponse(ok=False, error="GitHub API connection error")
        except Exception as exc:
            logger.exception("Unexpected error creating GitHub issue")
            return GitHubResponse(ok=False, error=str(exc))
