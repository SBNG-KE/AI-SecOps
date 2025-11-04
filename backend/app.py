import os
import platform
import json
import asyncio
from datetime import datetime, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

import psutil, socket, subprocess

# Supabase client
from supabase.client import create_client as create_supabase_client

# Gemini
import google.generativeai as genai

# ---------------------------
# Environment Setup
# ---------------------------
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not (SUPABASE_URL and SUPABASE_KEY and GEMINI_API_KEY):
    raise RuntimeError("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GEMINI_API_KEY in env")

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

# Create Supabase client
sb = create_supabase_client(SUPABASE_URL, SUPABASE_KEY)

# --- 🔍 Test Supabase connectivity ---
print("🔍 Testing Supabase connectivity...")
try:
    sb.table("system_reports").select("*").limit(1).execute()
    print("✅ Supabase connection OK")
except Exception as e:
    print("❌ Supabase connection failed:", e)

# -------------------------------------------------------
app = Flask(__name__)
CORS(app)

# ---------------------------
# Helpers
# ---------------------------
def save_scan_to_supabase(ip, details):
    payload = {"ip": ip, "details": details}
    sb.table("scans").insert(payload).execute()

def save_system_report(cpu, memory, disk, raw):
    payload = {
        "cpu_percent": float(cpu),
        "memory": float(memory),
        "disk": float(disk),
        "raw": raw
    }
    sb.table("system_reports").insert(payload).execute()

def fetch_recent_records(limit=10):
    scans = sb.table("scans").select("*").order("created_at", desc=True).limit(limit).execute()
    sys = sb.table("system_reports").select("*").order("created_at", desc=True).limit(limit).execute()
    return scans.data if hasattr(scans, 'data') else [], sys.data if hasattr(sys, 'data') else []

# ---------------------------
# System endpoint
# ---------------------------
@app.route("/api/system", methods=["GET"])
def system_status():
    cpu = psutil.cpu_percent(interval=0.5)
    memory = psutil.virtual_memory().percent
    disk = psutil.disk_usage("/").percent
    timestamp = datetime.now(timezone.utc).isoformat()
    raw = {"timestamp": timestamp}

    try:
        save_system_report(cpu, memory, disk, raw)
    except Exception as e:
        app.logger.error("Supabase save_system_report error: %s", e)

    return jsonify({
        "cpu_percent": cpu,
        "memory": memory,
        "disk": disk,
        "timestamp": timestamp
    })

# ---------------------------
# Async ping helper
# ---------------------------
async def ping_ip(ip, param):
    """Returns True if IP responds to ping"""
    try:
        proc = await asyncio.create_subprocess_exec(
            "ping", param, "1", "-w", "500", ip,  # 500ms timeout
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL
        )
        await proc.communicate()
        return proc.returncode == 0
    except Exception:
        return False

# ---------------------------
# Network scan endpoint
# ---------------------------
@app.route("/api/scan", methods=["GET"])
def scan_network():
    hostname = socket.gethostname()
    try:
        local_ip = socket.gethostbyname(hostname)
    except Exception:
        local_ip = "127.0.0.1"

    base = ".".join(local_ip.split(".")[:3]) + "."
    param = "-n" if platform.system().lower() == "windows" else "-c"

    results = {"local_ip": local_ip, "devices": []}
    print(f"🌐 Scanning {base}1-254 ...")

    async def run_scan():
        tasks = [ping_ip(f"{base}{i}", param) for i in range(1, 255)]
        responses = await asyncio.gather(*tasks)
        for i, alive in enumerate(responses, start=1):
            if alive:
                ip = f"{base}{i}"
                results["devices"].append({"ip": ip, "status": "alive"})
                print(f"✅ {ip} active")

    try:
        asyncio.run(run_scan())
    except RuntimeError:
        # fallback if already in event loop (e.g., when deployed with async server)
        loop = asyncio.get_event_loop()
        loop.run_until_complete(run_scan())
    except Exception as e:
        app.logger.error("Ping scan failed: %s", e)
        return jsonify({"error": str(e)}), 500

    # ✅ Save only alive devices
    try:
        for d in results["devices"]:
            save_scan_to_supabase(
                d["ip"],
                {"status": d["status"], "scanned_at": datetime.now(timezone.utc).isoformat()},
            )
    except Exception as e:
        app.logger.error("Supabase save_scan_to_supabase error: %s", e)

    results["timestamp"] = datetime.now(timezone.utc).isoformat()
    print(f"🏁 Scan complete: {len(results['devices'])} alive.")
    return jsonify(results)

# ---------------------------
# AI Advisor
# ---------------------------
@app.route("/api/ai-advisor", methods=["POST"])
def ai_advisor():
    try:
        scans, sys_reports = fetch_recent_records(limit=10)
    except Exception as e:
        app.logger.error("❌ Failed to fetch Supabase records: %s", e, exc_info=True)
        return jsonify({"error": "failed to fetch records", "detail": str(e)}), 500

    prompt_parts = [
        "You are a cybersecurity assistant. Analyze these results and give up to 5 actionable recommendations.",
        "\n=== Recent Network Scans ==="
    ]
    for s in scans:
        prompt_parts.append(f"- ip: {s.get('ip')} details: {json.dumps(s.get('details') or {})}")
    prompt_parts.append("\n=== Recent System Reports ===")
    for r in sys_reports:
        prompt_parts.append(f"- cpu: {r.get('cpu_percent')} memory: {r.get('memory')} disk: {r.get('disk')}")

    prompt = "\n".join(prompt_parts)

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        text = response.text or "(no response)"
    except Exception as e:
        app.logger.error("❌ Gemini generation failed: %s", e, exc_info=True)
        return jsonify({"error": "gemini generation failed", "detail": str(e)}), 500

    try:
        sb.table("scans").insert({
            "ip": "AI-ADVISOR",
            "details": {"advice": text, "created_at": datetime.now(timezone.utc).isoformat()}
        }).execute()
    except Exception as e:
        app.logger.warning("⚠️ Failed to save Gemini advice to Supabase: %s", e, exc_info=True)

    return jsonify({"advice_text": text})

# ---------------------------
# Recent Logs Endpoint
# ---------------------------
@app.route("/api/recent-logs", methods=["GET"])
def recent_logs():
    try:
        scans = sb.table("scans").select("*").order("created_at", desc=True).limit(20).execute()
        sys_reports = sb.table("system_reports").select("*").order("created_at", desc=True).limit(20).execute()
        return jsonify({
            "scans": scans.data if hasattr(scans, "data") else [],
            "system_reports": sys_reports.data if hasattr(sys_reports, "data") else []
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------
# Debug info
# ---------------------------
print("🧠 Registered routes:")
for rule in app.url_map.iter_rules():
    print(f"→ {rule}")

# ---------------------------
# Run the app
# ---------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
