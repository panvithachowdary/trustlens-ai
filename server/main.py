from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

classifier = pipeline(
    "zero-shot-classification",
    model="facebook/bart-large-mnli"
)

class LogRequest(BaseModel):
    log_text: str

labels = [
    "Malware Detected",
    "Brute Force Attempt",
    "Suspicious IP Access",
    "Patch Vulnerability",
    "Device Health Issue",
    "Data Exfiltration Pattern",
    "Unauthorized Configuration Change",
    "Phishing Attempt"
]

@app.get("/")
def home():
    return {"message": "TrustLens AI backend running"}

@app.post("/analyze")
def analyze_logs(request: LogRequest):
    result = classifier(request.log_text, labels, multi_label=True)

    threats = []

    for label, score in list(zip(result["labels"], result["scores"]))[:3]:
        if score > 0.35:
            threats.append({
                "threat": label,
                "confidence": round(score * 100),
                "severity": "Critical" if score > 0.75 else "High" if score > 0.45 else "Medium",
                "source": "Hugging Face zero-shot model + uploaded log",
                "matchedKeyword": "AI semantic classification",
                "matchedCount": 1,
                "reasoning": [
                    f"The uploaded log is semantically related to {label}.",
                    "The model compared the log against multiple IT security threat labels.",
                    "Human approval is required before any high-impact action."
                ],
                "recommendedAction": "Review this AI recommendation before taking action.",
                "alternatives": [
                    "Monitor affected device",
                    "Escalate to security analyst",
                    "Request more context from device owner"
                ],
                "sources": [
                    {"name": "Uploaded IT Log", "reliability": "High reliability"},
                    {"name": "Hugging Face Model Output", "reliability": "Medium reliability"}
                ],
                "limitations": [
                    "This is AI classification and may need human verification.",
                    "Model does not access live enterprise systems.",
                    "Uploaded logs may not contain full incident context."
                ],
                "evidence": request.log_text.splitlines()[:5],
                "scoreBreakdown": {
                    "baseScore": 70,
                    "keywordBoost": 0,
                    "severityBoost": round(score * 20)
                }
            })

    return {"threats": threats}