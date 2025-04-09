import rtms from "@zoom/rtms";
import chalk from 'chalk';
import boxen from 'boxen';
import gradient from 'gradient-string';
import { floor, abs } from 'mathjs';

const WIDTH = 50;
const MAX_HEIGHT = 12;
let totalBytes = 0;

// New gradient for the spectrograph with modern colors.
const spectrographGradient = gradient(['#03A9F4', '#8BC34A']);
const waveChars = ['▁','▂','▃','▄','▅','▆','▇','█'];

// Compute a solid color shifting from red to green based on progress.
const getSolidColor = (progress) => {
  const redVal = Math.floor((1 - progress) * 255);
  const greenVal = Math.floor(progress * 255);
  const hex = '#' +
    redVal.toString(16).padStart(2, '0') +
    greenVal.toString(16).padStart(2, '0') +
    '00';
  return hex;
};

const visualize = (data, user, ts) => {
  totalBytes += data.length;
  const totalKB = totalBytes / 1024;
  const progress = Math.min(totalKB / 1024, 1); // Cap progress at 1024 KB
  const filledWidth = Math.floor(progress * WIDTH);

  // Build levels for the spectrograph.
  const levels = Array.from({length: WIDTH}, (_, i) => {
    const samples = data.slice(i * 4, (i + 1) * 4);
    return samples.reduce((a, v) => a + abs(v - 128), 0) / 40;
  });
  const max = Math.max(...levels, 1);
  const normalized = levels.map(v => floor((v / max) * MAX_HEIGHT));
  
  // Assemble display with labels.
  const output = [
    boxen(
      chalk.bold(
        `${gradient('cyan', 'purple')('🎤  ZOOM AUDIO VISUALIZER')}\n` +
        chalk.cyan(`${user || "Unknown"}  ${chalk.dim(new Date(ts).toLocaleTimeString())}`)
      ), 
      { borderColor: 'blue', padding: 1 }
    ),
    
    chalk.bold("Spectrograph:"),    
    spectrographGradient.multiline(
      normalized.map(v => waveChars[floor(v / MAX_HEIGHT * 7)]).join('')
    ),
    
    chalk.bold("Total Data Streamed:"),    
    chalk.hex(getSolidColor(progress))('█'.repeat(filledWidth)) +
      chalk.dim('░'.repeat(WIDTH - filledWidth)) +
      chalk.cyan(`  ${totalKB.toFixed(1)} KB / 1024 KB`),
    
    chalk.dim(`Buffer: ${data.length} bytes  ${new Date().toLocaleTimeString()}`)
  ].join('\n\n');

  console.clear();
  console.log(output);
};

console.log(gradient('purple', 'cyan')('\n🎙️  Zoom Real-Time Media Streaming\n'));

// RTMS Setup

rtms.onWebhookEvent(({ event, payload }) => {
  if (event !== "meeting.rtms_started") return;
  
  const client = new rtms.Client();
  
  client.onAudioData((data, _, ts, meta) => {
    visualize(data, meta.userName, ts);
    
    // When total streamed data reaches or exceeds 1024 KB, exit the meeting.
    const totalKB = totalBytes / 1024;
    if (totalKB >= 1024) {
      console.log(chalk.green('Done! Leaving meeting.'));
      client.leave();
    }
  });
  
  client.onJoinConfirm(reason => console.log(
    reason === 0 ? chalk.green(`✅ Connected!`) : chalk.red(`❌ Error ${reason}`)
  ));
  
  client.join(payload);
});
