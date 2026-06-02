# Product Requirements Document (PRD): NutriGuide Flutter Replication

## 1. Product Overview
**NutriGuide** is a personalized AI-powered nutrition and health coaching application. It aims to provide users with clinically-backed dietary advice, real-time meal logging, and weather-adaptive meal planning to help them achieve health goals (Weight Loss, Muscle Gain, or Maintenance).

### Vision
To empower individuals with an intelligent, culturally-calibrated, and medically-aware digital nutritionist that fits in their pocket.

### Target Audience
- Individuals looking to improve their dietary habits.
- People managing chronic conditions like Type 2 Diabetes or Hypertension (with medical guardrails).
- Users in specific regions (e.g., UAE/South Asia) who need culturally relevant food recommendations.
- Fitness enthusiasts tracking macros.

---

## 2. Goals & Objectives
- **Replicate Functionality:** Move from a Web/React based platform to a native-feel mobile experience using Flutter.
- **Enhanced UX:** Provide smooth animations (glassmorphic progress rings, interactive charts).
- **Offline Capabilities:** Local caching for daily logs and food data.
- **AI Integration:** Seamless integration with multi-provider AI (Mistral, Groq, Gemini) for conversational health coaching.

---

## 3. User Personas
1. **The Weight Watcher:** Needs precise calorie tracking and motivation via streaks.
2. **The Busy Professional:** Needs quick food logging (barcode/voice) and automated meal plans.
3. **The Health-Conscious Senior:** Needs medical guardrails for medications (e.g., Metformin) and chronic conditions.

---

## 4. Functional Requirements

### 4.1 Onboarding & Authentication
- **Social/Email Login:** Support for Google Login and Email/Password.
- **Health Profile Setup:** Capture Age, Weight, Height, Health Goals, Dietary Restrictions, and Location.
- **TDEE Calculation:** Automatic calculation of maintenance and target calories using the Mifflin-St Jeor formula.

### 4.2 Dashboard (The Command Center)
- **Macro Trackers:** Circular progress indicators for Calories, Protein, Carbs, and Fats.
- **Daily Check-in:** Log mood, water intake, and energy levels.
- **Weekly Trend:** Visualization of weight and macro adherence over 7 days.
- **Achievement Toast:** Real-time feedback for hitting daily goals or maintaining streaks.

### 4.3 AI Nutrition Coach ("Nova")
- **Conversational Logging:** Log meals by describing them (e.g., "I had 2 eggs and a paratha for breakfast").
- **Clinical Intelligence:** Extensive guardrails for Metformin, Hypertension, Anemia, Liver Disease, CKD, Heart Failure, Warfarin, Hypothyroidism, and Osteoporosis.
- **Weather Context:** AI suggests hydration or cooling/warming foods based on real-time local forecast.
- **Voice Input:** Native-feel speech-to-text integration for hands-free logging.
- **Image Processing:** Multi-modal support (via OpenRouter/Gemini 2.0) for analyzing food photos.

### 4.4 Meal Planner
- **7-Day Generation:** Automated meal plans based on pantry items and local availability.
- **Weather-Adaptive:** Suggests light meals on hot days and warm meals on cold days.
- **Replacement Suggestions:** AI-driven alternatives if a suggested food is unavailable.
- **PDF Export:** Ability to export the 7-day plan as a formatted PDF for offline use.

### 4.5 Pantry & Food Database
- **Pantry Management:** Users list items they have at home; AI prioritizes these for meal plans.
- **Barcode Scanner:** Scan food items to fetch nutritional data.
- **USDA/Local DB Integration:** Search from a comprehensive food database.

### 4.6 Knowledge Base & RAG (Retrieval Augmented Generation)
- **Verified Sources:** AI coach must prioritize information from the internal knowledge base (verified medical PDFs) over general LLM training data.
- **Source Transparency:** AI responses should cite sources (e.g., "[Source: Nutrition_Guide.pdf]") when providing clinical advice.

### 4.7 Admin Portal (Back-office)
- **Stats Dashboard:** Real-time metrics on user growth, log activity, and AI usage.
- **Content Management:** CRUD operations for the food database and meal plan templates.
- **Knowledge Ingestion:** Interface to upload and index medical PDFs into the vector database (Pinecone).
- **User Oversight:** Ability to view user logs and disable accounts if necessary.

---

## 5. User Experience (UX)
- **Design Language:** **Strict Material 3 (M3)**. 
    - Utilize M3 Color System (Dynamic Color/Material You).
    - M3 Elevation (Color-based tinting instead of shadows).
    - M3 Typography scale and rounded shapes.
- **Interactive Elements:**
    - M3 Circular Progress indicators for macros.
    - M3 Extended FAB (Floating Action Button) for logging.
    - M3 Modal Bottom Sheets for data input.
- **Navigation:** M3 Navigation Bar (Bottom Navigation) with 4-5 destinations.

---

## 6. Technical Requirements (Flutter)
- **Framework:** Flutter (Latest Stable).
- **State Management:** **Riverpod** (Recommended for its reactive nature, perfect for syncing Chat logs with Dashboard macros instantly).
- **Local Storage:** **Hive** (Fast, NoSQL key-value database ideal for high-speed caching of USDA food data and offline logs).
- **Charts:** `fl_chart` for weekly trends.
- **Networking:** Dio with interceptors for JWT management.
- **Push Notifications:** Firebase Cloud Messaging (FCM) for meal reminders and streak alerts.

---

## 7. Success Metrics
- **Retention:** 7-day and 30-day active usage.
- **Accuracy:** User satisfaction with AI-logged food macros.
- **Engagement:** Number of chat messages per user.
- **Conversion:** Percentage of users who complete the 7-day meal plan.
