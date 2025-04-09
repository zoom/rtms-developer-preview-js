import rtms from "@zoom/rtms";

rtms.onWebhookEvent(({event, payload}) => {
    console.log(event, payload)
 
    if (event !== "meeting.rtms_started") 
        return

    const client = new rtms.Client()
    
    client.onAudioData((data, timestamp, metadata) => {
        console.log(data)
    });

    client.join(payload)
});