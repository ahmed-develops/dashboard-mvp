#include <WiFi.h>
#include <HTTPClient.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "visux";
const char* password = "12345678900";

// InfluxDB credentials
const char* influxdb_url = "https://us-east-1-1.aws.cloud2.influxdata.com";
const char* bucket = "sensor_data";
const char* org = "f60c81dc8f0cda19";  
const char* token = "H7K4WBskvoouGY9By5LGHjzDtStuDdHWmaj1gOeHbHLfEYTiRRe4PQ73G5ajwmEIBRbYSbUHdkmDD4odEKY5hg==";

// WebSocket client object
WebSocketsClient webSocket;

// Variables
int Value = 0;
int potValue = 0;
int temperature = 25;
int humidity = 60;
int ledBrightness1 = 0;  // Variable to store the slider value for LED on D23
int ledBrightness2 = 0;  // Variable to store the slider value for LED on D22

#define POT_PIN 34
#define LED_PIN1 23  // LED 1 connected to GPIO 23 (D23)
#define LED_PIN2 13  // LED 2 connected to GPIO 13 (D13)

unsigned long reconnectAttemptDelay = 1000;  // Start with 1 second delay
unsigned long lastReconnectAttempt = 0;
const unsigned long maxReconnectDelay = 30000;  // Max delay of 30 seconds

// Function to send sensor data over WebSocket
void sendSensorData() {
    potValue = analogRead(POT_PIN);

    // Create JSON object using ArduinoJson
    DynamicJsonDocument sensorDoc(256);
    sensorDoc["type"] = "sensor";  // Indicate that this is sensor data
    sensorDoc["temperature"] = potValue;  // Replace with actual sensor data
    sensorDoc["humidity"] = humidity;  // Replace with actual sensor data

    // Serialize and send the sensor data as a JSON string
    String sensorData;
    serializeJson(sensorDoc, sensorData);
    webSocket.sendTXT(sensorData);

    Serial.println("Sensor data sent: " + sensorData);
}

// Function to send sensor data to InfluxDB
void sendDataToInfluxDB(int testValue) {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;

        // Construct the InfluxDB API endpoint
        String url = String(influxdb_url) + "/api/v2/write?org=" + org + "&bucket=" + bucket + "&precision=ms";

        // Prepare line protocol data for InfluxDB
        String data = "sensor_data,device=esp32 value=" + String(testValue);

        // Send HTTP POST request to InfluxDB
        http.begin(url);
        http.addHeader("Authorization", String("Token ") + token);
        http.addHeader("Content-Type", "text/plain");

        int httpResponseCode = http.POST(data);

        if (httpResponseCode > 0) {
            Serial.println("Data sent to InfluxDB: " + data);
            Serial.println("InfluxDB Response: " + String(httpResponseCode));
        } else {
            Serial.println("Error sending data to InfluxDB: " + String(httpResponseCode));
        }

        http.end();
    } else {
        Serial.println("WiFi disconnected.");
    }
}

// WebSocket event handler
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  String message;
  DynamicJsonDocument doc(1024);
  int led = 0;
  int value = 0;

    switch (type) {
        case WStype_CONNECTED:
            webSocket.sendTXT("ESP32 Connected");
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
        case WStype_ERROR:
            Serial.println("WebSocket Error");
            break;
        case WStype_BIN:
            Serial.println("Binary data received");
            break;
        default:
            Serial.println("Unknown WebSocket event");
            break;
    }
}

// void reconnectWebSocket() {
//     // Attempt WebSocket reconnection if needed
//     if (!webSocket.isConnected() && millis() - lastReconnectAttempt > reconnectAttemptDelay) {
//         Serial.println("Attempting to reconnect WebSocket...");
//         webSocket.disconnect();  // Close any lingering connections
//         delay(reconnectAttemptDelay);  // Wait before reconnecting
//         webSocket.begin("192.168.137.69", 3001, "/");  // Change to webSocket.beginSSL() if using secure WebSocket (wss://)
//         webSocket.onEvent(webSocketEvent);
//         lastReconnectAttempt = millis();
//         reconnectAttemptDelay = min(reconnectAttemptDelay * 2, maxReconnectDelay);  // Exponentially increase delay
//     } else if (webSocket.isConnected()) {
//         reconnectAttemptDelay = 1000;  // Reset delay after successful connection
//     }
// }

void setup() {
    Serial.begin(115200);
    pinMode(LED_PIN1, OUTPUT);  // Set the LED pin for D23 as output
    pinMode(LED_PIN2, OUTPUT);  // Set the LED pin for D22 as output
    
    // Connect to WiFi
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("WiFi connected.");

    // Initialize WebSocket client and set event handler
    Serial.println("Connecting to WebSocket server...");
    webSocket.begin("192.168.137.69", 3001, "/");  // Change to webSocket.beginSSL() if using secure WebSocket (wss://)
    webSocket.onEvent(webSocketEvent);
}

void loop() {
    // Maintain WebSocket connection
    webSocket.loop();

    // Generate random value and send sensor data via WebSocket
    Value = random(20, 95);
    sendSensorData();

    // Send the same sensor data to InfluxDB
    sendDataToInfluxDB(Value);

    delay(5000);  // Wait before sending the next data
}
