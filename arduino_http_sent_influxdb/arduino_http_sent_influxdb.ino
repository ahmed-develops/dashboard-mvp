

#include <WiFi.h>
#include <HTTPClient.h>

int Value = 0;
const char* ssid = "visux"; // Replace with your WiFi SSID
const char* password = "12345678900"; // Replace with your WiFi password

// InfluxDB credentials (replace with your actual values)
const char* influxdb_url = "https://us-east-1-1.aws.cloud2.influxdata.com"; // Replace with your InfluxDB Cloud URL
const char* bucket = "sensor_data";  // Replace with your bucket name
const char* org = "f60c81dc8f0cda19";  // Replace with your organization ID
const char* token = "H7K4WBskvoouGY9By5LGHjzDtStuDdHWmaj1gOeHbHLfEYTiRRe4PQ73G5ajwmEIBRbYSbUHdkmDD4odEKY5hg==";  // Replace with your token


void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);

  // Wait for the connection to establish
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected.");
}

void loop() {
  Value = random(20, 95);
  // Send a test data point to InfluxDB
  sendDataToInfluxDB(Value); // Sending a test value of 42
}

void sendDataToInfluxDB(int testValue) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    // Construct the InfluxDB API endpoint
    String url = String(influxdb_url) + "/api/v2/write?org=" + org + "&bucket=" + bucket + "&precision=ms";

    // Prepare line protocol data for InfluxDB
    String data = "test_data,device=esp32 value=" + String(testValue);

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

    http.end(); // Close the connection
  } else {
    Serial.println("WiFi disconnected.");
  }
}
