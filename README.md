# ExpiryGuard

ExpiryGuard is an expiry date management system. It allows users to add, track, and get notified about the expiry dates of products, documents, or subscriptions using manual entry, barcode scanning, OCR, or voice input. It features a secure login system, visual analytics, and automatic notifications.

---

## Features


- JWT-based authentication (signup/login).
- Product dashboard showing expiry status: Safe, Near Expiry, Expired.
- OCR image upload for automatic extraction of expiry date.
- Barcode Scanner for Product Name Extraction.
- Voice Input for Product and Expire date Entry.
- Manual product entry support.
- Visual statistics with Chart.js (Doughnut charts).
- Automated email notifications for upcoming expiries.
- Voice input support for product entry.
- Responsive frontend UI using TailwindCSS.


---

## Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- Chart.js 
- Barcode: `quagga`, `react-qr-barcode-scanner`

### Backend
- Python
- FastAPI
- MongoDB 
- Langchain `Gemini LLM`
- Email Scheduler
- OCR: `OCR.space` 

---
## OCR and Voice Input

- Image Upload: Extracts the expiry date from the printed label on the product.- Voice Input: Use microphone to enter product information through speech recognition (eg."Milk will Expire Tomorrow")


## Email Notifications

- Automatically notifies users about upcoming or expired products
- Notifications sent via configured SMTP email
- Notification time is configurable via the dashboard
- Enable or disable alerts as needed

---
## 🗂️ Project Structure
```
ExpiryGuard/
├── Frontend/
│ ├── src/
│ │ ├── App.jsx
│ │ ├── components/
│ │ │ ├── AddProduct.jsx
│ │ │ ├── BarcodeScanner.jsx
│ │ │ ├── Dashboard.jsx
│ │ │ ├── Layout.jsx
│ │ │ ├── ProtectedRoute.jsx
│ │ │ ├── Statistics.jsx
│ │ │ └── auth/
│ │ │ ├── AuthPage.jsx
│ │ │ ├── LoginForm.jsx
│ │ │ └── SignupForm.jsx
│ │ ├── contexts/AuthContext.jsx
│ │ ├── services/
│ │ │ ├── authService.js
│ │ │ ├── notificationService.js
│ │ │ └── productService.js
│ │ └── utils/
│ │ ├── api.js
│ │ └── auth.js
├── backend/
│ ├── app.py
│ ├── config.py
│ ├── db.py
│ ├── email_scheduler.py
│ ├── ocr.py
│ ├── requirements.txt
│ ├── routes.py
│ ├── schemas.py
│ ├── security.py
│ └── utils.py
```

## Environment Variables

- MONGODB_URL=your-mongodb-url
- JWT_SECRET=your-jwt-secret-key
- SMTP_SERVER=your-smtp-server
- SMTP_PORT=your-smtp-port
- EMAIL_USER=your-email-address
- EMAIL_PASSWORD=your-email-app-password
- OCR_SPACE_API_KEY=your-ocr-space-api-key
- GEMINI_API_KEY=your-google-gemini-api-key
---
## Local Development

### 1. Clone the Repository

```bash
git clone https://github.com/Lokesh11868/Expiry-Guard.git
cd Expiry-Guard
```
### 2. Backend Setup

```bash
cd backend
python -m venv venv              
venv\Scripts\activate          
pip install -r requirements.txt
uvicorn app:app --reload
```
### 3. Set Environment Variables
```bash
- MONGODB_URL=your-mongodb-url
- JWT_SECRET=your-jwt-secret-key
- SMTP_SERVER=your-smtp-server
- SMTP_PORT=your-smtp-port
- EMAIL_USER=your-email-address
- EMAIL_PASSWORD=your-email-app-password
- OCR_SPACE_API_KEY=your-ocr-space-api-key
- GEMINI_API_KEY=your-google-gemini-api-key
```
### 4. Frontend Setup
```bash
cd Frontend
npm install
npm run dev
```
 You can now access the frontend at [http://localhost:5173](http://localhost:5173) and it will communicate with the FastAPI backend at [http://localhost:8000](http://localhost:8000).

---
**Made with ❤️ by [Lokesh](https://github.com/Lokesh11868)**



