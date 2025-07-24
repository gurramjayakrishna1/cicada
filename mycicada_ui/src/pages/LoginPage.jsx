import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "../App.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("http://localhost:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      login(data.access_token);
      navigate("/select");
    } else {
      setError(data.detail || "Login failed");
    }
  }

  return (
    <div className="wgu-login-bg-centered">
      <div className="wgu-login-center-card">
        <img
          src="/wgu-logo.png"
          alt="WGU Logo"
          style={{
            width: 70,
            marginBottom: 14,
            marginLeft: "auto",
            marginRight: "auto",
            display: "block"
          }}
        />
        <div className="wgu-login-subtitle" style={{ fontWeight: 700, letterSpacing: 2, fontSize: "2.18rem" }}>
          CICADA
        </div>
        <div className="wgu-login-subtitle" style={{ fontSize: "1.75rem", marginBottom: 20 }}>
          Python Learning Platform
        </div>
        <div style={{ textAlign: "center", marginBottom: 8, fontSize: "1.28rem", fontWeight: 800, color: "#003865" }}>
          Welcome Back, Night Owl
        </div>
        <div style={{ textAlign: "center", marginBottom: 18, color: "#197278", fontSize: "1.01rem" }}>
          Continue your Python mastery with personalized AI tutoring
        </div>
        <form className="wgu-login-form-modern" onSubmit={handleLogin}>
          <label className="wgu-login-label-modern" htmlFor="email">Email Address</label>
          <input
            className="wgu-login-input-modern"
            id="email"
            type="email"
            autoComplete="username"
            placeholder="student@wgu.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="wgu-login-label-modern" htmlFor="password">Password</label>
          <input
            className="wgu-login-input-modern"
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="wgu-login-error">{error}</div>}
          <button className="wgu-login-btn-modern" type="submit">
            <span style={{ fontWeight: 600 }}>Sign In to Portal</span>
          </button>
        </form>
        <div className="wgu-login-bottom-modern">
          <span>New to WGU’s Python Platform?</span>
          <button
            className="wgu-login-link-modern"
            type="button"
            onClick={() => navigate("/register")}
          >
            Create your account
          </button>
        </div>
      </div>
    </div>
  );
}