export interface Plant {
  id: string;
  name: string;
  code: string;
  color: string;
  lightColor: string;
  darkColor: string;
  textColor: string;
  bgGradient: string;
  emoji: string;
  logo?: string;
}

export interface MachineConfig {
  name: string;
  section: 'Film Line' | 'Slitter' | 'Metallizer';
}

export const PLANTS: Plant[] = [
  {
    id: 'ipak', name: 'IPAK', code: 'IPK', color: '#16a34a', lightColor: '#dcfce7',
    darkColor: '#15803d', textColor: '#166534', bgGradient: 'from-green-500 to-green-600', emoji: '🟢',
    logo: '/logos/ipak.png',
  },
  {
    id: 'cpak', name: 'CPAK', code: 'CPK', color: '#dc2626', lightColor: '#fee2e2',
    darkColor: '#b91c1c', textColor: '#991b1b', bgGradient: 'from-red-500 to-red-600', emoji: '🔴',
    logo: '/logos/cpak.png',
  },
  {
    id: 'gpak', name: 'GPAK', code: 'GPK', color: '#2563eb', lightColor: '#dbeafe',
    darkColor: '#1d4ed8', textColor: '#1e40af', bgGradient: 'from-blue-500 to-blue-600', emoji: '🔵',
    logo: '/logos/gpak.png',
  },
  {
    id: 'petpak', name: 'PETPAK', code: 'PPK', color: '#ea580c', lightColor: '#fed7aa',
    darkColor: '#c2410c', textColor: '#9a3412', bgGradient: 'from-orange-500 to-orange-600', emoji: '🟠',
    logo: '/logos/petpak.png',
  },
];

export const PLANT_MACHINES: Record<string, MachineConfig[]> = {
  IPAK: [
    { name: 'Film Line', section: 'Film Line' },
    { name: 'Primary Slitter', section: 'Slitter' },
    { name: 'Secondary Slitter 1', section: 'Slitter' },
    { name: 'Secondary Slitter 2', section: 'Slitter' },
    { name: 'Metallizer Slitter', section: 'Slitter' },
    { name: 'Metallizer', section: 'Metallizer' },
  ],
  CPAK: [
    { name: 'Film Line', section: 'Film Line' },
    { name: 'Cast Slitter', section: 'Slitter' },
    { name: 'Metallizer', section: 'Metallizer' },
  ],
  GPAK: [
    { name: 'Film Line', section: 'Film Line' },
    { name: 'Primary Slitter', section: 'Slitter' },
    { name: 'Secondary Slitter', section: 'Slitter' },
    { name: 'Metallizer Slitter', section: 'Slitter' },
    { name: 'Metallizer', section: 'Metallizer' },
  ],
  PETPAK: [
    { name: 'Film Line', section: 'Film Line' },
    { name: 'Primary Slitter', section: 'Slitter' },
    { name: 'Secondary Slitter', section: 'Slitter' },
    { name: 'Metallizer', section: 'Metallizer' },
  ],
};

export const SHIFTS = ['Morning', 'Evening', 'Night'] as const;
export const SECTIONS = ['Film Line', 'Slitter', 'Metallizer'] as const;
export const ROLES = ['admin', 'supervisor', 'manager', 'operator'] as const;
export type Role = typeof ROLES[number];
export type Shift = typeof SHIFTS[number];
export type Section = typeof SECTIONS[number];

export function getPlantConfig(plantName: string): Plant | undefined {
  return PLANTS.find(p => p.name === plantName || p.id === plantName);
}

export function getPlantById(id: string): Plant | undefined {
  return PLANTS.find(p => p.id === id);
}

export function getMachinesForPlant(plantName: string): MachineConfig[] {
  return PLANT_MACHINES[plantName] || [];
}

export function getMachinesForSection(plantName: string, section: string): MachineConfig[] {
  return getMachinesForPlant(plantName).filter(m => m.section === section);
}

export function getSectionForMachine(plantName: string, machineName: string): string | undefined {
  return getMachinesForPlant(plantName).find(m => m.name === machineName)?.section;
}

export const REPORT_TYPES = [
  'Overall Production',
  'Film-wise Production',
  'Machine-wise Production',
  'Waste',
  'Downtime',
  'Target',
  'Settings',
  'Cycles',
] as const;

export const ANALYTICS_TABS = [
  'Film Line',
  'Slitter',
  'Metallizer',
  'Targets',
] as const;

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', roles: ['admin', 'supervisor', 'manager', 'operator'] },
  { label: 'Production Entry', path: '/production', icon: 'ClipboardList', roles: ['admin', 'supervisor', 'operator'] },
  { label: 'Targets', path: '/targets', icon: 'Target', roles: ['admin', 'supervisor', 'manager', 'operator'] },
  { label: 'Reports', path: '/reports', icon: 'FileText', roles: ['admin', 'supervisor', 'manager'] },
  { label: 'Analytics', path: '/analytics', icon: 'BarChart3', roles: ['admin', 'supervisor', 'manager'] },
  { label: 'Export Quantity', path: '/export-quantity', icon: 'Ship', roles: ['admin', 'supervisor', 'manager', 'operator'] },
  { label: 'Dispatch', path: '/dispatch', icon: 'Truck', roles: ['admin', 'supervisor', 'manager', 'operator'] },
  { label: 'Dispatch Report', path: '/dispatch-report', icon: 'Truck', roles: ['admin', 'supervisor', 'manager', 'operator'] },
  { label: 'Packing Cost', path: '/packing-cost', icon: 'Package', roles: ['admin', 'supervisor', 'manager', 'operator'] },
  { label: 'Masters', path: '/masters', icon: 'Database', roles: ['admin'] },
  { label: 'User Management', path: '/users', icon: 'Users', roles: ['admin'] },
  { label: 'Permissions', path: '/permissions', icon: 'Shield', roles: ['admin'] },
  { label: 'Audit Logs', path: '/audit-logs', icon: 'ScrollText', roles: ['admin'] },
];

export const CHART_COLORS = {
  downtime: ['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#10b981', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'],
  film: ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#ec4899', '#14b8a6', '#f97316', '#6366f1'],
  machine: ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'],
};
