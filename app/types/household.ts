export interface Household {
  householdId: number;
  name: string;
  inviteCode: string;
  ownerId: number;
}

export interface HouseholdWithRole extends Household {
  role: "owner" | "member";
}

export interface HouseholdInviteCodeResponse {
  householdId: number;
  inviteCode: string;
  expiresAt?: string | null;
}
