import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { getEmailRedirectUrl } from '@/lib/auth-utils';

export type UserRole = 'admin' | 'teacher' | 'manager';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  school_id: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  schoolId: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  signup: (
    email: string,
    password: string,
    fullName: string,
    schoolName: string
  ) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  isAuthenticated: boolean;
  canManageData: boolean;
  canViewFinances: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ROLE_PRIORITY: UserRole[] = ['admin', 'manager', 'teacher'];
const BOOTSTRAP_COOLDOWN_MS = 30_000;
let lastBootstrapAt = 0;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const tryBootstrapUser = async (accessToken?: string) => {
    if (!accessToken) return;
    if (import.meta.env.VITE_DISABLE_BOOTSTRAP_USER === 'true') return;
    if (Date.now() - lastBootstrapAt < BOOTSTRAP_COOLDOWN_MS) return;
    lastBootstrapAt = Date.now();

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey =
      import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/bootstrap-user`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: supabaseKey,
          'Content-Type': 'application/json',
        },
      });

      // Silently ignore 401 errors - user might not be fully authenticated yet or function might not be available
      // This is not critical for login to work
      if (!response.ok && response.status !== 401) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn('bootstrap-user failed:', response.status, errorText);
      }
    } catch (error) {
      // Silently ignore all errors - bootstrap is not critical for login
      // Network errors and other errors are ignored to prevent console spam
    }
  };

  const fetchUserData = async (userId: string, accessToken?: string) => {
    // #region agent log
    const fetchStartTime = Date.now();
    fetch('http://127.0.0.1:7243/ingest/3e50eb41-c314-427c-becc-59b2a821ca76',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:85',message:'fetchUserData started',data:{userId},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      setIsLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        // Ignore AbortError - expected during navigation/unmounting
        if (profileError.name === 'AbortError' || profileError.message?.includes('aborted')) {
          setIsLoading(false);
          return;
        }
        throw profileError;
      }
      setProfile(profileData ?? null);
      setSchoolId(profileData?.school_id ?? null);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/3e50eb41-c314-427c-becc-59b2a821ca76',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:profile',message:'Profile loaded',data:{userId, schoolId: profileData?.school_id ?? null, hasProfile: !!profileData},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      const { data: roleRows, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (roleError) {
        // Ignore AbortError - expected during navigation/unmounting
        if (roleError.name === 'AbortError' || roleError.message?.includes('aborted')) {
          setIsLoading(false);
          return;
        }
        throw roleError;
      }

      const roles = (roleRows ?? []).map((row) => row.role as UserRole);
      let resolvedRole =
        ROLE_PRIORITY.find((r) => roles.includes(r)) ??
        (roles[0] ?? null);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/3e50eb41-c314-427c-becc-59b2a821ca76',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:roles',message:'Roles loaded',data:{userId, rolesCount: (roleRows ?? []).length, resolvedRole},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      let refreshedProfile = null;
      if (!resolvedRole) {
        // Only try bootstrap if we have a valid access token
        if (accessToken) {
          await tryBootstrapUser(accessToken);
        }
        const { data: refreshedProfileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        refreshedProfile = refreshedProfileData;
        setProfile(refreshedProfile ?? profileData ?? null);
        setSchoolId(refreshedProfile?.school_id ?? profileData?.school_id ?? null);

        const { data: refreshedRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);
        resolvedRole =
          ROLE_PRIORITY.find((r) => (refreshedRoles ?? []).some((row) => row.role === r)) ??
          ((refreshedRoles?.[0]?.role as UserRole) ?? null);
      }

      setRole(resolvedRole);
      // #region agent log
      const fetchDuration = Date.now() - fetchStartTime;
      fetch('http://127.0.0.1:7243/ingest/3e50eb41-c314-427c-becc-59b2a821ca76',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:149',message:'fetchUserData completed',data:{duration:fetchDuration,role:resolvedRole},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    } catch (error: any) {
      // Ignore AbortError - expected during component unmounting or navigation
      if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
        setIsLoading(false);
        return;
      }
      console.error('Error fetching user data:', error);
      toast.error('Nie udało się pobrać danych użytkownika');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) return;
      // Handle token refresh
      if (event === 'TOKEN_REFRESHED' && nextSession) {
        setSession(nextSession);
        setUser(nextSession.user);
        if (nextSession.user) {
          await fetchUserData(nextSession.user.id, nextSession.access_token);
        }
        return;
      }
      
      // Handle sign out or session expired
      if (event === 'SIGNED_OUT' || !nextSession) {
        // Clear all data and cache
        queryClient.clear();
        // Clear localStorage items related to Supabase auth
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase.auth') || (key.includes('sb-') && key.includes('-auth-token')))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        setSession(null);
        setUser(null);
        setProfile(null);
        setRole(null);
        setSchoolId(null);
        setIsLoading(false);
        return;
      }
      
      setSession(nextSession);
      const previousUserId = user?.id;
      const newUserId = nextSession?.user?.id;
      
      // If user changed, clear all cache (including subscription cache)
      if (previousUserId && newUserId && previousUserId !== newUserId) {
        // Clear all cache to prevent data from previous user
        queryClient.clear();
      } else if (event === 'SIGNED_IN' && nextSession?.user) {
        // For same user sign in, only clear non-subscription cache
        // Keep subscription cache to avoid unnecessary refetch
        queryClient.removeQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            // Keep subscription-related queries
            return key !== 'subscription-status' && key !== 'school-subscription-plan';
          }
        });
      }
      
      setUser(nextSession?.user ?? null);
      if (nextSession?.user && isMounted) {
        setTimeout(() => {
          if (isMounted) {
            fetchUserData(nextSession.user.id, nextSession.access_token);
          }
        }, 0);
      } else {
        setProfile(null);
        setRole(null);
        setSchoolId(null);
        setIsLoading(false);
      }
    });

    // Initial session check with retry
    const initializeSession = async () => {
      if (!isMounted) return;
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/3e50eb41-c314-427c-becc-59b2a821ca76',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:239',message:'initializeSession started',data:{timestamp:Date.now()},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      try {
        const sessionStartTime = Date.now();
        const { data: { session }, error } = await supabase.auth.getSession();
        const sessionDuration = Date.now() - sessionStartTime;
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/3e50eb41-c314-427c-becc-59b2a821ca76',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:243',message:'getSession completed',data:{hasSession:!!session,hasError:!!error,duration:sessionDuration},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        if (!isMounted) return;
        
        if (error) {
          // Ignore AbortError - expected during component unmounting or navigation
          if (error.name === 'AbortError' || error.message?.includes('aborted')) {
            if (isMounted) setIsLoading(false);
            return;
          }
          
          console.error('Session error:', error);
          // If refresh token is invalid, clear everything and sign out
          if (error.message?.includes('Refresh Token') || error.message?.includes('Invalid Refresh Token')) {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/3e50eb41-c314-427c-becc-59b2a821ca76',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:sessionError',message:'Session signOut due to refresh token',data:{msg: error?.message},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            await supabase.auth.signOut();
            if (isMounted) {
              queryClient.clear();
              setSession(null);
              setUser(null);
              setProfile(null);
              setRole(null);
              setSchoolId(null);
            }
          }
          if (isMounted) setIsLoading(false);
          return;
        }
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/3e50eb41-c314-427c-becc-59b2a821ca76',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:271',message:'Calling fetchUserData',data:{userId:session.user.id},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          await fetchUserData(session.user.id, session.access_token);
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/3e50eb41-c314-427c-becc-59b2a821ca76',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:274',message:'No session, setting isLoading false',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          if (isMounted) setIsLoading(false);
        }
      } catch (error: any) {
        if (!isMounted) return;
        
        // Ignore AbortError - expected during component unmounting or navigation
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          if (isMounted) setIsLoading(false);
          return;
        }
        
        console.error('Error initializing session:', error);
        // If refresh token error, sign out and clear
        if (error?.message?.includes('Refresh Token') || error?.message?.includes('Invalid Refresh Token')) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/3e50eb41-c314-427c-becc-59b2a821ca76',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:initSessionCatch',message:'Session signOut in catch (refresh token)',data:{msg: error?.message},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          await supabase.auth.signOut();
          if (isMounted) {
            queryClient.clear();
            setSession(null);
            setUser(null);
            setProfile(null);
            setRole(null);
            setSchoolId(null);
          }
        }
        if (isMounted) setIsLoading(false);
      }
    };

    initializeSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshUserData = useCallback(async () => {
    const sess = session ?? (await supabase.auth.getSession()).data.session;
    if (sess?.user) await fetchUserData(sess.user.id, sess.access_token);
  }, [session]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ?? null };
  };

  const signup = async (email: string, password: string, fullName: string, schoolName: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          school_name: schoolName,
        },
        emailRedirectTo: getEmailRedirectUrl(),
      },
    });
    return { error: error ?? null };
  };

  const logout = async () => {
    // Clear all subscription-related queries
    queryClient.removeQueries({ queryKey: ['subscription-status'] });
    queryClient.removeQueries({ queryKey: ['school-subscription-plan'] });
    
    // Clear all other user-specific queries
    queryClient.clear();
    
    // Clear localStorage items related to Supabase auth
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase.auth') || (key.includes('sb-') && key.includes('-auth-token')))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setSchoolId(null);
  };

  const isAuthenticated = !!user;
  const canManageData = role === 'admin' || role === 'manager';
  const canViewFinances = role === 'admin';

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    schoolId,
    isLoading,
    login,
    signup,
    logout,
    refreshUserData,
    isAuthenticated,
    canManageData,
    canViewFinances,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
