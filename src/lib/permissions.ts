export interface PermissionDef {
  id: string
  label: string
  module: string
}

export const ALL_PERMISSIONS: PermissionDef[] = [
  // Dashboard
  { id: 'dashboard.view', label: 'View Dashboard', module: 'Dashboard' },

  // Production Entry
  { id: 'production.view', label: 'View Entries', module: 'Production Entry' },
  { id: 'production.create', label: 'Create Entries', module: 'Production Entry' },
  { id: 'production.edit', label: 'Edit Entries', module: 'Production Entry' },
  { id: 'production.delete', label: 'Delete Entries', module: 'Production Entry' },
  { id: 'production.import', label: 'Import from Excel', module: 'Production Entry' },

  // Targets
  { id: 'targets.view', label: 'View Targets', module: 'Targets' },
  { id: 'targets.create', label: 'Create Targets', module: 'Targets' },
  { id: 'targets.edit', label: 'Edit Targets', module: 'Targets' },
  { id: 'targets.delete', label: 'Delete Targets', module: 'Targets' },

  // Reports
  { id: 'reports.view', label: 'View Reports', module: 'Reports' },
  { id: 'reports.export', label: 'Export Reports', module: 'Reports' },

  // Analytics
  { id: 'analytics.view', label: 'View Analytics', module: 'Analytics' },

  // Export Quantity
  { id: 'export-quantity.view', label: 'View Export Data', module: 'Export Quantity' },
  { id: 'export-quantity.create', label: 'Create Export Data', module: 'Export Quantity' },
  { id: 'export-quantity.edit', label: 'Edit Export Data', module: 'Export Quantity' },
  { id: 'export-quantity.delete', label: 'Delete Export Data', module: 'Export Quantity' },

  // Packing Cost
  { id: 'packing-cost.view', label: 'View Packing Cost', module: 'Packing Cost' },
  { id: 'packing-cost.create', label: 'Create Packing Cost', module: 'Packing Cost' },
  { id: 'packing-cost.edit', label: 'Edit Packing Cost', module: 'Packing Cost' },
  { id: 'packing-cost.delete', label: 'Delete Packing Cost', module: 'Packing Cost' },

  // Masters
  { id: 'masters.view', label: 'View Masters', module: 'Masters' },
  { id: 'masters.create', label: 'Create Master Records', module: 'Masters' },
  { id: 'masters.edit', label: 'Edit Master Records', module: 'Masters' },
  { id: 'masters.delete', label: 'Delete Master Records', module: 'Masters' },

  // Admin
  { id: 'admin.view', label: 'View Admin Panel', module: 'Admin' },
  { id: 'admin.users.manage', label: 'Manage Users', module: 'Admin' },
  { id: 'admin.users.create', label: 'Create Users', module: 'Admin' },
  { id: 'admin.users.edit', label: 'Edit Users', module: 'Admin' },
  { id: 'admin.users.delete', label: 'Delete Users', module: 'Admin' },
  { id: 'admin.permissions.manage', label: 'Manage Permissions', module: 'Admin' },
  { id: 'admin.audit.view', label: 'View Audit Logs', module: 'Admin' },
  { id: 'admin.machines.manage', label: 'Manage Machines', module: 'Admin' },
  { id: 'admin.film-codes.manage', label: 'Manage Film Codes', module: 'Admin' },
  { id: 'admin.downtime.manage', label: 'Manage Downtime Reasons', module: 'Admin' },
  { id: 'admin.plants.manage', label: 'Manage Plant Selection', module: 'Admin' },

  // Dispatch
  { id: 'dispatch.view', label: 'View Dispatch', module: 'Dispatch' },
  { id: 'dispatch.create', label: 'Add Dispatch', module: 'Dispatch' },
  { id: 'dispatch.edit', label: 'Edit Dispatch', module: 'Dispatch' },
  { id: 'dispatch.delete', label: 'Delete Dispatch', module: 'Dispatch' },
  { id: 'dispatch.export', label: 'Export Dispatch', module: 'Dispatch' },

  // Settings
  { id: 'settings.view', label: 'View Settings', module: 'Settings' },
  { id: 'settings.manage', label: 'Manage Settings', module: 'Settings' },
]

export const ROLE_DEFAULTS: Record<string, string[]> = {
  admin: ALL_PERMISSIONS.map(p => p.id),
  manager: [],
  supervisor: [],
  operator: [],
}

export function getEffectivePermissions(role: string, customPermissions: string[]): string[] {
  const base = ROLE_DEFAULTS[role] ?? ROLE_DEFAULTS.operator
  return [...new Set([...base, ...customPermissions])]
}

export function hasPermission(effectivePermissions: string[], permission: string): boolean {
  return effectivePermissions.includes(permission)
}

export function getModuleGroups(): { module: string; permissions: PermissionDef[] }[] {
  const map = new Map<string, PermissionDef[]>()
  for (const p of ALL_PERMISSIONS) {
    if (!map.has(p.module)) map.set(p.module, [])
    map.get(p.module)!.push(p)
  }
  return Array.from(map.entries()).map(([module, permissions]) => ({ module, permissions }))
}

// ─── Nav path → permission prefix mapping (authoritative) ────────
export const NAV_PATH_TO_PERM_PREFIX: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/production': 'production',
  '/targets': 'targets',
  '/reports': 'reports',
  '/analytics': 'analytics',
  '/export-quantity': 'export-quantity',
  '/dispatch': 'dispatch',
  '/dispatch-report': 'dispatch',
  '/packing-cost': 'packing-cost',
  '/masters': 'masters',
  '/users': 'admin',
  '/permissions': 'admin',
  '/audit-logs': 'admin',
}

// Sub-routes that require a specific sub-permission
export const NAV_PATH_TO_EXACT_PERM: Record<string, string> = {
  '/users': 'admin.view',
  '/permissions': 'admin.permissions.manage',
  '/audit-logs': 'admin.audit.view',
}

// Dashboard section → permission prefix needed to show that section
export const DASHBOARD_SECTION_PERMS: Record<string, string[]> = {
  'Film Line': ['production'],
  'Slitter': ['production'],
  'Metallizer': ['production'],
  'Dispatch': ['dispatch'],
}

// Module name → permission prefix (for checking if user has ANY permission in a module)
export const MODULE_TO_PERM_PREFIX: Record<string, string> = {
  'Dashboard': 'dashboard',
  'Production Entry': 'production',
  'Targets': 'targets',
  'Reports': 'reports',
  'Analytics': 'analytics',
  'Export Quantity': 'export-quantity',
  'Packing Cost': 'packing-cost',
  'Masters': 'masters',
  'Admin': 'admin',
  'Dispatch': 'dispatch',
  'Settings': 'settings',
}

// Check if user has any permission for a module
export function hasModulePermission(permissions: string[], modulePrefix: string): boolean {
  return permissions.some(p => p.startsWith(modulePrefix + '.'))
}

// Check if user can access a specific nav path
export function canAccessNavPath(permissions: string[], path: string): boolean {
  // Admin check: if user has all permissions, allow everything
  if (permissions.length >= ALL_PERMISSIONS.length) return true

  // Check exact permission first (for sub-pages like /users, /permissions, /audit-logs)
  const exactPerm = NAV_PATH_TO_EXACT_PERM[path]
  if (exactPerm) {
    return permissions.includes(exactPerm)
  }

  // Check prefix-based permission
  const prefix = NAV_PATH_TO_PERM_PREFIX[path]
  if (prefix) {
    return permissions.some(p => p.startsWith(prefix + '.'))
  }

  // Unknown path — deny
  return false
}

// Get accessible nav items from a nav config array
export function getAccessibleNavItems<T extends { path: string }>(
  items: T[],
  permissions: string[],
): T[] {
  return items.filter(item => canAccessNavPath(permissions, item.path))
}

// Check if user can access a dashboard section
export function canAccessDashboardSection(permissions: string[], section: string): boolean {
  if (permissions.length >= ALL_PERMISSIONS.length) return true
  const prefixes = DASHBOARD_SECTION_PERMS[section]
  if (!prefixes) return true // unknown section — allow
  return prefixes.some(prefix => permissions.some(p => p.startsWith(prefix + '.')))
}
