import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

class DataLabeler:
    def __init__(self):
        # Strict subcontinent & global ingredient criteria
        self.haram_ingredients = [
            "gelatin", "gelatine", "pork", "lard", "bacon", "ham",
            "carmine", "cochineal", "e120", "brewer's yeast",
            "wine", "rum", "alcohol", "beer", "whiskey"
        ]
        
        self.doubtful_ingredients = [
            "whey", "emulsifier", "mono and diglycerides", "e471", "e472",
            "rennet", "pepsin", "vanilla extract", "natural flavor", "lecithin",
            "e322", "glycerol", "glycerin", "e422"
        ]
        
        self.allergen_rules = {
            "dairy": ["milk", "butter", "cheese", "cream", "whey", "yogurt", "dahi", "doodh", "lactose"],
            "gluten": ["wheat", "barley", "rye", "flour", "atta", "maida", "gluten", "sooji", "semolina"],
            "nuts": ["peanut", "almond", "walnut", "cashew", "pistachio", "pecan", "hazelnut", "nut"],
            "soy": ["soy", "soya", "lecithin", "tofu"],
            "eggs": ["egg", "albumin", "yolk"]
        }

    def audit_halal_status(self, ingredients_str: str) -> str:
        """
        Analyzes the normalized ingredients string and labels the product's Halal compliance status.
        Status categories:
        - Haram: Explicitly contains forbidden ingredients.
        - Doubtful (Mushbooh): Contains suspicious ingredients requiring active Halal certification lookup.
        - Halal: Contains no doubtful or haram elements.
        """
        if not ingredients_str:
            return "Halal"  # Baseline default for raw single-ingredient foods if empty
            
        ingredients_lower = ingredients_str.lower()
        
        # Check explicit haram
        for haram in self.haram_ingredients:
            if haram in ingredients_lower:
                logging.info(f"Haram ingredient detected: {haram}")
                return "Haram"
                
        # Check doubtful / mushbooh
        for doubtful in self.doubtful_ingredients:
            if doubtful in ingredients_lower:
                logging.info(f"Doubtful (Mushbooh) ingredient detected: {doubtful}")
                return "Doubtful"
                
        return "Halal"

    def detect_allergens(self, ingredients_str: str) -> dict:
        """
        Scans ingredient string for allergen exposures.
        Returns a dictionary of allergen boolean flags.
        """
        flags = {
            "contains_dairy": False,
            "contains_gluten": False,
            "contains_nuts": False,
            "contains_soy": False,
            "contains_eggs": False
        }
        
        if not ingredients_str:
            return flags
            
        ingredients_lower = ingredients_str.lower()
        
        for allergen, keywords in self.allergen_rules.items():
            for keyword in keywords:
                if keyword in ingredients_lower:
                    flags[f"contains_{allergen}"] = True
                    break
                    
        return flags

    def label_product_record(self, cleaned_record: dict) -> dict:
        """
        Takes a cleaned record, runs the auditing suite, and appends the new label nodes.
        """
        ingredients = cleaned_record.get("ingredients", "")
        
        cleaned_record["halal_status"] = self.audit_halal_status(ingredients)
        cleaned_record["allergens"] = self.detect_allergens(ingredients)
        
        return cleaned_record

if __name__ == "__main__":
    labeler = DataLabeler()
    # Basic smoke test
    sample_cleaned = {
        "name": "Shan Biryani Masala",
        "brand": "Shan Foods",
        "ingredients": "salt, red chili, cumin, turmeric, coriander, emulsifier e471"
    }
    labeled = labeler.label_product_record(sample_cleaned)
    print("Test Labeling Results:\n", labeled)
