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
  console.log('New client connected');
  
  // Check if it's the ESP32 client
  if (!esp32Socket) {
    esp32Socket = ws;  // Assign ESP32 to this WebSocket connection
    console.log('ESP32 connected');
  }

  ws.on('message', (message) => {
    // Log the entire message received
    console.log('Received data:', message.toString());

    // Check if the message is valid JSON
    if (isJsonString(message)) {
      const data = JSON.parse(message);  // Parse the incoming JSON data
      console.log('Parsed JSON:', data);  // Log the parsed JSON data

      // Determine whether the data is from the frontend (slider) or ESP32 (sensor)
      if (data.type && data.type === 'sensor') {
        // Handle sensor data from ESP32
        console.log(`Sensor Data - Temperature: ${data.temperature}, Humidity: ${data.humidity}`);
        
        // Broadcast sensor data to all connected clients (including frontend)
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && client !== esp32Socket) {
            client.send(JSON.stringify(data));  // Send sensor data to frontend
          }
        });

      } else {
        // Handle slider data from frontend
        console.log(`Slider Data - LED: ${data.led}, Value: ${data.value}`);

        // Forward the slider value to the ESP32 if connected
        if (esp32Socket && esp32Socket.readyState === WebSocket.OPEN) {
          esp32Socket.send(JSON.stringify(data));  // Forward the JSON message to ESP32
        }
      }
    } else {
      // Handle non-JSON messages like "ESP32 Connected"
      console.log('Non-JSON message received:', message.toString());
    }
  });

  ws.on('close', () => {
    if (ws === esp32Socket) {
      esp32Socket = null;  // Clear the ESP32 connection when it disconnects
      console.log('ESP32 disconnected');
    }
    console.log('Client disconnected');
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
