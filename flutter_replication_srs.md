# Software Requirements Specification (SRS): NutriGuide Flutter Replication

## 1. Introduction
### 1.1 Purpose
This document specifies the software requirements for the Flutter-based mobile application of NutriGuide, replicating the existing MERN stack architecture.

### 1.2 Scope
The system includes a Flutter mobile app and a Node.js/MongoDB backend. It covers user onboarding, health tracking, AI-driven nutritional coaching, and administrative management.

---

## 2. Overall Description
### 2.1 Product Perspective
NutriGuide is a distributed system where the Flutter app acts as the primary interface, communicating via RESTful APIs with a Node.js backend which interfaces with AI providers (Mistral, Gemini, Groq) and weather/food services.

### 2.2 System Functions
1. **User Profile Management:** TDEE calculation, goal setting.
2. **Food Logging:** Manual, Barcode, Voice, and AI-description based.
3. **Macro Tracking:** Real-time calculation of daily totals vs. targets.
4. **AI Coaching:** Multi-turn conversation with tool-calling capabilities (log food, suggest replacement, etc.).
5. **Weather-Adaptive Meal Planning:** Generating 7-day plans based on local forecast.

---

## 3. System Features & Backend Logic

### 3.1 TDEE & Macro Calculation Logic (Mifflin-St Jeor)
The backend calculates the Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE):
- **BMR (Male):** `10 * weight + 6.25 * height - 5 * age + 5`
- **BMR (Female):** `10 * weight + 6.25 * height - 5 * age - 161`
- **TDEE:** `BMR * Activity Factor (default 1.55)`
- **Adjustments:**
    - Weight Loss: `TDEE * 0.8`
    - Muscle Gain: `TDEE * 1.15`
- **Macro Splits:**
    - Protein: 25% of calories / 4
    - Carbs: 45% of calories / 4
    ### 3.2 AI Service Architecture ("Nova")
    The AI Service uses a **Fallback Strategy**:
    1. Try **Mistral Small Latest**.
    2. If failed/timeout (8s), try **Llama-3.3-70b (Groq)**.
    3. If failed, try **Gemini 1.5 Flash**.
    4. **Vision/Images:** If an image is detected, route directly to **OpenRouter (Google Gemini 2.0 Flash)** for multi-modal analysis.

    ### 3.3 Clinical Guardrails (Prompt Engineering)
    The system injects clinical rules for 9+ chronic conditions and medication interactions:
    - **Metformin:** B12 depletion, Alcohol (Lactic Acidosis), Hypoglycemia risk with Bitter Melon/Berberine.
    - **Warfarin:** Consistency in Vitamin K intake, bleeding risk with high-dose Omega-3/Ginkgo.
    - **CKD:** Potassium/Phosphorus restriction, protein limits (dialysis vs. non-dialysis).
    - **Hypothyroidism:** Levothyroxine timing vs. Coffee/Calcium/Iron.
    - **Heart Failure:** Sodium <1500mg, Digoxin vs. Licorice/St. John's Wort.
    - **Liver Disease:** Prohibiting Alcohol/Kava, protein management in cirrhosis.
    - **Osteoporosis:** Bisphosphonate timing, sodium restriction for bone health.

    ### 3.4 Knowledge Base & RAG Architecture
    ... (unchanged)

    ### 3.5 Admin & Logic Flows
    - **PDF Export:** Uses `pdf` and `printing` packages to generate 7-day plans.
    - **Streak Logic:** Background process (`recalculateStreak`) triggered on every login or food log to update consecutive active days.

The system employs **Retrieval Augmented Generation (RAG)** to ensure clinical accuracy:
- **Vector Database:** Pinecone (Index: `nutriguide-kb`).
- **Embedding Model:** `multilingual-e5-large` (Pinecone built-in).
- **Workflow:**
    1. Admin uploads medical PDF.
    2. Backend chunks text (1000 chars, 200 overlap) and generates embeddings.
    3. AI Coach uses the `search_knowledge_base` tool to query Pinecone before answering medical questions.
    4. Top 4 relevant chunks are injected into the AI's context.

---

## 4. External Interface Requirements

### 4.1 User Interface (Flutter Components)
- **MacroRings:** Custom painter for concentric progress rings.
- **FoodSearchWidget:** Debounced search with local cache and remote fallback.
- **ChatInterface:** Bubble-based UI supporting Markdown and Tool Action states.
- **BarcodeScanner:** Integration with `mobile_scanner`.

### 4.2 Hardware Interfaces
- **Camera:** For barcode scanning and food photography.
- **Microphone:** For speech-to-text (VoiceInput).

### 4.3 Software Interfaces
- **Backend API:** REST API over HTTPS using JSON.
- **Push Notifications:** Firebase Cloud Messaging (FCM) for alerts and reminders.
- **External APIs:**
    - OpenWeatherMap (Forecast).
    - USDA FoodData Central.
    - AI Providers (Mistral, Groq, Google).

---

## 5. Non-Functional Requirements
### 5.1 Performance
- **API Response:** 90% of non-AI requests should respond within <200ms.
- **AI Response:** Streaming or "Thinking" indicators must be shown for AI processing.
- **Cold Start:** The app should load the Dashboard (from local Hive cache) in <500ms.

### 5.2 Security
- **JWT Auth:** Token-based authentication with 15-minute expiry and refresh tokens.
- **Data Encryption:** All data in transit over TLS/SSL. Sensitive user data (health profile) encrypted at rest using Hive's encrypted box feature.

### 5.3 Safety
- **Medical Disclaimer:** App must show a disclaimer that it is an AI coach, not a doctor.
- **Drug-Nutrient Warnings:** High-priority alerts for identified medical conditions.

---

## 6. System Architecture & Data Model

### 6.1 Database Schema (MongoDB & Hive)
- **User (MongoDB):** Email, Password, Profile (Age/Weight/Height), Goals, Restrictions, Pantry, Streak.
- **DailyLog (MongoDB + Hive):** Date, FoodItems (embedded), Totals (Macros). Hive stores the last 7 days locally for instant offline access.
- **FoodItem (Hive):** A local "Fast-Cache" of frequently used foods to reduce USDA API latency.
- **MealPlan (MongoDB):** 7-day structure with meal categories (Breakfast, Lunch, etc.).

### 6.2 Control Flow (Meal Logging)
1. User enters food via Chat/Manual/Barcode.
2. Backend validates food (Local DB -> USDA Fallback).
3. Backend updates or creates `DailyLog` for current date.
4. Backend triggers background `recalculateStreak` process.
5. Response returns updated daily totals to Flutter app.
6. Flutter app updates **Riverpod Providers**, causing `MacroRings` to animate to new values instantly.
