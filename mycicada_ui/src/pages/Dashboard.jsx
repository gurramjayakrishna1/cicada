import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-md mx-auto mt-12 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4 text-blue-700">
        Welcome, {user?.name || "User"}!
      </h1>
      <p className="mb-2"><strong>Email:</strong> {user?.email}</p>

      <div className="mt-6">
        <button
          onClick={() => navigate("/select")}
          className="w-full bg-green-600 text-white py-2 px-4 rounded mb-4"
        >
          🚀 Start Learning
        </button>

        <button
          onClick={logout}
          className="w-full bg-red-600 text-white py-2 px-4 rounded"
        >
          🔒 Log Out
        </button>
      </div>
    </div>
  );
}
