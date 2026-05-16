# KCAL Intelligence: Data Accuracy Roadmap

To transition the AI Agent from a "General Assistant" to a "Precision Nutritionist," we need to expand our data architecture across five strategic dimensions.

## 1. Deep Personalization (Biometric Data)
Accuracy is impossible without knowing the *recipient* of the nutrition.
*   **Biometric Dataset**: Age, sex, height, current weight, body fat %, and basal metabolic rate (BMR).
*   **Clinical Data**: Blood glucose trends, lipid panels, and hormonal markers (via integrations like InsideTracker).
*   **Genetic Markers**: Data from services like 23andMe or AncestryDNA to identify nutrient absorption efficiencies and sensitivities (e.g., caffeine metabolism, lactose intolerance).

## 2. Global Food Breadth (The "World Database")
Our current internal database is a seed. For 99% accuracy, we need live connections to global authorities.
*   **Nutritional Authority APIs**: Integration with **Nutritionix**, **Edamam**, or **USDA FoodData Central**. These provide millions of verified items.
*   **Global Barcode/UPC Mapping**: A dataset that maps millions of international UPCs to nutritional labels, ensuring the "Scan" feature never returns a "Not Found" error.
*   **Regionality Mapping**: Datasets of localized brands and common restaurant dishes in specific countries (e.g., specific street foods in SE Asia or regional supermarket brands in Europe).

## 3. Culinary Intelligence (Recipe Deconstruction)
The AI needs to understand how ingredients transform.
*   **Recipe-to-Macro Mapping**: A dataset of thousands of standard recipes to allow the AI to estimate macros for "Home-cooked Chicken Korma" based on standard ingredient ratios.
*   **Satiety Index Data**: Data mapping different foods to their satiety scores to help the AI suggest foods that keep the user full for longer (e.g., boiled potatoes vs. white bread).

## 4. Telemetry & Environment (Live Context)
Nutrition doesn't happen in a vacuum.
*   **Wearable Telemetry**: Real-time heart rate, sleep quality, and active calorie burn from **Apple Health**, **Google Fit**, or **Oura**. This allows the AI to suggest a higher carb intake on a heavy training day.
*   **Location/Menu Data**: Access to restaurant menus via **DoorDash** or **UberEats** APIs. The AI could say: *"I see you're at Starbucks; the Spinach & Feta wrap fits your protein goals for today."*

## 5. Behavioral & Psychological Markers (The "Why")
The most accurate agent is the one that predicts and prevents relapses.
*   **Mood-Food Correlation**: Historical datasets correlating user mood/stress (which we already log) with food choices. This allows the AI to provide proactive coaching: *"You usually feel low energy at 4 PM; let's have a protein snack now to avoid a sugar craving later."*
*   **Circadian Rhythm Data**: Optimal eating windows based on the user's specific chronotype.

---

### **Immediate Next Steps for Integration**
1.  **API Integration**: Prioritize **Nutritionix** for the most robust search/scan results.
2.  **User Profile Expansion**: Update the `User` model to include weight history and activity levels.
3.  **Wearable Sync**: Implement an OAuth flow for Apple/Google Health data.
