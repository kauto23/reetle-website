'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '@/types/user';
import {
  getAccessToken,
  saveAccessToken,
  clearAccessToken,
  getSavedUser,
  saveUser,
  clearUser,
  setTokenExpiredCallback,
  signInWithGoogle as apiSignInWithGoogle,
  signInWithApple as apiSignInWithApple,
  updateLanguage as apiUpdateLanguage,
  updateCefrLevel as apiUpdateCefrLevel,
  deleteAccount as apiDeleteAccount,
} from '@/services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  hasApp: boolean;
  isLoading: boolean;
  signInWithGoogle: (idToken: string, email?: string, fullName?: string) => Promise<boolean>;
  signInWithApple: (idToken: string, email?: string, fullName?: string) => Promise<boolean>;
  logout: () => void;
  updateLanguage: (familiarLanguage?: string, targetLanguage?: string) => Promise<boolean>;
  updateCefrLevel: (cefrLevel: string) => Promise<boolean>;
  updateLocalUser: (updates: Partial<User>) => void;
  deleteAccount: () => Promise<{ success: boolean; message?: string; error?: string }>;
  needsOnboarding: () => 'language' | 'level' | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearAccessToken();
    clearUser();
    setUser(null);
  }, []);

  // Load user from localStorage on mount
  useEffect(() => {
    const token = getAccessToken();
    const savedUser = getSavedUser();

    if (token && savedUser) {
      setUser(savedUser);
    }
    setIsLoading(false);

    // Register token expiry handler
    setTokenExpiredCallback(logout);
  }, [logout]);

  const signInWithGoogle = async (idToken: string, email?: string, fullName?: string): Promise<boolean> => {
    const { user: newUser, accessToken } = await apiSignInWithGoogle(idToken, email, fullName);
    saveAccessToken(accessToken);
    saveUser(newUser);
    setUser(newUser);
    return true;
  };

  const signInWithApple = async (idToken: string, email?: string, fullName?: string): Promise<boolean> => {
    try {
      const { user: newUser, accessToken } = await apiSignInWithApple(idToken, email, fullName);
      saveAccessToken(accessToken);
      saveUser(newUser);
      setUser(newUser);
      return true;
    } catch (error) {
      console.error('Apple sign-in failed:', error);
      return false;
    }
  };

  const updateLanguage = async (familiarLanguage?: string, targetLanguage?: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const updatedUser = await apiUpdateLanguage(user.id, familiarLanguage, targetLanguage);
      saveUser(updatedUser);
      setUser(updatedUser);
      return true;
    } catch (error) {
      console.error('Update language failed:', error);
      return false;
    }
  };

  const updateCefrLevel = async (cefrLevel: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const updatedUser = await apiUpdateCefrLevel(user.id, cefrLevel);
      saveUser(updatedUser);
      setUser(updatedUser);
      return true;
    } catch (error) {
      console.error('Update CEFR level failed:', error);
      return false;
    }
  };

  const updateLocalUser = (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    saveUser(updatedUser);
    setUser(updatedUser);
  };

  const needsOnboarding = (): 'language' | 'level' | null => {
    if (!user) return null;
    if (!user.targetLanguage || !user.familiarLanguage) return 'language';
    if (!user.cefrLevel) return 'level';
    return null;
  };

  const handleDeleteAccount = async () => {
    const result = await apiDeleteAccount();
    if (result.success) {
      clearAccessToken();
      clearUser();
      setUser(null);
    }
    return result;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        hasApp: !!user?.deviceToken,
        isLoading,
        signInWithGoogle,
        signInWithApple,
        logout,
        updateLanguage,
        updateCefrLevel,
        updateLocalUser,
        deleteAccount: handleDeleteAccount,
        needsOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
