#include <WiFi.h>
#include <WebSocketsClient.h>

#define LED_PIN 23  // LED connected to GPIO 23 (D23)
int ledBrightness = 0;  // Variable to store the slider value

WebSocketsClient webSocket;

// WebSocket event handler
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      break;

    case WStype_CONNECTED:
      webSocket.sendTXT("ESP32 Connected");  // Notify the server that ESP32 is connected
      break;

    case WStype_TEXT:
      // Convert the payload to an integer (slider value)
      ledBrightness = atoi((char *)payload);

      // Control the LED based on the slider value
      if (ledBrightness > 50) {
        digitalWrite(LED_PIN, HIGH);  // Turn LED on
      } else {
        digitalWrite(LED_PIN, LOW);   // Turn LED off
      }
      break;

    default:
      break;  // Ignore other event types
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);  // Set the LED pin as output

  // Connect to WiFi
  WiFi.begin("visux", "12345678900");  // Replace with your WiFi credentials
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  // WebSocket setup (replace with your backend server IP)
  webSocket.begin("192.168.137.69", 3001, "/");
  webSocket.onEvent(webSocketEvent);  // Register WebSocket event handler
}

void loop() {
  webSocket.loop();  // Maintain WebSocket connection
}
