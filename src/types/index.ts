export interface UserProfile {
  name: string;
  dob: string;
  gender: "male" | "female" | "other" | "";
  phone: string;
  address: string;
  state: string;
  district: string;
  income: number | null;
  category: "APL" | "BPL" | "AAY" | "";
  casteCategory: "General" | "OBC" | "SC" | "ST" | "";
  // Derived eligibility attributes (no raw document data stored)
  ageRange: string;
  incomeRange: string;
  occupationType: string;
  residency: string;
  employmentStatus: string;
  educationLevel: string;
  maritalStatus: string;
  hasDisability: boolean;
  landOwnership: string;
  hasBankAccount: boolean;
}

/** Compute age range bucket from DOB */
export function computeAgeRange(dob: string): string {
  if (!dob) return "";
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  if (age < 18) return "Below 18";
  if (age <= 25) return "18-25";
  if (age <= 35) return "26-35";
  if (age <= 45) return "36-45";
  if (age <= 60) return "46-60";
  return "Above 60";
}

/** Compute income range bucket from annual income */
export function computeIncomeRange(income: number | null): string {
  if (income === null || income === undefined) return "";
  if (income <= 100000) return "Below ₹1 lakh";
  if (income <= 250000) return "₹1-2.5 lakh";
  if (income <= 500000) return "₹2.5-5 lakh";
  if (income <= 800000) return "₹5-8 lakh";
  return "Above ₹8 lakh";
}

export interface DocumentUpload {
  type: "aadhaar" | "pan" | "ration" | "income" | "caste";
  file: File | null;
  status: "pending" | "uploaded" | "processing" | "verified" | "error";
  extractedData: Partial<UserProfile>;
  confidence: number;
}

export interface Scheme {
  id: string;
  name: string;
  department: string;
  state: string;
  category: SchemeCategory;
  benefitType: string;
  description: string;
  benefits: string;
  eligibility: SchemeEligibility;
  applicationUrl: string;
  deadline: string;
  documentsRequired: string[];
}

export type SchemeCategory =
  | "agriculture"
  | "education"
  | "health"
  | "housing"
  | "women_child"
  | "sc_st_welfare"
  | "employment"
  | "social_security"
  | "rural_development";

export interface SchemeEligibility {
  minAge?: number;
  maxAge?: number;
  maxIncome?: number;
  gender?: "male" | "female" | "any";
  categories?: string[];
  states?: string[];
  occupations?: string[];
}

export interface MatchedScheme extends Scheme {
  matchScore: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
}

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];
