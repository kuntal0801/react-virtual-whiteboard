import React, { useEffect } from "react";

const ShareModal = ({ canvas, onClose, onShare, value, onChange }) => {
  // Close modal with ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md z-10">
        <h2 className="text-xl font-semibold mb-4">
          Share "{canvas?.name}" Canvas
        </h2>

        <input
          type="email"
          placeholder="Enter email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
        />

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={onShare}
            className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
