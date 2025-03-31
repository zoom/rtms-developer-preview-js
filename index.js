import rtms from "@zoom/rtms";


const options = {
    meeting_uuid: "anything-goes-here", 
    rtms_stream_id: "and-here-too", 
    server_urls: "wss://tptestsvr122.zoomdev.us:9443"
}

rtms.onAudioData((data, timestamp, metadata) => {
    console.log(data);
});

rtms.join(options);


// The below method works if you want to trigger the test server without a webhook

/* rtms.onWebhookEvent(({eventType, payload}) => {
    if (eventType !== "meeting.rtms_started") 
        return

    const client = new rtms.Client()
    
    client.onAudioData((data, timestamp, metadata) => {
        console.log(data)
    });

    console.log(payload)

    client.join(payload)
});*/