
import threading
from datetime import datetime, timedelta
from time import sleep
from db import users_collection, products_collection
from utils import send_email_alert
import os
def send_all_expiry_alerts():
    users = list(users_collection.find({}))
    for user in users:
        user_id = str(user['_id'])
        email = user.get('email')
        if not email:
            continue
        products = list(products_collection.find({"user_id": user_id}))
        today = datetime.now().date()
        alert_products = [p for p in products if (lambda d: (datetime.strptime(d, '%d/%m/%Y').date() - today).days <= 3 if '/' in d else False)(p["expiry_date"])]
        if alert_products:
            send_email_alert(email, alert_products)

def notifications_enabled():
    flag_path = os.path.abspath('notifications_on.flag')
    return os.path.exists(flag_path)

def schedule_daily_alerts(hour, minute):
    def run():
        while True:
            now = datetime.now()
            next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if next_run <= now:
                next_run = next_run + timedelta(days=1)
            sleep_time = (next_run - now).total_seconds()
            print(f"[Scheduler] Sleeping for {sleep_time/60:.2f} minutes until next run at {next_run}")
            sleep(max(0, sleep_time))
            if notifications_enabled():
                print("[Scheduler] Sending daily expiry alerts...")
                send_all_expiry_alerts()
            else:
                print("[Scheduler] Notifications are OFF. Skipping email alerts.")
    threading.Thread(target=run, daemon=True).start()