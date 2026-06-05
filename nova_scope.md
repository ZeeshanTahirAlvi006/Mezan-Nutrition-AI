# Nova AI Nutritionist — Scope of Capabilities

This document outlines the current functional scope, tools, and constraints of the **Nova** AI nutrition assistant integrated into the **Mezan Nutrition AI** platform.

---

## 1. 🍽️ Food & Nutrition Logging
Nova acts as a conversational interface for managing diet logs.
*   **Conversational Logging:** Parses natural text descriptions (e.g., *"I had 2 boiled eggs and a cup of black coffee for breakfast"*) and automatically extracts food names, calories, protein, carbs, and fats.
*   **Direct Database Logging:** Triggers the `log_meal` backend system to register entries to the user's daily food journal.
*   **Water Tracker:** Understands requests to track hydration (e.g., *"Log 500ml of water"* or *"I just drank a glass of water"*) and updates fluid levels.
*   **History Retrieval:** Queries past logs via background tools to answer questions like *"How many calories did I eat last Tuesday?"* or *"What has my average protein intake been this week?"*.

---

## 2. 📝 Exercise & Activity Tracking
Nova bridges nutrition and physical activity tracking.
*   **Activity Logging:** Accepts text inputs about workouts (e.g., *"I did a 45-minute jog at moderate intensity"*) and uses `log_exercise` to store estimated calorie burns.
*   **Activity History:** Retrieves historical exercise details to provide context on energy expenditure.

---

## 3. 🔍 Smart Food Database Search & Menu Lookup
Nova can query external and internal databases to verify facts.
*   **USDA & Local DB Search:** Accesses a combined database of local food items and the official USDA FoodData Central registry to fetch verified macronutrients and micronutrients.
*   **Restaurant Menu Assistant:** Uses menu search tools to advise users on the healthiest options available at various restaurants.

---

## 4. 🧠 Intelligence, Planning & Custom Recommendations
Nova uses profile data and environmental context to provide proactive guidance.
*   **7-Day Weather & Pantry-Aware Meal Plans:** Generates comprehensive meal plan drafts matching target calories, utilizing:
    *   **Health Goals:** Weight Loss, Muscle Gain, or Maintenance.
    *   **Dietary Restrictions:** Halal, Vegan, Vegetarian, Gluten-Free, Nut Allergies, etc.
    *   **Pantry Items:** Prioritizes food items the user already has in their personal pantry list.
    *   **Weather Conditions:** Adapts plan components (e.g., suggesting cold, refreshing meals/hydration reminders in hot weather, or warm soups and energy-dense meals in colder forecasts).
*   **TDEE Calculations:** Recalculates Total Daily Energy Expenditure dynamically when weight or activity levels change.
*   **Smart Food Swaps:** Offers macro-equivalent alternative food suggestions for ingredients within a meal plan.
*   **Smart Shopping Lists:** Converts meal plans into organized grocery lists categorized by grocery aisles.

---

## 5. 🏥 Clinical Safety & Drug-Nutrient Guardrails
Nova is embedded with system-level clinical guardrails to issue critical warnings:
*   **Chronic Kidney Disease (CKD):** Flags high phosphorus, high potassium, and checks protein targets.
*   **Warfarin / Anticoagulants:** Warns against high or inconsistent Vitamin K intake (leafy greens).
*   **Metformin / Diabetes:** Advises on complex carbohydrate spacing to avoid glycemic swings.
*   **Osteoporosis (Bisphosphonates):** Reminds users to space out calcium/iron consumption relative to their medication.
*   **Other Interactions:** Includes guidelines on Thyroid medications (Levothyroxine), Hypertension, Liver diseases, and Cardiac therapies (Statins, Digoxin).

---

## 6. 📂 Semantic Knowledge Retrieval & Vision
*   **Pinecone Vector Database Search:** When asked specialized clinical questions, searches uploaded research papers and PDFs to supply scientifically backed answers.
*   **Vision-to-Log (OpenRouter):** Analyzes uploaded plate photos/images, identifies foods, estimates portion sizes, and suggests logging them.

---

## ⚠️ Current Scope Boundaries (Out of Scope / Gaps)
*   **No Active Push Notifications:** Nova cannot proactively initiate chats or send notifications without user prompts.
*   **Workout Log UI Gap:** The AI can log exercises, but the frontend dashboard lacks a dedicated dashboard component for viewing workout graphs.
*   **No Direct Step-by-Step Cooking Mode:** While Nova generates meal plans, it does not currently generate and pin step-by-step interactive cooking recipes in the dashboard.
