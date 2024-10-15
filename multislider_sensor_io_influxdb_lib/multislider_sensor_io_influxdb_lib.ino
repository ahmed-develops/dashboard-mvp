#if defined(ESP32)
  #include <WiFi.h>
  #include <WiFiMulti.h>
  WiFiMulti wifiMulti;
  #define DEVICE "ESP32"
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
  #include <ESP8266WiFiMulti.h>
  ESP8266WiFiMulti wifiMulti;
  #define DEVICE "ESP8266"
#endif

#include <InfluxDbClient.h>
#include <InfluxDbCloud.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

// WiFi and InfluxDB Configuration
#define WIFI_SSID "visux"
#define WIFI_PASSWORD "12345678900"
#define INFLUXDB_URL "https://us-east-1-1.aws.cloud2.influxdata.com"
#define INFLUXDB_TOKEN "eZAdAU8MOFc-mYLhTiEPmV7jX9HAej7bdvgCN59zCRDm-SJOvL5GFZqisQWFkE-z6_USiEt-VZHtU946axe4rg=="
#define INFLUXDB_ORG "f60c81dc8f0cda19"
#define INFLUXDB_BUCKET "sensor_data"
#define TZ_INFO "UTC+5"

InfluxDBClient client(INFLUXDB_URL, INFLUXDB_ORG, INFLUXDB_BUCKET, INFLUXDB_TOKEN, InfluxDbCloud2CACert);
Point sensor("wifi_status");

WebSocketsClient webSocket;
#define WEBSOCKET_SERVER "192.168.137.69"
#define WEBSOCKET_PORT 3001
#define WEBSOCKET_PATH "/"

// Sensor and LED configuration
#define POT_PIN 34
#define LED_PIN1 23
#define LED_PIN2 13
int potValue = 0;
int potValue2 = 0;
int ledBrightness1 = 0;
int ledBrightness2 = 0;
int humidity = 60;
int sensor1;

const unsigned long sendInterval = 500;
const unsigned long influxWriteInterval = 5000;

// RTOS task handles
TaskHandle_t influxDBTaskHandle;
TaskHandle_t webSocketTaskHandle;

// WiFi task: Handles WiFi reconnection
void wifiTask(void *pvParameters) {
  for (;;) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi disconnected. Reconnecting...");
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      while (WiFi.status() != WL_CONNECTED) {
        Serial.print(".");
        vTaskDelay(500 / portTICK_PERIOD_MS);
      }
      Serial.println("WiFi reconnected.");
    }
    vTaskDelay(10000 / portTICK_PERIOD_MS);  // Check every 10 seconds
  }
}

// WebSocket task: Handles WebSocket communication
void webSocketTask(void *pvParameters) {
  webSocket.begin(WEBSOCKET_SERVER, WEBSOCKET_PORT, WEBSOCKET_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  for (;;) {
    webSocket.loop();
    vTaskDelay(100 / portTICK_PERIOD_MS);  // Poll WebSocket
  }
}

// WebSocket event handler
void webSocketEvent(WStype_t type, uint8_t *payload, size_t length) {
  String message;
  DynamicJsonDocument doc(1024);

  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("WebSocket Disconnected");
      break;

    case WStype_CONNECTED:
      Serial.println("WebSocket Connected");
      webSocket.sendTXT("ESP32 Connected");
      break;

    case WStype_TEXT:
      // Parse the incoming JSON payload
      message = String((char *)payload);
      Serial.println("Received: " + message);

      if (deserializeJson(doc, message) == DeserializationError::Ok) {
        // Create a new scope for led and value variables
        {
          int led = doc["led"];
          int value = doc["value"];

          if (led == 1) {
            // Control LED on D23
            digitalWrite(LED_PIN1, (value > 50) ? HIGH : LOW);
          }
          if (led == 2) {
            // Control LED on D22
            digitalWrite(LED_PIN2, (value > 50) ? HIGH : LOW);
          }
        }
      } else {
        Serial.println("Failed to parse incoming message as JSON");
      }
      break;

    default:
      break;
  }
}


// InfluxDB task: Writes sensor data to InfluxDB
void influxDBTask(void *pvParameters) {
  for (;;) {

    potValue2 = analogRead(POT_PIN);
    sensor1 = random(20, 95);
    sensor.clearFields();
    sensor.addField("potValue", potValue2);
    sensor.addField("random", sensor1);

    Serial.print("Writing to InfluxDB: ");
    Serial.println(sensor.toLineProtocol());

    if (!client.writePoint(sensor)) {
      Serial.print("InfluxDB write failed: ");
      Serial.println(client.getLastErrorMessage());
    }

    vTaskDelay(influxWriteInterval / portTICK_PERIOD_MS);  // Write to InfluxDB every 7 seconds
  }
}

// Task for sending sensor data via WebSocket
void sensorTask(void *pvParameters) {
  for (;;) {
    
    potValue = analogRead(POT_PIN);
    DynamicJsonDocument sensorDoc(256);
    sensorDoc["type"] = "sensor";
    sensorDoc["temperature"] = potValue;
    sensorDoc["humidity"] = humidity;

    String sensorData;
    serializeJson(sensorDoc, sensorData);

    if (webSocket.sendTXT(sensorData)) {
      Serial.println("Sensor data sent: " + sensorData);
    } else {
      Serial.println("Failed to send sensor data.");
    }

    vTaskDelay(sendInterval / portTICK_PERIOD_MS);  // Send data every 5 seconds
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(LED_PIN1, OUTPUT);
  pinMode(LED_PIN2, OUTPUT);

  // Setup WiFi
  WiFi.mode(WIFI_STA);
  wifiMulti.addAP(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to WiFi...");
  while (wifiMulti.run() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("Connected to WiFi");

  timeSync(TZ_INFO, "pool.ntp.org", "time.nis.gov");

  // Validate InfluxDB connection
  if (client.validateConnection()) {
    Serial.println("Connected to InfluxDB");
  } else {
    Serial.print("InfluxDB connection failed: ");
    Serial.println(client.getLastErrorMessage());
  }
  sensor.addTag("device", DEVICE);
  sensor.addTag("SSID", WiFi.SSID());

  // Create RTOS tasks
  xTaskCreate(influxDBTask, "InfluxDB Task", 8192, NULL, 1, &influxDBTaskHandle);  // Increased stack size
  xTaskCreate(webSocketTask, "WebSocket Task", 4096, NULL, 1, &webSocketTaskHandle);
  xTaskCreate(sensorTask, "Sensor Task", 4096, NULL, 1, NULL);
}

void loop() {
  // Empty since RTOS tasks are handling the operations
}
