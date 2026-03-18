from rest_framework import serializers

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024  # 5 MB


class FeedbackSerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=["bug", "feature"])
    title = serializers.CharField(max_length=256)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    screenshot = serializers.ImageField(required=False)
    page_url = serializers.CharField(required=False, allow_blank=True, default="")
    browser_info = serializers.CharField(
        required=False, allow_blank=True, max_length=256, default=""
    )

    def validate_screenshot(self, value):
        if value:
            if value.content_type not in ALLOWED_IMAGE_TYPES:
                raise serializers.ValidationError(
                    "Only PNG, JPEG, GIF, and WebP images are allowed."
                )
            if value.size > MAX_SCREENSHOT_SIZE:
                raise serializers.ValidationError("Screenshot must be under 5 MB.")
        return value
