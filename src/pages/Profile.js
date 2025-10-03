import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ShareModal from "../components/Modal/ShareModal";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [canvases, setCanvases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCanvasName, setNewCanvasName] = useState("");
  const [shareInputs, setShareInputs] = useState({});
  const [activeShareCanvas, setActiveShareCanvas] = useState(null);

  const navigate = useNavigate();

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://your-backend.onrender.com/canvas";

  // Fetch user + canvases
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchProfileAndCanvases = async () => {
      try {
        const profileRes = await fetch(`${API_BASE_URL}/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profileData = await profileRes.json();
        if (!profileRes.ok) {
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }
        setUser(profileData.user);

        const canvasRes = await fetch(`${API_BASE_URL}/canvas`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const canvasData = await canvasRes.json();
        if (canvasRes.ok && canvasData.canvases) {
          setCanvases(canvasData.canvases);
        }
      } catch (error) {
        console.error("Error fetching profile/canvases:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndCanvases();
  }, [navigate, API_BASE_URL]);

  // Logout
  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    await fetch(`${API_BASE_URL}/users/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Create canvas
  const handleCreateCanvas = async () => {
    if (!newCanvasName.trim()) return;
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_BASE_URL}/canvas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newCanvasName }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to create canvas");
        return;
      }

      setCanvases([data.canvas, ...canvases]);
      setNewCanvasName("");
    } catch (error) {
      console.error("Error creating canvas:", error);
    }
  };

  // Delete canvas
  const handleDeleteCanvas = async (canvasId) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE_URL}/canvas/${canvasId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to delete canvas");
        return;
      }

      setCanvases(canvases.filter((c) => c._id !== canvasId));
    } catch (error) {
      console.error("Error deleting canvas:", error);
    }
  };

  // Open canvas
  const handleOpenCanvas = (uuid) => {
    navigate(`/load/${uuid}`);
  };

  // Share canvas
  const handleShareCanvas = async () => {
    if (!activeShareCanvas) return;
    const email = shareInputs[activeShareCanvas.uuid];
    if (!email) {
      alert("Please enter an email to share with");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `${API_BASE_URL}/canvas/share/${activeShareCanvas.uuid}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ shareWithEmail: email }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to share canvas");
        return;
      }

      setCanvases((prev) =>
        prev.map((c) =>
          c.uuid === activeShareCanvas.uuid
            ? { ...c, shared_with: [...c.shared_with, email] }
            : c
        )
      );

      setShareInputs((prev) => {
        const updated = { ...prev };
        delete updated[activeShareCanvas.uuid];
        return updated;
      });
      setActiveShareCanvas(null);

      alert("Canvas shared successfully!");
    } catch (error) {
      console.error("Error sharing canvas:", error);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-6 space-y-6">
      {/* Header */}
      {user && (
        <div className="flex w-full max-w-6xl justify-between items-center bg-white p-4 rounded-2xl shadow-md">
          <h1 className="text-3xl font-semibold">Hello, {user.name} 👋</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      )}

      {/* Create new canvas */}
      <div className="w-full max-w-6xl bg-white p-4 rounded-2xl shadow-md flex items-center space-x-4">
        <input
          type="text"
          placeholder="Enter new canvas name"
          value={newCanvasName}
          onChange={(e) => setNewCanvasName(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleCreateCanvas}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Create Canvas
        </button>
      </div>

      {/* Canvases */}
      {loading ? (
        <p>Loading canvases...</p>
      ) : canvases.length === 0 ? (
        <p>No canvases found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
          {canvases.map((canvas) => (
            <div
              key={canvas.uuid}
              className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition"
            >
              <h2 className="text-xl font-bold mb-2">{canvas.name}</h2>
              <p className="text-gray-500 text-sm mb-2">
                Owner: {canvas.owner === user._id ? "You" : canvas.owner}
              </p>
              <p className="text-gray-500 text-sm mb-2">
                Shared With:{" "}
                {canvas.shared_with.length > 0
                  ? canvas.shared_with.join(", ")
                  : "No one"}
              </p>
              <p className="text-gray-400 text-xs">
                Created: {new Date(canvas.createdAt).toLocaleString()}
              </p>
              <p className="text-gray-400 text-xs">
                Updated: {new Date(canvas.updatedAt).toLocaleString()}
              </p>

              {/* Actions */}
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => handleOpenCanvas(canvas.uuid)}
                  className="bg-green-500 text-white py-2 px-3 rounded-lg hover:bg-green-600"
                >
                  Open
                </button>
                <button
                  onClick={() => handleDeleteCanvas(canvas._id)}
                  className="bg-red-500 text-white py-2 px-3 rounded-lg hover:bg-red-600"
                >
                  Delete
                </button>
                <button
                  onClick={() => setActiveShareCanvas(canvas)}
                  className="bg-blue-500 text-white py-2 px-3 rounded-lg hover:bg-blue-600"
                >
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Modal */}
      {activeShareCanvas && (
        <ShareModal
          canvas={activeShareCanvas}
          onClose={() => setActiveShareCanvas(null)}
          onShare={handleShareCanvas}
          value={shareInputs[activeShareCanvas.uuid] || ""}
          onChange={(val) =>
            setShareInputs((prev) => ({
              ...prev,
              [activeShareCanvas.uuid]: val,
            }))
          }
        />
      )}
    </div>
  );
};

export default Profile;
