from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
security = HTTPBearer()
router = APIRouter()

from email_scheduler import schedule_daily_alerts
import threading
current_scheduler = {'thread': None, 'hour': 20, 'minute': 11}

@router.post("/scheduler/time")
async def set_scheduler_time(data: dict, current_user: dict = Depends(get_current_user)):
    hour = int(data.get('hour', 6))
    minute = int(data.get('minute', 0))
    # Update user's notification_time in users_collection
    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"notification_time": {"hour": hour, "minute": minute}}}
    )
    return {"message": f"Notification time updated to {hour:02d}:{minute:02d}"}

@router.post("/notifications/on")
async def enable_notifications():
    import os
    from email_scheduler import schedule_daily_alerts_for_all_users
    flag_path = os.path.abspath("notifications_on.flag")
    with open(flag_path, "w") as f:
        f.write("on")
    schedule_daily_alerts_for_all_users()
    return {"message": "Notifications enabled and scheduler started"}


@router.post("/notifications/off")
async def disable_notifications():
    import os
    flag_path = os.path.abspath("notifications_on.flag")
    try:
        os.remove(flag_path)
        pass
    except FileNotFoundError:
        pass
    return {"message": "Notifications disabled"}

from datetime import datetime, timedelta
from PIL import Image
import io, base64, threading, dateparser, json, re

from bson import ObjectId
from schemas import UserCreate, ProductCreate
from db import users_collection, products_collection
from security import hash_password, verify_password, create_access_token
from utils import get_product_status, send_email_alert, get_product_from_open_facts
from ocr import extract_text_from_image, extract_expiry_date_from_text
from config import GEMINI_API_KEY
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from config import JWT_SECRET, JWT_ALGORITHM
    from jose import jwt, JWTError
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = users_collection.find_one({"_id": ObjectId(payload.get("sub"))})
        if not user: raise HTTPException(status_code=401, detail="Invalid token")
        return user
    except JWTError: raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/signup")
async def signup(user: UserCreate):
    if users_collection.find_one({"username": user.username}): raise HTTPException(status_code=400, detail="Username already exists")
    if users_collection.find_one({"email": user.email}): raise HTTPException(status_code=400, detail="Email already exists")
    # Set default notification_time if not provided
    notification_time = user.notification_time if user.notification_time else {"hour": 6, "minute": 0}
    doc = {"username": user.username, "email": user.email, "password": hash_password(user.password), "created_at": datetime.utcnow(), "notification_time": notification_time}
    result = users_collection.insert_one(doc)
    return {"access_token": create_access_token(data={"sub": str(result.inserted_id)}), "token_type": "bearer", "user": {"id": str(result.inserted_id), "username": user.username, "email": user.email, "notification_time": notification_time}}


from pymongo.errors import ExecutionTimeout

@router.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    try:
        user = users_collection.find_one({"username": username}, max_time_ms=2000)  # 2 seconds timeout
    except ExecutionTimeout:
        raise HTTPException(status_code=504, detail="Database timeout. Please try again later.")
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "access_token": create_access_token(data={"sub": str(user["_id"])}),
        "token_type": "bearer",
        "user": {"id": str(user["_id"]), "username": user["username"], "email": user["email"]}
    }


@router.get("/users/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {"id": str(current_user["_id"]), "username": current_user["username"], "email": current_user["email"]}


@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    try:
        image_bytes = await file.read()
        text = extract_text_from_image(image_bytes)
        expiry_date = extract_expiry_date_from_text(text)
        import base64
        image_url = f"data:image/png;base64,{base64.b64encode(image_bytes).decode()}"
    except Exception as e:
        print(f"OCR error: {e}"); return {"image_url": None, "expiry_date": None, "extracted_text": ""}
    return {"image_url": image_url, "expiry_date": expiry_date, "extracted_text": text}


@router.post("/add-item")
async def add_item(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    doc = {"user_id": str(current_user["_id"]), "product_name": product.product_name, "expiry_date": product.expiry_date, "image_url": product.image_url, "barcode": product.barcode, "status": get_product_status(product.expiry_date), "created_at": datetime.utcnow()}
    doc["_id"] = str(products_collection.insert_one(doc).inserted_id)
    return doc


@router.get("/get-items")
async def get_items(current_user: dict = Depends(get_current_user)):
    products = list(products_collection.find({"user_id": str(current_user["_id"])}))
    for p in products: p["_id"] = str(p["_id"]); p["status"] = get_product_status(p["expiry_date"])
    products.sort(key=lambda p: datetime.strptime(p["expiry_date"], "%d/%m/%Y") if "/" in p["expiry_date"] else datetime.max)
    return products


@router.delete("/delete-item/{item_id}")
async def delete_item(item_id: str, current_user: dict = Depends(get_current_user)):
    result = products_collection.delete_one({"_id": ObjectId(item_id), "user_id": str(current_user["_id"])})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}


@router.get("/statistics")
async def get_statistics(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    products = list(products_collection.find({"user_id": user_id}))
    today, week = datetime.now().date(), datetime.now().date() + timedelta(days=7)
    total, expiring, expired = len(products), 0, 0
    status_breakdown = {"safe": 0, "near": 0, "expired": 0}
    for p in products:
        try: expiry = datetime.strptime(p["expiry_date"], '%d/%m/%Y').date()
        except: continue
        status = get_product_status(p["expiry_date"]); status_breakdown[status] += 1
        if expiry < today: expired += 1
        elif expiry <= week: expiring += 1
    return {"total_items": total, "expiring_this_week": expiring, "expired_items": expired, "status_breakdown": status_breakdown}


@router.post("/send-expiry-alerts")
async def send_expiry_alerts(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    products = list(products_collection.find({"user_id": user_id}))
    today = datetime.now().date()
    alert_products = [p for p in products if (lambda d: (datetime.strptime(d, '%d/%m/%Y').date() - today).days <= 3 if '/' in d else False)(p["expiry_date"])]
    if alert_products:
        threading.Thread(target=lambda: send_email_alert(current_user["email"], alert_products)).start()
        return {"message": f"Expiry alerts sent for {len(alert_products)} products", "products_count": len(alert_products)}
    return {"message": "No products require alerts at this time"}


@router.get("/product-by-barcode/{barcode}")
async def get_product_by_barcode(barcode: str, current_user: dict = Depends(get_current_user)):
    p = products_collection.find_one({"user_id": str(current_user["_id"]), "barcode": barcode})
    if p: return {"product_name": p["product_name"], "barcode": barcode, "source": "user_inventory"}
    ofp = get_product_from_open_facts(barcode)
    if ofp: return ofp
    raise HTTPException(status_code=404, detail="Product not found")


@router.post("/parse-voice")
async def parse_voice(data: dict = Body(...)):
    transcript = data.get('transcript', '')
    try:
        if GEMINI_API_KEY:
            llm = ChatGoogleGenerativeAI(model="gemini-2.0-pro", google_api_key=GEMINI_API_KEY, temperature=0)
            prompt = PromptTemplate(input_variables=["sentence"], template=("Extract the product name and expiry date from this sentence. Respond as JSON with keys 'product_name' and 'expiry_date'. The expiry date should be in DD/MM/YYYY format. Sentence: '{sentence}'"))
            chain = prompt | llm
            result = chain.invoke({"sentence": transcript})
            content = result.content if hasattr(result, 'content') else result
            try:
                extracted = json.loads(content)
                expiry_date = extracted.get('expiry_date')
                if expiry_date:
                    parsed = dateparser.parse(expiry_date, settings={"PREFER_DAY_OF_MONTH": "last"})
                    extracted['expiry_date'] = parsed.strftime('%d/%m/%Y') if parsed else None
                return extracted
            except Exception as parse_error:
                print(f"Failed to parse LLM output as JSON: {content}")
                return {"error": "Failed to parse LLM output as JSON", "llm_content": content}
        else:
            return {"error": "Gemini API key not set."}
    except Exception as e:
        print(f"LangChain Gemini extraction error: {e}")
        expiry_date, product_name = None, None
        date_match = re.search(r'(tomorrow|day after tomorrow|\d{1,2}(st|nd|rd|th)?\s+\w+\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', transcript, re.IGNORECASE)
        if date_match: expiry_date = date_match.group(0)
        if expiry_date:
            prod_match = re.search(r'([a-zA-Z0-9 ]+?)\s+(is|are|will be|going to be|to be|expiring|expires|will expire|is going to expire)', transcript, re.IGNORECASE)
            if prod_match: product_name = prod_match.group(1).strip()
        else:
            prod_match = re.search(r'add\s+(\w+)', transcript, re.IGNORECASE)
            if prod_match: product_name = prod_match.group(1)
        if expiry_date:
            parsed = dateparser.parse(expiry_date, settings={"PREFER_DAY_OF_MONTH": "last"})
            expiry_date = parsed.strftime('%d/%m/%Y') if parsed else None
        if not product_name and not expiry_date:
            return {"error": "Could not extract product or expiry from transcript", "transcript": transcript}
        return {"product_name": product_name, "expiry_date": expiry_date}