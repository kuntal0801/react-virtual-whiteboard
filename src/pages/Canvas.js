import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import BoardProvider from "../store/BoardProvider";
import ToolboxProvider from "../store/ToolboxProvider";
import Toolbar from "../components/Toolbar";
import Board from "../components/Board";
import Toolbox from "../components/Toolbox";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "https://your-backend.onrender.com";
const API_URL = process.env.REACT_APP_API_URL || "https://your-backend.onrender.com";

const socket = io(SOCKET_URL, { transports: ["websocket"] });

const CanvasPage = () => {
  const { uuid } = useParams();
  const [canvas, setCanvas] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    // Join socket room
    socket.emit("joinCanvas", uuid);

    // Load canvas from backend
    const fetchCanvas = async () => {
      try {
        const res = await axios.get(`${API_URL}/canvas/load/${uuid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCanvas(res.data.canvas || { elements: [] });
      } catch (err) {
        console.error(err);
        setCanvas({ elements: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchCanvas();

    // Listen for live updates from other users
    socket.on("canvas_update", (data) => {
      if (data?.elements) {
        setCanvas((prev) => ({ ...prev, elements: data.elements }));
      }
    });

    return () => {
      socket.off("canvas_update");
    };
  }, [uuid, navigate]);

  if (loading) return <p>Loading canvas...</p>;
  if (!canvas) return <p>Canvas not available</p>;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="mb-4">
        <button
          onClick={() => navigate("/profile")}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Back to Profile
        </button>
      </div>

      <BoardProvider initialCanvas={canvas} socket={socket} canvasId={uuid}>
        <ToolboxProvider>
          <Toolbar />
          <Board />
          <Toolbox />
        </ToolboxProvider>
      </BoardProvider>
    </div>
  );
};

export default CanvasPage;
