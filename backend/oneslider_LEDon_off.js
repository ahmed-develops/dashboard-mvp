const http = require('http');
const WebSocket = require('ws');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const port = 3001;

let esp32Socket = null;  // Store the ESP32 WebSocket connection

// WebSocket connection logic
wss.on('connection', (ws) => {
  esp32Socket = ws;  // Save the WebSocket connection as the ESP32

  ws.on('message', (message) => {
    // Forward the slider value to the ESP32 if connected
    if (esp32Socket && esp32Socket.readyState === WebSocket.OPEN) {
      esp32Socket.send(message.toString());  // Send the slider value as a string
    }
  });

  ws.on('close', () => {
    esp32Socket = null;  // Clear the ESP32 connection when it disconnects
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
