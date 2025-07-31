
import threading
from datetime import datetime, timedelta
from time import sleep
from db import users_collection, products_collection
from utils import send_email_alert
import os

def send_all_expiry_alerts(user):
    user_id = str(user['_id'])
    email = user.get('email')
    if not email:
        return
    products = list(products_collection.find({"user_id": user_id}))
    today = datetime.now().date()
    alert_products = [p for p in products if (lambda d: (datetime.strptime(d, '%d/%m/%Y').date() - today).days <= 3 if "/" in d else False)(p["expiry_date"])]
    if alert_products:
        send_email_alert(email, alert_products)

def schedule_daily_alerts_for_all_users():
    users = list(users_collection.find({}))
    for user in users:
        notif = user.get("notification_time")
        hour = notif["hour"] if notif and "hour" in notif else 6
        minute = notif["minute"] if notif and "minute" in notif else 0
        email = user.get('email')
        if not email:
            continue
        def user_scheduler(user_id, email, hour, minute):
            while True:
                now = datetime.now()
                next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
                if next_run <= now:
                    next_run = next_run + timedelta(days=1)
                sleep_time = (next_run - now).total_seconds()
                print(f"[Scheduler] Sleeping for {sleep_time/60:.2f} minutes until next run at {next_run} for user {email}")
                sleep(max(0, sleep_time))
                if notifications_enabled():
                    print(f"[Scheduler] Sending daily expiry alerts for {email}...")
                    products = list(products_collection.find({"user_id": user_id}))
                    today = datetime.now().date()
                    alert_products = [p for p in products if (lambda d: (datetime.strptime(d, '%d/%m/%Y').date() - today).days <= 3 if "/" in d else False)(p["expiry_date"])]
                    if alert_products:
                        send_email_alert(email, alert_products)
                else:
                    print(f"[Scheduler] Notifications are OFF for {email}. Skipping email alerts.")
        threading.Thread(target=user_scheduler, args=(str(user['_id']), email, hour, minute), daemon=True).start()