# Security Specification — Sistema EncheiVos

## 1. Data Invariants
1. **Default Deny**: All paths not explicitly matched in `/workspaces/{workspaceId}`, `/userPreferences/{userId}`, or `/admins/{adminId}` are denied.
2. **Ownership & Verified Identity**: Every write requires `request.auth != null`, `request.auth.token.email_verified == true`, and `ownerId == request.auth.uid` (or `userId == request.auth.uid`).
3. **Strict Keys & Anti-Shadow-Update**: Every `create` checks `hasAll` and `hasOnly` for exact schema keys. Every `update` wraps with `isValid[Entity](incoming())` and restricts `affectedKeys().hasOnly(...)`.
4. **Immutable Fields**: `ownerId`, `userId`, and `createdAt` cannot be modified after creation (`incoming().ownerId == existing().ownerId` and `incoming().createdAt == existing().createdAt`).
5. **Temporal Integrity**: `createdAt == request.time` on create; `updatedAt == request.time` on create and update.
6. **PII Isolation & Query Enforcer**: `allow list` and `allow get` require `resource.data.ownerId == request.auth.uid` (or `isAdmin()`), preventing blanket reads or cross-user PII leaks.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: `auth = null`, creating `/workspaces/w1` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: `auth = { uid: 'u1', token: { email: 'jonasgabitres@gmail.com', email_verified: false } }` -> `PERMISSION_DENIED`.
3. **Identity Spoofing on Create**: `auth.uid = 'u1'`, payload `ownerId: 'u2'` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Create**: Adding `isSuperAdmin: true` to `/workspaces/w1` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection on Update**: Updating `/workspaces/w1` with `role: 'admin'` -> `PERMISSION_DENIED`.
6. **Owner Mutation on Update**: Changing `ownerId` from `'u1'` to `'u2'` on update -> `PERMISSION_DENIED`.
7. **CreatedAt Tampering on Update**: Modifying `createdAt` during an update -> `PERMISSION_DENIED`.
8. **Client Timestamp Forgery**: Sending a past/future timestamp instead of `request.time` for `updatedAt` -> `PERMISSION_DENIED`.
9. **ID Poisoning Attack**: Document ID exceeding 128 chars or containing invalid characters (`../etc`) -> `PERMISSION_DENIED`.
10. **Payload Size Exhaustion**: `organizationName` string > 200 chars or invalid theme enum -> `PERMISSION_DENIED`.
11. **Cross-Tenant PII Read**: Authenticated user `'u2'` attempting `get` on `/userPreferences/u1` -> `PERMISSION_DENIED`.
12. **Unfiltered List Query**: Authenticated user attempting `list` without `resource.data.ownerId == request.auth.uid` -> `PERMISSION_DENIED`.
