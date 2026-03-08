AI SecOps Hub

AI SecOps Hub is an AI-powered Security Operations dashboard designed to monitor system health, discover devices on a local network, analyze security telemetry, and generate automated cybersecurity recommendations.

The platform integrates real-time infrastructure monitoring, network reconnaissance, AI-assisted threat analysis, and persistent telemetry logging into a unified dashboard.

It demonstrates how AI can assist Security Operations Centers (SOC) by turning raw system and network data into actionable insights.

System Overview

AI SecOps Hub is composed of three main layers:

Monitoring Layer

AI Analysis Layer

Visualization Layer

                 ┌───────────────────────────┐
                 │       Frontend UI         │
                 │     Next.js Dashboard     │
                 └─────────────┬─────────────┘
                               │ REST API
                               ▼
                 ┌───────────────────────────┐
                 │      Backend Services     │
                 │        Flask API          │
                 │                           │
                 │  • System Monitoring      │
                 │  • Network Discovery      │
                 │  • AI Threat Advisor      │
                 │  • Log Aggregation        │
                 └─────────────┬─────────────┘
                               │
                               ▼
                 ┌───────────────────────────┐
                 │        Data Layer         │
                 │         Supabase          │
                 │                           │
                 │  • Network Scan Logs      │
                 │  • System Telemetry       │
                 │  • AI Analysis Records    │
                 └───────────────────────────┘
Key Capabilities
1. System Telemetry Monitoring

The platform continuously monitors host machine performance metrics.

Metrics collected:

CPU utilization

Memory usage

Disk utilization

Timestamped telemetry

The system records metrics using the Python library psutil, enabling lightweight monitoring without external agents.

Telemetry is stored for historical analysis and visualization.

Example telemetry response:

{
  "cpu_percent": 31.2,
  "memory": 54.8,
  "disk": 62.3,
  "timestamp": "2026-03-08T20:32:00Z"
}
2. Network Device Discovery

The platform performs asynchronous subnet scanning to detect active devices on the local network.

Process:

Identify the local machine IP address

Derive subnet range

Launch asynchronous ping requests to all hosts in the subnet

Detect active hosts

Log discovered devices

Scanning range example:

192.168.1.1 – 192.168.1.254

Discovered devices:

{
  "devices": [
    { "ip": "192.168.1.1", "status": "alive" },
    { "ip": "192.168.1.8", "status": "alive" }
  ]
}

All detected hosts are persisted in the database for analysis.

This mimics simplified network reconnaissance techniques used in SOC environments.

3. AI Security Advisor

AI SecOps Hub integrates Google Gemini AI to analyze system telemetry and network discovery logs.

The AI engine receives:

recent network scan results

recent system telemetry

infrastructure metrics

From this data, the AI generates cybersecurity recommendations.

Example recommendations:

1. Investigate unknown hosts discovered on the local network.
2. Monitor CPU spikes exceeding 80%.
3. Enable network segmentation for untrusted devices.
4. Monitor disk utilization to prevent service degradation.
5. Implement intrusion detection logging.

AI recommendations are stored in the telemetry database for auditing and historical analysis.

4. Historical Security Logs

The system maintains persistent logs including:

Network Logs

Stores discovered devices:

ip: 192.168.1.8
details:
{
 "status": "alive",
 "scanned_at": "2026-03-08T20:10:00Z"
}
System Telemetry

Stores system health metrics.

cpu_percent: 33
memory: 52
disk: 61
AI Security Analysis

AI-generated security insights are logged for reference and auditability.

Dashboard Interface

The Next.js dashboard provides real-time monitoring and security insights.

System Status Cards

Displays current machine metrics:

CPU

Memory

Disk

These values auto-refresh every 5 seconds.

System Trend Visualization

A dynamic chart displays historical telemetry using Recharts.

Tracked metrics:

CPU utilization

Memory usage

This allows detection of performance anomalies.

Network Scanner

Users can trigger subnet discovery using the Scan Network button.

The dashboard displays all detected active devices.

Example:

192.168.1.1 — alive
192.168.1.7 — alive
AI Advisor Panel

Users can request AI-driven analysis.

The system retrieves recent logs and sends them to Gemini for analysis.

Results are displayed as security recommendations.

Recent Activity Logs

Displays:

latest network scans

latest system telemetry

AI analysis records

This acts as a simplified security event timeline.

Technology Stack
Backend

Python

Flask

psutil

asyncio

Supabase Python Client

Google Gemini AI

Frontend

Next.js

React

TypeScript

Recharts

Tailwind CSS

Lucide Icons

Data Layer

Supabase (PostgreSQL)

Environment Configuration

Create a .env file in the backend directory.

SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
Running the Application
Backend

Install dependencies:

pip install flask flask-cors python-dotenv psutil supabase google-generativeai

Run the server:

python app.py

API server runs at:

http://localhost:5000
Frontend

Install dependencies:

npm install

Start the development server:

npm run dev

Dashboard runs at:

http://localhost:3000
Project Structure
ai-secops-hub
│
├── backend
│   ├── app.py
│   ├── monitoring
│   ├── scanning
│   └── ai_advisor
│
├── frontend
│   ├── app
│   ├── components
│   └── dashboard
│
├── database
│   └── schema.sql
│
└── README.md
Security Use Cases

This project demonstrates concepts used in:

Security Operations Centers (SOC)

DevSecOps monitoring

Infrastructure telemetry analysis

Network discovery

AI-assisted threat analysis

Potential extensions include:

anomaly detection

automated threat response

intrusion detection

alerting systems

SIEM integration

Future Enhancements

Possible improvements:

device fingerprinting

port scanning

anomaly detection using ML

automated threat scoring

real-time alerting

network topology mapping

distributed agent monitoring

SIEM integrations
