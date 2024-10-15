#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

#define LED_PIN1 23  // LED 1 connected to GPIO 23 (D23)
#define LED_PIN2 13  // LED 2 connected to GPIO 22 (D22)

int ledBrightness1 = 0;  // Variable to store the slider value for LED on D23
int ledBrightness2 = 0;  // Variable to store the slider value for LED on D22

WebSocketsClient webSocket;

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  // Declare variables outside the switch block
  String message;
  DynamicJsonDocument doc(1024);
  int led = 0;
  int value = 0;

  switch (type) {
    case WStype_DISCONNECTED:
      break;

    case WStype_CONNECTED:
      webSocket.sendTXT("ESP32 Connected");  // Notify the server that ESP32 is connected
      break;

    case WStype_TEXT:
      // Parse the incoming JSON payload
      message = String((char *)payload);
      Serial.println("Received: " + message);

      deserializeJson(doc, message);
      led = doc["led"];
      value = doc["value"];

      if (led == 1) {
        // Control LED on D23
        ledBrightness1 = value;
        digitalWrite(LED_PIN1, (ledBrightness1 > 50) ? HIGH : LOW);
      } 
      if (led == 2) {
        // Control LED on D22
        ledBrightness2 = value;
        digitalWrite(LED_PIN2, (ledBrightness2 > 50) ? HIGH : LOW);
      }
      break;

    default:
      break;  // Ignore other event types
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN1, OUTPUT);  // Set the LED pin for D23 as output
  pinMode(LED_PIN2, OUTPUT);  // Set the LED pin for D22 as output

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
