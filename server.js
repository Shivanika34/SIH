import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Schema & Model
const alertSchema = new mongoose.Schema({
  description: String,
  location: String,
  fileName: String,
  dropboxPath: String,
  timestamp: { type: Date, default: Date.now },
});

const Alert = mongoose.model("Alert", alertSchema);

// Routes
app.post("/api/alerts", async (req, res) => {
  try {
    const { description, location, fileName, dropboxPath } = req.body;

    if (!description || !fileName || !dropboxPath) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const newAlert = new Alert({ description, location, fileName, dropboxPath });
    await newAlert.save();

    res.status(201).json({ message: "Alert saved successfully", alert: newAlert });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Server error while saving alert." });
  }
});

// Health Check
app.get("/", (req, res) => {
  res.send("🌍 Urban Assistant backend is running.");
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
