import re, requests, smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import EMAIL_USER, EMAIL_PASSWORD, SMTP_SERVER, SMTP_PORT

def extract_product_info(text: str) -> dict:
    result = {"product_name": None, "expiry_date": None, "best_before_months": None}
    best_before_patterns = [
        r'(?:Best Before|Best before|BB|BBE)\s*(?:date)?\s*[:\-]?\s*(\d+)\s*(?:months?|mon|m)',
        r'(\d+)\s*(?:months?|mon|m)\s*(?:Best Before|Best before|BB|BBE)',
        r'(?:Use within|Use by|Consume within)\s*(\d+)\s*(?:months?|mon|m)',
    ]
    for pattern in best_before_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            result["best_before_months"] = matches[0]
            break
    expiry_patterns = [
        r'(?:EXP|EXPIRY|EXPIRES|EXPIRE|Best Before|Use By)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
        r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})',
        r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2})',
    ]
    for pattern in expiry_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            date_str = matches[0]
            try:
                date_formats = ['%d/%m/%Y', '%d/%m/%y', '%d-%m-%Y', '%d-%m-%y', '%m/%d/%Y']
                for fmt in date_formats:
                    try:
                        parsed_date = datetime.strptime(date_str, fmt)
                        result["expiry_date"] = parsed_date.strftime('%d/%m/%Y')
                        break
                    except ValueError:
                        continue
                if result["expiry_date"]:
                    break
            except:
                continue
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if len(line) > 2 and len(line) < 60:
            if not re.search(r'\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}', line):
                skip_words = ['exp', 'expiry', 'expires', 'best', 'before', 'use', 'by']
                if not any(word in line.lower() for word in skip_words) and not line.isdigit():
                    result["product_name"] = line
                    break
    return result

def get_product_status(expiry_date: str) -> str:
    today = datetime.now().date()
    try:
        expiry = datetime.strptime(expiry_date, '%d/%m/%Y').date()
    except ValueError:
        return 'safe'
    days_diff = (expiry - today).days
    if days_diff < 0:
        return 'expired'
    elif days_diff <= 7:
        return 'near'
    else:
        return 'safe'

def send_email_alert(user_email: str, products: list):
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = user_email
        msg['Subject'] = "ExpiryGuard - Product Expiry Alert"
        body = "The following products in your inventory need attention:\n\n"
        for product in products:
            try:
                expiry_date = datetime.strptime(product['expiry_date'], '%d/%m/%Y').date()
            except ValueError:
                continue
            days_diff = (expiry_date - datetime.now().date()).days
            status = "EXPIRED" if days_diff < 0 else f"Expires in {days_diff} days"
            body += f"- {product['product_name']} - {status}\n"
        body += "\nPlease check your ExpiryGuard dashboard for more details."
        msg.attach(MIMEText(body, 'plain'))
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False

def get_product_from_open_facts(barcode):
    try:
        food_url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
        food_response = requests.get(food_url, timeout=5)
        if food_response.status_code == 200:
            food_data = food_response.json()
            if food_data.get("status") == 1 and food_data.get("product"):
                product = food_data["product"]
                product_name = product.get("product_name", "")
                if product_name:
                    return {
                        "product_name": product_name,
                        "barcode": barcode,
                        "source": "openfoodfacts"
                    }
        beauty_url = f"https://world.openbeautyfacts.org/api/v0/product/{barcode}.json"
        beauty_response = requests.get(beauty_url, timeout=5)
        if beauty_response.status_code == 200:
            beauty_data = beauty_response.json()
            if beauty_data.get("status") == 1 and beauty_data.get("product"):
                product = beauty_data["product"]
                product_name = product.get("product_name", "")
                if product_name:
                    return {
                        "product_name": product_name,
                        "barcode": barcode,
                        "source": "openbeautyfacts"
                    }
    except Exception as e:
        print(f"API error: {e}")
    return None
