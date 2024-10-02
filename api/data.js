import fs from "node:fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const PDF_FILES_DATA_FILE = "pdfFiles.json";
const IMAGE_FILES_DATA_FILE = "imageFiles.json";
const VIDEO_FILES_DATA_FILE = "videoFiles.json";

export const pdfFiles = new Map();
export const imageFiles = new Map();
export const videoFiles = new Map();

// Load PDF files data from file
export async function loadPdfFilesDataFromFile() {
  try {
    const data = await fs.readFile(PDF_FILES_DATA_FILE, "utf-8");
    const files = JSON.parse(data);
    for (const file of files) {
      pdfFiles.set(file.id, file);
    }
    console.log("PDF files data loaded from file.");
  } catch (err) {
    console.error("Error loading PDF files data:", err.message);
  }
}

// Update PDF files data to file
export async function updatePdfFilesDataToFile() {
  try {
    const data = JSON.stringify(Array.from(pdfFiles.values()), null, 2);
    await fs.writeFile(PDF_FILES_DATA_FILE, data);
    console.log("PDF files data updated to file.");
  } catch (err) {
    console.error("Error updating PDF files data:", err.message);
  }
}

// Load image files data from file
export async function loadImageFilesDataFromFile() {
  try {
    const data = await fs.readFile(IMAGE_FILES_DATA_FILE, "utf-8");
    const files = JSON.parse(data);
    for (const file of files) {
      imageFiles.set(file.id, file);
    }
    console.log("Image files data loaded from file.");
  } catch (err) {
    console.error("Error loading image files data:", err.message);
  }
}

// Update image files data to file
export async function updateImageFilesDataToFile() {
  try {
    const data = JSON.stringify(Array.from(imageFiles.values()), null, 2);
    await fs.writeFile(IMAGE_FILES_DATA_FILE, data);
    console.log("Image files data updated to file.");
  } catch (err) {
    console.error("Error updating image files data:", err.message);
  }
}

// Load video files data from file
export async function loadVideoFilesDataFromFile() {
  try {
    const data = await fs.readFile(VIDEO_FILES_DATA_FILE, "utf-8");
    const files = JSON.parse(data);
    for (const file of files) {
      videoFiles.set(file.id, file);
    }
    console.log("Video files data loaded from file.");
  } catch (err) {
    console.error("Error loading video files data:", err.message);
  }
}

// Update video files data to file
export async function updateVideoFilesDataToFile() {
  try {
    const data = JSON.stringify(Array.from(videoFiles.values()), null, 2);
    await fs.writeFile(VIDEO_FILES_DATA_FILE, data);
    console.log("Video files data updated to file.");
  } catch (err) {
    console.error("Error updating video files data:", err.message);
  }
}
