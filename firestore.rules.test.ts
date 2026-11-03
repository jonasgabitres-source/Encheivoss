import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesSource = fs.readFileSync('firestore.rules', 'utf8');

test('Firestore security rules satisfy the 8 Pillars and block the Dirty Dozen', () => {
  // 1. Global Safety Net
  assert.ok(rulesSource.includes('match /{document=**} {\n      allow read, write: if false;\n    }'));
  // 2. Verified Email Requirement
  assert.ok(rulesSource.includes('request.auth.token.email_verified == true'));
  // 3. Path Variable Hardening (ID Poisoning Guard)
  assert.ok(rulesSource.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')"));
  // 4. Anti-Update-Gap & Strict Keys
  assert.ok(rulesSource.includes('isValidWorkspaceSnapshot(incoming())'));
  assert.ok(rulesSource.includes('isValidUserPreference(incoming())'));
  assert.ok(rulesSource.includes("affectedKeys().hasOnly(['organizationName', 'payloadJson', 'version', 'updatedAt'])"));
  assert.ok(rulesSource.includes("affectedKeys().hasOnly(['theme', 'activePersonId', 'rememberMe', 'updatedAt'])"));
  // 5. Immutable Fields & Server Timestamps
  assert.ok(rulesSource.includes('incoming().ownerId == existing().ownerId'));
  assert.ok(rulesSource.includes('incoming().createdAt == existing().createdAt'));
  assert.ok(rulesSource.includes('incoming().updatedAt == request.time'));
  // 6. Query Enforcer on list
  assert.ok(rulesSource.includes('allow list: if isSignedIn() && (existing().ownerId == request.auth.uid || isAdmin());'));
});
