import express from "express";
import { MongoClient } from "mongodb";

const app = express();

// MongoDB connection URI
const uri = "mongodb://localhost:27017/test";

// Connect to MongoDB
const client = new MongoClient(uri, { useUnifiedTopology: true });
client
  .connect()
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

// Define a route to handle GET requests
app.get("/fetch-data/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const db = client.db("test");
    const collection = db.collection("books1234"); // Replace "your_collection_name" with your actual collection name
    const document = await collection.findOne({ _id: id }); // Fetch document by _id
    res.json(document); // Respond with the fetched document
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
