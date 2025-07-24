import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import SessionSelector from "./pages/SessionSelector";
import ChatSession from "./pages/ChatSession";
import Header from "./components/Header"; // <-- Import the header

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* WGU Header always on top */}
        <Header />

        {/* Main content below */}
        <Routes>
          {/* Redirect root to session selector */}
          <Route path="/" element={<Navigate to="/select" replace />} />

          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route
            path="/select"
            element={
              <ProtectedRoute>
                <SessionSelector />
              </ProtectedRoute>
            }
          />
          <Route
            path="/session/:session_id"
            element={
              <ProtectedRoute>
                <ChatSession />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;


