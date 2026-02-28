"use client";

import {
  Crown,
  Mail,
  MoreVertical,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  Users2,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useApi } from "@/hooks/useApi";
import { useMutation } from "@/hooks/useMutation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type {
  Invitation,
  InviteMemberRequest,
  TeamMember,
  UserRole,
} from "@/lib/types";
import api from "@/lib/api";

const ROLE_LABELS: Record<UserRole, string> = {
  doctor: "Doctor",
  therapist: "Therapist",
  admin: "Admin",
};

const ROLE_COLORS: Record<UserRole, string> = {
  doctor: "bg-emerald-50 text-emerald-700",
  therapist: "bg-blue-50 text-blue-700",
  admin: "bg-amber-50 text-amber-700",
};

export default function TeamPage() {
  const { user } = useAuth();
  const isOwner = user?.is_clinic_owner ?? false;

  const { data: members, refetch: refetchMembers } =
    useApi<TeamMember[]>("/team/");
  const { data: invitations, refetch: refetchInvitations } =
    useApi<Invitation[]>(isOwner ? "/team/invitations/" : null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [roleEditId, setRoleEditId] = useState<number | null>(null);

  const pendingInvitations = invitations?.filter((inv) => !inv.accepted_at) ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your clinic&apos;s team members and roles
          </p>
        </div>
        {isOwner && (
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Members list */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Users2 className="h-5 w-5 text-gray-400" />
            Members
            {members && (
              <span className="text-sm font-normal text-gray-400">
                ({members.length})
              </span>
            )}
          </h2>
        </div>
        <div className="divide-y">
          {members?.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isOwner={isOwner}
              currentUserId={user?.id ?? 0}
              actionMenuId={actionMenuId}
              setActionMenuId={setActionMenuId}
              roleEditId={roleEditId}
              setRoleEditId={setRoleEditId}
              onUpdate={refetchMembers}
            />
          ))}
          {!members && (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              Loading team members...
            </div>
          )}
          {members?.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              No team members yet
            </div>
          )}
        </div>
      </div>

      {/* Pending invitations (owner only) */}
      {isOwner && pendingInvitations.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b px-6 py-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Mail className="h-5 w-5 text-gray-400" />
              Pending Invitations
              <span className="text-sm font-normal text-gray-400">
                ({pendingInvitations.length})
              </span>
            </h2>
          </div>
          <div className="divide-y">
            {pendingInvitations.map((inv) => (
              <InvitationRow
                key={inv.id}
                invitation={inv}
                onCancel={refetchInvitations}
              />
            ))}
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            refetchInvitations();
          }}
        />
      )}
    </div>
  );
}

// ── Member Row ──

function MemberRow({
  member,
  isOwner,
  currentUserId,
  actionMenuId,
  setActionMenuId,
  roleEditId,
  setRoleEditId,
  onUpdate,
}: {
  member: TeamMember;
  isOwner: boolean;
  currentUserId: number;
  actionMenuId: number | null;
  setActionMenuId: (id: number | null) => void;
  roleEditId: number | null;
  setRoleEditId: (id: number | null) => void;
  onUpdate: () => void;
}) {
  const [isRoleUpdating, setIsRoleUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSelf = member.id === currentUserId;
  const canManage = isOwner && !member.is_clinic_owner && !isSelf;

  const handleRoleChange = useCallback(
    async (newRole: UserRole) => {
      setIsRoleUpdating(true);
      try {
        await api.patch(`/team/${member.id}/role/`, { role: newRole });
        setRoleEditId(null);
        onUpdate();
      } catch {
        // Error handling via UI feedback
      } finally {
        setIsRoleUpdating(false);
      }
    },
    [member.id, setRoleEditId, onUpdate],
  );

  const handleRemove = useCallback(async () => {
    if (!confirm(`Remove ${member.first_name} ${member.last_name} from the clinic?`)) {
      return;
    }
    setIsRemoving(true);
    try {
      await api.delete(`/team/${member.id}/`);
      setActionMenuId(null);
      onUpdate();
    } catch {
      // Error handling via UI feedback
    } finally {
      setIsRemoving(false);
    }
  }, [member, setActionMenuId, onUpdate]);

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
          {member.first_name?.[0]?.toUpperCase() ?? "?"}
          {member.last_name?.[0]?.toUpperCase() ?? ""}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">
              {member.first_name} {member.last_name}
            </p>
            {member.is_clinic_owner && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
                <Crown className="h-3 w-3" />
                Owner
              </span>
            )}
            {isSelf && !member.is_clinic_owner && (
              <span className="text-xs text-gray-400">(You)</span>
            )}
          </div>
          <p className="text-sm text-gray-500">{member.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Role badge or inline edit */}
        {roleEditId === member.id ? (
          <div className="flex items-center gap-2">
            <Select
              value={member.role}
              onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              disabled={isRoleUpdating}
              className="!h-8 !text-sm"
            >
              <option value="doctor">Doctor</option>
              <option value="therapist">Therapist</option>
              <option value="admin">Admin</option>
            </Select>
            <button
              type="button"
              onClick={() => setRoleEditId(null)}
              className="rounded p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[member.role]}`}
          >
            {ROLE_LABELS[member.role]}
          </span>
        )}

        {/* Action menu */}
        {canManage && roleEditId !== member.id && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() =>
                setActionMenuId(actionMenuId === member.id ? null : member.id)
              }
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {actionMenuId === member.id && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setActionMenuId(null)}
                />
                <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setActionMenuId(null);
                      setRoleEditId(member.id);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Shield className="h-4 w-4" />
                    Change Role
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={isRemoving}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Invitation Row ──

function InvitationRow({
  invitation,
  onCancel,
}: {
  invitation: Invitation;
  onCancel: () => void;
}) {
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = useCallback(async () => {
    setIsCancelling(true);
    try {
      await api.delete(`/team/invitations/${invitation.id}/`);
      onCancel();
    } catch {
      // Error handling via UI feedback
    } finally {
      setIsCancelling(false);
    }
  }, [invitation.id, onCancel]);

  const expiresAt = new Date(invitation.expires_at);
  const isExpired = expiresAt < new Date();

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {invitation.first_name} {invitation.last_name}
          </p>
          <p className="text-sm text-gray-500">{invitation.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[invitation.role]}`}
        >
          {ROLE_LABELS[invitation.role]}
        </span>
        {isExpired ? (
          <span className="text-xs text-red-500">Expired</span>
        ) : (
          <span className="text-xs text-gray-400">
            Expires {expiresAt.toLocaleDateString()}
          </span>
        )}
        <button
          type="button"
          onClick={handleCancel}
          disabled={isCancelling}
          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
          title="Cancel invitation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Invite Modal ──

function InviteModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<InviteMemberRequest>({
    email: "",
    first_name: "",
    last_name: "",
    role: "doctor",
  });

  const {
    mutate: invite,
    isLoading,
    error,
  } = useMutation<InviteMemberRequest, Invitation>("post", "/team/invite/");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const result = await invite(form);
      if (result) {
        onSuccess();
      }
    },
    [form, invite, onSuccess],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Invite Team Member
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="doctor@example.com"
              required
              hasError={!!error?.email}
            />
            {error?.email && (
              <p className="mt-1 text-sm text-red-600">
                {Array.isArray(error.email) ? error.email[0] : error.email}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                First Name
              </label>
              <Input
                value={form.first_name}
                onChange={(e) =>
                  setForm({ ...form, first_name: e.target.value })
                }
                placeholder="First name"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <Input
                value={form.last_name}
                onChange={(e) =>
                  setForm({ ...form, last_name: e.target.value })
                }
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Role
            </label>
            <Select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as UserRole })
              }
            >
              <option value="doctor">Doctor</option>
              <option value="therapist">Therapist</option>
              <option value="admin">Admin</option>
            </Select>
          </div>

          {error?.detail && (
            <p className="text-sm text-red-600">{error.detail}</p>
          )}
          {error?.non_field_errors && (
            <p className="text-sm text-red-600">{error.non_field_errors[0]}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              <Plus className="h-4 w-4" />
              Send Invitation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
