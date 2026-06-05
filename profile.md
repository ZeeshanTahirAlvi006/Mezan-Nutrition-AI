1. System & Localization
Preferred Language (String): e.g., English, Urdu, Arabic. (Crucial for generating localized recipes and advice).

Location/Region (String or Object): Country and city to map local grocery brands, seasonal ingredients, and regional dishes.

Account Name/Nickname (String): For personalized app text and AI chat greetings.

2. Biological Baseline (The Math)
Age (Number): Used for age-specific metabolic formulas and nutrient intake guidelines.

Biological Sex (Enum: Male, Female): Necessary for standard BMR (Basal Metabolic Rate) formulas like Mifflin-St Jeor.

Current Height (Number): In cm or inches.

Current Weight (Number): In kg or lbs.

3. Lifestyle & Targets
Primary Goal (Enum):

Weight Loss

Muscle Gain

Maintenance

Disease Management (e.g., blood sugar control)

Activity Level (Enum):

Sedentary (Little to no exercise)

Lightly Active (1–3 days/week)

Moderately Active (3–5 days/week)

Very Active (6–7 days/week heavy exercise)

Diet Type/Preference (Array of Enums): Halal, Vegetarian, Vegan, Keto, None.

4. Critical Safety Guardrails
Allergies & Intolerances (Array of Strings): e.g., Peanuts, Dairy, Gluten, Soy. (Acts as a hard filter for the AI).

Medical Conditions (Array of Strings): e.g., Type 2 Diabetes, Hypertension, Hyperthyroidism.

Pregnancy/Lactation Status (Boolean or Enum): Changes micronutrient thresholds and caloric cushions significantly

