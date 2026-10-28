import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthStatus = "loading" | "signedOut" | "signedIn";

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  /** Lets a user into the app once sign-in / sign-up has checked their role */
  admit: (userId: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Responders and admins work from the web dashboard; the mobile app is for
 * citizens. A failed lookup doesn't lock anyone out — in an emergency app it's
 * better to let a citizen in than to block them on a flaky connection.
 */
export async function hasMobileAccess(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (error) return true;
  return data?.role !== "responder" && data?.role !== "admin";
}

export async function denyMobileAccess() {
  await supabase?.auth.signOut();
  Alert.alert(
    "Use the web dashboard",
    "Responder and admin accounts sign in on the AGAP web dashboard, not the mobile app."
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [admittedUserId, setAdmittedUserId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setInitialized(true);
      return;
    }

    let cancelled = false;

    // Restore a persisted session before choosing which screens to show
    const restore = async () => {
      try {
        const { data } = await supabase!.auth.getSession();
        const restored = data.session;
        if (restored && !cancelled) {
          // Let them in from the stored session right away; a weak network
          // must not hold an emergency app on the boot screen. The role was
          // checked at login, and is re-checked here in the background.
          setAdmittedUserId(restored.user.id);
          hasMobileAccess(restored.user.id).then((allowed) => {
            if (!allowed) denyMobileAccess();
          });
        }
      } catch (err) {
        console.error("Error restoring session:", err);
      } finally {
        if (!cancelled) setInitialized(true);
      }
    };

    restore();

    // Supabase calls must not be awaited inside this callback (it can
    // deadlock the auth client), so it only mirrors state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setAdmittedUserId(null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const admit = useCallback((userId: string) => {
    setAdmittedUserId(userId);
  }, []);

  const status: AuthStatus = !initialized
    ? "loading"
    : session && session.user.id === admittedUserId
      ? "signedIn"
      : "signedOut";

  return (
    <AuthContext.Provider value={{ status, session, admit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
