import React, { useState } from "react";
import { uploadToFirebase, uploadToMongo } from "./uploadService";

export default function UploadForm() {
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const useMongo = true; // Toggle between MongoDB and Firebase

  const handleUpload = async () => {
    if (!file || !description) {
      setMessage("⚠️ Please select a file and enter a description.");
      return;
    }

    const dropboxToken = process.env.REACT_APP_DROPBOX_TOKEN;
    if (!dropboxToken) {
      setMessage("⚠️ Dropbox token missing. Check your .env file.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      // Upload to Dropbox
      const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dropboxToken}`,
          "Dropbox-API-Arg": JSON.stringify({
            path: `/UrbanAssistant/${file.name}`,
            mode: "add",
            autorename: true,
            mute: false,
          }),
          "Content-Type": "application/octet-stream",
        },
        body: file,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dropbox upload failed: ${errorText}`);
      }

      const uploadResult = await response.json();
      const dropboxPath = uploadResult.path_lower;

      const metadata = {
        description,
        location,
        fileName: file.name,
        dropboxPath,
      };

      if (useMongo) {
        await uploadToMongo(metadata);
      } else {
        await uploadToFirebase({ ...metadata, file });
      }

      setMessage("✅ Upload successful! Metadata saved.");
      setDescription("");
      setLocation("");
      setFile(null);
    } catch (error) {
      console.error("Upload error:", error);
      setMessage(`❌ Upload failed: ${error.message || "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h2>📤 Upload Alert</h2>
      <input
        style={{ marginBottom: "10px", padding: "8px", width: "300px" }}
        type="text"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <br />
      <input
        style={{ marginBottom: "10px", padding: "8px", width: "300px" }}
        type="text"
        placeholder="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <br />
      <input
        style={{ marginBottom: "10px", padding: "8px", width: "300px" }}
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <br />
      <button
        style={{
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
        onClick={handleUpload}
        disabled={uploading}
      >
        {uploading ? "Uploading..." : "Upload Alert"}
      </button>
      {message && <p style={{ marginTop: "15px" }}>{message}</p>}
    </div>
  );
}
