"use client";

import { useState, useCallback } from "react";

export interface Profession {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  growthPerspective?: string;
  estimatedSalary?: string;
  requiredSkills?: string;
}

/**
 * Hook to manage profession wheel state and interactions
 */
export function useProfessionWheel() {
  const [selectedProfession, setSelectedProfession] =
    useState<Profession | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const selectProfession = useCallback((profession: Profession) => {
    setSelectedProfession(profession);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedProfession(null);
  }, []);

  const setHovered = useCallback((index: number | null) => {
    setHoveredIndex(index);
  }, []);

  return {
    selectedProfession,
    hoveredIndex,
    selectProfession,
    clearSelection,
    setHovered,
  };
}
