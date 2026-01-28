import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean | null; // null = not checked yet, true/false = checked
  isLoading: boolean;
  checkAdminStatus: () => Promise<boolean>; // Lazy check for admin routes
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useAuthProvider() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = not checked
  const [isLoading, setIsLoading] = useState(true);
  
  // Cache to prevent repeated admin checks
  const adminCheckCache = useRef<{ userId: string; isAdmin: boolean } | null>(null);
  const adminCheckInProgress = useRef<Promise<boolean> | null>(null);

  // Lazy admin check - only called when needed (on admin routes)
  const checkAdminStatus = useCallback(async (): Promise<boolean> => {
    const currentUser = user;
    
    if (!currentUser) {
      console.log("[Auth] No user, admin check returns false");
      setIsAdmin(false);
      return false;
    }

    // Return cached result if same user
    if (adminCheckCache.current?.userId === currentUser.id) {
      console.log("[Auth] Admin status from cache:", adminCheckCache.current.isAdmin);
      setIsAdmin(adminCheckCache.current.isAdmin);
      return adminCheckCache.current.isAdmin;
    }

    // If check already in progress, wait for it
    if (adminCheckInProgress.current) {
      console.log("[Auth] Admin check already in progress, waiting...");
      return adminCheckInProgress.current;
    }

    // Perform the admin check
    const checkPromise = (async () => {
      const startTime = performance.now();
      console.log("[Auth] Checking admin status for user:", currentUser.id);
      
      try {
        const { data, error } = await supabase
          .from("admin_users")
          .select("user_id")
          .eq("user_id", currentUser.id)
          .maybeSingle();
        
        const duration = performance.now() - startTime;
        console.log(`[Auth] Admin query took ${duration.toFixed(2)}ms`);
        
        if (error) {
          console.error("[Auth] Admin check error:", error);
          setIsAdmin(false);
          return false;
        }
        
        const isAdminResult = !!data;
        console.log("[Auth] Admin check result:", isAdminResult);
        
        // Cache the result
        adminCheckCache.current = { userId: currentUser.id, isAdmin: isAdminResult };
        setIsAdmin(isAdminResult);
        
        return isAdminResult;
      } finally {
        adminCheckInProgress.current = null;
      }
    })();

    adminCheckInProgress.current = checkPromise;
    return checkPromise;
  }, [user]);

  useEffect(() => {
    const startTime = performance.now();
    console.log("[Auth] Initializing auth state...");

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[Auth] Auth state changed:", event);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Clear admin cache on logout or user change
        if (event === 'SIGNED_OUT' || !session?.user) {
          adminCheckCache.current = null;
          setIsAdmin(null);
        } else if (event === 'SIGNED_IN' && session?.user) {
          // Clear cache for fresh check on new login
          if (adminCheckCache.current?.userId !== session.user.id) {
            adminCheckCache.current = null;
            setIsAdmin(null);
          }
        }
        
        setIsLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const duration = performance.now() - startTime;
      console.log(`[Auth] getSession() took ${duration.toFixed(2)}ms`);
      
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const startTime = performance.now();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    console.log(`[Auth] signIn took ${performance.now() - startTime}ms`);
    
    // Clear cache to force fresh admin check after login
    adminCheckCache.current = null;
    setIsAdmin(null);
    
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(null);
    adminCheckCache.current = null;
  };

  return {
    user,
    session,
    isAdmin,
    isLoading,
    checkAdminStatus,
    signIn,
    signUp,
    signOut,
  };
}

export { AuthContext };
