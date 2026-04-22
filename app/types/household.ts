export interface Household {
  householdId: number;
  name: string;
  inviteCode: string;
  ownerId: number;
  createdAt?: string;
}

export interface HouseholdWithRole extends Household {
  role: "owner" | "member";
}

export interface HouseholdInviteCodeResponse {
  householdId: number;
  inviteCode: string;
  expiresAt?: string | null;
}
