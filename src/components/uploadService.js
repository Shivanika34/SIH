
// export async function uploadToFirebase({ description, location, file, dropboxPath, dropboxShareLink }) {
//   if (!file || !file.name) {
//     throw new Error("File is missing or invalid.");
//   }

//   const { db } = await import("../firebase/config.js");
//   const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");

//   // ✅ Convert Dropbox link to direct link
//   let mediaUrl = dropboxShareLink;
//   if (dropboxShareLink && dropboxShareLink.includes("dropbox.com")) {
//     mediaUrl = dropboxShareLink.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
//   }

//   // ✅ Save in Firestore with actual link, not just file name
//   return await addDoc(collection(db, "uploads"), {
//     description,
//     location, // { lat, lng }
//     media: mediaUrl, // 🔥 this is the important part
//     fileName: file.name,
//     dropboxPath,
//     timestamp: serverTimestamp(),
//   });
// }
 
// // uploadService.js

// export async function getReadableLocation(lat, lng) {
//   try {
//     const response = await fetch(
//       `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
//     );
//     if (!response.ok) return null;
//     const data = await response.json();
//     return data.display_name || null;
//   } catch (err) {
//     console.error("Failed to fetch location name:", err);
//     return null;
//   }
// }

// export const uploadToMongo = async (metadata) => {
//   const response = await fetch("http://localhost:5000/api/upload", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(metadata),
//   });

//   if (!response.ok) {
//     const errorText = await response.text();
//     throw new Error(`Failed to save metadata: ${errorText}`);
//   }

//   return response.json();
// };
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/config.js";

export const uploadToFirestore = async (data) => {
  try {
    const docRef = await addDoc(collection(db, "reports"), {
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
      status: "pending"
    });
    return docRef.id;
  } catch (error) {
    console.error("Error uploading to Firestore:", error);
    throw error;
  }
};

export const getReadableLocation = async (lat, lng) => {
  try {
    // Using Google Geocoding API (replace with your API key)
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=YOUR_API_KEY`
    );
    const data = await response.json();
    return data.results[0]?.formatted_address || `${lat}, ${lng}`;
  } catch (error) {
    console.error("Error getting readable location:", error);
    return `${lat}, ${lng}`;
  }
};