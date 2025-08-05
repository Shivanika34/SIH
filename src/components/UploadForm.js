import { useState } from "react";
import { db } from "../firebase/config";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export default function UploadForm() {
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const handleUpload = async () => {
    try {
      await addDoc(collection(db, "alerts"), {
        description,
        location,
        timestamp: Timestamp.now()
      });
      alert("Alert uploaded!");
    } catch (error) {
      alert("Error uploading alert: " + error.message);
    }
  };

  return (
    <div>
      <input type="text" placeholder="Description" onChange={(e) => setDescription(e.target.value)} />
      <input type="text" placeholder="Location" onChange={(e) => setLocation(e.target.value)} />
      <button onClick={handleUpload}>Upload Alert</button>
    </div>
  );
}