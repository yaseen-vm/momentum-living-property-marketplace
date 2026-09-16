import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@momentum/shared";

interface AuthState {
  token: string | null;
  role: Role | null;
  userId: string | null;
  setAuth: (token: string, role: Role, userId: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      userId: null,
      setAuth: (token, role, userId) => set({ token, role, userId }),
      clearAuth: () => set({ token: null, role: null, userId: null }),
    }),
    { name: "momentum-auth" }
  )
);
