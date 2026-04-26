# Product Owner — US-051 Recruiter Role & Organizations

## Scope confirmation
US-051 is a V2.0 product-definition task. The product owner models the recruiter role and enterprise organization concept as a specification artifact that will guide future developer implementation. No code is written in this stage.

## 1. Recruiter role model

### AuthRole extension
```typescript
export type AuthRole = "admin" | "user" | "recruiter";
```

### Recruiter attributes
| Field | Type | Description |
|---|---|---|
| `role` | `"recruiter"` | Assigned via admin invitation only |
| `organizationId` | `string` | Required — recruiter must belong to an org |
| `permissions` | `RecruiterPermission[]` | Scoped capabilities |

### RecruiterPermission set (V2.0 scope)
| Permission | Description |
|---|---|
| `applications:read` | Read candidate applications shared with this recruiter |
| `interviews:schedule` | Schedule interview sessions |
| `candidates:view` | View anonymized candidate profiles |
| `organization:manage` | Admin sub-permission — manage org members (org-admin only) |

### Recruiter cannot
- Access `/admin` panel (admin-only)
- Read other users' private profiles
- Generate CV/LM on behalf of candidates
- Access credit ledger

## 2. Organization / enterprise account model

### Organization entity
```typescript
type Organization = {
  id: string;                    // UUID
  name: string;                  // Company name
  slug: string;                  // URL-safe identifier
  createdAt: string;             // ISO 8601
  createdBy: string;             // admin email who created it
  status: "active" | "suspended";
  members: OrganizationMember[];
};

type OrganizationMember = {
  email: string;
  role: "org-admin" | "member";  // within the org
  joinedAt: string;
};
```

### Organization lifecycle
| Action | Who |
|---|---|
| Create organization | Platform admin only |
| Invite recruiter to org | Platform admin OR org-admin |
| Suspend organization | Platform admin |
| Delete organization | Platform admin |

### Organization constraints
- A recruiter MUST belong to exactly one organization
- An organization can have multiple recruiters
- org-admin is a sub-role within `recruiter` — not a new `AuthRole`
- Organization data is isolated: recruiters see only data shared with their org

## 3. Permission separation matrix

| Capability | `user` | `recruiter` | `admin` |
|---|---|---|---|
| Access own profile/CV | ✅ | ❌ | ❌ |
| Create candidature | ✅ | ❌ | ❌ |
| Run interview session | ✅ | ❌ | ❌ |
| View shared applications | ❌ | ✅ | ✅ |
| Schedule interviews | ❌ | ✅ | ✅ |
| View org dashboard | ❌ | ✅ | ✅ |
| Access /admin | ❌ | ❌ | ✅ |
| Manage templates | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Create organizations | ❌ | ❌ | ✅ |
| Manage org members | ❌ | org-admin only | ✅ |

## 4. Invitation flow for recruiter
- Recruiter invited via admin panel: chooses email + organization
- Magic link with `role: "recruiter"` + `organizationId` in payload
- Invitation token embeds org assignment — no public signup path
- 48h expiry, single-use (same rules as existing invitation system)

## 5. Acceptance criteria verification

| Criterion | Evidence | Status |
|---|---|---|
| Le rôle recruteur est modélisé | `AuthRole` extended to include `"recruiter"`; RecruiterPermission set defined; recruiter attributes (organizationId, permissions) specified | ✅ |
| Les organisations et comptes entreprise sont gérés | Organization entity fully specified with CRUD lifecycle, member model, org-admin sub-role, isolation rules | ✅ |
| Les permissions sont séparées des rôles `user` et `admin` | Permission matrix table shows distinct non-overlapping capabilities; recruiter cannot access /admin, user cannot access recruiter routes | ✅ |

## 6. Implementation notes for developer workflow
- Extend `AuthRole` type in `apps/api/src/auth/auth.types.ts`
- Add `Organization` entity (PostgreSQL table or JSON store depending on V2.0 infra choice)
- Extend `AuthInvitation` to carry `organizationId?: string`
- Add `OrganizationModule` in NestJS with CRUD endpoints under `/admin/organizations`
- Add route guard `@Roles("recruiter")` analogous to existing admin guard
- Extend `FileAuthAccountStore` or migrate to DB-backed store for org membership

## Open questions (⚠️ TO CLARIFY)
- Will organization data be stored in the existing JSON flat file or requires PostgreSQL migration?
- Should recruiter have a separate dashboard route (e.g. `/recruiter`) or an in-app tab?
- Is B2B billing (org-level credits) in V2.0 scope or deferred to V3?
