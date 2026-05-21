import asyncio
import logging
from bs4 import BeautifulSoup
import httpx
from playwright.async_api import async_playwright

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

class NutritionScraper:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }

    async def fetch_static_html(self, url: str) -> str:
        """
        Fetches static HTML from a URL using httpx with robust error handling.
        """
        logging.info(f"Fetching static HTML from: {url}")
        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=15.0, follow_redirects=True) as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.text
        except Exception as e:
            logging.error(f"Error fetching URL {url}: {e}")
            return ""

    async def scrape_dynamic_page(self, url: str, item_selector: str, scroll_limit: int = 5) -> list:
        """
        Launches a headless Playwright browser to load dynamic modern SPAs (e.g. Pandamart, Daraz, Kravemart),
        scrolls to trigger infinite loading, and extracts basic product cards.
        """
        logging.info(f"Launching Playwright to scrape dynamic page: {url}")
        results = []
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                # Set viewport to mimic desktop browser
                context = await browser.new_context(
                    viewport={"width": 1280, "height": 800},
                    user_agent=self.headers["User-Agent"]
                )
                page = await context.new_page()
                
                await page.goto(url, wait_until="networkidle")
                
                # Dynamic scrolling to trigger lazy load / infinite scroll
                for i in range(scroll_limit):
                    logging.info(f"Scrolling dynamic page ({i + 1}/{scroll_limit})...")
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    await asyncio.sleep(2.0)  # Wait for items to render
                
                # Fetch product cards
                cards = await page.locator(item_selector).all()
                logging.info(f"Found {len(cards)} product element matches.")
                
                for card in cards:
                    try:
                        # Attempt to extract text elements defensively
                        html = await card.inner_html()
                        soup = BeautifulSoup(html, "html.parser")
                        text_content = soup.get_text(separator=" ").strip()
                        
                        results.append({
                            "raw_text": text_content,
                            "raw_html": html
                        })
                    except Exception as inner_e:
                        logging.warning(f"Error reading card element: {inner_e}")
                        
                await browser.close()
        except Exception as e:
            logging.error(f"Playwright scraping failed for {url}: {e}")
            
        return results

    def parse_product_details(self, html_content: str) -> dict:
        """
        Helper parser using BeautifulSoup to parse nutritional details from generic catalog tables.
        """
        soup = BeautifulSoup(html_content, "html.parser")
        data = {
            "name": "",
            "brand": "",
            "ingredients": "",
            "macros": {}
        }
        
        # Extensible selector heuristics (can be customized per target site)
        title_elem = soup.find(["h1", "h2"], class_=["product-title", "title", "product-name"])
        if title_elem:
            data["name"] = title_elem.get_text().strip()
            
        brand_elem = soup.find(["span", "div", "a"], class_=["brand", "product-brand"])
        if brand_elem:
            data["brand"] = brand_elem.get_text().strip()
            
        ing_elem = soup.find(class_=["ingredients", "ingredients-list", "product-ingredients"])
        if ing_elem:
            data["ingredients"] = ing_elem.get_text().strip()
            
        # Parse common nutrition tables
        table = soup.find("table", class_=["nutrition-table", "nutrition-facts"])
        if table:
            for row in table.find_all("tr"):
                cols = [c.get_text().strip().lower() for c in row.find_all(["td", "th"])]
                if len(cols) >= 2:
                    key, val = cols[0], cols[1]
                    if "calor" in key or "energy" in key:
                        data["macros"]["calories"] = val
                    elif "protein" in key:
                        data["macros"]["protein"] = val
                    elif "carb" in key:
                        data["macros"]["carbs"] = val
                    elif "fat" in key:
                        data["macros"]["fats"] = val
                        
        return data

# Quick local test module
if __name__ == "__main__":
    scraper = NutritionScraper()
    print("Scraper class loaded successfully.")
