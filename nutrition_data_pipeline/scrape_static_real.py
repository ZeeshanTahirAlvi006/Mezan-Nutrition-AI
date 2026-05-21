import httpx
import logging
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def test_static_scrape():
    url = "https://www.naheed.pk/groceries-pets/beverages"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
    }
    
    logging.info(f"Targeting Naheed Beverages page statically: {url}")
    try:
        response = httpx.get(url, headers=headers, follow_redirects=True, timeout=20.0)
        logging.info(f"Response status code: {response.status_code}")
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            logging.info(f"Page title: {soup.title.string.strip() if soup.title else 'No Title'}")
            
            # Magento 2 standard class is .product-item
            items = soup.select(".product-item")
            logging.info(f"Found {len(items)} '.product-item' elements.")
            
            if not items:
                items = soup.select(".product-item-info")
                logging.info(f"Found {len(items)} '.product-item-info' elements.")
                
            # Let's check some common selectors in Magento 2
            if items:
                logging.info("\n--- Struct of First Item ---")
                logging.info(items[0].prettify()[:1000])
                
                # Try to parse details
                for idx, item in enumerate(items[:10]):
                    name_elem = item.select_one(".product-item-link, a.product-item-link, .product-name a")
                    price_elem = item.select_one(".price-box .price, span.price, [id^='product-price-'] .price")
                    
                    name = name_elem.get_text().strip() if name_elem else "No Name"
                    link = name_elem["href"].strip() if name_elem and name_elem.has_attr("href") else "No Link"
                    price = price_elem.get_text().strip() if price_elem else "No Price"
                    
                    logging.info(f"Parsed {idx+1}: {name} | Price: {price} | Link: {link}")
            else:
                logging.warning("No items found. Body snippet:")
                logging.info(response.text[:2000])
        else:
            logging.warning(f"Non-200 response: {response.status_code}")
            logging.info(response.text[:1000])
            
    except Exception as e:
        logging.error(f"Static scrape failed: {e}")

if __name__ == "__main__":
    test_static_scrape()
