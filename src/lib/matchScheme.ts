import { Scheme } from "@/types";

export const matchScheme = (scheme: Scheme, profile: any): number => {
  let score = 40;
  let maxScore = 40;
  const e = scheme.eligibility;

  if (profile.dob && (e.minAge || e.maxAge)) {
    const age = Math.floor((Date.now() - new Date(profile.dob).getTime()) / 31557600000);
    if (e.minAge && age < e.minAge) return 0;
    if (e.maxAge && age > e.maxAge) return 0;
    score += 12;
    maxScore += 12;
  }

  if (e.maxIncome) {
    maxScore += 15;
    if (profile.income && profile.income > e.maxIncome) return 0;
    if (profile.income) score += 15;
  }

  if (e.gender && e.gender !== "any") {
    maxScore += 10;
    if (profile.gender && e.gender !== profile.gender) return 0;
    if (profile.gender && e.gender === profile.gender) score += 10;
  }

  if (e.states && e.states.length > 0) {
    maxScore += 15;
    if (profile.state && !e.states.includes(profile.state)) return 0;
    if (profile.state && e.states.includes(profile.state)) score += 15;
  }
  if (scheme.state === "All India") {
    score += 5;
    maxScore += 5;
  }

  if (e.categories && e.categories.length > 0) {
    maxScore += 12;
    const userCats = [profile.category, profile.casteCategory].filter(Boolean);
    if (userCats.length > 0 && !e.categories.some((c: string) => userCats.includes(c))) return 0;
    if (userCats.some((c: string) => e.categories!.includes(c))) score += 12;
  }

  if (e.occupations && e.occupations.length > 0) {
    maxScore += 10;
    if (profile.employmentStatus || profile.occupationType) {
      const terms = `${profile.employmentStatus} ${profile.occupationType}`.toLowerCase();
      if (e.occupations.some((o: string) => terms.includes(o.toLowerCase()))) score += 10;
    }
  }

  return Math.min(Math.round((score / maxScore) * 98), 98);
};
