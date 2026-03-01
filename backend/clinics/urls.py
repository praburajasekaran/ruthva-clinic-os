from django.urls import path

from .views import (
    accept_invite,
    invitation_cancel,
    invitation_list,
    invite_details,
    team_invite,
    team_list,
    team_remove,
    team_update_role,
)

urlpatterns = [
    path("", team_list, name="team-list"),
    path("invite/", team_invite, name="team-invite"),
    path("<int:member_id>/role/", team_update_role, name="team-update-role"),
    path("<int:member_id>/", team_remove, name="team-remove"),
    path("invitations/", invitation_list, name="invitation-list"),
    path("invitations/<int:invitation_id>/", invitation_cancel, name="invitation-cancel"),
]

# Invite accept endpoints (public, not under /team/)
invite_urlpatterns = [
    path("details/", invite_details, name="invite-details"),
    path("accept/", accept_invite, name="invite-accept"),
]
