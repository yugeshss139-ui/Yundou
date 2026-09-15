import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthChange } from '../services/authService';
import { getUserProfile, type UserProfile } from '../services/userService';


interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSubAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isSubAdmin: false,
  isStaff: false,
});

export function useAuthContext(): AuthContextValue {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);

      let fetchedProfile: UserProfile | null = null;
      if (firebaseUser) {
        fetchedProfile = await getUserProfile(firebaseUser.uid);
        setProfile(fetchedProfile);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const isAdmin = profile?.role === 'admin';
  const isSubAdmin = profile?.role === 'subadmin';
  const isStaff = isAdmin || isSubAdmin;

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isSubAdmin, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}
