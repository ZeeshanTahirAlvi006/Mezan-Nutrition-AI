import httpx
import logging
import re
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def find_navigation_urls():
    url = "https://www.naheed.pk/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    }
    
    logging.info(f"Fetching Naheed homepage to extract category links: {url}")
    try:
        response = httpx.get(url, headers=headers, follow_redirects=True, timeout=20.0)
        logging.info(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            links = soup.find_all("a", href=True)
            logging.info(f"Found {len(links)} total links on homepage.")
            
            # Filter links by interesting grocery/food keywords
            keywords = ["grocery", "beverages", "masalay", "oil", "bakery", "dairy", "food", "snacks", "pantry", "breakfast"]
            matching_links = []
            
            for link in links:
                href = link["href"]
                text = link.get_text().strip()
                # Clean up multiple whitespaces
                text = re.sub(r"\s+", " ", text)
                
                # Check if any keyword matches the link path or text
                if any(kw in href.lower() or kw in text.lower() for kw in keywords):
                    matching_links.append((href, text))
            
            # Print unique matching links
            unique_matches = sorted(list(set(matching_links)))
            logging.info(f"Found {len(unique_matches)} matching navigation links:")
            for href, text in unique_matches[:60]: # Print top 60 matches
                print(f"URL: {href} | Text: {text}")
                
        else:
            logging.warning("Failed to fetch homepage.")
            print(response.text[:1000])
            
    except Exception as e:
        logging.error(f"Failed to find navigation links: {e}")

if __name__ == "__main__":
    find_navigation_urls()
