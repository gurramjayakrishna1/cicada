import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function SessionSelector() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [view, setView] = useState("menu"); // "menu" | "browse" | "proficiency"
  const [groupedObjectives, setGroupedObjectives] = useState({});
  const [proficiency, setProficiency] = useState([]);

  useEffect(() => {
    if (view === "browse") fetchLOs();
    if (view === "proficiency") fetchProficiency();
    // eslint-disable-next-line
  }, [view]);

  async function fetchLOs() {
    const res = await fetch("http://localhost:8000/api/objectives");
    const data = await res.json();
    const grouped = {};
    for (const lo of data) {
      if (!grouped[lo.topic]) grouped[lo.topic] = [];
      grouped[lo.topic].push(lo);
    }
    setGroupedObjectives(grouped);
  }

  async function fetchProficiency() {
    const res = await fetch(`http://localhost:8000/api/user/${user.id}/proficiency`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    const data = await res.json();
    setProficiency(data);
  }

  async function startSession(mode, loId = null) {
    const res = await fetch("http://localhost:8000/api/session/start", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: user.id,
        mode,
        lo_id: loId,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      navigate(`/session/${data.session_id}`);
    } else {
      alert("Failed to start session.");
    }
  }

return (
  <div className="wgu-login-bg-centered">
    {/* MENU & BROWSE stay in the centered card */}
    {(view === "menu" || view === "browse") && (
      <div className="wgu-session-card">
        <div className="wgu-session-header">
          <div className="wgu-session-title">
            Welcome, {user?.name || "Student"}
          </div>
          <div className="wgu-session-subtitle">What would you like to do?</div>
        </div>
        
        {view === "menu" && (
          <div className="wgu-session-menu">
            <button
              className="wgu-session-btn wgu-btn-blue"
              onClick={() => startSession("tutor")}
            >
              <span role="img" aria-label="guide">🦉</span> Let the Tutor Guide Me
            </button>
            <button
              className="wgu-session-btn wgu-btn-green"
              onClick={() => setView("browse")}
            >
              <span role="img" aria-label="objective">📚</span> Browse by Objective
            </button>
            <button
              className="wgu-session-btn wgu-btn-proficiency"
              onClick={() => setView("proficiency")}
            >
              <span role="img" aria-label="proficiency">📊</span> Show Proficiency
            </button>
          </div>
        )}

        {view === "browse" && (
          <div className="wgu-session-inner">
            <button onClick={() => setView("menu")} className="wgu-session-back">
              ⬅ Back to Menu
            </button>
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {Object.entries(groupedObjectives).map(([topic, objectives]) => (
                <div key={topic} className="wgu-session-topic">
                  <div className="wgu-session-topic-title">{topic}</div>
                  <div>
                    {objectives.map((lo) => (
                      <button
                        key={lo.id}
                        onClick={() => startSession("browse", lo.id)}
                        className="wgu-session-objective-btn"
                      >
                        {lo.objective}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="wgu-session-btn wgu-btn-logout"
          style={{ marginTop: 28 }}
        >
          🔒 Log Out
        </button>
      </div>
    )}

    {/* Full-width Proficiency Table */}
    {view === "proficiency" && (
      <div className="wgu-session-full-proficiency">
        <div className="wgu-session-full-header">
          <button onClick={() => setView("menu")} className="wgu-session-back">
            ⬅ Back to Menu
          </button>
          <div className="wgu-session-title" style={{ margin: 0 }}>
            Welcome, {user?.name || "Student"}
          </div>
          <div className="wgu-session-subtitle" style={{ marginBottom: 18 }}>
            What would you like to do?
          </div>
        </div>
        <div className="wgu-session-table-scroll-full">
          <table className="wgu-session-table wgu-session-table-full">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Learning Objective</th>
                <th>Proficiency</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {proficiency.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.topic}</td>
                  <td>{item.objective}</td>
                  <td>
                    <span className="wgu-pill-score">
                      {item.score?.toFixed(2)}
                    </span>
                  </td>
                  <td>{item.feedback}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={logout}
          className="wgu-session-btn wgu-btn-logout"
          style={{ margin: "34px auto 0 auto", display: "block", maxWidth: 240 }}
        >
          🔒 Log Out
        </button>
      </div>
    )}
  </div>
);
}