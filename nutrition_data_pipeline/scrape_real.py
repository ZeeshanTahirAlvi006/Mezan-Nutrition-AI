import asyncio
import logging
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

async def test_scrape():
    url = "https://www.naheed.pk/grocery-bakery/beverages"
    logging.info(f"Targeting Naheed Beverages page: {url}")
    
    async with async_playwright() as p:
        logging.info("Launching chromium headless...")
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        try:
            # Go to URL with reasonable timeout
            await page.goto(url, wait_until="load", timeout=30000)
            logging.info("Page loaded successfully. Waiting for dynamic content...")
            await asyncio.sleep(5) # Give it 5 seconds to load fully
            
            # Print page title
            title = await page.title()
            logging.info(f"Page Title: {title}")
            
            # Get HTML content
            content = await page.content()
            soup = BeautifulSoup(content, "html.parser")
            
            # Look for common selectors to find product listings
            # Naheed.pk is a Magento-based store, so it typically uses standard Magento 2 classes like:
            # - .product-item
            # - .product-item-info
            # - .product-item-link
            # - .price-box, .price
            
            product_items = soup.select(".product-item")
            logging.info(f"Found {len(product_items)} elements with class '.product-item'")
            
            if not product_items:
                product_items = soup.select("[class*='product-item']")
                logging.info(f"Found {len(product_items)} elements containing class 'product-item' in name")
            
            if not product_items:
                product_items = soup.select(".product-card")
                logging.info(f"Found {len(product_items)} elements with class '.product-card'")
                
            # Let's inspect the first 5 elements to see what selectors they have
            for idx, item in enumerate(product_items[:5]):
                logging.info(f"\n--- Product Element {idx+1} ---")
                # print first 500 characters of element's HTML to inspect structure
                logging.info(item.prettify()[:800])
                
            # If no product items found, print out a snippet of the page's body to see what classes are present
            if not product_items:
                logging.warning("No product elements found. Printing a body snippet:")
                body = soup.find("body")
                if body:
                    logging.info(body.prettify()[:1000])
                    
        except Exception as e:
            logging.error(f"Scraping test failed: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_scrape())
