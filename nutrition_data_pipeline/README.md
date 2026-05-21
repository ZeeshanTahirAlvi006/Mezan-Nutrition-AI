# 🇵🇰 stand-alone Nutrition Data Scraping, Cleaning, & Labeling Pipeline

This is a modern, extensible, and standalone data ingestion pipeline designed to scrape global food products with a heavy focus on the **Pakistani grocery and traditional food market**. It processes raw data, cleans it, applies Romanized Urdu translations, audits ingredients for Halal compliance, extracts allergen safety warnings, and outputs structured analytical datasets (JSON, CSV, Parquet).

---

## 🚀 Directory Structure

```text
nutrition_data_pipeline/
├── requirements.txt      # Python dependencies
├── scraper.py            # Playwright & BeautifulSoup web scraper
├── cleaner.py            # Romanized Urdu synonym translator & metric parser
├── labeler.py            # Halal ingredient auditor & allergen tagger
├── main.py               # Orchestrator & Multi-format exporter
├── README.md             # Setup and running instructions
└── outputs/              # Structured results directory (auto-created)
    ├── pakistan_food_database.json
    ├── pakistan_food_database.csv
    └── pakistan_food_database.parquet
```

---

## 🛠️ Setup Instructions

### 1. Prerequisites
Ensure you have **Python 3.8+** installed on your system.

### 2. Install Dependencies
Navigate to this directory in your terminal and install the required modules:
```bash
pip install -r requirements.txt
```

### 3. Install Playwright Web Browsers
The dynamic web scraper uses Playwright to load infinite-scroll, Javascript-driven grocery applications (like Pandamart or Daraz). Download the chromium headless binaries:
```bash
playwright install chromium
```

---

## 📊 Core Features

1. **Scraper (`scraper.py`):**
   * Employs `Playwright` to launch automated headless browsers, mimicking desktop viewport scrolling behavior to bypass lazy loading.
   * Leverages `BeautifulSoup` to parse traditional HTML tables and product structures.
2. **Cleaner (`cleaner.py`):**
   * Implements a custom **Romanized Urdu synonym map** to translate local terms (`"Aloo"` -> `"potato"`, `"Zeera"` -> `"cumin"`, `"Doodh"` -> `"milk"`, `"Naan"` -> `"naan bread"`) to standard English dictionary nodes.
   * Sanitizes noisy strings, formats numbers, and uses calorie equations as a fallback calculation when missing.
3. **Labeler (`labeler.py`):**
   * **Halal Audit:** Scans ingredients for prohibited items (Pork, Gelatin, Carmine/E120, etc.) and tags products as `Halal`, `Haram`, or `Doubtful (Mushbooh)` (e.g. questionable emulsifiers or food colorings).
   * **Allergen Extraction:** Tags dairy, nuts, gluten, soy, and eggs as boolean attributes.
4. **Exporter (`main.py`):**
   * Outputs **JSON** (direct MongoDB insertion-friendly format), **CSV** (for human validation), and **Parquet** (optimized database storage).

---

## 💻 Running the Pipeline

To run the end-to-end simulation pipeline and verify the setup:
```bash
python main.py
```

### Extending for Production
To scrape a live site:
1. Initialize the `NutritionScraper`.
2. Invoke `scrape_dynamic_page(url, item_selector)` to retrieve list details.
3. Feed the results list to the orchestrator's `process_raw_batch(raw_list)`.
4. Run `export_data()` to generate structured assets.
