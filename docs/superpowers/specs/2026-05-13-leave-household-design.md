# Leave Household Feature Design

**Date:** 2026-05-13  
**Status:** Approved

## Summary

Allow a non-owner household member to voluntarily leave a household. The owner cannot leave (must delete the household instead).

## Background

The existing `removeMember` endpoint (`DELETE /households/{householdId}/members/{userId}`) only permits the owner to remove other members. Members have no way to leave on their own. The original design doc states: "A member can leave a household; the owner cannot leave (must delete the household instead)" — this is currently unimplemented.

## Scope

- **In scope:** Backend permission logic update, frontend Leave button in members list page, GitHub issue creation
- **Out of scope:** Owner transferring ownership before leaving, bulk leave, notifications to remaining members beyond existing WebSocket events

## Backend Design

### File: `HouseholdService.java` — `removeMember` method

**Updated permission logic:**

```
if requesterUserId == ownerId:
    if targetUserId == ownerId:
        → 400 BAD_REQUEST ("The owner cannot leave; delete the household instead.")
    else:
        → allow (owner removes a member)
elif requesterUserId == targetUserId:
    → allow (member leaves voluntarily)
else:
    → 403 FORBIDDEN ("Members can only remove themselves.")
```

**Data handling:** Remove the `HouseholdMember` record. All other household data (pantry items, etc.) stays in the household with no user association change — consistent with "direct disassociation" strategy.

**No new endpoint needed.** The existing `DELETE /households/{householdId}/members/{userId}` endpoint is reused.

### Error responses

| Scenario | HTTP | Message |
|----------|------|---------|
| Owner tries to leave | 400 | "The owner cannot leave; delete the household instead." |
| Member tries to remove someone else | 403 | "Members can only remove themselves." |
| Target user not a member | 404 | (existing behavior) |

## Frontend Design

### File: `app/households/[id]/members/page.tsx`

**Behavior per row in the members list:**

| Current user's role | Viewing own row | Viewing others' rows |
|---------------------|----------------|----------------------|
| Owner | No button | "Remove" button (existing) |
| Member | "Leave" button (new) | No button |

**Leave flow:**
1. Member clicks "Leave" button on their own row
2. Confirmation dialog appears (same modal style as delete household)
3. On confirm: call `DELETE /households/{householdId}/members/{currentUserId}`
4. On success: navigate to `/households`
5. On error: show error toast

**WebSocket:** No changes needed. Existing `MEMBER_REMOVED` event already broadcasts to other members when someone is removed, keeping their member lists up to date.

## GitHub Issue

Create a GitHub issue titled: "Feature: allow members to leave a household" on the client repo before implementation. Reference the issue number in code comments.

## Testing

- **Backend unit test:** `removeMember` with requester == target, non-owner → succeeds
- **Backend unit test:** `removeMember` with requester == owner, target == owner → 400
- **Backend unit test:** `removeMember` with non-owner requester != target → 403
- **Frontend:** Leave button visible only for non-owner current user; not visible for owner or other members' rows
