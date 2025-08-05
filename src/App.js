import React, { useState, useEffect } from "react";
import UploadForm from "./components/UploadForm";
import Login from "./components/Login";
import { auth } from "./firebase/config"; // Adjust the path if needed
import { onAuthStateChanged } from "firebase/auth";

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