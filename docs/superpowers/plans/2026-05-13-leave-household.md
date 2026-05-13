# Leave Household Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a non-owner household member to voluntarily leave a household via a "Leave" button on the members page.

**Architecture:** Extend the existing `DELETE /households/{householdId}/members/{userId}` endpoint by relaxing the `removeMember` service method to accept self-removal requests from non-owner members. The frontend adds a "Leave" button visible only to the current non-owner user on their own member card.

**Tech Stack:** Java/Spring Boot (backend), Next.js/React/Ant Design (frontend), JUnit 5 + Mockito (backend tests), Jest + React Testing Library (frontend tests)

---

## File Map

| Action | File |
|--------|------|
| Modify | `sopra-fs26-group-09-server/src/main/java/ch/uzh/ifi/hase/soprafs26/service/HouseholdService.java` |
| Modify (tests) | `sopra-fs26-group-09-server/src/test/java/ch/uzh/ifi/hase/soprafs26/service/HouseholdServiceTest.java` |
| Modify | `sopra-fs26-group-09-client/app/households/[id]/members/page.tsx` |
| Modify (tests) | `sopra-fs26-group-09-client/app/households/[id]/members/page.test.tsx` |

---

## Task 1: Create GitHub Issues

**Files:** none

- [ ] **Step 1: Create issue on client repo**

```bash
cd /home/tingyw/projects/sopra-fs26-group-09-client
gh issue create \
  --title "Feature: allow members to leave a household" \
  --body "$(cat <<'EOF'
## Problem

There is no way for a non-owner household member to voluntarily leave a household. The only options currently are:
- Owner removes the member
- Owner deletes the household

## Expected Behavior

A non-owner member should see a "Leave" button on the members page for their own row. Clicking it (with confirmation) removes them from the household and redirects them to `/households`.

The household owner cannot leave — they must delete the household instead.

## Implementation Notes

- Backend: relax `removeMember` in `HouseholdService` to allow `requester == target` when requester is not the owner
- Frontend: add "Leave" button in `app/households/[id]/members/page.tsx` visible only to the non-owner current user on their own row
EOF
)"
```

Note the issue number printed (e.g. `#42`). You will use it in the next step and in code comments.

- [ ] **Step 2: Create issue on server repo**

```bash
cd /home/tingyw/projects/sopra-fs26-group-09-server
gh issue create \
  --title "Feature: allow members to leave a household" \
  --body "$(cat <<'EOF'
## Problem

`HouseholdService.removeMember` throws 403 FORBIDDEN for any non-owner requester, including when the member is trying to remove themselves (leave).

## Required Change

Update the permission check so that:
- Owner can remove any non-owner member (existing behavior)
- Non-owner member can remove themselves (new)
- Owner trying to remove themselves → 400 BAD_REQUEST (existing)
- Non-owner trying to remove someone else → 403 FORBIDDEN (existing)

See client-side issue for full context.
EOF
)"
```

Note the server-side issue number as well.

Fill in the quick reference at the bottom of this plan before proceeding.

---

## Task 2: Backend – Write Failing Test for Member Self-Leave

**Files:**
- Modify: `sopra-fs26-group-09-server/src/test/java/ch/uzh/ifi/hase/soprafs26/service/HouseholdServiceTest.java`

- [ ] **Step 1: Write the failing test**

In `HouseholdServiceTest.java`, add this test after `removeMember_owner_success` (around line 806). Replace `<CLIENT_ISSUE>` and `<SERVER_ISSUE>` with the issue numbers from Task 1.

```java
    @Test
    // Implements member self-leave feature (client #<CLIENT_ISSUE>, server #<SERVER_ISSUE>)
    void removeMember_memberLeavesSelf_success() {
        Household household = new Household();
        household.setId(10L);
        household.setOwnerId(1L); // user 1 is owner

        when(householdRepository.findById(10L)).thenReturn(Optional.of(household));
        when(householdMemberRepository.existsById(eq(new HouseholdMemberId(2L, 10L)))).thenReturn(true);

        // user 2 (non-owner) removes themselves
        householdService.removeMember(10L, 2L, 2L);

        verify(householdMemberRepository).deleteById(eq(new HouseholdMemberId(2L, 10L)));
    }
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/tingyw/projects/sopra-fs26-group-09-server
./mvnw test -pl . -Dtest="HouseholdServiceTest#removeMember_memberLeavesSelf_success" -q 2>&1 | tail -20
```

Expected: `FAILED` — throws `403 FORBIDDEN` (current behavior blocks all non-owners).

---

## Task 3: Backend – Update `removeMember` Permission Logic

**Files:**
- Modify: `sopra-fs26-group-09-server/src/main/java/ch/uzh/ifi/hase/soprafs26/service/HouseholdService.java:430-456`

- [ ] **Step 1: Replace the permission block in `removeMember`**

Find and replace this block (lines 434-440):

```java
        if (!household.getOwnerId().equals(requesterUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the household owner can remove members.");
        }

        if (targetUserId.equals(requesterUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The owner cannot remove themselves from the household.");
        }
```

Replace with (substitute `<CLIENT_ISSUE>` and `<SERVER_ISSUE>` with real numbers):

```java
        boolean requesterIsOwner = household.getOwnerId().equals(requesterUserId);
        boolean requesterIsSelf = targetUserId.equals(requesterUserId);

        if (requesterIsOwner && requesterIsSelf) {
            // owner cannot leave; they must delete the household instead (client #<CLIENT_ISSUE>, server #<SERVER_ISSUE>)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The owner cannot leave; delete the household instead.");
        }
        if (!requesterIsOwner && !requesterIsSelf) {
            // non-owner members may only remove themselves, not other members (client #<CLIENT_ISSUE>, server #<SERVER_ISSUE>)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Members can only remove themselves.");
        }
```

- [ ] **Step 2: Run the new test to verify it passes**

```bash
cd /home/tingyw/projects/sopra-fs26-group-09-server
./mvnw test -pl . -Dtest="HouseholdServiceTest#removeMember_memberLeavesSelf_success" -q 2>&1 | tail -10
```

Expected: `BUILD SUCCESS`

- [ ] **Step 3: Run all `removeMember` tests**

```bash
cd /home/tingyw/projects/sopra-fs26-group-09-server
./mvnw test -pl . -Dtest="HouseholdServiceTest#removeMember*" -q 2>&1 | tail -20
```

Expected: All 6 tests pass. Note: `removeMember_nonOwner_throws403` tests requester=1, target=3, owner=2 — requester is not owner AND not self, so still 403.

Note: `removeMember_ownerRemovingSelf_throws400` tests requester=1, target=1, owner=1 — the error message in the service changed from "The owner cannot remove themselves from the household." to "The owner cannot leave; delete the household instead." That test only checks the HTTP status (400), not the message, so it still passes.

- [ ] **Step 4: Run the full test suite**

```bash
cd /home/tingyw/projects/sopra-fs26-group-09-server
./mvnw test -q 2>&1 | tail -20
```

Expected: `BUILD SUCCESS`

- [ ] **Step 5: Commit**

```bash
cd /home/tingyw/projects/sopra-fs26-group-09-server
git add src/main/java/ch/uzh/ifi/hase/soprafs26/service/HouseholdService.java \
        src/test/java/ch/uzh/ifi/hase/soprafs26/service/HouseholdServiceTest.java
git commit -m "feat: allow non-owner members to leave a household (#<SERVER_ISSUE>)"
```

---

## Task 4: Frontend – Write Failing Tests for Leave Button

**Files:**
- Modify: `sopra-fs26-group-09-client/app/households/[id]/members/page.test.tsx`

- [ ] **Step 1: Make `userId` mock configurable per test**

At the top of `page.test.tsx` (before the `jest.mock` calls), add:

```typescript
let currentUserIdMock = "1";
```

Then replace the entire `jest.mock("@/hooks/useSessionStorage", ...)` block with:

```typescript
jest.mock("@/hooks/useSessionStorage", () => ({
  __esModule: true,
  default: (key: string) => {
    if (key === "token") {
      return { value: "test-token", set: jest.fn(), clear: jest.fn() };
    }
    if (key === "households") {
      return {
        value: [
          { householdId: 10, name: "Test House", inviteCode: "ABC123", ownerId: 1, role: "owner" },
        ],
        set: setHouseholdsMock,
        clear: jest.fn(),
      };
    }
    if (key === "selectedHouseholdId") {
      return { value: null, set: jest.fn(), clear: clearSelectedHouseholdIdMock };
    }
    if (key === "userId") {
      return { value: currentUserIdMock, set: jest.fn(), clear: jest.fn() };
    }
    return { value: "", set: jest.fn(), clear: jest.fn() };
  },
}));
```

- [ ] **Step 2: Reset `currentUserIdMock` in `beforeEach`**

Inside the `describe("HouseholdMembersPage", ...)` block, update the existing `beforeEach` to:

```typescript
  beforeEach(() => {
    jest.clearAllMocks();
    currentUserIdMock = "1"; // reset to owner perspective for each test
  });
```

- [ ] **Step 3: Add two failing tests for the Leave feature**

At the end of the `describe` block (before the closing `}`), add:

```typescript
  // Leave button tests (client #<CLIENT_ISSUE>)
  it("shows Leave button for current user when they are a non-owner member", async () => {
    currentUserIdMock = "2"; // bob is the current user (non-owner)
    getMock.mockImplementation((url: string) => {
      if (url === "/households/10") return Promise.resolve({ householdId: 10, name: "Test House" });
      if (url === "/households/10/members") return Promise.resolve(sampleMembers);
      return Promise.reject(new Error("unexpected: " + url));
    });

    render(<HouseholdMembersPage />);

    await waitFor(() => {
      expect(screen.getByText("bob")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Leave" })).toBeInTheDocument();
    // Remove button must not appear for non-owner
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  it("calls DELETE /households/10/members/2 and redirects to /households on leave confirm", async () => {
    currentUserIdMock = "2"; // bob leaves
    getMock.mockImplementation((url: string) => {
      if (url === "/households/10") return Promise.resolve({ householdId: 10, name: "Test House" });
      if (url === "/households/10/members") return Promise.resolve(sampleMembers);
      return Promise.reject(new Error("unexpected: " + url));
    });
    deleteMock.mockResolvedValueOnce(undefined);

    render(<HouseholdMembersPage />);

    await waitFor(() => {
      expect(screen.getByText("bob")).toBeInTheDocument();
    });

    // The Popconfirm mock renders a confirm button with data-testid="popconfirm-ok"
    // Only the Leave Popconfirm is in the DOM when current user is non-owner
    fireEvent.click(screen.getByTestId("popconfirm-ok"));

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith("/households/10/members/2");
      expect(pushMock).toHaveBeenCalledWith("/households");
    });
  });
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
cd /home/tingyw/projects/sopra-fs26-group-09-client
npx jest "app/households/\[id\]/members/page.test.tsx" --no-coverage 2>&1 | tail -30
```

Expected: The two new tests fail — "Leave" button doesn't exist yet.

---

## Task 5: Frontend – Add Leave Button

**Files:**
- Modify: `sopra-fs26-group-09-client/app/households/[id]/members/page.tsx`

- [ ] **Step 1: Add `isLeavingHousehold` state after line 67**

After `const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);`, add:

```typescript
  const [isLeavingHousehold, setIsLeavingHousehold] = useState(false);
```

- [ ] **Step 2: Add `handleLeave` function after `handleRemove` (after line 82)**

After the closing `};` of `handleRemove`, add:

```typescript
  // Allows the current non-owner member to voluntarily leave this household (client #<CLIENT_ISSUE>)
  const handleLeave = async () => {
    if (currentUserId === null) return;
    setIsLeavingHousehold(true);
    try {
      await api.delete(`/households/${householdId}/members/${currentUserId}`);
      setHouseholds(cachedHouseholds.filter((h) => h.householdId !== householdId));
      clearSelectedHouseholdId();
      router.push("/households");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to leave household.");
    } finally {
      setIsLeavingHousehold(false);
    }
  };
```

- [ ] **Step 3: Add Leave button in the member card render block**

After the closing `)}` of the existing `Popconfirm` for Remove (after line 241), add:

```tsx
                {/* Leave button for current non-owner member (client #<CLIENT_ISSUE>) */}
                {!isOwner && member.userId === currentUserId && (
                  <Popconfirm
                    title="Leave this household?"
                    onConfirm={() => void handleLeave()}
                    okText="Leave"
                    cancelText="Cancel"
                  >
                    <Button
                      size="small"
                      danger
                      loading={isLeavingHousehold}
                    >
                      Leave
                    </Button>
                  </Popconfirm>
                )}
```

- [ ] **Step 4: Run the new tests to verify they pass**

```bash
cd /home/tingyw/projects/sopra-fs26-group-09-client
npx jest "app/households/\[id\]/members/page.test.tsx" --no-coverage 2>&1 | tail -30
```

Expected: All tests pass including the two new ones.

- [ ] **Step 5: Run the full frontend test suite**

```bash
cd /home/tingyw/projects/sopra-fs26-group-09-client
npm test -- --no-coverage 2>&1 | tail -30
```

Expected: All tests pass.

- [ ] **Step 6: Run build**

```bash
cd /home/tingyw/projects/sopra-fs26-group-09-client
npm run build 2>&1 | tail -20
```

Expected: No TypeScript errors, compiled successfully.

- [ ] **Step 7: Commit**

```bash
cd /home/tingyw/projects/sopra-fs26-group-09-client
git add "app/households/[id]/members/page.tsx" \
        "app/households/[id]/members/page.test.tsx"
git commit -m "feat: add Leave button for non-owner members (#<CLIENT_ISSUE>)"
```

---

## Quick Reference: Issue Numbers

Fill these in after Task 1:

| Repo | Issue # |
|------|---------|
| client | `#___` |
| server | `#___` |

Replace every `<CLIENT_ISSUE>` and `<SERVER_ISSUE>` placeholder before executing Tasks 2–5.
