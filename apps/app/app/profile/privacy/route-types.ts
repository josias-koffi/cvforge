export type PrivacyRetentionRule = {
  action: string;
  automation: string;
  dataType: string;
  retention: string;
};

export type PrivacyRetentionPolicy = {
  audioPurgePlan: {
    execution: string;
    retentionDays: number;
    scope: string;
    status: "planned";
  };
  documentedAt: string;
  rules: PrivacyRetentionRule[];
};

export type PrivacyApiExportPayload = {
  exportData: {
    adminGrantReferences: Array<{
      amount: number;
      createdAt: string;
      id: string;
      metadata: {
        adminEmail?: string;
      };
      note: string | null;
      userEmail: string;
    }>;
    auth: {
      account: {
        consent: {
          acceptedAt: string;
          source: "invitation" | "passwordless";
          version: string;
        } | null;
        email: string;
        role: "admin" | "user";
      } | null;
      issuedInvitations: Array<{
        consumedAt: string | null;
        createdAt: string;
        createdBy: string;
        email: string;
        expiresAt: string;
        role: "admin" | "user";
        tokenHash: string;
      }>;
      receivedInvitations: Array<{
        consumedAt: string | null;
        createdAt: string;
        createdBy: string;
        email: string;
        expiresAt: string;
        role: "admin" | "user";
        tokenHash: string;
      }>;
    };
    exportedAt: string;
    notifications: Array<{
      createdAt: string;
      id: string;
      message: string;
      readAt: string | null;
      title: string;
      type: string;
      userEmail: string;
    }>;
    ownedApplications: Array<{
      createdAt: string;
      id: string;
      sourceLabel: string;
      status: string;
      updatedAt: string;
      userEmail: string;
    }>;
    ownedCredits: Array<{
      amount: number;
      balanceAfter: number;
      createdAt: string;
      id: string;
      note: string | null;
      type: string;
      userEmail: string;
    }>;
    retentionPolicy: PrivacyRetentionPolicy;
    userEmail: string;
  };
};
