export type HouseholdRole = "owner" | "member";

export interface Household {
  householdId: number;
  name: string;
  inviteCode: string;
  ownerId: number;
  createdAt?: string;
  role?: HouseholdRole;
}

export interface HouseholdWithRole extends Household {
  role: HouseholdRole;
}

export interface HouseholdInviteCodeResponse {
  householdId: number;
  inviteCode: string;
  expiresAt?: string | null;
}
