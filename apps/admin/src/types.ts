export type ProvisionStepState = "pending" | "active" | "done";

export interface ProvisionStepView {
  key: string;
  label: string;
  state: ProvisionStepState;
}

export interface AdminUser {
  tenantId: string;
  email: string | null;
  plan: string;
  status: string;
  mcpUsed: number;
  mcpLimit: number;
  mcpMonth: string;
  signedUpAt: string | null;
  lastMcpUsageAt: string | null;
  revoked: boolean;
  revokedAt: string | null;
  pool: string | null;
  percent: number;
  onboardingCompleted: boolean;
  progressLabel: string;
  stuck: boolean;
  stuckReason: string | null;
  stuckStage: "provision" | "onboarding" | null;
  provisionSteps: ProvisionStepView[];
  poolMode: string | null;
  updatedAt: string | null;
  egressBytesMonth: number | null;
  egressCapBytes: number | null;
}

export interface ListUsersResponse {
  users: AdminUser[];
  nextCursor: string | null;
  count: number;
}

export interface OnboardingProfile {
  companyName?: string;
  companyEmail?: string;
  phone?: string;
  occupation?: string;
  jobTitle?: string;
  teamSize?: string;
  primaryUseCase?: string;
}

export interface AdminUserDetail {
  user: AdminUser;
  appUrl: string;
  workspaceOpenUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  percent: number;
  progressLabel: string;
  stuck: boolean;
  stuckReason: string | null;
  stuckStage: "provision" | "onboarding" | null;
  provisionSteps: ProvisionStepView[];
  onboardingCompleted: boolean;
  onboardingProfile: OnboardingProfile | null;
  poolMode: string | null;
  uploadSchema: string | null;
  uploadDbRole: string | null;
  supersetRoleName: string | null;
  supersetDatabaseId: number | null;
  supersetRoleId: number | null;
  mcpBackendUrl: string | null;
  mcpBackendKind: string | null;
  mcpToolAllowlist: string | null;
  maxCreators: number | null;
  maxViewers: number | null;
  egressBytesMonth: number | null;
  egressCapBytes: number | null;
  egressMonth: string | null;
  metaSchema: string | null;
  workspaceSchema: string | null;
  ecsServiceName: string | null;
  cloudMapUrl: string | null;
  apiKeyPresent: boolean;
  apiKeyRevoked: boolean;
  account: {
    googleSub: string | null;
    email: string | null;
    createdAt: string | null;
    signInMethod: string;
  } | null;
  billing: {
    checkoutId: string;
    status: string;
    plan: string | null;
    billingInterval: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    jobId: string | null;
    updatedAt: string;
  } | null;
  sandboxJob: {
    jobId: string;
    status: string;
    percent: number | null;
    steps: Record<string, string> | null;
    appUrl: string | null;
    publicHostname: string | null;
    error: string | null;
    updatedAt: string;
  } | null;
}
