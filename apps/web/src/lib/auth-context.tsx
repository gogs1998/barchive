"use client";

/**
 * Auth context — provides global auth state + modal trigger.
 * Stub implementation: replace API calls when BackendEngineer ships auth endpoints.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export interface User {
  id: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
}

export type AuthView =
  | "login"
  | "register"
  | "verify-email"
  | "forgot-password"
  | "reset-sent";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  modalOpen: boolean;
  modalView: AuthView;
  openAuthModal: (view?: AuthView) => void;
  closeAuthModal: () => void;
  setModalView: (view: AuthView) => void;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (
    displayName: string,
    email: string,
    password: string
  ) => Promise<{ error?: string }>;
  logout: () => void;
  sendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  /** Email stored during register for verify-email view */
  pendingEmail: string;
  setPendingEmail: (email: string) => void;
  /** My Bar ingredient ids */
  barIngredients: string[];
  addBarIngredient: (id: string) => void;
  removeBarIngredient: (id: string) => void;
  /** Favourite cocktail slugs */
  favourites: string[];
  toggleFavourite: (slug: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Stub helpers (replace with real API) ───────────────────────────────────

const STUB_USER_KEY = "bariq_stub_user";
const STUB_BAR_KEY = "bariq_stub_bar";
const STUB_FAV_KEY = "bariq_stub_favs";

function loadStubUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STUB_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStubUser(u: User | null) {
  if (typeof window === "undefined") return;
  if (u) localStorage.setItem(STUB_USER_KEY, JSON.stringify(u));
  else localStorage.removeItem(STUB_USER_KEY);
}

function loadStringSet(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

function saveStringSet(key: string, values: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(values));
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalView, setModalView] = useState<AuthView>("login");
  const [pendingEmail, setPendingEmail] = useState("");
  const [barIngredients, setBarIngredients] = useState<string[]>([]);
  const [favourites, setFavourites] = useState<string[]>([]);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setUser(loadStubUser());
    setBarIngredients(loadStringSet(STUB_BAR_KEY));
    setFavourites(loadStringSet(STUB_FAV_KEY));
    setLoading(false);
  }, []);

  const openAuthModal = useCallback((view: AuthView = "login") => {
    setModalView(view);
    setModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const login = useCallback(
    async (email: string, _password: string): Promise<{ error?: string }> => {
      // TODO: replace with real API call
      await new Promise((r) => setTimeout(r, 800));
      // Stub: accept any credentials
      const u: User = {
        id: "stub-" + Date.now(),
        displayName: email.split("@")[0],
        email,
        emailVerified: true,
      };
      setUser(u);
      saveStubUser(u);
      return {};
    },
    []
  );

  const register = useCallback(
    async (
      displayName: string,
      email: string,
      _password: string
    ): Promise<{ error?: string }> => {
      // TODO: replace with real API call
      await new Promise((r) => setTimeout(r, 800));
      const u: User = {
        id: "stub-" + Date.now(),
        displayName,
        email,
        emailVerified: false,
      };
      setUser(u);
      saveStubUser(u);
      setPendingEmail(email);
      return {};
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    saveStubUser(null);
  }, []);

  const sendVerificationEmail = useCallback(async () => {
    // TODO: real API
    await new Promise((r) => setTimeout(r, 400));
  }, []);

  const sendPasswordReset = useCallback(async (_email: string) => {
    // TODO: real API
    await new Promise((r) => setTimeout(r, 600));
  }, []);

  const addBarIngredient = useCallback((id: string) => {
    setBarIngredients((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveStringSet(STUB_BAR_KEY, next);
      return next;
    });
  }, []);

  const removeBarIngredient = useCallback((id: string) => {
    setBarIngredients((prev) => {
      const next = prev.filter((x) => x !== id);
      saveStringSet(STUB_BAR_KEY, next);
      return next;
    });
  }, []);

  const toggleFavourite = useCallback((slug: string) => {
    setFavourites((prev) => {
      const next = prev.includes(slug)
        ? prev.filter((x) => x !== slug)
        : [...prev, slug];
      saveStringSet(STUB_FAV_KEY, next);
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        modalOpen,
        modalView,
        openAuthModal,
        closeAuthModal,
        setModalView,
        login,
        register,
        logout,
        sendVerificationEmail,
        sendPasswordReset,
        pendingEmail,
        setPendingEmail,
        barIngredients,
        addBarIngredient,
        removeBarIngredient,
        favourites,
        toggleFavourite,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
