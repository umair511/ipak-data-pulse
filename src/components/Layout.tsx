import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { usePlant } from '@/lib/PlantContext';
import { useTheme } from '@/lib/ThemeContext';
import { NAV_ITEMS, PLANTS } from '@/lib/plantConfig';
import { canAccessNavPath, getAccessibleNavItems } from '@/lib/permissions';
import { cn } from '@/lib/cn';
import {
  LayoutDashboard, ClipboardList, Target, FileText, BarChart3, Ship, Package,
  Database, Users, Shield, ScrollText, Menu, X, ChevronDown, LogOut, Factory, Truck,
  Sun, Moon,
} from 'lucide-react';

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  LayoutDashboard, ClipboardList, Target, FileText, BarChart3, Ship, Package,
  Database, Users, Shield, ScrollText, Truck,
};

export default function Layout({
  children, currentPath, onNavigate,
}: {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  const { user, logout, permissions, assignedPlants, hasPermission } = useAuth();
  const { selectedPlant, switchPlant } = usePlant();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [plantDropdown, setPlantDropdown] = useState(false);

  // Filter nav items by actual permissions
  const filteredItems = getAccessibleNavItems(NAV_ITEMS, permissions);

  // Filter plants: admin sees all, others see only assigned
  const visiblePlants = user?.role === 'admin'
    ? PLANTS
    : PLANTS.filter(p => assignedPlants.some(ap => ap.name === p.name));

  const plantColor = selectedPlant?.color || '#16a34a';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-200',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
          {sidebarOpen && (
            <>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: plantColor + '20' }}>
                <Factory className="w-5 h-5" style={{ color: plantColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">IPAK Data Pulse</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{selectedPlant?.name || 'No Plant'}</p>
              </div>
            </>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-slate-600">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {filteredItems.map(item => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const active = currentPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
                style={active ? { backgroundColor: plantColor } : {}}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => { logout(); onNavigate('/login'); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-800 shadow-xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h1 className="font-bold text-slate-900 dark:text-slate-100">IPAK Data Pulse</h1>
              <button onClick={() => setMobileOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <nav className="p-2 space-y-1">
              {filteredItems.map(item => {
                const Icon = iconMap[item.icon] || LayoutDashboard;
                const active = currentPath === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => { onNavigate(item.path); setMobileOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      active ? 'text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    )}
                    style={active ? { backgroundColor: plantColor } : {}}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => { logout(); onNavigate('/login'); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center px-4 gap-4 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-slate-600">
            <Menu className="w-5 h-5" />
          </button>

          {/* Plant Switcher — filtered by assigned plants */}
          <div className="relative">
            <button
              onClick={() => setPlantDropdown(!plantDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: plantColor }} />
              <span className="font-medium">{selectedPlant?.name || 'Select Plant'}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {plantDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-50 py-1">
                {visiblePlants.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { switchPlant(p); setPlantDropdown(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            ) : (
              <Sun className="w-4 h-4 text-yellow-500" />
            )}
          </button>

          <div className="flex items-center gap-2 text-sm">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-200 font-medium">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block">
              <p className="font-medium text-slate-900 dark:text-slate-100">{user?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Click outside to close plant dropdown */}
      {plantDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setPlantDropdown(false)} />
      )}
    </div>
  );
}
