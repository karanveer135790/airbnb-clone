"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { api } from "@/lib/api";
import { Listing, User } from "@/lib/types";
type AppState = {
  user: User | null;
  users: User[];
  selectUser: (id: number) => void;
  favoriteIds: Set<number>;
  toggleFavorite: (id: number) => Promise<void>;
  notify: (text: string) => void;
  dark: boolean;
  toggleTheme: () => void;
  identityError: string;
};
const Context = createContext<AppState | null>(null);
export function Providers({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]),
    [user, setUser] = useState<User | null>(null);
  const [favoriteIds, setFavorites] = useState(new Set<number>()),
    [toast, setToast] = useState(""),
    [dark, setDark] = useState(false),
    [identityError, setIdentityError] = useState("");
  const currentId = useRef<number | null>(null);
  const notify = useCallback((text: string) => setToast(text), []);
  useEffect(() => {
    let live = true;
    api<User[]>("/demo/users")
      .then((data) => {
        if (!live) return;
        setUsers(data);
        let saved = "";
        try {
          saved = localStorage.getItem("demo-user") || "";
        } catch {}
        setUser(
          data.find((u) => u.id === Number(saved)) ||
            data.find((u) => u.role === "guest") ||
            data[0] ||
            null,
        );
      })
      .catch(() => {
        if (live)
          setIdentityError(
            "Demo accounts unavailable. Check the API connection.",
          );
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    currentId.current = user?.id ?? null;
    setFavorites(new Set());
    if (!user) return;
    let live = true;
    api<Listing[]>("/me/wishlist", {}, user.id)
      .then((data) => {
        if (live) setFavorites(new Set(data.map((l) => l.id)));
      })
      .catch((e) => notify(e.message));
    return () => {
      live = false;
    };
  }, [user, notify]);
  useEffect(() => {
    try {
      setDark(
        localStorage.getItem("theme") === "dark" ||
          (!localStorage.getItem("theme") &&
            matchMedia("(prefers-color-scheme: dark)").matches),
      );
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  const selectUser = (id: number) => {
    const next = users.find((u) => u.id === id);
    if (next) {
      setUser(next);
      try {
        localStorage.setItem("demo-user", String(id));
      } catch {}
    }
  };
  const toggleFavorite = async (id: number) => {
    if (!user) {
      notify("Choose a demo account to save homes.");
      return;
    }
    const identity = user.id;
    const saved = favoriteIds.has(id);
    await api(
      `/me/wishlist/${id}`,
      { method: saved ? "DELETE" : "PUT" },
      identity,
    );
    if (currentId.current === identity) {
      setFavorites((prev) => {
        const next = new Set(prev);
        saved ? next.delete(id) : next.add(id);
        return next;
      });
      notify(saved ? "Removed from your wishlist" : "Saved to your wishlist");
    }
  };
  const toggleTheme = () =>
    setDark((value) => {
      try {
        localStorage.setItem("theme", value ? "light" : "dark");
      } catch {}
      return !value;
    });
  return (
    <Context.Provider
      value={{
        user,
        users,
        selectUser,
        favoriteIds,
        toggleFavorite,
        notify,
        dark,
        toggleTheme,
        identityError,
      }}
    >
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`toast ${toast ? "visible" : ""}`}
      >
        {toast}
      </div>
    </Context.Provider>
  );
}
export function useApp() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing Providers");
  return context;
}
