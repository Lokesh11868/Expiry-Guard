from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class ProductCreate(BaseModel):
    product_name: str
    expiry_date: str
    image_url: Optional[str] = None
    barcode: Optional[str] = None
