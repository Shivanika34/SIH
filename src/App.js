import React, { useState, useEffect } from "react";
import UploadForm from "./components/UploadForm.js"; // ✅ default import
import Login from "./components/Login.js";
import CommunityFeed from "./components/CommunityFeed.js";
import { auth, db } from "./firebase/config.js"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import './App.css';

const USER_ROLES = {
  CITIZEN: 'citizen',
  DEPARTMENT: 'department',
  ADMIN: 'admin'
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentView, setCurrentView] = useState('feed'); // 'feed' or 'report'
  const [loading, setLoading] = useState(true);
  const [userTrustScore, setUserTrustScore] = useState(0);

  // useEffect(() => {
  //   const unsubscribe = onAuthStateChanged(auth, async (user) => {
  //     if (user) {
  //       setIsLoggedIn(true);
        
  //       // Fetch user role and data
  //       try {
  //         const userDoc = await getDoc(doc(db, "users", user.uid));
  //         if (userDoc.exists()) {
  //           const userData = userDoc.data();
  //           setUserRole(userData.role);
  //           setUserTrustScore(userData.trustScore || 100);
  //         }
  //       } catch (error) {
  //         console.error("Error fetching user data:", error);
  //       }
  //     } else {
  //       setIsLoggedIn(false);
  //       setUserRole(null);
  //       setUserTrustScore(0);
  //     }
  //     setLoading(false);
  //   });
  //   return () => unsubscribe();
  // }, []);
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("User logged in:", user.uid); // Debug log
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("User data:", userData); // Debug log
        setUserRole(userData.role);
        setUserTrustScore(userData.trustScore || 0);
      } else {
        console.log("No user document found!"); // Debug log
      }
      setIsLoggedIn(true);
    } else {
      console.log("No user logged in"); // Debug log
      setIsLoggedIn(false);
      setUserRole(null);
    }
    setLoading(false);
  });

  return () => unsubscribe();
}, []);
  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const getRoleDisplay = (role) => {
    const roleDisplays = {
      [USER_ROLES.CITIZEN]: '👤 Citizen',
      [USER_ROLES.DEPARTMENT]: '🏛️ Department Staff',
      [USER_ROLES.ADMIN]: '⚙️ Administrator'
    };
    return roleDisplays[role] || '👤 User';
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">🔄</div>
        <p>Loading Urban Assistant...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title">🏙️ Urban Assistant</h1>
            <p className="app-subtitle">Community-driven civic reporting</p>
          </div>
          
          <div className="header-right">
            <div className="user-info">
              <div className="user-details">
                <span className="user-role">{getRoleDisplay(userRole)}</span>
                <span className="user-email">{auth.currentUser?.email}</span>
                <span className="trust-score">Trust Score: {userTrustScore}</span>
              </div>
              <button className="sign-out-btn" onClick={handleSignOut}>
                🚪 Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Navigation for citizens */}
        {userRole === USER_ROLES.CITIZEN && (
          <nav className="app-nav">
            <button 
              className={`nav-btn ${currentView === 'feed' ? 'active' : ''}`}
              onClick={() => setCurrentView('feed')}
            >
              🏙️ Community Feed
            </button>
            <button 
              className={`nav-btn ${currentView === 'report' ? 'active' : ''}`}
              onClick={() => setCurrentView('report')}
            >
              📤 Report Issue
            </button>
          </nav>
        )}
      </header>

      <main className="app-main">
        {/* Different views based on user role */}
        {userRole === USER_ROLES.CITIZEN && (
          <>
            {currentView === 'feed' && <CommunityFeed />}
            {currentView === 'report' && <UploadForm />}
          </>
        )}

        {userRole === USER_ROLES.DEPARTMENT && (
          <div className="department-dashboard">
            <div className="coming-soon">
              <h2>🏛️ Department Dashboard</h2>
              <p>Department interface coming soon...</p>
              <p>This will include:</p>
              <ul>
                <li>Assigned reports management</li>
                <li>Status updates and communications</li>
                <li>Resource allocation tools</li>
                <li>Progress tracking</li>
              </ul>
            </div>
          </div>
        )}

        {userRole === USER_ROLES.ADMIN && (
          <div className="admin-dashboard">
            <div className="coming-soon">
              <h2>⚙️ Administrator Dashboard</h2>
              <p>Admin interface coming soon...</p>
              <p>This will include:</p>
              <ul>
                <li>System-wide analytics</li>
                <li>User management</li>
                <li>Report validation</li>
                <li>Department coordination</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
