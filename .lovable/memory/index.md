Design system + constraints for FindMyScheme platform

Design: Plus Jakarta Sans (headings) + DM Sans (body), primary blue (221 83% 53%), accent orange (25 95% 53%), success green (152 69% 41%)
Project: FindMyScheme - Government welfare scheme discovery PWA for Indian citizens
Tech: React+Vite+Tailwind+TypeScript, framer-motion, Lovable Cloud (Supabase)
Auth: Phone OTP via edge function (mock code 123456, Twilio later)
DB Tables: user_profiles (derived attributes, no raw docs), otp_codes, saved_schemes
Edge Functions: otp (send/verify), profile (get/update/save_scheme), smart-questions — all verify_jwt=false
Data: 33 sample schemes in src/data/schemes.ts, matching logic in src/lib/matchScheme.ts
Pages: / (landing), /login, /upload, /verify, /questions, /schemes, /dashboard
Components: PageTransition, StaggerContainer, StaggerItem (src/components/PageTransition.tsx), AppHeader (src/components/AppHeader.tsx)
Returning users: skip onboarding, go to /dashboard with "New schemes matching your profile" banner
Profile synced to server on verify + questions completion, onboarding_complete flag set
CSS utilities: glass-card, glass-nav, shadow-glow, shadow-soft, shadow-card, shadow-card-hover, gradient-primary, gradient-accent, text-gradient
