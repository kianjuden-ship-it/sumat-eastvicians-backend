// Category keys must match categoryConfig keys used on the student portal (frontend/index.html).
const CATEGORY_GROUPS = {
  welfare: ['bullying', 'health', 'teacher', 'student-conduct', 'academic'],
  childProtection: ['child-protection', 'safety'],
  sslgFeedback: ['suggestion', 'appreciation', 'event-feedback', 'sslg-feedback']
};

// Each role declares:
//   viewAll        - sees every report in full detail
//   categories      - the only category keys this role may open in full detail
//   statsOnly       - may see counts/analytics but never reporter identity or descriptions
//   canManageUsers  - may manage administrator accounts
//   canManageSystem - may view system/technical administration screens
const ROLE_PERMISSIONS = {
  PRINCIPAL: { viewAll: true, categories: [], statsOnly: false, canManageUsers: true, canManageSystem: true, label: 'Principal', access: 'Full System Access' },
  DESIGNATED_SCHOOL_ADMINISTRATOR: { viewAll: true, categories: [], statsOnly: false, canManageUsers: false, canManageSystem: false, label: 'Designated School Administrator', access: 'Full Report Access' },
  GUIDANCE_COUNSELOR: { viewAll: false, categories: CATEGORY_GROUPS.welfare, statsOnly: false, canManageUsers: false, canManageSystem: false, label: 'Guidance Counselor', access: 'Student Welfare Cases' },
  CHILD_PROTECTION_COMMITTEE: { viewAll: false, categories: CATEGORY_GROUPS.childProtection, statsOnly: false, canManageUsers: false, canManageSystem: false, label: 'Child Protection Committee', access: 'Sensitive Cases' },
  ICT_ADMINISTRATOR: { viewAll: false, categories: [], statsOnly: false, canManageUsers: false, canManageSystem: true, label: 'ICT Administrator', access: 'System Management' },
  SSLG_PRESIDENT: { viewAll: false, categories: CATEGORY_GROUPS.sslgFeedback, statsOnly: true, canManageUsers: false, canManageSystem: false, label: 'SSLG President', access: 'SSLG Programs and Services' },
  SYSTEM_OPERATOR: { viewAll: false, categories: [], statsOnly: false, canManageUsers: true, canManageSystem: true, label: 'System Operator / Platform Administrator', access: 'Technical Administration' }
};

function getPermissions(role) {
  return ROLE_PERMISSIONS[role] || null;
}

// Reports a role is allowed to see at all (list level). System-only roles see nothing here.
function canListReports(role) {
  const permissions = getPermissions(role);
  if (!permissions) return false;
  return permissions.viewAll || permissions.categories.length > 0 || permissions.statsOnly;
}

function categoryFilterFor(role) {
  const permissions = getPermissions(role);
  if (!permissions || permissions.viewAll) return null; // null = no restriction
  return permissions.categories;
}

// Whether reporter identity fields should be hidden for this role on a given report.
function shouldMaskIdentity(role, report) {
  const permissions = getPermissions(role);
  if (!permissions) return true;
  if (permissions.viewAll) return false;
  if (permissions.statsOnly) return true;
  if (report.privacy_mode === 'confidential_identity') return true;
  return false;
}

module.exports = { ROLE_PERMISSIONS, getPermissions, canListReports, categoryFilterFor, shouldMaskIdentity };
