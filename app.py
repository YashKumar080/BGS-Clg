import os
from dotenv import load_dotenv

# ─── Load .env FIRST before anything else ────────────────────────────────────
load_dotenv()

import sqlite3
import base64
import smtplib
import time
import re
from datetime import datetime, date
from flask import Flask, request, jsonify, render_template

import easyocr
import numpy as np
from PIL import Image
from io import BytesIO
from rapidfuzz import process, fuzz

# Initialize EasyOCR Reader (loads model to memory)
reader = easyocr.Reader(['en'], gpu=False)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

# ─── Database Setup ───────────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), "arogya.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Medicines table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS medicines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            time TEXT NOT NULL,
            days TEXT DEFAULT 'Daily',
            status TEXT DEFAULT 'Pending',
            last_taken_date TEXT DEFAULT ''
        )
    """)

    # Subscription / user table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS subscription (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plan TEXT DEFAULT 'Free',
            scan_count INTEGER DEFAULT 0,
            last_reset_date TEXT DEFAULT ''
        )
    """)

    # SOS contacts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sos_contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL
        )
    """)

    # Ensure a default subscription row exists
    cursor.execute("SELECT COUNT(*) FROM subscription")
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            "INSERT INTO subscription (plan, scan_count, last_reset_date) VALUES (?, ?, ?)",
            ("Free", 0, str(date.today()))
        )

    conn.commit()
    conn.close()

init_db()


# ─── Helper: check & reset daily scan count ──────────────────────────────────
def get_subscription():
    conn = get_db()
    sub = conn.execute("SELECT * FROM subscription WHERE id=1").fetchone()
    conn.close()
    return dict(sub) if sub else {}

def reset_scan_if_new_day():
    sub = get_subscription()
    today = str(date.today())
    if sub.get("last_reset_date") != today:
        conn = get_db()
        conn.execute(
            "UPDATE subscription SET scan_count=0, last_reset_date=? WHERE id=1",
            (today,)
        )
        conn.commit()
        conn.close()


# ─── Helper: auto-mark missed medicines ─────────────────────────────────────
def update_statuses():
    now = datetime.now()
    today = str(date.today())
    conn = get_db()
    medicines = conn.execute("SELECT * FROM medicines").fetchall()
    missed_meds = []
    for med in medicines:
        med = dict(med)
        try:
            med_time = datetime.strptime(f"{today} {med['time']}", "%Y-%m-%d %H:%M")
        except Exception:
            continue

        if med["last_taken_date"] == today:
            conn.execute("UPDATE medicines SET status='Taken' WHERE id=?", (med["id"],))
        elif now > med_time and med["last_taken_date"] != today:
            conn.execute("UPDATE medicines SET status='Missed' WHERE id=?", (med["id"],))
            if med["status"] != "Missed":
                missed_meds.append(med)
        else:
            if med["last_taken_date"] != today:
                conn.execute("UPDATE medicines SET status='Pending' WHERE id=?", (med["id"],))

    conn.commit()
    conn.close()
    return missed_meds


# ─── SOS Alert ────────────────────────────────────────────────────────────────
def send_sos_alert(medicine_name, med_time):
    conn = get_db()
    contacts = conn.execute("SELECT * FROM sos_contacts").fetchall()
    conn.close()

    msg_text = (
        f"🚨 Alert: Your parent has missed their medicine "
        f"'{medicine_name}' scheduled at {med_time}."
    )
    print(f"[SOS LOG] {msg_text}")

    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")

    if smtp_user and smtp_pass and contacts:
        try:
            server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
            server.login(smtp_user, smtp_pass)
            for contact in contacts:
                contact = dict(contact)
                subject = "🚨 Arogya Setu AI – Missed Medicine Alert"
                body = f"Subject: {subject}\n\n{msg_text}"
                server.sendmail(smtp_user, contact["email"], body)
            server.quit()
        except Exception as e:
            print(f"[SOS EMAIL ERROR] {e}")


# ══════════════════════════════════════════════════════
#  FRONTEND ROUTES
# ══════════════════════════════════════════════════════

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/scanner")
def scanner():
    return render_template("scanner.html")

@app.route("/reminders")
def reminders():
    return render_template("reminders.html")

@app.route("/subscription")
def subscription():
    return render_template("subscription.html")


# ══════════════════════════════════════════════════════
#  API ROUTES – MEDICINES
# ══════════════════════════════════════════════════════

@app.route("/api/medicines", methods=["GET"])
def get_medicines():
    update_statuses()
    conn = get_db()
    medicines = conn.execute("SELECT * FROM medicines ORDER BY time").fetchall()
    conn.close()
    return jsonify([dict(m) for m in medicines])


@app.route("/api/medicines", methods=["POST"])
def add_medicine():
    data = request.get_json()
    name = data.get("name", "").strip()
    time = data.get("time", "").strip()
    days = data.get("days", "Daily").strip()

    if not name or not time:
        return jsonify({"error": "Name and time are required"}), 400

    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO medicines (name, time, days, status, last_taken_date) VALUES (?,?,?,?,?)",
        (name, time, days, "Pending", "")
    )
    conn.commit()
    med_id = cursor.lastrowid
    conn.close()
    return jsonify({"id": med_id, "message": "Medicine added successfully"}), 201


@app.route("/api/medicines/<int:med_id>", methods=["PUT"])
def update_medicine(med_id):
    data = request.get_json()
    name = data.get("name", "").strip()
    time = data.get("time", "").strip()
    days = data.get("days", "Daily").strip()

    if not name or not time:
        return jsonify({"error": "Name and time are required"}), 400

    conn = get_db()
    conn.execute(
        "UPDATE medicines SET name=?, time=?, days=? WHERE id=?",
        (name, time, days, med_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Medicine updated"})


@app.route("/api/medicines/<int:med_id>", methods=["DELETE"])
def delete_medicine(med_id):
    conn = get_db()
    conn.execute("DELETE FROM medicines WHERE id=?", (med_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Medicine deleted"})


@app.route("/api/medicines/<int:med_id>/taken", methods=["POST"])
def mark_taken(med_id):
    today = str(date.today())
    conn = get_db()
    conn.execute(
        "UPDATE medicines SET status='Taken', last_taken_date=? WHERE id=?",
        (today, med_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Marked as taken"})


@app.route("/api/check-missed", methods=["GET"])
def check_missed():
    missed = update_statuses()
    for med in missed:
        send_sos_alert(med["name"], med["time"])
    return jsonify({"missed": missed})


# ══════════════════════════════════════════════════════
#  API ROUTES – AI SCANNER
# ══════════════════════════════════════════════════════

@app.route("/api/scan", methods=["POST"])
def scan_medicine():
    reset_scan_if_new_day()
    sub = get_subscription()

    data = request.get_json()
    if not data or "image" not in data:
        return jsonify({"error": "No image provided"}), 400

    image_data = data["image"]
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(image_data)
        img = Image.open(BytesIO(image_bytes))
    except Exception:
        return jsonify({"error": "Invalid image data"}), 400

    # ── 1. OCR Extraction (EasyOCR) ─────────────────────────
    try:
        img_np = np.array(img)
        # EasyOCR expects BGR format normally, but RGB also works. Convert to RGB explicitly.
        if len(img_np.shape) == 3 and img_np.shape[2] == 4:
            img_np = np.array(img.convert("RGB"))
            
        results = reader.readtext(img_np)
        extracted_text = " ".join([text for (_, text, _) in results])
    except Exception as e:
        return jsonify({"error": f"OCR failed: {str(e)}"}), 500

    # ── 2. Text Cleaning ──────────────────────────────────────────
    cleaned_text = extracted_text.lower()
    # Remove digits and special characters
    cleaned_text = re.sub(r'[^a-z\s]', ' ', cleaned_text)
    
    words_to_remove = ["tablets", "tablet", "ip", "mg"]
    for word in words_to_remove:
        cleaned_text = re.sub(rf'\b{word}\b', ' ', cleaned_text)
    
    cleaned_text = ' '.join(cleaned_text.split())
    
    if not cleaned_text.strip():
        return jsonify({"error": "No readable text found in the image. Please provide a clearer image."}), 400

    # ── 3. Database Fetch & Fuzzy Matching ────────────────────────
    conn = get_db()
    meds = conn.execute("SELECT * FROM medicines").fetchall()
    conn.close()

    medicine_list = [dict(m) for m in meds]
    
    # We will score each DB medicine name against the cleaned OCR text
    best_match_name = None
    best_score = 0
    matched_med_obj = None

    for med in medicine_list:
        db_name = med["name"].lower()
        # Using token_set_ratio as it handles substring matches well
        score = fuzz.token_set_ratio(db_name, cleaned_text)
        if score > best_score:
            best_score = score
            best_match_name = med["name"]
            matched_med_obj = med

    if best_score > 80:
        confidence = f"Confirmed Match ({int(best_score)}%)"
        conf_level = "High"
    elif best_score >= 60:
        confidence = f"Closest Match ({int(best_score)}%)"
        conf_level = "Medium"
    else:
        return jsonify({"error": "Medicine not recognized clearly, please try again."}), 400

    # ── 4. Medicine Use Lookup (Option B) ─────────────────────────
    MED_USE_MAP = {
        "paracetamol": "Used for fever and pain relief",
        "crocin": "Pain relief",
        "aspirin": "Reduces pain, fever, or inflammation",
        "amoxicillin": "Antibiotic used to treat bacterial infections",
        "metformin": "Used to treat type 2 diabetes",
        "amlodipine": "Used to treat high blood pressure",
        "omeprazole": "Reduces stomach acid",
        "cetirizine": "Antihistamine for allergies",
        "ibuprofen": "Reduces fever and treats pain or inflammation"
    }
    
    lookup_name = best_match_name.lower()
    medicine_use = "No additional information available"
    for key, use_text in MED_USE_MAP.items():
        if key in lookup_name:
            medicine_use = use_text
            break


    # Increment scan count
    conn = get_db()
    conn.execute("UPDATE subscription SET scan_count=scan_count+1 WHERE id=1")
    conn.commit()
    conn.close()

    # ── 5. Reminder Status ────────────────────────────────────────
    update_statuses()
    today = str(date.today())
    reminder_status = f"ℹ️ This medicine is not in your reminder schedule."

    if matched_med_obj:
        med = matched_med_obj
        if med["last_taken_date"] == today:
            reminder_status = f"✅ You have already taken {med['name']} today."
        else:
            now = datetime.now()
            try:
                med_time = datetime.strptime(f"{today} {med['time']}", "%Y-%m-%d %H:%M")
                if now > med_time:
                    reminder_status = f"⚠️ You have MISSED {med['name']} scheduled at {med['time']}."
                    send_sos_alert(med["name"], med["time"])
                else:
                    reminder_status = f"⏰ You should take {med['name']} at {med['time']}."
            except Exception:
                reminder_status = f"📋 {med['name']} is in your schedule at {med['time']}."

    # Send response back to UX
    return jsonify({
        "medicine_name": best_match_name,
        "confidence_score": confidence,
        "confidence_level": conf_level,
        "use": medicine_use,
        "reminder_status": reminder_status,
        "plan": sub.get("plan", "Free"),
        "scan_count": sub.get("scan_count", 0) + 1
    })


# ══════════════════════════════════════════════════════
#  API ROUTES – SUBSCRIPTION
# ══════════════════════════════════════════════════════

@app.route("/api/subscription", methods=["GET"])
def get_sub():
    reset_scan_if_new_day()
    sub = get_subscription()
    return jsonify(sub)


@app.route("/api/subscription", methods=["POST"])
def update_sub():
    data = request.get_json()
    plan = data.get("plan", "Free")
    allowed = ["Free", "Pro", "Family"]
    if plan not in allowed:
        return jsonify({"error": "Invalid plan"}), 400

    conn = get_db()
    conn.execute("UPDATE subscription SET plan=? WHERE id=1", (plan,))
    conn.commit()
    conn.close()
    return jsonify({"message": f"Subscription updated to {plan} (Demo Mode)", "plan": plan})


# ══════════════════════════════════════════════════════
#  API ROUTES – SOS CONTACTS
# ══════════════════════════════════════════════════════

@app.route("/api/sos-contacts", methods=["GET"])
def get_contacts():
    conn = get_db()
    contacts = conn.execute("SELECT * FROM sos_contacts").fetchall()
    conn.close()
    return jsonify([dict(c) for c in contacts])


@app.route("/api/sos-contacts", methods=["POST"])
def add_contact():
    data = request.get_json()
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    if not name or not email:
        return jsonify({"error": "Name and email required"}), 400
    conn = get_db()
    conn.execute("INSERT INTO sos_contacts (name, email) VALUES (?,?)", (name, email))
    conn.commit()
    conn.close()
    return jsonify({"message": "Contact added"}), 201


@app.route("/api/sos-contacts/<int:cid>", methods=["DELETE"])
def delete_contact(cid):
    conn = get_db()
    conn.execute("DELETE FROM sos_contacts WHERE id=?", (cid,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Contact deleted"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
