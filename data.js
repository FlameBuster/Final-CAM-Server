import fs from "node:fs/promises";

const DATA_FILE_PATH = "pdfFilesData.json";
const IMAGE_FILE_PATH = "imageFilesData.json";
const VIDEO_FILE_PATH = "videoFilesData.json";

let pdfFiles = new Map();
let imageFiles = new Map();
let videoFiles = new Map();

export async function savedPdfFilesDataToFile() {
  const data = JSON.stringify(Array.from(pdfFiles.entries()));
  await fs.writeFile(DATA_FILE_PATH, data);
}

export async function savedImageFilesDataToFile() {
  const data = JSON.stringify(Array.from(imageFiles.entries()));
  await fs.writeFile(IMAGE_FILE_PATH, data);
}

export async function savedVideoFilesDataToFile() {
  const data = JSON.stringify(Array.from(videoFiles.entries()));
  await fs.writeFile(VIDEO_FILE_PATH, data);
}

export async function loadPdfFilesDataFromFile() {
  try {
    const data = await fs.readFile(DATA_FILE_PATH, "utf-8");
    if (data.trim() === "") {
      console.error("Nothing to load for PDF files...");
      return;
    }
    const entries = JSON.parse(data);
    pdfFiles = new Map(entries);
  } catch (err) {
    console.error("Error loading pdfFiles data from file:", err);
    pdfFiles = new Map();
  }
}

export async function loadImageFilesDataFromFile() {
  try {
    const data = await fs.readFile(IMAGE_FILE_PATH, "utf-8");
    if (data.trim() === "") {
      console.error("Nothing to load for image files...");
      return;
    }
    const entries = JSON.parse(data);
    imageFiles = new Map(entries);
  } catch (err) {
    console.error("Error loading imageFiles data from file:", err);
    imageFiles = new Map();
  }
}

export async function loadVideoFilesDataFromFile() {
  try {
    const data = await fs.readFile(VIDEO_FILE_PATH, "utf-8");
    if (data.trim() === "") {
      console.error("Nothing to load for video files...");
      return;
    }
    const entries = JSON.parse(data);
    videoFiles = new Map(entries);
  } catch (err) {
    console.error("Error loading videoFiles data from file:", err);
    videoFiles = new Map();
  }
}

export function updatePdfFilesDataToFile() {
  savedPdfFilesDataToFile()
    .then(() => console.log("PDF files data updated successfully"))
    .catch((err) => console.error("Error updating PDF files data:", err));
}

export function updateImageFilesDataToFile() {
  savedImageFilesDataToFile()
    .then(() => console.log("Image files data updated successfully"))
    .catch((err) => console.error("Error updating Image files data:", err));
}

export function updateVideoFilesDataToFile() {
  savedVideoFilesDataToFile()
    .then(() => console.log("Video files data updated successfully"))
    .catch((err) => console.error("Error updating Video files data:", err));
}

export { pdfFiles, imageFiles, videoFiles };