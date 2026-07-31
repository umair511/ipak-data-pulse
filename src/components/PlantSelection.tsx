import React from 'react';
import { usePlant } from '@/lib/PlantContext';
import { useAuth } from '@/lib/AuthContext';
import { PLANTS } from '@/lib/plantConfig';
import { Card } from '@/components/ui/card';
import { Factory, LogOut, Lock } from 'lucide-react';

export default function PlantSelection({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { selectPlant } = usePlant();
  const { logout, user, assignedPlants, hasPermission } = useAuth();

  // Filter plants: admin sees all, others see only assigned plants
  const visiblePlants = user?.role === 'admin'
    ? PLANTS
    : PLANTS.filter(p => assignedPlants.some(ap => ap.name === p.name));

  const handleSelect = (plant: typeof PLANTS[0]) => {
    selectPlant(plant);
    onNavigate('/dashboard');
  };

  // If no plants are assigned and user is not admin, show a message
  if (visiblePlants.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-red-500 dark:text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">No Plants Assigned</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Contact your administrator to assign plant access.</p>
          {user && <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Logged in as {user.name} ({user.role})</p>}
        </div>
        <button
          onClick={() => { logout(); onNavigate('/login'); }}
          className="mt-8 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
          <Factory className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">IPAK Data Pulse</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Select your plant to continue</p>
        {user && <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Logged in as {user.name} ({user.role})</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full px-4">
        {visiblePlants.map(plant => (
          <Card
            key={plant.id}
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 hover:border-slate-300 dark:hover:border-slate-600 dark:bg-slate-800 dark:border-slate-700"
            onClick={() => handleSelect(plant)}
          >
            <div className="p-6 text-center">
              {plant.logo ? (
                <div className="w-40 h-20 mx-auto mb-3 flex items-center justify-center bg-slate-100 dark:bg-slate-200 rounded-lg">
                  <img
                    src={plant.logo}
                    alt={plant.name}
                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                  />
                </div>
              ) : (
                <div className="text-4xl mb-3">{plant.emoji}</div>
              )}
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{plant.name}</h3>
              <div
                className="mt-3 h-2 rounded-full"
                style={{ backgroundColor: plant.color }}
              />
            </div>
          </Card>
        ))}
      </div>

      <button
        onClick={() => { logout(); onNavigate('/login'); }}
        className="mt-8 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </div>
  );
}
