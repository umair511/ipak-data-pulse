import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PLANTS, type Plant } from './plantConfig';
import { useAuth } from './AuthContext';

interface PlantContextType {
  selectedPlant: Plant | null;
  selectPlant: (plant: Plant) => void;
  switchPlant: (plant: Plant) => void;
  validatePlant: () => void;
}

const PlantContext = createContext<PlantContextType>({
  selectedPlant: null,
  selectPlant: () => {},
  switchPlant: () => {},
  validatePlant: () => {},
});

export function PlantProvider({ children }: { children: React.ReactNode }) {
  const { user, assignedPlants } = useAuth();
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(() => {
    const saved = localStorage.getItem('selectedPlant');
    if (saved) {
      return PLANTS.find(p => p.id === saved) || null;
    }
    return null;
  });

  // Validate saved plant against assigned plants when permissions load
  useEffect(() => {
    if (!user) return;

    // Admin can access any plant
    if (user.role === 'admin') return;

    // If user has assigned plants and current selection is not in the list, clear it
    if (assignedPlants.length > 0 && selectedPlant) {
      const isAllowed = assignedPlants.some(p => p.name === selectedPlant.name);
      if (!isAllowed) {
        setSelectedPlant(null);
        localStorage.removeItem('selectedPlant');
      }
    }

    // If user has exactly 1 plant assigned, auto-select it
    if (assignedPlants.length === 1 && !selectedPlant) {
      const plant = PLANTS.find(p => p.name === assignedPlants[0].name);
      if (plant) {
        setSelectedPlant(plant);
        localStorage.setItem('selectedPlant', plant.id);
      }
    }
  }, [user, assignedPlants, selectedPlant]);

  const selectPlant = useCallback((plant: Plant) => {
    setSelectedPlant(plant);
    localStorage.setItem('selectedPlant', plant.id);
  }, []);

  const switchPlant = useCallback((plant: Plant) => {
    setSelectedPlant(plant);
    localStorage.setItem('selectedPlant', plant.id);
  }, []);

  const validatePlant = useCallback(() => {
    if (!user) return;
    if (user.role === 'admin') return;
    if (assignedPlants.length > 0 && selectedPlant) {
      const isAllowed = assignedPlants.some(p => p.name === selectedPlant.name);
      if (!isAllowed) {
        setSelectedPlant(null);
        localStorage.removeItem('selectedPlant');
      }
    }
  }, [user, assignedPlants, selectedPlant]);

  return (
    <PlantContext.Provider value={{ selectedPlant, selectPlant, switchPlant, validatePlant }}>
      {children}
    </PlantContext.Provider>
  );
}

export function usePlant() {
  return useContext(PlantContext);
}
