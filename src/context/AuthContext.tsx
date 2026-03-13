import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { UserProfile, computeAgeRange, computeIncomeRange } from "@/types";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  isAuthenticated: boolean;
  phone: string;
  isReturningUser: boolean;
}

interface AuthContextType {
  auth: AuthState;
  login: (phone: string, isReturning: boolean, serverProfile?: any) => void;
  logout: () => void;
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  savedSchemes: string[];
  toggleSaveScheme: (schemeId: string) => void;
  syncProfileToServer: () => Promise<void>;
  loadProfileFromServer: () => Promise<void>;
}

const defaultProfile: UserProfile = {
  name: "", dob: "", gender: "", phone: "", address: "", state: "", district: "",
  income: null, category: "", casteCategory: "",
  ageRange: "", incomeRange: "", occupationType: "", residency: "rural",
  employmentStatus: "", educationLevel: "", maritalStatus: "", hasDisability: false,
  landOwnership: "", hasBankAccount: false,
};

const AuthContext = createContext<AuthContextType | null>(null);

// Map server profile (snake_case) to client profile (camelCase)
const mapServerToClient = (sp: any): UserProfile => ({
  name: sp.name || "",
  dob: sp.dob || "",
  gender: sp.gender || "",
  phone: sp.phone || "",
  address: sp.address || "",
  state: sp.state || "",
  district: sp.district || "",
  income: sp.income || null,
  category: sp.category || "",
  casteCategory: sp.caste_category || "",
  ageRange: sp.age_range || computeAgeRange(sp.dob || ""),
  incomeRange: sp.income_range || computeIncomeRange(sp.income || null),
  occupationType: sp.occupation_type || "",
  residency: sp.residency || "rural",
  employmentStatus: sp.employment_status || "",
  educationLevel: sp.education_level || "",
  maritalStatus: sp.marital_status || "",
  hasDisability: sp.has_disability || false,
  landOwnership: sp.land_ownership || "",
  hasBankAccount: sp.has_bank_account || false,
});

// Map client profile to server format
const mapClientToServer = (cp: UserProfile) => {
  // Compute derived ranges before sending
  const ageRange = computeAgeRange(cp.dob);
  const incomeRange = computeIncomeRange(cp.income);
  return {
    name: cp.name || null,
    dob: cp.dob || null,
    gender: cp.gender || null,
    address: cp.address || null,
    state: cp.state || null,
    district: cp.district || null,
    income: cp.income,
    category: cp.category || null,
    caste_category: cp.casteCategory || null,
    // Derived eligibility attributes only — no aadhaar/pan
    age_range: ageRange || cp.ageRange || null,
    income_range: incomeRange || cp.incomeRange || null,
    occupation_type: cp.occupationType || null,
    residency: cp.residency || "rural",
    employment_status: cp.employmentStatus || null,
    education_level: cp.educationLevel || null,
    marital_status: cp.maritalStatus || null,
    has_disability: cp.hasDisability,
    land_ownership: cp.landOwnership || null,
    has_bank_account: cp.hasBankAccount,
  };
};

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

  const login = useCallback((phone: string, isReturning: boolean, serverProfile?: any) => {
    const newAuth = { isAuthenticated: true, phone, isReturningUser: isReturning };
    setAuth(newAuth);
    localStorage.setItem("fms_auth", JSON.stringify(newAuth));

    if (serverProfile && isReturning) {
      const mapped = mapServerToClient(serverProfile);
      setProfile(mapped);
      localStorage.setItem("fms_profile", JSON.stringify(mapped));
    } else if (!isReturning) {
      const p = { ...defaultProfile, phone };
      setProfile(p);
      localStorage.setItem("fms_profile", JSON.stringify(p));
    }
  }, []);

  const logout = useCallback(() => {
    setAuth({ isAuthenticated: false, phone: "", isReturningUser: false });
    localStorage.removeItem("fms_auth");
  }, []);

  const syncProfileToServer = useCallback(async () => {
    if (!auth.phone) return;
    try {
      const serverData = { ...mapClientToServer(profile), onboarding_complete: true };
      await supabase.functions.invoke("profile", {
        body: { phone: auth.phone, action: "update", profile: serverData },
      });
    } catch (e) {
      console.error("Failed to sync profile:", e);
    }
  }, [auth.phone, profile]);

  const loadProfileFromServer = useCallback(async () => {
    if (!auth.phone) return;
    try {
      const { data } = await supabase.functions.invoke("profile", {
        body: { phone: auth.phone, action: "get" },
      });
      if (data?.profile) {
        const mapped = mapServerToClient(data.profile);
        setProfile(mapped);
        localStorage.setItem("fms_profile", JSON.stringify(mapped));
      }
      if (data?.savedSchemes) {
        setSavedSchemes(data.savedSchemes);
        localStorage.setItem("fms_saved", JSON.stringify(data.savedSchemes));
      }
    } catch (e) {
      console.error("Failed to load profile:", e);
    }
  }, [auth.phone]);

  const toggleSaveScheme = useCallback(async (schemeId: string) => {
    // Optimistic update
    setSavedSchemes(prev => {
      const next = prev.includes(schemeId) ? prev.filter(id => id !== schemeId) : [...prev, schemeId];
      localStorage.setItem("fms_saved", JSON.stringify(next));
      return next;
    });

    // Sync to server
    if (auth.phone) {
      try {
        await supabase.functions.invoke("profile", {
          body: { phone: auth.phone, action: "save_scheme", scheme_id: schemeId },
        });
      } catch (e) {
        console.error("Failed to toggle save:", e);
      }
    }
  }, [auth.phone]);

  // Persist profile changes locally
  React.useEffect(() => {
    localStorage.setItem("fms_profile", JSON.stringify(profile));
  }, [profile]);

  return (
    <AuthContext.Provider value={{ auth, login, logout, profile, setProfile, savedSchemes, toggleSaveScheme, syncProfileToServer, loadProfileFromServer }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
