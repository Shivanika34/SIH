export async function uploadToFirebase({ description, location, file, dropboxPath }) {
  if (!file || !file.name) {
    throw new Error("File is missing or invalid.");
  }

  const { db } = await import("../firebase/config");
  const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");

  return await addDoc(collection(db, "uploads"), {
    description,
    location,
    fileName: file.name,
    dropboxPath,
    timestamp: serverTimestamp(),
  });
}

export async function uploadToMongo({ description, location, fileName, dropboxPath }) {
  if (!fileName || !dropboxPath) {
    throw new Error("Missing required metadata.");
  }

  const res = await fetch("http://localhost:5000/api/alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description,
      location,
      fileName,
      dropboxPath,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`MongoDB upload failed: ${errorText}`);
  }

  return await res.json();
}
