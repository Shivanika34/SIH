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
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import "../styles/CommunityFeed.css";

const CATEGORIES = {
  'roads_transport': { label: '🛣️ Roads & Transport', color: '#e53e3e' },
  'water_sewage': { label: '💧 Water & Sewage', color: '#3182ce' },
  'electricity': { label: '⚡ Electricity', color: '#d69e2e' },
  'waste_management': { label: '🗑️ Sanitation & Waste', color: '#38a169' },
  'public_safety': { label: '🚨 Public Safety', color: '#dd6b20' },
  'parks_recreation': { label: '🌳 Parks & Recreation', color: '#00a3c4' },
  'street_lighting': { label: '🏮 Street Lighting', color: '#805ad5' },
  'other': { label: '📝 Other Issues', color: '#718096' }
};

const STATUS_COLORS = {
  'submitted': '#718096',
  'validated': '#3182ce',
  'in_progress': '#d69e2e',
  'resolved': '#38a169',
  'rejected': '#e53e3e'
};

export default function CommunityFeed() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState({});
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch user's previous votes
    const fetchUserVotes = async () => {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        setUserVotes(userDoc.data().votes || {});
      }
    };
    fetchUserVotes();

    // Listen to reports in real-time
    let q = query(collection(db, "reports"));
    
    if (sortBy === 'newest') {
      q = query(q, orderBy("createdAt", "desc"));
    } else if (sortBy === 'popular') {
      q = query(q, orderBy("votes.totalVotes", "desc"));
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const reportsData = [];
      querySnapshot.forEach((doc) => {
        reportsData.push({ id: doc.id, ...doc.data() });
      });
      
      // Filter reports based on current filter
      let filteredReports = reportsData;
      if (filter !== 'all') {
        filteredReports = reportsData.filter(report => report.category === filter);
      }
      
      setReports(filteredReports);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filter, sortBy]);

  const handleVote = async (reportId, voteType) => {
    if (!auth.currentUser) return;

    const userId = auth.currentUser.uid;
    const reportRef = doc(db, "reports", reportId);
    const userRef = doc(db, "users", userId);
    
    try {
      // Check if user already voted on this report
      const currentVote = userVotes[reportId];
      
      let voteChanges = {};
      let trustScoreChange = 0;
      let userVoteUpdates = { ...userVotes };

      if (currentVote === voteType) {
        // Remove vote
        voteChanges[`votes.${voteType}s`] = increment(-1);
        voteChanges["votes.totalVotes"] = increment(-1);
        delete userVoteUpdates[reportId];
        trustScoreChange = voteType === 'upvote' ? -2 : 1; // Lose points for removing upvote
      } else {
        if (currentVote) {
          // Change vote type
          voteChanges[`votes.${currentVote}s`] = increment(-1);
          voteChanges[`votes.${voteType}s`] = increment(1);
          // Total votes stay the same
          trustScoreChange = voteType === 'upvote' ? 3 : -1; // +3 for upvote, -1 for downvote
        } else {
          // New vote
          voteChanges[`votes.${voteType}s`] = increment(1);
          voteChanges["votes.totalVotes"] = increment(1);
          trustScoreChange = voteType === 'upvote' ? 2 : -1; // +2 for upvote, -1 for downvote
        }
        userVoteUpdates[reportId] = voteType;
      }

      // Update report votes
      await updateDoc(reportRef, voteChanges);
      
      // Update user's vote history and trust score
      await updateDoc(userRef, {
        votes: userVoteUpdates,
        votesGiven: increment(1),
        trustScore: increment(trustScoreChange)
      });

      setUserVotes(userVoteUpdates);

    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const reportTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - reportTime) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const getStatusBadge = (status) => {
    const statusLabels = {
      'submitted': 'Submitted',
      'validated': 'Validated',
      'in_progress': 'In Progress',
      'resolved': 'Resolved',
      'rejected': 'Rejected'
    };
    
    return (
      <span 
        className="status-badge" 
        style={{ backgroundColor: STATUS_COLORS[status] }}
      >
        {statusLabels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="feed-loading">
        <div className="loading-spinner">🔄</div>
        <p>Loading community reports...</p>
      </div>
    );
  }

  return (
    <div className="community-feed">
      <div className="feed-header">
        <h1>🏙️ Community Reports</h1>
        <p>Vote on reports to help prioritize community issues</p>
      </div>

      <div className="feed-controls">
        <div className="filter-section">
          <label>Filter by Category:</label>
          <select 
            className="filter-select"
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORIES).map(([key, category]) => (
              <option key={key} value={key}>{category.label}</option>
            ))}
          </select>
        </div>

        <div className="sort-section">
          <label>Sort by:</label>
          <select 
            className="sort-select"
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="popular">Most Voted</option>
          </select>
        </div>
      </div>

      <div className="reports-grid">
        {reports.length === 0 ? (
          <div className="no-reports">
            <p>No reports found for the selected filter.</p>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="report-card">
              <div className="report-header">
                <div className="report-meta">
                  <span 
                    className="category-badge"
                    style={{ backgroundColor: CATEGORIES[report.category]?.color }}
                  >
                    {CATEGORIES[report.category]?.label}
                  </span>
                  {getStatusBadge(report.status)}
                  <span className="report-time">
                    {formatTimeAgo(report.createdAt)}
                  </span>
                </div>
              </div>

              <div className="report-content">
                <h3 className="report-title">{report.title}</h3>
                <p className="report-description">{report.description}</p>
                
                <div className="report-location">
                  📍 {report.address?.city}, {report.address?.state}
                  {report.landmark && ` • ${report.landmark}`}
                </div>

                {report.media && report.media.length > 0 && (
                  <div className="report-media">
                    <span className="media-indicator">
                      📸 {report.media.length} attachment(s)
                    </span>
                  </div>
                )}
              </div>

              <div className="report-actions">
                <div className="voting-section">
                  <button
                    className={`vote-btn upvote ${userVotes[report.id] === 'upvote' ? 'active' : ''}`}
                    onClick={() => handleVote(report.id, 'upvote')}
                  >
                    👍 {report.votes?.upvotes || 0}
                  </button>
                  
                  <button
                    className={`vote-btn downvote ${userVotes[report.id] === 'downvote' ? 'active' : ''}`}
                    onClick={() => handleVote(report.id, 'downvote')}
                  >
                    👎 {report.votes?.downvotes || 0}
                  </button>
                </div>

                <div className="report-stats">
                  <span className="views">👀 {report.views || 0}</span>
                  <span className="total-votes">
                    🗳️ {report.votes?.totalVotes || 0} votes
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}