import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyAqZTn3yNhhfw79tKhXh0_ad2BjuS_bpDA",
  authDomain: "urbanassist-777.firebaseapp.com",
  projectId: "urbanassist-777",
  //storageBucket: "urbanassist-777.firebasestorage.app",
  messagingSenderId: "801881616951",
  appId: "1:801881616951:web:6e1e00184c20a518df45b2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { db,auth };
export default app;

