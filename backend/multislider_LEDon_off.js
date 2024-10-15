const http = require('http');
const WebSocket = require('ws');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const port = 3001;

let esp32Socket = null;  // Store the ESP32 WebSocket connection

// Utility function to check if a string is valid JSON
function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

// WebSocket connection logic
wss.on('connection', (ws) => {
  esp32Socket = ws;  // Save the WebSocket connection as the ESP32

  ws.on('message', (message) => {
    // Check if the message is valid JSON
    if (isJsonString(message)) {
      const data = JSON.parse(message);  // Parse the incoming JSON data
console.log(data)
      // Forward the slider value to the ESP32 if connected
      if (esp32Socket && esp32Socket.readyState === WebSocket.OPEN) {
        esp32Socket.send(JSON.stringify(data));  // Forward the JSON message
      }
    } else {
      // Handle non-JSON messages like "ESP32 Connected"
      console.log('Non-JSON message received:', message.toString());
    }
  });

  ws.on('close', () => {
    esp32Socket = null;  // Clear the ESP32 connection when it disconnects
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
