import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { PlantProvider, usePlant } from '@/lib/PlantContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import { canAccessNavPath } from '@/lib/permissions';
import Layout from '@/components/Layout';
import Login from '@/components/Login';
import PlantSelection from '@/components/PlantSelection';
import Dashboard from '@/components/Dashboard';
import ProductionEntry from '@/components/ProductionEntry';
import Targets from '@/components/Targets';
import Reports from '@/components/Reports';
import Analytics from '@/components/Analytics';
import ExportQuantity from '@/components/ExportQuantity';
import Dispatch from '@/components/Dispatch';
import DispatchReport from '@/components/DispatchReport';
import PackingCost from '@/components/PackingCost';
import Masters from '@/components/Masters';
import { UserManagement, Permissions, AuditLogs } from '@/components/Admin';

function useHashRouter() {
  const [path, setPath] = useState(() => window.location.hash.slice(1) || '/login');
  const [params, setParams] = useState<Record<string, string>>({});

  const navigate = useCallback((newPath: string, routeParams?: Record<string, string>) => {
    window.location.hash = newPath;
    setPath(newPath);
    setParams(routeParams || {});
  }, []);

  useEffect(() => {
    const handler = () => setPath(window.location.hash.slice(1) || '/login');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  return { path, params, navigate };
}

function AppContent() {
  const { isAuthenticated, loading, permissions } = useAuth();
  const { selectedPlant } = usePlant();
  const { path, params, navigate } = useHashRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  // Auth routes
  if (!isAuthenticated || path === '/login') {
    if (path !== '/login') navigate('/login');
    return <Login onNavigate={navigate} />;
  }

  // Plant selection
  if (!selectedPlant || path === '/select-plant') {
    if (path !== '/select-plant') navigate('/select-plant');
    return <PlantSelection onNavigate={navigate} />;
  }

  // Route guard: check if user has permission for this path
  if (path !== '/dashboard' && !canAccessNavPath(permissions, path)) {
    navigate('/dashboard');
    return null;
  }

  // Main app routes
  const renderPage = () => {
    switch (path) {
      case '/dashboard': return <Dashboard onNavigate={navigate} />;
      case '/production': return <ProductionEntry />;
      case '/targets': return <Targets />;
      case '/reports': return <Reports initialParams={params} />;
      case '/analytics': return <Analytics />;
      case '/export-quantity': return <ExportQuantity />;
      case '/dispatch': return <Dispatch initialParams={params} />;
      case '/dispatch-report': return <DispatchReport initialParams={params} />;
      case '/packing-cost': return <PackingCost />;
      case '/masters': return <Masters />;
      case '/users': return <UserManagement />;
      case '/permissions': return <Permissions />;
      case '/audit-logs': return <AuditLogs />;
      default: return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <Layout currentPath={path} onNavigate={navigate}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PlantProvider>
          <AppContent />
        </PlantProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
