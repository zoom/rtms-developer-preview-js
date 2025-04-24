// Import the RTMS SDK
import rtms from "@zoom/rtms";

// Set up webhook event handler to receive RTMS events from Zoom
rtms.onWebhookEvent(({ event, payload }) => {
  console.log(`Received webhook event: ${event}`);

  // Only process webhook events for RTMS start notifications
  if (event !== "meeting.rtms_started") {
    console.log(`Received event ${event}, ignoring...`);
    return;
  }
  
  // Create a client instance for this specific meeting
  const client = new rtms.Client();
  

  // Configure HD video (720p H.264 at 30fps)
  client.setVideoParameters({
    contentType: rtms.VideoContentType.RAW_VIDEO,
    codec: rtms.VideoCodec.H264,
    resolution: rtms.VideoResolution.SD,
    dataOpt: rtms.VideoDataOption.VIDEO_SINGLE_ACTIVE_STREAM,
    fps: 30
  });

  // Set up video data handler
  client.onVideoData((data, size, timestamp, metadata) => {
    console.log(`Video data: ${size} bytes from ${metadata.userName}`);
  });
    

  // Set up audio data handler
  client.onAudioData((data, size, timestamp, metadata) => {
    console.log(`Audio data: ${size} bytes from ${metadata.userName}`);
  }); 


  // Set up transcript data handler
  client.onTranscriptData((data, size, timestamp, metadata) => {
    console.log(`${metadata.userName}: ${data}`);
  });

  // Join the meeting using the webhook payload directly
  client.join(payload);
});