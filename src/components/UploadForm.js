import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase/config.js";
import { collection, addDoc, doc, getDoc, updateDoc, increment ,limit} from "firebase/firestore";
import { uploadToMongo } from "./uploadService.js";
import "../styles/UploadForm.css";

// Voice Recorder Component
const VoiceRecorder = ({ onRecordingComplete, onRecordingClear }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
        }
        
        setHasRecording(true);
        onRecordingComplete(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };
  
  const clearRecording = () => {
    setHasRecording(false);
    setRecordingDuration(0);
    setIsPlaying(false);
    onRecordingClear();
    if (audioRef.current) {
      audioRef.current.src = '';
    }
  };
  
  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="voice-recorder">
      <audio 
        ref={audioRef} 
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      {!hasRecording ? (
        <div className="recording-controls">
          <button
            type="button"
            className={`record-btn ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? (
              <>
                <span className="pulse-dot"></span>
                ⏹️ Stop ({formatTime(recordingDuration)})
              </>
            ) : (
              <>🎤 Record Voice Message</>
            )}
          </button>
          {isRecording && (
            <div className="recording-indicator">
              <div className="wave-animation">
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="playback-controls">
          <button
            type="button"
            className="play-btn"
            onClick={togglePlayback}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <span className="duration">{formatTime(recordingDuration)}</span>
          <button
            type="button"
            className="clear-btn"
            onClick={clearRecording}
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
};
const CATEGORIES = {
  ROADS: { id: "roads_transport", label: "🛣️ Roads & Transport" },
  WATER: { id: "water_sewage", label: "💧 Water & Sewage" },
  ELECTRICITY: { id: "electricity", label: "⚡ Electricity" },
  SANITATION: { id: "waste_management", label: "🗑️ Sanitation & Waste" },
  SAFETY: { id: "public_safety", label: "🚨 Public Safety" },
  PARKS: { id: "parks_recreation", label: "🌳 Parks & Recreation" },
  LIGHTING: { id: "street_lighting", label: "🏮 Street Lighting" },
  OTHER: { id: "other", label: "📝 Other Issues" }
};

const PRIORITY_LEVELS = {
  LOW: { id: "low", label: "Low Priority" },
  MEDIUM: { id: "medium", label: "Medium Priority" },
  HIGH: { id: "high", label: "High Priority" },
  CRITICAL: { id: "critical", label: "Critical" }
};

// Firestore Upload Function
const uploadToFirestore = async (data) => {
  try {
    const reportData = {
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      address: data.address,
      landmark: data.landmark,
      location: data.location,
      dropboxPath: data.dropboxPath,
      dropboxShareLink: data.dropboxShareLink,
      trustScore: data.trustScore,
      userId: data.userId,
      timestamp: data.timestamp,
      status: "pending",
      votes: 0,
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, "reports"), reportData);
    console.log("Document written with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error uploading to Firestore:", error);
    throw new Error(`Firestore upload failed: ${error.message}`);
  }
};

// Get Readable Location using reverse geocoding
const getReadableLocation = async (lat, lng) => {
  try {
    // Using a free geocoding service (you can replace with Google Maps API)
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    
    if (!response.ok) {
      throw new Error("Geocoding service unavailable");
    }
    
    const data = await response.json();
    const address = data.locality || data.city || data.principalSubdivision || "Unknown Location";
    const fullAddress = `${address}, ${data.countryName || "Unknown Country"}`;
    
    return fullAddress;
  } catch (error) {
    console.error("Error getting readable location:", error);
    // Fallback to coordinates
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

// Dropbox Upload Function
async function uploadFileToDropbox(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("http://localhost:5000/api/upload-to-dropbox", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      throw new Error(errorData.message || `Upload failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.shareLink) {
      throw new Error("No share link received from server");
    }
    
    return data.shareLink;
  } catch (error) {
    console.error("Dropbox upload error:", error);
    
    if (error.message === 'Failed to fetch') {
      throw new Error("Cannot connect to upload server. Please ensure the backend server is running on port 5000.");
    }
    
    throw new Error(`File upload failed: ${error.message}`);
  }
}

export default function UploadForm() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: CATEGORIES.ROADS.id,
    priority: PRIORITY_LEVELS.MEDIUM.id,
    address: { street: "", city: "", state: "", zipCode: "" },
    landmark: ""
  });

  const [file, setFile] = useState(null);
  const [voiceRecording, setVoiceRecording] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [userTrustScore, setUserTrustScore] = useState(0);
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'voice'
  const [locationLoading, setLocationLoading] = useState(true);

  // Get User Location
  useEffect(() => {
    if (!navigator.geolocation) {
      setMessage("⚠️ Geolocation is not supported by your browser");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationLoading(false);
        if (message.includes("Unable to fetch location")) {
          setMessage("");
        }
      },
      (error) => {
        console.log("Location error:", error);
        setMessage("⚠️ Unable to fetch location. Please allow location access or enter address manually.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  }, []);

  // Fetch User Trust Score
  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserTrustScore(userData.trustScore || 100);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Keep default trust score of 100
        }
      }
    };
    fetchUserData();
  }, []);

  const handleInputChange = (field, value) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleVoiceRecordingComplete = (audioBlob) => {
    setVoiceRecording(audioBlob);
  };

  const handleVoiceRecordingClear = () => {
    setVoiceRecording(null);
  };

  const switchInputMode = (mode) => {
    setInputMode(mode);
    if (mode === 'text') {
      setVoiceRecording(null);
    } else {
      setFormData(prev => ({ ...prev, description: '' }));
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setMessage("⚠️ Please enter a title");
      return false;
    }
    if (inputMode === 'text' && !formData.description.trim()) {
      setMessage("⚠️ Please enter a description or switch to voice message");
      return false;
    }
    if (inputMode === 'voice' && !voiceRecording) {
      setMessage("⚠️ Please record a voice message or switch to text description");
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
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setMessage("⚠️ File size must be less than 10MB");
      return false;
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      setMessage("⚠️ Please upload a valid image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, MOV)");
      return false;
    }
    
    if (!userLocation && !formData.address.street.trim()) {
      setMessage("⚠️ Location is required. Please allow location access or enter a street address");
      return false;
    }
    
    if (!auth.currentUser) {
      setMessage("⚠️ You must be logged in to submit a report");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setUploading(true);
      setMessage("⏳ Uploading file...");

      // Step 1: Upload file to Dropbox
      const dropboxShareLink = await uploadFileToDropbox(file);
      
      // Convert Dropbox share link to direct link
      const dropboxDirectLink = dropboxShareLink
        .replace("www.dropbox.com", "dl.dropboxusercontent.com")
        .replace("?dl=0", "");

      setMessage("⏳ Processing location...");

      // Step 2: Get readable address from coordinates
      let readableLocation;
      if (userLocation) {
        readableLocation = await getReadableLocation(
          userLocation.latitude,
          userLocation.longitude
        );
      } else {
        // Use manual address if no GPS location
        readableLocation = `${formData.address.street}, ${formData.address.city}, ${formData.address.state} ${formData.address.zipCode}`.trim();
      }

      setMessage("⏳ Saving report...");

      // Step 3: Prepare complete form data
      const completeFormData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        address: formData.address,
        landmark: formData.landmark.trim(),
        location: {
          lat: userLocation?.latitude || null,
          lng: userLocation?.longitude || null,
          readableLocation,
        },
        dropboxPath: dropboxDirectLink,
        dropboxShareLink,
        trustScore: userTrustScore,
        userId: auth.currentUser.uid,
        timestamp: new Date().toISOString(),
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type
        }
      };

      // Step 4: Save to Firestore
      const documentId = await uploadToFirestore(completeFormData);

      setMessage("✅ Report submitted successfully!");
      
      // Reset form after successful submission
      setTimeout(() => {
        setFile(null);
        setFormData({
          title: "",
          description: "",
          category: CATEGORIES.ROADS.id,
          priority: PRIORITY_LEVELS.MEDIUM.id,
          address: { street: "", city: "", state: "", zipCode: "" },
          landmark: ""
        });
        setMessage("");
      }, 3000);

      console.log("Report submitted with ID:", documentId);
      
    } catch (err) {
      console.error("Upload error:", err);
      setMessage(`❌ ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h1>📢 Report Civic Issue</h1>
        <p>Help improve your community by reporting issues</p>
        {auth.currentUser && (
          <div className="trust-score">
            <span className="trust-label">Trust Score:</span>
            <span className="trust-value">{userTrustScore}</span>
          </div>
        )}
      </div>

      {!auth.currentUser ? (
        <div className="auth-required">
          <p>⚠️ You must be logged in to submit a report</p>
          <p>Please log in to continue</p>
        </div>
      ) : (
        <form className="upload-form" onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-section">
            <label className="form-label">📝 Report Title</label>
            <input
              className="form-input"
              type="text"
              placeholder="Brief title (e.g., 'Pothole on Main Street')"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
             
              required
            />
            <div className="char-count">{formData.title.length}/200</div>
          </div>

          {/* Category & Priority */}
          <div className="form-row">
            <div className="form-section">
              <label className="form-label">🗂️ Category</label>
              <select
                className="form-select"
                value={formData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                required
              >
                {Object.values(CATEGORIES).map((category) => (
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
                onChange={(e) => handleInputChange("priority", e.target.value)}
                required
              >
                {Object.values(PRIORITY_LEVELS).map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description Input Mode Toggle */}
          <div className="form-section">
            <div className="input-mode-toggle">
              <button
                type="button"
                className={`mode-btn ${inputMode === 'text' ? 'active' : ''}`}
                onClick={() => switchInputMode('text')}
              >
                📝 Text Description
              </button>
              <button
                type="button"
                className={`mode-btn ${inputMode === 'voice' ? 'active' : ''}`}
                onClick={() => switchInputMode('voice')}
              >
                🎤 Voice Message
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="form-section">
            <label className="form-label">
              {inputMode === 'text' ? '📄 Description' : '🎤 Voice Message'}
            </label>
            
            {inputMode === 'text' ? (
              <>
                <textarea
                  className="form-textarea"
                  placeholder="Describe the issue in detail..."
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={4}
                />
                <div className="char-count">{formData.description.length}/2000</div>
              </>
            ) : (
              <VoiceRecorder 
                onRecordingComplete={handleVoiceRecordingComplete}
                onRecordingClear={handleVoiceRecordingClear}
              />
            )}
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
                onChange={(e) => handleInputChange("address.street", e.target.value)}
              />
              <input
                className="form-input"
                type="text"
                placeholder="City*"
                value={formData.address.city}
                onChange={(e) => handleInputChange("address.city", e.target.value)}
                required
              />
              <input
                className="form-input"
                type="text"
                placeholder="State/Region"
                value={formData.address.state}
                onChange={(e) => handleInputChange("address.state", e.target.value)}
              />
              <input
                className="form-input"
                type="text"
                placeholder="ZIP/Postal Code"
                value={formData.address.zipCode}
                onChange={(e) => handleInputChange("address.zipCode", e.target.value)}
              />
            </div>
          </div>

          {/* Landmark */}
          <div className="form-section">
            <label className="form-label">📍 Nearby Landmark (Optional)</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g., 'Near City Hall', 'Opposite Metro Station'"
              value={formData.landmark}
              onChange={(e) => handleInputChange("landmark", e.target.value)}
              maxLength={100}
            />
          </div>

          {/* File Upload */}
          <div className="form-section">
            <label className="form-label">📸 Attach Photo/Video</label>
            <div className="file-upload-area">
              <input
                type="file"
                id="file-upload"
                className="file-input"
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
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
                    <span className="upload-icon">📁</span>
                    <span>Choose file to upload</span>
                    <span className="file-types">Images: JPEG, PNG, GIF, WebP | Videos: MP4, WebM, MOV</span>
                  </div>
                )}
              </label>
              
              {file && (
                <div style={{ marginTop: '15px' }}>
                  <button 
                    type="button" 
                    onClick={() => setFile(null)}
                    style={{ 
                      background: '#fed7d7', 
                      color: '#742a2a', 
                      border: 'none', 
                      padding: '6px 12px', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      fontSize: '0.9em'
                    }}
                  >
                    Remove File
                  </button>
                  
                  {file.size > 10 * 1024 * 1024 && (
                    <div style={{ color: '#e53e3e', marginTop: '8px', fontWeight: 'bold' }}>
                      ⚠️ File too large (max 10MB)
                    </div>
                  )}
                  
                  {/* File Preview */}
                  {file.type.startsWith('image/') && (
                    <div style={{ marginTop: '10px', textAlign: 'center' }}>
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Preview"
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '200px', 
                          borderRadius: '8px', 
                          objectFit: 'cover' 
                        }}
                        onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                      />
                    </div>
                  )}
                  
                  {file.type.startsWith('video/') && (
                    <div style={{ marginTop: '10px', textAlign: 'center' }}>
                      <video
                        src={URL.createObjectURL(file)}
                        controls
                        preload="metadata"
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '200px', 
                          borderRadius: '8px' 
                        }}
                        onLoadedMetadata={(e) => URL.revokeObjectURL(e.target.src)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Location Status */}
          <div className="location-section">
            {locationLoading ? (
              <div className="location-status loading">
                🔄 Getting your location...
              </div>
            ) : userLocation ? (
              <div className="location-status success">
                📍 Location detected: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
              </div>
            ) : (
              <div className="location-status warning">
                ⚠️ Location not available. Using address for location reference.
              </div>
            )}
          </div>

          {/* Submit */}
          <button 
            className={`submit-btn ${uploading ? "loading" : ""}`} 
            type="submit" 
            disabled={uploading || locationLoading}
          >
            {uploading ? "🔄 Submitting..." : "📤 Submit Report"}
          </button>

          {message && (
            <div className={`form-message ${
              message.includes("✅") ? "success" : 
              message.includes("⏳") ? "info" : "error"
            }`}>
              {message}
            </div>
          )}
        </form>
      )}
    </div>
  );
}