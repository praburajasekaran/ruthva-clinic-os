from django.urls import path

from .views import submit_feedback

urlpatterns = [
    path("", submit_feedback, name="submit-feedback"),
]
