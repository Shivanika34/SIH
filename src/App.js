import React, { useState, useEffect } from "react";
import UploadForm from "./components/UploadForm.js";
import Login from "./components/Login.js";
import { auth } from "./firebase/config.js"; 
import { onAuthStateChanged } from "firebase/auth";
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div>
      <h1>Urban Assistant</h1>
      {!isLoggedIn ? <Login /> : <UploadForm />}
    </div>
  );
}

export default App;