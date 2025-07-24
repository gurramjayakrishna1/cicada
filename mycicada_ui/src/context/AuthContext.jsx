// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("access_token"));
  const [user, setUser] = useState(null);

  // Load user profile when token changes
  useEffect(() => {
    async function fetchProfile() {
      if (!token) {
        setUser(null);
        return;
      }
      console.log("Token in AuthContext:", token);
      try {
        const res = await fetch("http://localhost:8000/api/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          logout(); // Token might be invalid
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        logout();
      }
    }

    fetchProfile();
  }, [token]);

  function login(newToken) {
    localStorage.setItem("access_token", newToken);
    setToken(newToken);
  }

  function logout() {
    localStorage.removeItem("access_token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
