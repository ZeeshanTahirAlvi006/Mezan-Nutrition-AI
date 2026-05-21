import re
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

class DataCleaner:
    def __init__(self):
        # Romanized Urdu & regional synonym mappings to normalize inputs to English standard keys
        self.regional_synonyms = {
            # Grains & Flour
            "atta": "wheat flour",
            "ata": "wheat flour",
            "maida": "all-purpose flour",
            "chawal": "rice",
            "channa": "chickpeas",
            "chana": "chickpeas",
            "suji": "semolina",
            "sooji": "semolina",
            
            # Vegetables
            "aloo": "potato",
            "alu": "potato",
            "tamatar": "tomato",
            "pyaz": "onion",
            "pyaaz": "onion",
            "adrak": "ginger",
            "lehsun": "garlic",
            "lasun": "garlic",
            "bhindi": "okra",
            "bhendi": "okra",
            "ladyfinger": "okra",
            "palak": "spinach",
            
            # Spices
            "zeera": "cumin",
            "jeera": "cumin",
            "haldi": "turmeric",
            "lal mirch": "red chili",
            "namak": "salt",
            "dhaniya": "coriander",
            
            # Dairy
            "dahi": "yogurt",
            "makkhan": "butter",
            "ghee": "clarified butter",
            "doodh": "milk",
            "dudh": "milk",
            
            # Meat & Dishes
            "murgh": "chicken",
            "murgi": "chicken",
            "gosht": "meat",
            "nehari": "nihari",
            "nahaari": "nihari",
            "naan": "naan bread",
            "paratha": "paratha flatbread",
            "roti": "chapati"
        }

    def clean_text(self, text: str) -> str:
        """
        Strips HTML tags, double spaces, and weird escape characters from scraped inputs.
        """
        if not text:
            return ""
        # Remove tags
        text = re.sub(r"<[^>]*>", " ", text)
        # Normalize whitespace
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def parse_nutrient_value(self, value_str: str) -> float:
        """
        Uses regular expressions to extract numeric values from nutrient strings (e.g. "12g", "5.5 mg", "350 kcal").
        Returns the float representation or 0.0 if not parsed.
        """
        if not value_str or not isinstance(value_str, str):
            return 0.0
            
        value_str = value_str.lower().strip()
        # Regex to find integer or float
        match = re.search(r"([0-9]+(?:\.[0-9]+)?)", value_str)
        if match:
            return float(match.group(1))
        return 0.0

    def normalize_ingredient_synonyms(self, ingredient_str: str) -> str:
        """
        Translates regional/Romanized Urdu ingredients to standard dictionary terms.
        """
        if not ingredient_str:
            return ""
            
        words = re.split(r"[\s,]+", ingredient_str.lower())
        normalized_words = []
        
        # Parse compound phrases first
        i = 0
        while i < len(words):
            word = words[i]
            # Lookahead check for 2-word phrase synonyms (e.g. "lal mirch")
            if i + 1 < len(words):
                phrase = f"{word} {words[i+1]}"
                if phrase in self.regional_synonyms:
                    normalized_words.append(self.regional_synonyms[phrase])
                    i += 2
                    continue
            
            # Single word checks
            if word in self.regional_synonyms:
                normalized_words.append(self.regional_synonyms[word])
            else:
                normalized_words.append(word)
            i += 1
            
        return ", ".join(filter(None, normalized_words))

    def clean_product_record(self, raw_record: dict) -> dict:
        """
        Takes raw scraped record and returns a pristine, standardized dictionary.
        """
        cleaned = {
            "name": self.clean_text(raw_record.get("name", "")),
            "brand": self.clean_text(raw_record.get("brand", "Generic")),
            "ingredients": self.normalize_ingredient_synonyms(self.clean_text(raw_record.get("ingredients", ""))),
            "macros": {
                "calories": 0.0,
                "protein": 0.0,
                "carbs": 0.0,
                "fats": 0.0
            }
        }
        
        # Map and parse macros safely
        raw_macros = raw_record.get("macros", {})
        for macro in ["calories", "protein", "carbs", "fats"]:
            val = raw_macros.get(macro, "0")
            cleaned["macros"][macro] = self.parse_nutrient_value(str(val))
            
        # Fallback calorie calculation if missing but macros are present: Calories = (P*4) + (C*4) + (F*9)
        if cleaned["macros"]["calories"] == 0.0:
            p = cleaned["macros"]["protein"]
            c = cleaned["macros"]["carbs"]
            f = cleaned["macros"]["fats"]
            calc_calories = (p * 4.0) + (c * 4.0) + (f * 9.0)
            if calc_calories > 0:
                cleaned["macros"]["calories"] = round(calc_calories, 1)
                
        return cleaned

if __name__ == "__main__":
    cleaner = DataCleaner()
    # Basic smoke test
    raw = {
        "name": "<h1>Shan Biryani Masala 50g</h1>",
        "brand": "Shan Foods ",
        "ingredients": "Namak, Lal Mirch, Zeera, Haldi, Coriander",
        "macros": {
            "calories": "0",
            "protein": "1.2 g",
            "carbs": "8.5 grams",
            "fats": "0.5 g"
        }
    }
    cleaned = cleaner.clean_product_record(raw)
    print("Test Cleaning Results:\n", cleaned)
