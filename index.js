import rtms from "@zoom/rtms";
import chalk from "chalk";
import boxen from "boxen";
import gradient from "gradient-string";
import figlet from "figlet";
import _ from "lodash";

// Configuration
const WIDTH = 60;
const TARGET_MB = 1; // Target data streaming size in MB

// State tracking
let totalBytes = 0;
let startTime = null;
let participants = new Set();
let lastSamples = [];

const titleGradient = gradient(["#FF4081", "#7C4DFF", "#00BCD4"]);
const waveformGradient = gradient(["#03A9F4", "#00BCD4", "#009688", "#4CAF50"]);
const volumeGradient = gradient(["#E91E63", "#9C27B0", "#673AB7", "#3F51B5"]);
const progressGradient = gradient(["#FF5722", "#FF9800", "#FFC107", "#FFEB3B", "#8BC34A", "#4CAF50"]);

// ASCII visualization characters
const waveChars = "▁▂▃▄▅▆▇█";
const progressChars = "█▓▒░";


// Format time as mm:ss
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function createWaveform(data, width) {
  // Sample the buffer at regular intervals
  const step = Math.floor(data.length / width);
  let result = "";
  
  for (let i = 0; i < width; i++) {
    const pos = i * step;
    if (pos < data.length) {
      // Convert 8-bit audio (0-255) to normalized (0-1)
      const normalized = Math.abs((data[pos] - 128) / 128);
      const idx = Math.min(Math.floor(normalized * waveChars.length), waveChars.length - 1);
      result += waveChars[idx];
    } else {
      result += waveChars[0];
    }
  }
  
  return result;
}

function createSpectrum(data, width) {
  // Group samples into frequency buckets
  const buckets = [];
  const bucketSize = Math.floor(data.length / width);
  
  for (let i = 0; i < width; i++) {
    const start = i * bucketSize;
    const end = start + bucketSize;
    const samples = data.slice(start, end);
    
    // Calculate average energy in this frequency range
    const energy = samples.reduce((sum, val) => sum + Math.abs(val - 128), 0) / samples.length;
    buckets.push(energy / 128); // Normalize to 0-1 range
  }
  
  // Create the visualization with ASCII bars
  let result = "";
  for (let i = 0; i < buckets.length; i++) {
    const idx = Math.min(Math.floor(buckets[i] * waveChars.length), waveChars.length - 1);
    result += waveChars[idx];
  }
  
  return result;
}

// Maintain a buffer of recent samples for a moving waveform
function updateSampleBuffer(data, width) {
  // Add new samples to buffer
  for (let i = 0; i < data.length; i += width) {
    if (lastSamples.length >= width * 2) {
      lastSamples.shift();
    }
    lastSamples.push(data[i % data.length]);
  }
  
  // Ensure buffer doesn't grow too large
  if (lastSamples.length > width * 2) {
    lastSamples = lastSamples.slice(-width * 2);
  }
  
  return lastSamples;
}

function createProgressBar(current, total, width) {
  const progress = Math.min(current / total, 1);
  const barWidth = Math.floor(progress * width);
  return progressChars[0].repeat(barWidth) + progressChars[3].repeat(width - barWidth);
}

// Set up buffer to reduce screen flicker
let displayBuffer = '';
let updateCount = 0;
const REFRESH_RATE = 3; // Update screen every N audio packets

function visualize(data, user, ts, meta) {
  if (!startTime) startTime = Date.now();
  
  // Update state
  totalBytes += data.length;
  if (user) participants.add(user);
  const meetingDuration = Date.now() - startTime;
  
  // Update sample buffer for the moving waveform
  updateSampleBuffer(data, WIDTH);
  
  // Calculate progress percentage
  const targetBytes = TARGET_MB * 1024 * 1024;
  const progress = Math.min(totalBytes / targetBytes, 1);
  
  // Only update the display occasionally to reduce flicker
  updateCount++;
  if (updateCount % REFRESH_RATE !== 0 && displayBuffer) {
    return;
  }
  
  const title = figlet.textSync("RTMS Viz", { font: "Small" });
  
  const header = boxen(
    titleGradient(title) + "\n" +
    chalk.cyan("Zoom Realtime Media Streams Visualizer"),
    { 
      padding: 1,
      borderColor: "blue",
      borderStyle: "round" 
    }
  );
  
  const infoPanel = boxen(
    `${chalk.cyan.bold("Meeting Info")}\n\n` +
    `${chalk.bold("Participant:")} ${chalk.yellow(user || "Unknown")}\n` +
    `${chalk.bold("Participants:")} ${chalk.yellow(participants.size)}\n` +
    `${chalk.bold("Duration:")} ${chalk.yellow(formatTime(meetingDuration))}\n` +
    `${chalk.bold("Data Received:")} ${chalk.yellow((totalBytes / 1024).toFixed(1) + " KB")}\n` +
    `${chalk.bold("Progress:")} ${chalk.yellow((progress * 100).toFixed(1) + "%")}\n` +
    `${chalk.bold("Timestamp:")} ${chalk.dim(new Date(ts).toLocaleTimeString())}`,
    { 
      padding: 1,
      borderColor: "cyan"
    }
  );
  
  // Generate visualizations
  const waveform = createWaveform(data, WIDTH);
  const spectrum = createSpectrum(data, WIDTH);
  const progressBar = createProgressBar(totalBytes, targetBytes, WIDTH);
  
  // Create visualization sections
  const visualizations = boxen(
    `${chalk.bold.cyan("Live Waveform")}
${waveformGradient(waveform)}

${chalk.bold.magenta("Frequency Spectrum")}
${volumeGradient(spectrum)}

${chalk.bold.green("Data Progress")} ${(progress * 100).toFixed(1)}% of ${TARGET_MB} MB
${progressGradient(progressBar)}`,
    {
      padding: 1,
      borderColor: "green"
    }
  );
  
  // Store the display in buffer
  displayBuffer = [header, infoPanel, visualizations].join("\n\n");
  
  // Clear screen and render
  console.clear();
  console.log(displayBuffer);
}

// Entry point
console.log(chalk.cyan("\n🔊 Starting RTMS Terminal Visualizer...\n"));
console.log(chalk.dim("Waiting for webhook event from Zoom... Press Ctrl+C to exit\n"));

// RTMS Setup
rtms.onWebhookEvent(({ event, payload }) => {
  if (event !== "meeting.rtms_started") {
    console.log(chalk.yellow(`Received event: ${event} (waiting for meeting.rtms_started)`));
    return;
  }
  
  console.log(chalk.green(`✅ Received ${event} event - connecting to meeting...`));
  
  const client = new rtms.Client();
  
  client.onJoinConfirm(reason => {
    if (reason === 0) {
      console.log(chalk.green(`✅ Connected to meeting successfully!`));
      startTime = Date.now();
    } else {
      console.log(chalk.red(`❌ Failed to join meeting (reason code: ${reason})`));
      process.exit(1);
    }
  });
  
  client.onAudioData((data, _, ts, meta) => {
    visualize(data, meta.userName, ts, meta);
    
    // Exit meeting when target data size is reached
    const targetBytes = TARGET_MB * 1024 * 1024;
    if (totalBytes >= targetBytes) {
      console.log(chalk.green(`\n✅ Reached target data size of ${TARGET_MB} MB. Leaving meeting...`));
      client.leave();
    }
  });
  
  client.onLeave(reason => {
    console.log(chalk.yellow(`\nLeft meeting (reason code: ${reason})`));
    console.log(chalk.cyan(`Total data received: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`));
    console.log(chalk.cyan(`Session duration: ${formatTime(Date.now() - startTime)}`));
  });
  
  process.on("SIGINT", () => {
    console.log(chalk.yellow("\nInterrupted by user. Exiting..."));
    process.exit(0);
  });
  
  client.join(payload);
});