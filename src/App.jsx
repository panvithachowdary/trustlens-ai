import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const canvasRef = useRef(null);
  const [activePage, setActivePage] = useState("dashboard");
  const [logData, setLogData] = useState("");
  const [threats, setThreats] = useState([]);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [incidentReports, setIncidentReports] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [autonomyLevel, setAutonomyLevel] = useState("Balanced Review");
  const [searchText, setSearchText] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [analyzed, setAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);

  const menuItems = ["dashboard", "analyze", "transparency", "audit", "incidents", "model"];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrame;

    canvas.width = width;
    canvas.height = height;

    const particles = Array.from({ length: 160 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 2.5 + 1.5,
    }));

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
        glow.addColorStop(0, "rgba(0,212,255,0.95)");
        glow.addColorStop(1, "rgba(0,212,255,0)");

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const d = Math.hypot(p.x - q.x, p.y - q.y);

          if (d < 180) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(0,212,255,${0.25 * (1 - d / 180)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      });

      animationFrame = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  const getAverageConfidence = () => {
    if (threats.length === 0) return 0;
    const total = threats.reduce((sum, item) => sum + Number(item.confidence || 0), 0);
    return Math.round(total / threats.length);
  };

  const getRiskLevel = () => {
    if (threats.some((item) => item.severity === "Critical")) return "Critical Risk";
    if (threats.some((item) => item.severity === "High")) return "High Risk";
    if (threats.some((item) => item.severity === "Medium")) return "Medium Risk";
    return "No Active Risk";
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 95) return "Very High Confidence";
    if (confidence >= 85) return "High Confidence";
    return "Review Recommended";
  };

  const filteredThreats = threats.filter((item) => {
    const text = searchText.toLowerCase();

    const matchesSearch =
      item.threat.toLowerCase().includes(text) ||
      item.severity.toLowerCase().includes(text) ||
      item.matchedKeyword.toLowerCase().includes(text);

    const matchesSeverity = severityFilter === "All" || item.severity === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      setLogData(event.target.result);
      setAnalyzed(false);
      setThreats([]);
    };

    reader.readAsText(file);
  };

  const generateSampleLogs = () => {
    const sampleLogs = `Device WIN-1034 detected malware in temporary folder.
Repeated failed login from unknown IP 185.44.21.90.
Patch missing on device LAPTOP-7782.
CPU spike detected on server SRV-204.
Large upload detected from finance laptop to external domain.`;

    setLogData(sampleLogs);
    setAnalyzed(false);
    setThreats([]);
    setActivePage("analyze");
  };

  const analyzeLogs = async () => {
    if (!logData.trim()) {
      alert("Please upload or generate logs first.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("https://trustlens-ai-backend.onrender.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          log_text: logData,
        }),
      });

      const data = await response.json();
      const results = data.threats || [];

      setThreats(results);

      setTimeline(
        results.map((item) => ({
          threat: item.threat,
          severity: item.severity,
          time: new Date().toLocaleTimeString(),
        }))
      );

      setAnalyzed(true);
      setActivePage("dashboard");
    } catch (error) {
      alert("Backend not connected. Make sure FastAPI is running on port 8000.");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = (threat, decision) => {
    const newLog = {
      threat: threat.threat,
      decision,
      time: new Date().toLocaleString(),
      confidence: threat.confidence,
    };

    const incident = {
      id: `INC-${Math.floor(Math.random() * 10000)}`,
      threat: threat.threat,
      action: decision,
      confidence: threat.confidence,
      outcome: "Pending Review",
      safeguard: decision === "Approved" ? "Human Approval Applied" : "Manual Override Applied",
    };

    setAuditLogs([newLog, ...auditLogs]);
    setIncidentReports([incident, ...incidentReports]);
    setSelectedThreat(null);
  };

  const downloadReport = () => {
    const report = {
      project: "TrustLens AI",
      analyzedAt: new Date().toLocaleString(),
      totalThreats: threats.length,
      overallRisk: getRiskLevel(),
      threats,
      auditTrail: auditLogs,
      incidentReports,
    };

    const file = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = "trustlens-ai-report.json";
    link.click();

    URL.revokeObjectURL(url);
  };

  const renderHero = (eyebrow, title, highlight, subtitle) => (
    <div className="hero fade-in">
      <div className="hero-eyebrow">{eyebrow}</div>
      <div className="hero-title">
        {title} <span>{highlight}</span>
      </div>
      <div className="hero-sub">{subtitle}</div>
    </div>
  );

  const renderThreatCard = (item, index) => {
    const severityClass = item.severity.toLowerCase();

    return (
      <div className="threat-item" key={index} style={{ animationDelay: `${index * 0.06}s` }}>
        <div className="threat-card-top">
          <div className={`threat-severity ${severityClass}`}></div>

          <div className="threat-body">
            <div className="threat-msg">{item.threat}</div>

            <div className="threat-meta">
              <span>{item.severity}</span> · {item.matchedKeyword} · {item.source}
            </div>

            <div className="confidence-bar">
              <div className="confidence-fill" style={{ width: `${item.confidence}%` }}></div>
            </div>

            <div className="confidence-text">
              Confidence: {item.confidence}% · {getConfidenceLabel(item.confidence)}
            </div>
          </div>

          <div className="threat-actions">
            <button className="action-btn approve" onClick={() => handleDecision(item, "Approved")}>
              Approve
            </button>

            <button className="action-btn deny" onClick={() => handleDecision(item, "Overridden")}>
              Override
            </button>

            <button className="action-btn inspect" onClick={() => setSelectedThreat(item)}>
              Ask Why
            </button>
          </div>
        </div>

        <div className="incident-reasoning compact">
          <strong>Recommended Action:</strong> {item.recommendedAction}
        </div>

        <div className="threat-details compact-details">
          <div className="detail-pill">
            <strong>Reasoning</strong>
            <span>{item.reasoning?.length || 0} factors available</span>
          </div>

          <div className="detail-pill">
            <strong>Data Source</strong>
            <span>{item.source}</span>
          </div>

          <div className="detail-pill">
            <strong>Alternatives</strong>
            <span>{item.alternatives?.length || 0} options available</span>
          </div>

          <div className="detail-pill">
            <strong>Limitations</strong>
            <span>{item.limitations?.length || 0} known limitations</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-shell">
      <canvas ref={canvasRef} id="bg-canvas"></canvas>

      <nav className="top-nav">
        <button className="nav-brand" onClick={() => setActivePage("dashboard")}>
          <span className="nav-brand-dot"></span>
          TrustLens AI
        </button>

        <div className="nav-links">
          {menuItems.map((item) => (
            <button
              key={item}
              className={`nav-link ${activePage === item ? "active" : ""}`}
              onClick={() => setActivePage(item)}
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>

        <div className="nav-right">
          <div className="status-badge">
            <span className="status-dot"></span>
            System Online
          </div>

          <button className="btn-gen" onClick={generateSampleLogs}>
            Generate Sample Logs
          </button>
        </div>
      </nav>

      <aside className="sidebar">
        <div className="sidebar-section">
          <div className="sidebar-label">Navigation</div>

          {menuItems.map((item) => (
            <button
              key={item}
              className={`sidebar-item ${activePage === item ? "active" : ""}`}
              onClick={() => setActivePage(item)}
            >
              <span className="sidebar-icon">
                {item === "dashboard"
                  ? "⬡"
                  : item === "analyze"
                  ? "◈"
                  : item === "transparency"
                  ? "◎"
                  : item === "audit"
                  ? "≡"
                  : item === "incidents"
                  ? "⚠"
                  : "◑"}
              </span>

              {item === "analyze"
                ? "Analyze Logs"
                : item === "audit"
                ? "Audit Trail"
                : item === "model"
                ? "Model Info"
                : item.charAt(0).toUpperCase() + item.slice(1)}

              {item === "incidents" && incidentReports.length > 0 && (
                <span className="sidebar-badge">{incidentReports.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="sidebar-section sidebar-mode-section">
          <div className="sidebar-label">Autonomy Mode</div>

          <div className="sidebar-mode-box">
            <div>Current Mode</div>
            <strong>{autonomyLevel}</strong>
          </div>
        </div>
      </aside>

      <main className="content">
        {activePage === "dashboard" && (
          <section className="page-section active">
            {renderHero(
              "IT Security Console · v2.4.1",
              "Transparent",
              "AI Security",
              "Analyze logs, inspect AI reasoning, approve high-impact actions — with full human oversight at every step."
            )}

            <div className="metrics-grid">
              <div className="metric-card fade-in fade-in-1">
                <div className="metric-label">Threats Detected</div>
                <div className="metric-value red">{threats.length}</div>
                <div className="metric-sub">
                  {threats.length ? "Needs review" : "No active threats"}
                </div>
              </div>

              <div className="metric-card fade-in fade-in-2">
                <div className="metric-label">Critical Alerts</div>
                <div className="metric-value amber">
                  {threats.filter((item) => item.severity === "Critical").length}
                </div>
                <div className="metric-sub">Immediate action</div>
              </div>

              <div className="metric-card fade-in fade-in-3">
                <div className="metric-label">Human Decisions</div>
                <div className="metric-value cyan">{auditLogs.length}</div>
                <div className="metric-sub">Actions reviewed</div>
              </div>

              <div className="metric-card fade-in fade-in-4">
                <div className="metric-label">Avg Confidence</div>
                <div className="metric-value">{getAverageConfidence()}%</div>
                <div className="metric-sub">AI certainty score</div>
              </div>

              <div
                className={`metric-card fade-in fade-in-5 ${
                  getRiskLevel() === "No Active Risk" ? "risk-none" : "risk-high"
                }`}
              >
                <div className="metric-label">Overall Risk</div>
                <div
                  className={`metric-value risk-text ${
                    getRiskLevel() === "No Active Risk" ? "green" : "red"
                  }`}
                >
                  {getRiskLevel()}
                </div>
                <div className="metric-sub">Scan to assess</div>
              </div>
            </div>

            <div className="section-card fade-in">
              <div className="section-header">
                <div>
                  <div className="section-title">Recent AI Recommendations</div>
                  <div className="section-subtitle">Pending human review · Sorted by severity</div>
                </div>

                <button className="btn-secondary" onClick={() => setActivePage("analyze")}>
                  Run New Scan
                </button>
              </div>

              {threats.length === 0 ? (
                <div className="empty-state">
                  No threats analyzed yet.
                  <br />
                  <span>Generate sample logs to begin analysis.</span>
                </div>
              ) : (
                <div>{threats.slice(0, 3).map(renderThreatCard)}</div>
              )}
            </div>
          </section>
        )}

        {activePage === "analyze" && (
          <section className="page-section active">
            {renderHero(
              "Log Analysis Engine",
              "Upload & Analyze",
              "IT Logs",
              "Send .txt, .log, or .csv files to the AI backend for threat classification. Every finding is explained."
            )}

            <div className="section-card fade-in">
              <label className="upload-zone">
                <input type="file" accept=".txt,.log,.csv" onChange={handleFile} />
                <div className="upload-icon">◈</div>
                <div className="upload-title">Drop your log file here</div>
                <div className="upload-sub">
                  Supports .txt, .log, .csv — or generate sample logs below
                </div>
              </label>

              {logData && (
                <div className="log-results">
                  <div className="log-entry ok">
                    <span className="tag">LOG</span>
                    <span>{logData}</span>
                  </div>
                </div>
              )}

              <div className="upload-actions">
                <button className="btn-primary" onClick={generateSampleLogs}>
                  Generate Sample Logs
                </button>

                <button className="btn-primary analyze-green" onClick={analyzeLogs}>
                  {loading ? "Analyzing with Hugging Face..." : "Analyze Logs"}
                </button>

                <button className="btn-secondary" onClick={downloadReport}>
                  Download Report
                </button>
              </div>

              {loading && <div className="scan-line visible"></div>}

              {threats.length > 0 && (
                <div className="filter-box">
                  <input
                    type="text"
                    placeholder="Search threats..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />

                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                  >
                    <option value="All">All Severities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                  </select>
                </div>
              )}

              {analyzed && threats.length === 0 && (
                <div className="empty-state">No major threats found.</div>
              )}

              {threats.length > 0 && (
                <div className="log-results">
                  {filteredThreats.length === 0 ? (
                    <div className="empty-state">No threats match your filter.</div>
                  ) : (
                    filteredThreats.map(renderThreatCard)
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {activePage === "transparency" && (
          <section className="page-section active">
            {renderHero(
              "Autonomy & Agent Control",
              "Multi-Agent",
              "Transparency",
              "Control how much autonomy the AI holds before acting. Inspect each agent's role in the decision chain."
            )}

            <div className="section-card fade-in">
              <div className="section-title">AI Autonomy Control</div>
              <div className="section-subtitle">
                Controls how much freedom the AI agent has before taking action
              </div>

              <div className="autonomy-controls">
                {["Always Ask Me", "Balanced Review", "Act & Notify"].map((level) => (
                  <button
                    key={level}
                    className={`autonomy-btn ${autonomyLevel === level ? "active" : ""}`}
                    onClick={() => setAutonomyLevel(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>

              <div className="autonomy-mode-display">
                Current Mode: <strong>{autonomyLevel}</strong> — AI flags high-risk actions and
                waits for approval before executing.
              </div>
            </div>

            <div className="section-card fade-in">
              <div className="section-title">Agent Pipeline</div>
              <div className="section-subtitle">How AI agents collaborate and escalate to humans</div>

              <div className="agents-grid">
                <div className="agent-card">
                  <div className="agent-header">
                    <div className="agent-icon detect">⬡</div>
                    <div>
                      <div className="agent-name">Detection Agent</div>
                      <div className="agent-role">Stage 1 · Automated</div>
                    </div>
                  </div>
                  <div className="agent-desc">
                    Scans uploaded logs and detects suspicious patterns using AI classification.
                  </div>
                </div>

                <div className="agent-card">
                  <div className="agent-header">
                    <div className="agent-icon risk">◈</div>
                    <div>
                      <div className="agent-name">Risk Agent</div>
                      <div className="agent-role">Stage 2 · Automated</div>
                    </div>
                  </div>
                  <div className="agent-desc">
                    Evaluates severity, confidence score, and business impact.
                  </div>
                </div>

                <div className="agent-card">
                  <div className="agent-header">
                    <div className="agent-icon remed">◎</div>
                    <div>
                      <div className="agent-name">Remediation Agent</div>
                      <div className="agent-role">Stage 3 · Supervised</div>
                    </div>
                  </div>
                  <div className="agent-desc">
                    Suggests quarantine, patch rollout, reset, or escalation.
                  </div>
                </div>

                <div className="agent-card human">
                  <div className="agent-header">
                    <div className="agent-icon human">H</div>
                    <div>
                      <div className="agent-name">Human Admin</div>
                      <div className="agent-role">Stage 4 · Final authority</div>
                    </div>
                  </div>
                  <div className="agent-desc">
                    Approves, overrides, asks why, or escalates with full audit trail.
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activePage === "audit" && (
          <section className="page-section active">
            {renderHero(
              "Compliance & Traceability",
              "AI",
              "Audit Trail",
              "Every human decision, AI action, and override is logged for review."
            )}

            <div className="section-card fade-in">
              <div className="section-title">Human Decisions</div>

              {auditLogs.length === 0 ? (
                <div className="empty-state">No human decisions recorded yet.</div>
              ) : (
                <div className="timeline">
                  {auditLogs.map((log, index) => (
                    <div className="timeline-item" key={index}>
                      <div className="timeline-dot">{index + 1}</div>
                      <div>
                        <div className="timeline-action">{log.threat}</div>
                        <div className="timeline-detail">
                          Decision: {log.decision} · Confidence: {log.confidence}%
                        </div>
                        <div className="timeline-time">{log.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="section-card fade-in">
              <div className="section-title">Threat Timeline</div>

              {timeline.length === 0 ? (
                <div className="empty-state">No threat activity recorded yet.</div>
              ) : (
                <div className="timeline">
                  {timeline.map((item, index) => (
                    <div className="timeline-item" key={index}>
                      <div className="timeline-dot">⬡</div>
                      <div>
                        <div className="timeline-action">{item.threat}</div>
                        <div className="timeline-detail">
                          {item.severity} · {item.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activePage === "incidents" && (
          <section className="page-section active">
            {renderHero(
              "Incident Management",
              "AI",
              "Incident Reports",
              "Structured incident reports generated from AI analysis and human actions."
            )}

            <div className="section-card fade-in">
              <div className="section-title">Active Incidents</div>

              {incidentReports.length === 0 ? (
                <div className="empty-state">No incident reports generated yet.</div>
              ) : (
                <div>
                  {incidentReports.map((report) => (
                    <div className="incident-card" key={report.id}>
                      <div className="incident-header">
                        <span className="severity-pill medium">Report</span>
                        <div className="incident-title">{report.id}</div>
                      </div>

                      <div className="incident-meta">
                        <div className="incident-meta-item">
                          Action: <span>{report.action}</span>
                        </div>
                        <div className="incident-meta-item">
                          Confidence: <span>{report.confidence}%</span>
                        </div>
                      </div>

                      <div className="incident-reasoning">
                        <strong>Threat:</strong> {report.threat}
                        <br />
                        <strong>Safeguard:</strong> {report.safeguard}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activePage === "model" && (
          <section className="page-section active">
            {renderHero(
              "AI Model Transparency",
              "Model",
              "Information",
              "Full visibility into the AI model powering TrustLens."
            )}

            <div className="section-card fade-in">
              <div className="model-grid">
                <div className="model-card">
                  <div className="model-field">Model ID</div>
                  <div className="model-value special">facebook/bart-large-mnli</div>
                </div>

                <div className="model-card">
                  <div className="model-field">Classification Type</div>
                  <div className="model-value">Zero-Shot Classification</div>
                </div>

                <div className="model-card">
                  <div className="model-field">Provider</div>
                  <div className="model-value">Hugging Face</div>
                </div>

                <div className="model-card">
                  <div className="model-field">Human Oversight</div>
                  <div className="model-value green">Required</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {selectedThreat && (
          <div className="modal-overlay">
            <div className="modal">
              <button className="close-btn" onClick={() => setSelectedThreat(null)}>
                ×
              </button>

              <span className={`severity-pill ${selectedThreat.severity.toLowerCase()}`}>
                {selectedThreat.severity}
              </span>

              <h2>{selectedThreat.threat}</h2>

              <h4>AI Reasoning</h4>
              <ul>
                {selectedThreat.reasoning?.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>

              <p>
                <b>Confidence:</b> {selectedThreat.confidence}% (
                {getConfidenceLabel(selectedThreat.confidence)})
              </p>

              <p>
                <b>Data Source:</b> {selectedThreat.source}
              </p>

              <h4>Alternatives</h4>
              <ul>
                {selectedThreat.alternatives?.map((alt, i) => (
                  <li key={i}>{alt}</li>
                ))}
              </ul>

              <h4>Known Limitations</h4>
              <ul>
                {selectedThreat.limitations?.map((limit, i) => (
                  <li key={i}>{limit}</li>
                ))}
              </ul>

              <div className="threat-actions modal-actions">
                <button
                  className="action-btn approve"
                  onClick={() => handleDecision(selectedThreat, "Approved")}
                >
                  Approve
                </button>

                <button
                  className="action-btn deny"
                  onClick={() => handleDecision(selectedThreat, "Overridden")}
                >
                  Override
                </button>

                <button
                  className="action-btn inspect"
                  onClick={() => handleDecision(selectedThreat, "Escalated")}
                >
                  Escalate
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;