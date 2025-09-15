import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase/config.js";
import { collection, addDoc, doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { uploadToMongo } from "./uploadService.js";
import "../styles/UploadForm.css";

const CATEGORIES = {
  ROADS: { id: 'roads_transport', label: '🛣️ Roads & Transport', icon: '🚗' },
  WATER: { id: 'water_sewage', label: '💧 Water & Sewage', icon: '🚰' },
  ELECTRICITY: { id: 'electricity', label: '⚡ Electricity', icon: '💡' },
  SANITATION: { id: 'waste_management', label: '🗑️ Sanitation & Waste', icon: '♻️' },
  SAFETY: { id: 'public_safety', label: '🚨 Public Safety', icon: '🛡️' },
  PARKS: { id: 'parks_recreation', label: '🌳 Parks & Recreation', icon: '🌲' },
  LIGHTING: { id: 'street_lighting', label: '🏮 Street Lighting', icon: '💡' },
  OTHER: { id: 'other', label: '📝 Other Issues', icon: '❓' }
};

const PRIORITY_LEVELS = {
  LOW: { id: 'low', label: 'Low Priority', color: '#48bb78' },
  MEDIUM: { id: 'medium', label: 'Medium Priority', color: '#ed8936' },
  HIGH: { id: 'high', label: 'High Priority', color: '#f56565' },
  CRITICAL: { id: 'critical', label: 'Critical', color: '#e53e3e' }
};

export default function UploadForm() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: CATEGORIES.ROADS.id,
    priority: PRIORITY_LEVELS.MEDIUM.id,
    location: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: ""
    },
    landmark: ""
  });
  
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [userTrustScore, setUserTrustScore] = useState(0);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log("Location access denied:", error);
        }
      );
    }
  }, []);

  // Fetch user trust score
  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserTrustScore(userDoc.data().trustScore || 100);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setMessage("⚠️ Please enter a title for your report");
      return false;
    }
    if (!formData.description.trim()) {
      setMessage("⚠️ Please enter a description");
      return false;
    }
    if (!formData.address.city.trim()) {
      setMessage("⚠️ Please enter your city");
      return false;
    }
    if (!file) {
      setMessage("⚠️ Please attach an image or video");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const dropboxToken = process.env.REACT_APP_DROPBOX_TOKEN;
    if (!dropboxToken) {
      setMessage("⚠️ Dropbox token missing. Check your .env file.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      // Upload file to Dropbox
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${timestamp}_${file.name}`;
      
      const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dropboxToken}`,
          "Dropbox-API-Arg": JSON.stringify({
            path: `/UrbanAssistant/reports/${fileName}`,
            mode: "add",
            autorename: true,
            mute: false,
          }),
          "Content-Type": "application/octet-stream",
        },
        body: file,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const uploadResult = await response.json();

      // Create report data
      const reportData = {
        ...formData,
        reporterId: auth.currentUser.uid,
        media: [{
          type: file.type.startsWith('image/') ? 'image' : 'video',
          url: uploadResult.path_lower,
          filename: fileName,
          size: file.size,
          mimeType: file.type
        }],
        location: userLocation ? {
          type: 'Point',
          coordinates: [userLocation.longitude, userLocation.latitude]
        } : null,
        status: 'submitted',
        votes: { upvotes: 0, downvotes: 0, totalVotes: 0 },
        views: 0,
        createdAt: new Date().toISOString(),
        isAnonymous: false
      };

      // Save to Firebase
      const docRef = await addDoc(collection(db, "reports"), reportData);
      
      // Update user's report count
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        reportsSubmitted: increment(1)
      });

      // Also save to MongoDB if needed
      await uploadToMongo({
        ...reportData,
        firebaseId: docRef.id,
        dropboxPath: uploadResult.path_lower
      });

      setMessage("✅ Report submitted successfully! Thank you for helping your community.");
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        category: CATEGORIES.ROADS.id,
        priority: PRIORITY_LEVELS.MEDIUM.id,
        location: "",
        address: { street: "", city: "", state: "", zipCode: "" },
        landmark: ""
      });
      setFile(null);
      
    } catch (error) {
      console.error("Upload error:", error);
      setMessage(`❌ Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const selectedCategory = Object.values(CATEGORIES).find(cat => cat.id === formData.category);
  const selectedPriority = Object.values(PRIORITY_LEVELS).find(pri => pri.id === formData.priority);

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h1>📢 Report Civic Issue</h1>
        <p>Help improve your community by reporting issues</p>
        <div className="trust-score">
          <span className="trust-label">Trust Score:</span>
          <span className="trust-value">{userTrustScore}</span>
        </div>
      </div>

      <form className="upload-form" onSubmit={(e) => e.preventDefault()}>
        {/* Title */}
        <div className="form-section">
          <label className="form-label">📝 Report Title</label>
          <input
            className="form-input"
            type="text"
            placeholder="Brief title for your report (e.g., 'Pothole on Main Street')"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            maxLength={200}
          />
        </div>

        {/* Category & Priority */}
        <div className="form-row">
          <div className="form-section">
            <label className="form-label">🗂️ Category</label>
            <select
              className="form-select"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
            >
              {Object.values(CATEGORIES).map(category => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-section">
            <label className="form-label">⚡ Priority</label>
            <select
              className="form-select"
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
            >
              {Object.values(PRIORITY_LEVELS).map(priority => (
                <option key={priority.id} value={priority.id}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="form-section">
          <label className="form-label">📄 Description</label>
          <textarea
            className="form-textarea"
            placeholder="Provide detailed description of the issue, its impact, and any relevant information..."
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
            maxLength={2000}
          />
          <div className="char-count">{formData.description.length}/2000</div>
        </div>

        {/* Address */}
        <div className="form-section">
          <label className="form-label">🏠 Address</label>
          <div className="address-grid">
            <input
              className="form-input"
              type="text"
              placeholder="Street Address"
              value={formData.address.street}
              onChange={(e) => handleInputChange('address.street', e.target.value)}
            />
            <input
              className="form-input"
              type="text"
              placeholder="City*"
              value={formData.address.city}
              onChange={(e) => handleInputChange('address.city', e.target.value)}
              required
            />
            <input
              className="form-input"
              type="text"
              placeholder="State"
              value={formData.address.state}
              onChange={(e) => handleInputChange('address.state', e.target.value)}
            />
            <input
              className="form-input"
              type="text"
              placeholder="ZIP Code"
              value={formData.address.zipCode}
              onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
            />
          </div>
        </div>

        {/* Landmark */}
        <div className="form-section">
          <label className="form-label">📍 Nearby Landmark (Optional)</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g., 'Near City Hall', 'Opposite ABC Store'"
            value={formData.landmark}
            onChange={(e) => handleInputChange('landmark', e.target.value)}
          />
        </div>

        {/* File Upload */}
        <div className="form-section">
          <label className="form-label">📸 Attach Photo/Video</label>
          <div className="file-upload-area">
            <input
              className="file-input"
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files[0])}
              id="file-upload"
            />
            <label htmlFor="file-upload" className="file-upload-label">
              {file ? (
                <div className="file-selected">
                  <span className="file-icon">📎</span>
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              ) : (
                <div className="file-placeholder">
                  <span className="upload-icon">☁️</span>
                  <span>Click to upload or drag and drop</span>
                  <span className="file-types">PNG, JPG, MP4 up to 10MB</span>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Location Status */}
        {userLocation && (
          <div className="location-status">
            📍 Location detected: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
          </div>
        )}

        {/* Submit Button */}
        <button
          className={`submit-btn ${uploading ? 'loading' : ''}`}
          onClick={handleSubmit}
          disabled={uploading}
        >
          {uploading ? (
            <span>🔄 Submitting Report...</span>
          ) : (
            <span>📤 Submit Report</span>
          )}
        </button>

        {/* Message */}
        {message && (
          <div className={`form-message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
