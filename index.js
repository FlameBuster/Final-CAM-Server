import express from "express";
import bodyParser from "body-parser";
import createError from "http-errors";
import morgan from "morgan";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import fs from "node:fs/promises";
import path from "path";
import {
  loadPdfFilesDataFromFile,
  updatePdfFilesDataToFile,
  pdfFiles,
  loadImageFilesDataFromFile,
  updateImageFilesDataToFile,
  imageFiles,
  loadVideoFilesDataFromFile,
  videoFiles,
  updateVideoFilesDataToFile,
} from "./data.js";
import { MongoClient } from "mongodb";

const app = express();
const uri = "mongodb://localhost:27017/test";
const client = new MongoClient(uri, { useUnifiedTopology: true });
let database;

client
  .connect()
  .then(() => {
    database = client.db("test");
    console.log("Connected to MongoDB");
  })
  .catch((err) => console.error("Error connecting to MongoDB:", err));

const UPLOADS_PDFS_DIR = "uploads/pdfs/";
const UPLOADS_IMAGES_DIR = "uploads/images/";
const UPLOADS_VIDEOS_DIR = "uploads/videos/";

// Ensure directories exist
async function ensureDirectoriesExist() {
  try {
    await fs.mkdir(UPLOADS_PDFS_DIR, { recursive: true });
    await fs.mkdir(UPLOADS_IMAGES_DIR, { recursive: true });
    await fs.mkdir(UPLOADS_VIDEOS_DIR, { recursive: true });
    console.log("Upload directories are ensured.");
  } catch (err) {
    console.error("Error ensuring directories:", err);
  }
}

ensureDirectoriesExist();

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan("dev"));

loadPdfFilesDataFromFile();
loadImageFilesDataFromFile();
loadVideoFilesDataFromFile();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;
    if (file.mimetype === "application/pdf") {
      uploadPath = UPLOADS_PDFS_DIR;
    } else if (file.mimetype.startsWith("image/")) {
      uploadPath = UPLOADS_IMAGES_DIR;
    } else if (file.mimetype.startsWith("video/")) {
      uploadPath = UPLOADS_VIDEOS_DIR;
    } else {
      return cb(new Error("Invalid file type"), "");
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

app.get("/", (req, res, next) => {
  res.status(200).send("Welcome to the CME pdf and image host server");
});

// Login Endpoints

app.get("/login/fetch/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const db = client.db("test");
    const collection = db.collection("login");
    const user = await collection.findOne({ username: username });
    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/signup", async (req, res) => {
  const loginData = req.body.loginData;
  console.log(loginData);
  try {
    if (!database) {
      throw new Error("MongoDB connection not established");
    }

    const collection = database.collection("login");
    await collection.insertOne(loginData);
    console.log("Metadata uploaded to MongoDB:", loginData);
  } catch (error) {
    console.error("Error uploading metadata to MongoDB:", error.message);
    return next(createError(500, "Internal Server Error"));
  }
  res.send({ success: "success" });
});

// PDF Endpoints

app.get("/pdf/data/fetch/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const db = client.db("test");
    const collection = db.collection("books1234");
    const document = await collection.findOne({ _id: id });
    res.json(document); //
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/pdf/fetch", (req, res, next) => {
  const allMetaData = Array.from(pdfFiles.values());
  res.json(allMetaData);
});

app.get("/pdf/fetch/:id", async (req, res, next) => {
  const { id } = req.params;
  const metadata = pdfFiles.get(id);

  if (!metadata) {
    return next(createError(404, "PDF not found"));
  }

  const filePath = metadata.filepath;

  try {
    const data = await fs.readFile(filePath);
    res.contentType("application/pdf").send(data);
  } catch (e) {
    return next(createError(500, "Internal Server Error"));
  }
});

app.post("/pdf/create", upload.single("file"), async (req, res, next) => {
  if (!req.file) {
    return next(createError(400, "No file uploaded"));
  }

  const { originalname, path, size } = req.file;

  const existingFile = Array.from(pdfFiles.values()).find(
    (file) => file.filename === originalname
  );

  if (existingFile) {
    return next(createError(409, "File with the same name already exists"));
  }

  const id = uuidv4();
  const uploadDate = new Date().toISOString();
  const metadata = {
    id,
    filename: originalname,
    filepath: path,
    size,
    uploadDate,
    editDate: uploadDate,
  };

  pdfFiles.set(id, metadata);
  updatePdfFilesDataToFile();
  const metadata2 = {
    _id: id,
    content_path: path,
    metadata: JSON.parse(req.body.metadata),
  };

  // Upload metadata to MongoDB
  try {
    if (!database) {
      throw new Error("MongoDB connection not established");
    }

    const collection = database.collection("books1234");
    await collection.insertOne(metadata2);
    console.log("Metadata uploaded to MongoDB:", metadata);
  } catch (error) {
    console.error("Error uploading metadata to MongoDB:", error.message);
    return next(createError(500, "Internal Server Error"));
  }
  res.send({ success: "success", id });
});

app.patch("/pdf/edit/:id", upload.single("file"), async (req, res, next) => {
  const { id } = req.params;

  if (!pdfFiles.has(id)) {
    return next(createError(404, "PDF not found"));
  }

  const metadata = pdfFiles.get(id);
  const { filename, filepath, size } = metadata;

  if (req.file) {
    const { originalname, path: newFilePath, size: newSize } = req.file;

    const existingFile = Array.from(pdfFiles.values()).find(
      (file) => file.filename === originalname && file.id !== id
    );

    if (existingFile) {
      return next(createError(409, "File with the same name already exists"));
    }

    try {
      await fs.unlink(filepath);
    } catch (err) {
      return next(createError(500, "Error deleting old PDF file"));
    }

    // Update metadata with new file info
    metadata.filename = originalname;
    metadata.filepath = newFilePath;
    metadata.size = newSize;
  }

  const { newFilename, newUploadDate, newEditDate } = req.body;

  if (newFilename) metadata.filename = newFilename;
  if (newUploadDate) metadata.uploadDate = newUploadDate;
  if (newEditDate) metadata.editDate = newEditDate;

  metadata.editDate = new Date().toISOString();

  // Save changes
  pdfFiles.set(id, metadata);
  updatePdfFilesDataToFile();

  res.send({ success: "PDF updated successfully", id });
});

app.delete("/pdf/delete/:id", async (req, res, next) => {
  const { id } = req.params;

  if (!pdfFiles.has(id)) {
    return next(createError(404, "PDF not found"));
  }

  const metadata = pdfFiles.get(id);
  const filePath = metadata.filepath;

  try {
    await fs.unlink(filePath);
    pdfFiles.delete(id);
    updatePdfFilesDataToFile();

    res.send({ success: true, message: "PDF file deleted successfully" });
  } catch (err) {
    next(createError(500, "Error deleting PDF file"));
  }
});

// Image Endpoints

app.get("/image/divisions", async (req, res) => {
  try {
    const db = client.db("test");
    const collection = db.collection("Gallery123");
    const document = await collection.distinct("metadata.Division");
    console.log(document);
    res.json(document);
  } catch (error) {
    console.error("Error fetching divisions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("/image/divisions/:division", async (req, res) => {
  const { division } = req.params;
  try {
    const db = client.db("test");
    const collection = db.collection("Gallery123");

    const cursor = collection.find(
      { "metadata.Division": division },
      { projection: { _id: 1 } }
    );

    const documents = await cursor.toArray();

    console.log(documents);

    res.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/filename/:division", async (req, res) => {
  const { division } = req.params;
  try {
    const db = client.db("test");
    const collection = db.collection("Gallery123");

    const cursor = collection.find(
      { "metadata.Division": division },
      { projection: { filename: 1 } }
    );

    const documents = await cursor.toArray();

    console.log(documents);

    res.json(documents); // Respond with the fetched _id fields
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/image/fetch", (req, res, next) => {
  const allMetaData = Array.from(imageFiles.values());
  res.json(allMetaData);
});

app.get("/image/fetch/:id", async (req, res, next) => {
  const { id } = req.params;
  const metadata = imageFiles.get(id);

  if (!metadata) {
    return next(createError(404, "Image not found"));
  }

  const filePath = metadata.filepath;

  try {
    const data = await fs.readFile(filePath);
    res.contentType("image/jpeg").send(data); // Change the content type as needed
  } catch (e) {
    return next(createError(500, "Internal Server Error"));
  }
});

app.post("/image/create", upload.single("file"), async (req, res, next) => {
  if (!req.file) {
    return next(createError(400, "No file uploaded"));
  }

  const { originalname, path } = req.file;

  const existingFile = Array.from(imageFiles.values()).find(
    (file) => file.filename === originalname
  );

  if (existingFile) {
    return next(createError(409, "File with the same name already exists"));
  }

  const id = uuidv4();
  const uploadDate = new Date().toISOString();
  const metadata = {
    id,
    filename: originalname,
    filepath: path,
    size: req.file.size,
    uploadDate,
    editDate: uploadDate,
  };
  const metadata2 = {
    _id: id,
    content_path: path,
    filename: originalname,
    metadata: JSON.parse(req.body.metadata),
  };
  imageFiles.set(id, metadata);
  updateImageFilesDataToFile();

  try {
    if (!database) {
      throw new Error("MongoDB connection not established");
    }

    const collection = database.collection("Gallery123");
    await collection.insertOne(metadata2);
    console.log("Metadata uploaded to MongoDB:", metadata);
  } catch (error) {
    console.error("Error uploading metadata to MongoDB:", error.message);
    return next(createError(500, "Internal Server Error"));
  }

  res.send({ success: "success", id });
});

app.patch("/image/edit/:id", upload.single("file"), async (req, res, next) => {
  const { id } = req.params;

  if (!imageFiles.has(id)) {
    return next(createError(404, "Image not found"));
  }

  const metadata = imageFiles.get(id);
  const { filename, filepath, size } = metadata;

  // Handle new file upload
  if (req.file) {
    const { originalname, path: newFilePath, size: newSize } = req.file;

    const existingFile = Array.from(imageFiles.values()).find(
      (file) => file.filename === originalname && file.id !== id
    );

    if (existingFile) {
      return next(createError(409, "File with the same name already exists"));
    }

    try {
      await fs.unlink(filepath);
    } catch (err) {
      return next(createError(500, "Error deleting old image file"));
    }

    metadata.filename = originalname;
    metadata.filepath = newFilePath;
    metadata.size = newSize;
  }

  // Update metadata from request body
  const { newFilename, newUploadDate } = req.body;

  if (newFilename) metadata.filename = newFilename;
  if (newUploadDate) metadata.uploadDate = newUploadDate;

  // Always update edit date to current date
  metadata.editDate = new Date().toISOString();

  // Save changes
  imageFiles.set(id, metadata);
  updateImageFilesDataToFile();

  res.send({ success: "Image updated successfully", id });
});

app.delete("/image/delete/:id", async (req, res, next) => {
  const { id } = req.params;

  if (!imageFiles.has(id)) {
    return next(createError(404, "Image not found"));
  }

  const metadata = imageFiles.get(id);
  const filePath = metadata.filepath;

  try {
    await fs.unlink(filePath);
    imageFiles.delete(id);
    updateImageFilesDataToFile();

    res.send({ success: true, message: "Image file deleted successfully" });
  } catch (err) {
    next(createError(500, "Error deleting image file"));
  }
});

//API endpoints for videos

app.post("/video/create", upload.single("file"), async (req, res, next) => {
  if (!req.file) {
    return next(createError(400, "No file uploaded"));
  }

  const { originalname, path, size } = req.file;
  const { description, Division } = JSON.parse(req.body.metadata);

  const existingFile = Array.from(videoFiles.values()).find(
    (file) => file.filename === originalname
  );

  if (existingFile) {
    return next(createError(409, "File with the same name already exists"));
  }

  const id = uuidv4();
  const uploadDate = new Date().toISOString();
  const metadata = {
    id,
    filename: originalname,
    filepath: path,
    size,
    uploadDate,
    editDate: uploadDate,
  };

  const metadata2 = {
    _id: id,
    content_path: path,
    filename: originalname,
    metadata: {
      description,
      Division,
      uploadDate,
    },
  };

  videoFiles.set(id, metadata);
  updateVideoFilesDataToFile();

  try {
    if (!database) {
      throw new Error("MongoDB connection not established");
    }

    const collection = database.collection("Videos123");
    await collection.insertOne(metadata2);
    console.log("Metadata uploaded to MongoDB:", metadata2);
    res.send({ success: "success", id });
  } catch (error) {
    console.error("Error uploading metadata to MongoDB:", error.message);
    return next(createError(500, "Internal Server Error"));
  }
});

app.get("/video/divisions", async (req, res) => {
  try {
    const db = client.db("test");
    const collection = db.collection("Videos123");
    const divisions = await collection.distinct("metadata.Division");
    console.log(divisions);
    res.json(divisions);
  } catch (error) {
    console.error("Error fetching divisions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/video/divisions/:division", async (req, res) => {
  const { division } = req.params;
  try {
    const db = client.db("test");
    const collection = db.collection("Videos123");

    const cursor = collection.find(
      { "metadata.Division": division },
      { projection: { _id: 1 } }
    );

    const documents = await cursor.toArray();
    console.log(documents);
    res.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/video/filename/:division", async (req, res) => {
  const { division } = req.params;
  try {
    const db = client.db("test");
    const collection = db.collection("Videos123");

    const cursor = collection.find(
      { "metadata.Division": division },
      { projection: { filename: 1 } }
    );

    const documents = await cursor.toArray();
    console.log(documents);
    res.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/video/fetch", (req, res, next) => {
  try {
    const allMetaData = Array.from(videoFiles.values());
    res.json(allMetaData);
  } catch (error) {
    console.error("Error fetching video metadata:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/video/fetch/:id", async (req, res, next) => {
  const { id } = req.params;
  const metadata = videoFiles.get(id);

  if (!metadata) {
    return next(createError(404, "Video not found"));
  }

  const filePath = metadata.filepath;

  try {
    const data = await fs.readFile(filePath);
    res.contentType("video/mp4").send(data);
  } catch (error) {
    console.error("Error fetching video:", error);
    return next(createError(500, "Internal Server Error"));
  }
});

app.delete("/video/delete/:id", async (req, res, next) => {
  const { id } = req.params;

  if (!videoFiles.has(id)) {
    return next(createError(404, "Video not found"));
  }

  const metadata = videoFiles.get(id);
  const filePath = metadata.filepath;

  try {
    await fs.unlink(filePath);
    imageFiles.delete(id);
    updateVideoFilesDataToFile();

    res.send({ success: true, message: "Video file deleted successfully" });
  } catch (err) {
    next(createError(500, "Error deleting video file"));
  }
});

// Main

app.use("*", (req, res, next) => {
  next(createError(404, "Resource Not Found"));
});

app.use((err, req, res, next) => {
  const error = {
    status: err.status || 500,
    message: err.message || "Internal Server Error",
  };

  res.status(err.status || 500).send(error);
});

app.listen(8080, () => {
  console.log("The app is running on port 8080");
});
