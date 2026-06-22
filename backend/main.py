from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LogRequest(BaseModel):
    log_text: str

THREAT_RULES = [
    {
        "threat": "Malware Detected",
        "keywords": ["malware", "virus", "trojan", "ransomware", "encrypted files"],
        "severity": "Critical",
        "confidence": 92,
        "action": "Isolate the affected device and run a full malware scan."
    },
    {
        "threat": "Brute Force Attempt",
        "keywords": ["failed login", "repeated failed", "login attempts", "brute force"],
        "severity": "High",
        "confidence": 88,
        "action": "Temporarily block the source IP and enforce password reset."
    },
    {
        "threat": "Suspicious IP Access",
        "keywords": ["unknown ip", "external ip", "suspicious ip", "185.", "203."],
        "severity": "High",
        "confidence": 84,
        "action": "Review network logs and block the suspicious IP if confirmed."
    },
    {
        "threat": "Patch Vulnerability",
        "keywords": ["patch missing", "outdated", "vulnerability", "cve", "security patch"],
        "severity": "Medium",
        "confidence": 79,
        "action": "Schedule a staged patch rollout after compatibility review."
    },
    {
        "threat": "Device Health Issue",
        "keywords": ["cpu spike", "memory spike", "disk full", "overheating"],
        "severity": "Medium",
        "confidence": 75,
        "action": "Monitor device performance and check running processes."
    },
    {
        "threat": "Data Exfiltration Pattern",
        "keywords": ["large upload", "data transfer", "external domain", "exfiltration"],
        "severity": "Critical",
        "confidence": 90,
        "action": "Restrict outbound traffic and investigate the affected device."
    },
    {
        "threat": "Phishing Attempt",
        "keywords": ["phishing", "malicious link", "credential", "fake login"],
        "severity": "High",
        "confidence": 83,
        "action": "Warn affected users and reset impacted credentials."
    },
]

@app.get("/")
def home():
    return {"message": "TrustLens AI backend running"}

@app.post("/analyze")
def analyze_logs(request: LogRequest):
    text = request.log_text.lower()
    threats = []

    for rule in THREAT_RULES:
        matched = [word for word in rule["keywords"] if word in text]

        if matched:
            threats.append({
                "threat": rule["threat"],
                "confidence": rule["confidence"],
                "severity": rule["severity"],
                "source": "Uploaded IT log + TrustLens detection rules",
                "matchedKeyword": ", ".join(matched),
                "matchedCount": len(matched),
                "reasoning": [
                    f"The log contains suspicious terms linked to {rule['threat']}.",
                    f"Matched evidence: {', '.join(matched)}.",
                    "The system recommends human review before taking action."
                ],
                "recommendedAction": rule["action"],
                "alternatives": [
                    "Monitor the affected device",
                    "Escalate to security analyst",
                    "Request more context from the device owner"
                ],
                "sources": [
                    {"name": "Uploaded IT Log", "reliability": "High reliability"},
                    {"name": "TrustLens Rule Engine", "reliability": "Medium reliability"}
                ],
                "limitations": [
                    "This is a rule-assisted AI simulation for prototype deployment.",
                    "The system does not access live enterprise devices.",
                    "Human verification is required before high-impact actions."
                ],
                "evidence": request.log_text.splitlines()[:5],
                "scoreBreakdown": {
                    "baseScore": 70,
                    "keywordBoost": len(matched) * 5,
                    "severityBoost": 10 if rule["severity"] == "Critical" else 5
                }
            })

    return {"threats": threats}