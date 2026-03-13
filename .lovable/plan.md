

# FindMyScheme — Government Welfare Scheme Discovery Platform

## Overview
A PWA that helps Indian citizens discover government welfare schemes they're eligible for, using OCR document extraction and AI-powered smart questions.

---

## Pages & User Flow

### 1. Landing Page (`/`)
- Hero section with tagline: "Find the government schemes you deserve"
- Key benefits: minimal documents, AI-powered, all India coverage
- "Get Started" CTA → login page
- Stats section (schemes covered, states, users helped)
- How it works: 3-step visual (Upload → Answer → Discover)
- Government-friendly design: Indian tricolor accents, clean typography, accessibility-first

### 2. OTP Login Page (`/login`)
- Phone number input with country code (+91)
- Mock OTP flow (6-digit code, any code accepted for now — Twilio integration later)
- Clean, minimal form with government emblem styling
- After login → redirect to Document Upload or Returning Dashboard

### 3. Document Upload Page (`/upload`)
- Upload cards for each document type: **Aadhaar, PAN, Ration Card, Income Certificate, Caste Certificate**
- Drag-and-drop or camera capture for each
- Show which documents are optional vs recommended
- Progress indicator showing completion percentage
- "Skip for now" option — users can proceed with fewer documents
- Files processed client-side using browser OCR (Tesseract.js)

### 4. OCR Verification Page (`/verify`)
- Display extracted fields per document in editable form cards
- Fields: Name, DOB, Gender, Address, State, District, Income, Category (APL/BPL/AAY), Caste Category, PAN number
- User confirms or corrects each field
- Visual confidence indicators (green/yellow/red) for OCR accuracy
- "Confirm & Continue" button

### 5. Smart Question Flow (`/questions`)
- AI-powered conversational interface using Lovable AI
- AI receives the user's extracted profile and asks targeted follow-up questions one at a time
- Questions cover: employment status, education level, marital status, disability, land ownership, bank account details, specific scheme prerequisites
- Chat-like UI with suggested answer chips for common responses
- Progress bar showing estimated completion
- AI determines when enough info is gathered and triggers scheme matching

### 6. Scheme Dashboard (`/schemes`)
- Grid/list of matched schemes with eligibility percentage
- Each scheme card shows: name, department, benefit type, eligibility match score
- Filter by: category (education, health, agriculture, housing), state, benefit type
- Search bar for quick lookup
- Scheme detail modal/page: full description, benefits, required documents, application link, deadline
- "Save" and "Share" buttons per scheme

### 7. Returning User Dashboard (`/dashboard`)
- Welcome back with user's name
- Saved/bookmarked schemes
- Profile summary with option to update
- "Re-check eligibility" button to run matching again
- Recent scheme updates/notifications section

---

## Scheme Data
- Start with **hardcoded sample data of 50+ central and state schemes** covering major categories (agriculture, education, health, housing, women & child, SC/ST welfare)
- Structured data model: scheme name, department, state, eligibility criteria (age, income, gender, category, occupation), benefits, application URL
- Firecrawl integration planned for later to aggregate from government portals (myscheme.gov.in, state portals)

---

## Technical Architecture

### Frontend
- React + Vite + TypeScript + Tailwind CSS
- PWA manifest (no install prompt, works in browser)
- Tesseract.js for client-side OCR
- Framer Motion for smooth page transitions and animations
- Responsive: mobile-first design

### Backend (Lovable Cloud)
- **Database tables**: users, user_profiles (extracted data), user_documents, schemes, saved_schemes
- **Edge functions**: `smart-questions` (Lovable AI for dynamic Q&A), `match-schemes` (eligibility matching logic)
- **Auth**: Mock OTP for now (stored in DB, validated server-side)

### AI Integration
- Lovable AI (Gemini Flash) powers the smart question flow
- Edge function receives user profile + asks AI to generate next question
- AI also used for scheme matching refinement

---

## Design System
- **Colors**: Deep blue (#1a237e) primary, saffron (#FF9933) accent, white/light gray backgrounds
- **Typography**: Inter font, large readable text, high contrast
- **Accessibility**: WCAG AA compliant, Hindi/English labels where relevant
- **Style**: Clean, trustworthy, government-friendly — inspired by India.gov.in aesthetics

