"use client";

/**
 * Auth context — provides global auth state + modal trigger.
 *
 * Session is backed by the real backend (cookie-based httpOnly tokens).
 * On mount we call GET /api/user/me to rehydrate the session; all mutations
 * hit the real /api/v1/auth/* endpoints from BAR-35.
 *
 * Bar ingredients are backed by the real /api/user/bar REST API when a
 * user is authenticated; an empty array for unauthenticated guests.
 *
 * Favourites are stored in localStorage (backend endpoint not yet shipped).
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  getMe,
  loginApi,
  registerApi,
  logoutApi,
  requestPasswordResetApi,
  getGoogleOAuthUrl,
  getUserBar,
  addUserBarIngredient,
  removeUserBarIngredient,
  type BarIngredientAPI,
  type AuthUser,
} from "./api";

export interface User {
  id: string;
  /** Derived from email prefix when no display_name is returned */
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

// Re-export so consumers can import from auth-context
export type { BarIngredientAPI };

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
  startGoogleOAuth: () => Promise<void>;
  /** Email stored during register for verify-email view */
  pendingEmail: string;
  setPendingEmail: (email: string) => void;
  /** My Bar ingredient ids (stable for legacy callers) */
  barIngredients: string[];
  /** My Bar full ingredient objects from API */
  barIngredientData: BarIngredientAPI[];
  barLoading: boolean;
  addBarIngredient: (id: string) => Promise<void>;
  removeBarIngredient: (id: string) => Promise<void>;
  /** Favourite cocktail slugs (localStorage until backend endpoint ships) */
  favourites: string[];
  toggleFavourite: (slug: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── localStorage helpers (favourites only) ──────────────────────────────────

const STUB_FAV_KEY = "bariq_stub_favs";

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

// ─── Map AuthUser → User ──────────────────────────────────────────────────────

function mapApiUser(apiUser: AuthUser): User {
  return {
    id: apiUser.id,
    displayName: apiUser.display_name ?? apiUser.email.split("@")[0],
    email: apiUser.email,
    emailVerified: apiUser.email_verified,
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalView, setModalView] = useState<AuthView>("login");
  const [pendingEmail, setPendingEmail] = useState("");
  const [barIngredientData, setBarIngredientData] = useState<BarIngredientAPI[]>([]);
  const [barLoading, setBarLoading] = useState(false);
  const [favourites, setFavourites] = useState<string[]>([]);

  // Rehydrate session from backend on mount
  useEffect(() => {
    setFavourites(loadStringSet(STUB_FAV_KEY));
    getMe()
      .then((apiUser) => {
        setUser(apiUser ? mapApiUser(apiUser) : null);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Fetch bar ingredients from API when user changes
  useEffect(() => {
    if (!user) {
      setBarIngredientData([]);
      return;
    }
    setBarLoading(true);
    getUserBar()
      .then((res) => setBarIngredientData(res.items))
      .catch(() => {
        setBarIngredientData([]);
      })
      .finally(() => setBarLoading(false));
  }, [user]);

  const openAuthModal = useCallback((view: AuthView = "login") => {
    setModalView(view);
    setModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      const result = await loginApi(email, password);
      if (result.error) return { error: result.error };
      // Backend sets cookies; fetch current user to get full profile
      const apiUser = await getMe();
      setUser(apiUser ? mapApiUser(apiUser) : null);
      return {};
    },
    []
  );

  const register = useCallback(
    async (
      _displayName: string,
      email: string,
      password: string
    ): Promise<{ error?: string }> => {
      const result = await registerApi(email, password);
      if (result.error) return { error: result.error };
      // Account created; user is not yet verified — show verify-email view
      setPendingEmail(email);
      return {};
    },
    []
  );

  const logout = useCallback(async () => {
    setUser(null);
    setBarIngredientData([]);
    try {
      await logoutApi();
    } catch {
      // Ignore network errors on logout — local state is already cleared
    }
  }, []);

  const sendVerificationEmail = useCallback(async () => {
    // Backend sends the email automatically on register; resend not yet exposed.
    // No-op until a /resend-verification endpoint is added.
    await Promise.resolve();
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await requestPasswordResetApi(email);
  }, []);

  const startGoogleOAuth = useCallback(async () => {
    const url = await getGoogleOAuthUrl();
    window.location.href = url;
  }, []);

  const addBarIngredient = useCallback(async (id: string) => {
    // Optimistic update
    setBarIngredientData((prev) => {
      if (prev.some((i) => i.id === id)) return prev;
      return [...prev, { id, name: id, category: "Other" }];
    });
    try {
      await addUserBarIngredient(id);
      // Refresh to get canonical name/category from server
      const res = await getUserBar();
      setBarIngredientData(res.items);
    } catch {
      // Revert on failure
      setBarIngredientData((prev) => prev.filter((i) => i.id !== id));
    }
  }, []);

  const removeBarIngredient = useCallback(async (id: string) => {
    // Optimistic removal
    setBarIngredientData((prev) => prev.filter((i) => i.id !== id));
    try {
      await removeUserBarIngredient(id);
    } catch {
      // Revert on failure — refetch
      try {
        const res = await getUserBar();
        setBarIngredientData(res.items);
      } catch {
        // silently ignore secondary failure
      }
    }
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

  // Stable derived ids list for legacy callers
  const barIngredients = barIngredientData.map((i) => i.id);

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
        startGoogleOAuth,
        pendingEmail,
        setPendingEmail,
        barIngredients,
        barIngredientData,
        barLoading,
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
