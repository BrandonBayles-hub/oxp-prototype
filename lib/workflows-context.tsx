"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Recipe = { id: string; name: string; enabled: boolean; fromTemplate?: string };

const STORAGE_KEY = "janet-poc-workflows-v2";

const INITIAL_RECIPES: Recipe[] = [
  { id: "1", name: "New lead → create task", enabled: false, fromTemplate: "Lead response" },
  { id: "2", name: "Lease renewal reminder", enabled: false },
  { id: "3", name: "Work order → notify resident", enabled: false, fromTemplate: "Maintenance triage" },
];

type WorkflowsContextValue = {
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  toggleRecipe: (id: string) => void;
  addRecipe: (recipe: Omit<Recipe, "id">) => void;
  atLeastOneEnabled: boolean;
};

const WorkflowsContext = createContext<WorkflowsContextValue | null>(null);

export function WorkflowsProvider({ children }: { children: React.ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecipes(parsed);
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
    } catch {
      // ignore
    }
  }, [recipes, mounted]);

  const toggleRecipe = useCallback((id: string) => {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  }, []);

  const addRecipe = useCallback((recipe: Omit<Recipe, "id">) => {
    setRecipes((prev) => [...prev, { ...recipe, id: String(Date.now()) }]);
  }, []);

  const atLeastOneEnabled = recipes.some((r) => r.enabled);

  return (
    <WorkflowsContext.Provider value={{ recipes, setRecipes, toggleRecipe, addRecipe, atLeastOneEnabled }}>
      {children}
    </WorkflowsContext.Provider>
  );
}

export function useWorkflows() {
  const ctx = useContext(WorkflowsContext);
  if (!ctx) throw new Error("useWorkflows must be used within WorkflowsProvider");
  return ctx;
}
