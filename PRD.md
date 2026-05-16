# Product Requirements Document (PRD)

## 1. Product Overview
**Project Name:** Antigravity Nutrition
**Platform:** Web Application (Mobile-responsive)
**Tech Stack:** MERN (MongoDB, Express.js, React.js, Node.js)
**AI Engine:** LMArena (LMSYS) API (OpenAI-compatible)
**Infrastructure:** Frontend (Vercel), Backend (Node.js/Express), Database (MongoDB Atlas)

**Product Vision & Mission:**
Antigravity Nutrition is an intelligent, AI-driven web application designed to help users achieve their health and wellness goals. Built with a focus on localized nutritional data (prioritizing the UAE market), the app aligns with **UAE Vision 2031 & SDG 3 (Health & Wellbeing)**. It provides real-time, context-aware AI coaching, seamless macro tracking, and dynamic gamification to maintain user engagement.

---

## 2. Target Audience & User Personas
- **Health-conscious Individuals in the UAE:** Seeking tailored nutrition advice aligned with local food brands (e.g., Al Rawabi).
- **Fitness Enthusiasts:** Needing precise macronutrient tracking and goal adjustments based on daily energy levels.
- **Individuals with Dietary Restrictions:** Requiring intelligent warnings regarding allergies, halal compliance, or vegan diets.

---

## 3. Key Features & Functional Requirements

### 3.1. User Authentication & Onboarding
- **JWT-based Auth:** Secure login and registration.
- **Comprehensive Onboarding:** Captures critical user data:
  - **Bio-data:** Age, Weight, Height.
  - **Health Goals:** Weight Loss, Muscle Gain, Maintenance.
  - **Restrictions:** Allergies, Halal, Vegan, etc.

### 3.2. Localized Food Database
- **Data Sourcing:** Kaggle datasets (Global Food Nutrition, USDA/OpenFoodFacts).
- **Localization:** Tagged with a `country` field to prioritize regional brands and foods (e.g., UAE).
- **Nutrition Tracking:** Standardized attributes (`calories`, `protein`, `carbs`, `fats`, `fiber`, `vitamin_A`, `vitamin_C`, `sodium`, `sugar`).
- **Barcode Scanner:** Integration with `quagga2` for easy logging.

### 3.3. AI Orchestration (Intelligent Virtual Agent)
- **LMArena Integration:** Seamless interaction using LMSYS API.
- **System Personality:** Expert nutritionist adhering to UAE health standards.
- **Function Calling:** Enables the AI to query the MongoDB food database to answer specific inquiries.
- **Conflict Warnings:** AI actively warns users against food choices that conflict with their logged allergies or goals (e.g., high sugar/sodium).

### 3.4. Dynamic Tracking & Check-ins
- **Daily Food Logs:** Users log daily meals, calculating real-time macro progress.
- **Daily Check-ins:** Multi-step form tracking subjective metrics (Mood via Emojis, Energy via Sliders, Satiety).
- **Adaptive Algorithm:** Backend logic dynamically adjusts daily calorie targets based on check-in data (e.g., suggesting a 10% calorie increase if energy is persistently low).

### 3.5. Gamification & Engagement
- **Streaks & Progress:** Tracks consecutive daily logs (`streakCount`).
- **Achievements:** Unlocks milestone modals when hitting macro targets (e.g., 3 consecutive days).
- **Dashboard Analytics:** Visual progress bars and radial charts (via `Recharts`) to track the timeline toward health goals.

---

## 4. Technical Architecture

### 4.1. Frontend (React & Vercel)
- **State Management:** Context API or Redux for handling user stats universally.
- **UI Components:** Highly visual dashboards, chatbot bubbles, interactive gamification elements.
- **Deployment:** Vercel for CI/CD.

### 4.2. Backend API (Node.js & Express)
- `GET /api/food/search?q=...&country=...` - Queries Kaggle data.
- `POST /api/logs/daily` - Submits food and macro data.
- `POST /api/checkin` - Submits mood, energy, and satiety metrics.
- `POST /api/chat` - Interfaces with the LMArena model.

### 4.3. Database (MongoDB Atlas)
- **Collections:** 
  - `users`
  - `food_items`
  - `daily_logs`
  - `check_ins`

---

## 5. UI/UX & Design Guidelines
- **Modern & Premium Aesthetics:** Mobile-first approach, dark modes, glassmorphism, dynamic animations.
- **Interactive Gamification:** Micro-animations on achievement unlocks.
- **Clear Visual Hierarchy:** Critical health data (macros, warnings) must be prominent and easily digestible.

---

## 6. Compliance & Success Metrics
- [ ] **SDG 3 Alignment:** App actively warns about high-sugar/high-sodium foods.
- [ ] **UAE 2030 Alignment:** Prioritizes local food items in search results.
- [ ] **AI Excellence:** LMArena model provides accurate, context-aware nutritional advice without hallucinations.
- [ ] **Digital Economy Standard:** Interface is fully mobile-responsive and high-performing.

---

## 7. Future Roadmap / Phases
- **Phase 1: Data Architecture:** DB setup and Kaggle data integration.
- **Phase 2: AI Orchestration:** LMArena connection and prompt engineering.
- **Phase 3: Backend API:** Auth, tracking, and algorithm development.
- **Phase 4: Frontend Development:** UI construction, Recharts integration, Barcode scanner.
- **Phase 5: Gamification:** Streaks, achievements, and advanced personalization.
