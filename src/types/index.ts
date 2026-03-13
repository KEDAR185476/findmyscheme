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
  panNumber: string;
  aadhaarNumber: string;
  employmentStatus: string;
  educationLevel: string;
  maritalStatus: string;
  hasDisability: boolean;
  landOwnership: string;
  hasBankAccount: boolean;
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
