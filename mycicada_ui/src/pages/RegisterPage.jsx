import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("http://localhost:8000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ name, email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      alert("✅ Registration successful. You can now log in.");
      navigate("/login");
    } else {
      setError(data.detail || "Registration failed.");
    }
  }

  return (
    <div className="wgu-login-bg">
      <div className="wgu-login-center-container">
        <div className="wgu-login-center-card">
          <div className="wgu-login-title" style={{ textAlign: "center" }}>
            Create Your Account
          </div>
          <div style={{
            color: "#197278",
            fontSize: "1.05rem",
            textAlign: "center",
            marginBottom: "20px"
          }}>
            Welcome to WGU CICADA! Please complete the form below to register.
          </div>
          <form onSubmit={handleRegister}>
            <label className="wgu-login-label" htmlFor="fullname">
              Full Name
            </label>
            <input
              id="fullname"
              className="wgu-login-input"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />

            <label className="wgu-login-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              className="wgu-login-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />

            <label className="wgu-login-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="wgu-login-input"
              type="password"
              placeholder="Choose a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            {error && (
              <div className="wgu-login-error" style={{ marginBottom: 8 }}>
                {error}
              </div>
            )}

            <button type="submit" className="wgu-login-btn" style={{ marginTop: 10 }}>
              Register
            </button>
          </form>
          <div style={{ marginTop: 18, textAlign: "center", fontSize: "1rem" }}>
            Already have an account?
            <button
              className="wgu-login-link"
              type="button"
              onClick={() => navigate("/login")}
              style={{ marginLeft: 5 }}
            >
              Log in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}