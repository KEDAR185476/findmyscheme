import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { UserProfile } from "@/types";

interface AuthState {
  isAuthenticated: boolean;
  phone: string;
  isReturningUser: boolean;
}

interface AuthContextType {
  auth: AuthState;
  login: (phone: string) => void;
  logout: () => void;
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  savedSchemes: string[];
  toggleSaveScheme: (schemeId: string) => void;
}

const defaultProfile: UserProfile = {
  name: "", dob: "", gender: "", phone: "", address: "", state: "", district: "",
  income: null, category: "", casteCategory: "", panNumber: "", aadhaarNumber: "",
  employmentStatus: "", educationLevel: "", maritalStatus: "", hasDisability: false,
  landOwnership: "", hasBankAccount: false,
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [auth, setAuth] = useState<AuthState>(() => {
    const stored = localStorage.getItem("fms_auth");
    return stored ? JSON.parse(stored) : { isAuthenticated: false, phone: "", isReturningUser: false };
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    const stored = localStorage.getItem("fms_profile");
    return stored ? JSON.parse(stored) : { ...defaultProfile };
  });

  const [savedSchemes, setSavedSchemes] = useState<string[]>(() => {
    const stored = localStorage.getItem("fms_saved");
    return stored ? JSON.parse(stored) : [];
  });

  const login = useCallback((phone: string) => {
    const existingProfile = localStorage.getItem("fms_profile");
    const newAuth = { isAuthenticated: true, phone, isReturningUser: !!existingProfile };
    setAuth(newAuth);
    localStorage.setItem("fms_auth", JSON.stringify(newAuth));
    if (!existingProfile) {
      const p = { ...defaultProfile, phone };
      setProfile(p);
      localStorage.setItem("fms_profile", JSON.stringify(p));
    }
  }, []);

  const logout = useCallback(() => {
    setAuth({ isAuthenticated: false, phone: "", isReturningUser: false });
    localStorage.removeItem("fms_auth");
  }, []);

  const toggleSaveScheme = useCallback((schemeId: string) => {
    setSavedSchemes(prev => {
      const next = prev.includes(schemeId) ? prev.filter(id => id !== schemeId) : [...prev, schemeId];
      localStorage.setItem("fms_saved", JSON.stringify(next));
      return next;
    });
  }, []);

  // Persist profile changes
  React.useEffect(() => {
    localStorage.setItem("fms_profile", JSON.stringify(profile));
  }, [profile]);

  return (
    <AuthContext.Provider value={{ auth, login, logout, profile, setProfile, savedSchemes, toggleSaveScheme }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
