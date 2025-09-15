import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase/config.js";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  increment, 
  getDoc,
  where,
  limit,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import "../styles/CommunityFeed.css";

// Helper: Convert Dropbox share URL to direct content URL
function getDropboxDirectLink(dropboxUrl) {
  if (!dropboxUrl || typeof dropboxUrl !== "string") return null;
  let url = dropboxUrl.trim();
  if (!url.startsWith("https://")) {
    url = "https://" + url;
  }
  url = url.replace(/^https:\/\/(www\.)?dropbox\.com/, "https://dl.dropboxusercontent.com");
  if (url.includes("?dl=0") || url.includes("?dl=1")) {
    url = url.replace(/\?dl=[01]/, "?raw=1");
  } else if (!url.includes("?raw=1")) {
    url += "?raw=1";
  }
  return url;
}

// Helper: Safely get image URL from report object
function getImageUrl(report) {
  const url = report.dropboxPath || report.dropboxShareLink || report.media;
  if (Array.isArray(url)) return url[0];
  if (typeof url === "object" && url !== null) return null;
  return url || null;
}

// Image Modal Component
const ImageModal = ({ src, alt, isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <img src={src} alt={alt} className="modal-image" />
      </div>
    </div>
  );
};

// Audio Player Component (same as yours)
const AudioPlayer = ({ audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = React.useRef();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };
    const setAudioTime = () => setCurrentTime(audio.currentTime);
    audio.addEventListener("loadeddata", setAudioData);
    audio.addEventListener("timeupdate", setAudioTime);
    audio.addEventListener("ended", () => setIsPlaying(false));
    return () => {
      audio.removeEventListener("loadeddata", setAudioData);
      audio.removeEventListener("timeupdate", setAudioTime);
      audio.removeEventListener("ended", () => setIsPlaying(false));
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (isPlaying) audio.pause();
    else audio.play();
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="audio-player">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button className="play-pause-btn" onClick={togglePlayPause}>
        {isPlaying ? "⏸️" : "▶️"}
      </button>
      <div className="audio-progress">
        <div className="audio-progress-bar" style={{ width: `${(currentTime / duration) * 100 || 0}%`}} />
      </div>
      <div className="audio-time">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  );
};

const CATEGORIES = {
  roads_transport: { label: "🛣️ Roads & Transport", color: "#e53e3e" },
  water_sewage: { label: "💧 Water & Sewage", color: "#3182ce" },
  electricity: { label: "⚡ Electricity", color: "#d69e2e" },
  waste_management: { label: "🗑️ Sanitation & Waste", color: "#38a169" },
  public_safety: { label: "🚨 Public Safety", color: "#dd6b20" },
  parks_recreation: { label: "🌳 Parks & Recreation", color: "#00a3c4" },
  street_lighting: { label: "🏮 Street Lighting", color: "#805ad5" },
  other: { label: "📝 Other Issues", color: "#718096" },
};

const PRIORITY_COLORS = {
  low: "#68d391",
  medium: "#fbb03b",
  high: "#f56565",
  critical: "#e53e3e",
};

const STATUS_COLORS = {
  pending: "#718096",
  validated: "#3182ce",
  in_progress: "#d69e2e",
  resolved: "#38a169",
  rejected: "#e53e3e",
};

export default function CommunityFeed() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState({});
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedImage, setSelectedImage] = useState(null);
  const [expandedReports, setExpandedReports] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    const fetchUserVotes = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserVotes(userDoc.data().votes || {});
        }
      } catch (error) {
        console.error("Error fetching user votes:", error);
      }
    };
    fetchUserVotes();

    let q = collection(db, "reports");

    if (filter !== "all") {
      q = query(q, where("category", "==", filter));
    }

    if (statusFilter !== "all") {
      q = query(q, where("status", "==", statusFilter));
    }

    if (sortBy === "newest") {
      q = query(q, orderBy("createdAt", "desc"));
    } else if (sortBy === "popular") {
      q = query(q, orderBy("votes", "desc"));
    }

    q = query(q, limit(50));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const reportsData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          let createdAtDate;
          if (data.createdAt) {
            createdAtDate = typeof data.createdAt.toDate === "function" ? data.createdAt.toDate() : new Date(data.createdAt);
          } else if (data.timestamp) {
            createdAtDate = new Date(data.timestamp);
          } else {
            createdAtDate = new Date();
          }
          reportsData.push({
            id: doc.id,
            ...data,
            votes: typeof data.votes === "object" ? data.votes : data.votes || 0,
            votesCount: typeof data.votes === "object" ? data.votes?.totalVotes || 0 : data.votes || 0,
            createdAt: createdAtDate,
          });
        });
        setReports(reportsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching reports:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filter, sortBy, statusFilter]);

  const handleVote = async (reportId, voteType) => {
    if (!auth.currentUser) {
      alert("Please log in to vote on reports");
      return;
    }
    const userId = auth.currentUser.uid;
    const reportRef = doc(db, "reports", reportId);
    const userRef = doc(db, "users", userId);

    try {
      const currentVote = userVotes[reportId];
      let voteUpdate = {};
      let trustScoreChange = 0;
      let userVoteUpdates = { ...userVotes };

      if (currentVote === voteType) {
        voteUpdate.votes = increment(-1);
        delete userVoteUpdates[reportId];
        trustScoreChange = voteType === "upvote" ? -1 : 0;
      } else {
        if (currentVote) {
          userVoteUpdates[reportId] = voteType;
          trustScoreChange = voteType === "upvote" ? 2 : -2;
        } else {
          voteUpdate.votes = increment(voteType === "upvote" ? 1 : -1);
          userVoteUpdates[reportId] = voteType;
          trustScoreChange = voteType === "upvote" ? 1 : -1;
        }
      }

      if (Object.keys(voteUpdate).length > 0) {
        await updateDoc(reportRef, voteUpdate);
      }

      await updateDoc(userRef, {
        votes: userVoteUpdates,
        trustScore: increment(trustScoreChange),
      });

      setUserVotes(userVoteUpdates);
    } catch (error) {
      console.error("Error voting:", error);
      alert("Failed to record your vote. Please try again.");
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const statusLabels = {
      pending: "Pending",
      validated: "Validated",
      in_progress: "In Progress",
      resolved: "Resolved",
      rejected: "Rejected",
    };
    return (
      <span className="status-badge" style={{ backgroundColor: STATUS_COLORS[status || "pending"] }}>
        {statusLabels[status || "pending"]}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityLabels = {
      low: "Low",
      medium: "Medium",
      high: "High",
      critical: "Critical",
    };
    return (
      <span className="priority-badge" style={{ backgroundColor: PRIORITY_COLORS[priority || "medium"] }}>
        {priorityLabels[priority || "medium"]}
      </span>
    );
  };

  const isVideoFile = (url, fileInfo) => {
    if (fileInfo?.type) {
      return fileInfo.type.startsWith("video/");
    }
    if (!url || typeof url !== "string") {
      return false;
    }
    const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv"];
    return videoExtensions.some((ext) => url.toLowerCase().includes(ext));
  };

  const openImageModal = (imageUrl, reportTitle) => {
    setSelectedImage({ url: imageUrl, alt: reportTitle });
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  if (loading) {
    return (
      <div className="feed-loading">
        <div className="loading-spinner">🔄</div>
        <p>Loading community reports...</p>
      </div>
    );
  }

  if (!auth.currentUser) {
    return (
      <div className="feed-auth-required">
        <h2>Login Required</h2>
        <p>Please log in to view community reports</p>
      </div>
    );
  }

  return (
    <div className="community-feed">
      <div className="feed-header">
        <h1>🏙️ Community Reports</h1>
        <p>Vote on reports to help prioritize community issues</p>
        <div className="stats-summary">
          {reports.length} {reports.length === 1 ? "report" : "reports"} found
        </div>
      </div>

      <div className="feed-controls">
        <div className="filter-section">
          <label>Category:</label>
          <select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {Object.entries(CATEGORIES).map(([key, category]) => (
              <option key={key} value={key}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-section">
          <label>Status:</label>
          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="validated">Validated</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="sort-section">
          <label>Sort by:</label>
          <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="popular">Most Voted</option>
          </select>
        </div>
      </div>

      <div className="reports-grid">
        {reports.length === 0 ? (
          <div className="no-reports">
            <p>📭 No reports found for the selected filters.</p>
            <p>Try adjusting your filter settings or check back later.</p>
          </div>
        ) : (
          reports.map((report) => {
            const rawUrl = getImageUrl(report);
            const imageUrl = getDropboxDirectLink(rawUrl);
            const isVideo = isVideoFile(imageUrl, report.fileInfo);
            return (
              <div key={report.id} className="report-card">
                <div className="report-header">
                  <div className="report-meta">
                    <span className="category-badge" style={{ backgroundColor: CATEGORIES[report.category]?.color }}>
                      {CATEGORIES[report.category]?.label}
                    </span>
                    {getPriorityBadge(report.priority)}
                    {getStatusBadge(report.status)}
                    <span className="report-time">{formatTimeAgo(report.createdAt)}</span>
                  </div>
                  <div className="trust-score-display">Trust: {report.trustScore || 100}</div>
                </div>

                <div className="report-content">
                  <h3 className="report-title">{report.title}</h3>
                  <p className="report-description">
                    {report.description.length > 200 ? `${report.description.substring(0, 200)}...` : report.description}
                  </p>

                  <div className="report-location">
                    📍 {report.location?.readableLocation || `${report.address?.city}, ${report.address?.state}` || "Location not available"}
                    {report.landmark && <span className="landmark"> • Near {report.landmark}</span>}
                  </div>

                  {report.voiceMessage && (
                    <div className="voice-message-container">
                      <div className="voice-message-header">🎤 Voice Description</div>
                      <AudioPlayer audioUrl={getDropboxDirectLink(report.voiceMessage)} />
                    </div>
                  )}

                  {imageUrl && (
                    <div className="report-media">
                      {isVideo ? (
                        <div className="video-container">
                          <video
                            src={imageUrl}
                            controls
                            className="media-content video-content"
                            preload="metadata"
                            poster={report.thumbnailUrl}
                            onError={(e) => {
                              console.error("Video failed to load:", imageUrl);
                              e.target.parentElement.innerHTML = '<div class="media-error">📹 Video unavailable</div>';
                            }}
                          >
                            Your browser does not support video playback.
                          </video>
                        </div>
                      ) : (
                        <div className="image-container">
                          <img
                            src={imageUrl}
                            alt={`${report.title} - Evidence photo`}
                            className="media-content image-content"
                            loading="lazy"
                            onClick={() => openImageModal(imageUrl, report.title)}
                            onError={(e) => {
                              console.error("Image failed to load:", imageUrl);
                              e.target.parentElement.innerHTML = '<div class="media-error">🖼️ Image unavailable</div>';
                            }}
                          />
                          <div className="image-overlay">
                            <span className="zoom-icon">🔍</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="report-actions">
                  <div className="voting-section">
                    <button
                      className={`vote-btn upvote ${userVotes[report.id] === "upvote" ? "active" : ""}`}
                      onClick={() => handleVote(report.id, "upvote")}
                      title="This report is helpful/important"
                    >
                      👍 {typeof report.votes === "object" ? report.votes?.upvotes || 0 : Math.max(0, report.votesCount || 0)}
                    </button>

                    <button
                      className={`vote-btn downvote ${userVotes[report.id] === "downvote" ? "active" : ""}`}
                      onClick={() => handleVote(report.id, "downvote")}
                      title="This report is not helpful/accurate"
                    >
                      👎 {typeof report.votes === "object" ? report.votes?.downvotes || 0 : ""}
                    </button>
                  </div>

                  <div className="report-stats">
                    <span className="vote-count">
                      🗳️ {report.votesCount || 0} {Math.abs(report.votesCount || 0) === 1 ? "vote" : "votes"}
                    </span>
                    {report.userId && (
                      <span className="reporter-info">👤 Reporter Trust: {report.trustScore || 100}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {reports.length >= 50 && (
        <div className="load-more-notice">
          <p>Showing first 50 reports. Use filters to narrow down results.</p>
        </div>
      )}

      {/* Image Modal */}
      <ImageModal src={selectedImage?.url} alt={selectedImage?.alt} isOpen={!!selectedImage} onClose={closeImageModal} />
    </div>
  );
}
