export async function uploadToFirebase({ description, location, file, dropboxPath }) {
  if (!file || !file.name) {
    throw new Error("File is missing or invalid.");
  }

  const { db } = await import("../firebase/config.js");
  const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");

  return await addDoc(collection(db, "uploads"), {
    description,
    location,
    fileName: file.name,
    dropboxPath,
    timestamp: serverTimestamp(),
  });
}

export const uploadToMongo = async (metadata) => {
  const response = await fetch("http://localhost:5000/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save metadata: ${errorText}`);
  }

  return response.json();
};