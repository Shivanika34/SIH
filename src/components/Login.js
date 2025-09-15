import React, { useState } from "react";
import { auth, db } from "../firebase/config.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import "../styles/Login.css";

const USER_ROLES = {
  CITIZEN: 'citizen',
  DEPARTMENT: 'department', 
  ADMIN: 'admin'
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState(USER_ROLES.CITIZEN);
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      setMessage("⚠️ Please fill in all fields");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      let userCredential;
      
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Verify user role
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role !== selectedRole) {
            setMessage("❌ Invalid role selection for this account");
            await auth.signOut();
            setLoading(false);
            return;
          }
        }
        
        setMessage("✅ Logged in successfully!");
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Store user role and initial data
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email: email,
          role: selectedRole,
          trustScore: 100, // Initial trust score
          reportsSubmitted: 0,
          votesGiven: 0,
          createdAt: new Date().toISOString(),
          isActive: true
        });
        
        setMessage("✅ Account created successfully!");
      }
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🏙️ Urban Assistant</h1>
          <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
          <p>{isLogin ? "Sign in to your account" : "Join our community"}</p>
        </div>

        <form className="login-form" onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label htmlFor="role">Select Role</label>
            <select 
              id="role"
              className="form-select"
              value={selectedRole} 
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value={USER_ROLES.CITIZEN}>👤 Citizen</option>
              <option value={USER_ROLES.DEPARTMENT}>🏛️ Department Staff</option>
              <option value={USER_ROLES.ADMIN}>⚙️ Administrator</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              className="form-input"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            className={`login-btn ${loading ? 'loading' : ''}`}
            onClick={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <span>🔄 Processing...</span>
            ) : (
              <span>{isLogin ? "Sign In" : "Create Account"}</span>
            )}
          </button>

          <div className="login-switch">
            <p>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button"
                className="switch-btn"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>

          {message && (
            <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
