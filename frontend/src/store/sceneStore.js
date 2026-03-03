import { create } from 'zustand';

export const useSceneStore = create((set) => ({
  scrollProgress: 0,
  scrollVelocity: 0,
  currentSection: 0,
  
  setScrollProgress: (progress) => set({ scrollProgress: progress }),
  setScrollVelocity: (velocity) => set({ scrollVelocity: velocity }),
  setCurrentSection: (section) => set({ currentSection: section }),
}));