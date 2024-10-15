#if defined(ESP32)
  #include <WiFiMulti.h>
  WiFiMulti wifiMulti;
  #define DEVICE "ESP32"
  #elif defined(ESP8266)
  #include <ESP8266WiFiMulti.h>
  ESP8266WiFiMulti wifiMulti;
  #define DEVICE "ESP8266"
  #endif
  
  #include <InfluxDbClient.h>
  #include <InfluxDbCloud.h>
  int sensor1;
  #define WIFI_SSID "visux"
  #define WIFI_PASSWORD "12345678900"
  
  #define INFLUXDB_URL "https://us-east-1-1.aws.cloud2.influxdata.com"
  #define INFLUXDB_TOKEN "eZAdAU8MOFc-mYLhTiEPmV7jX9HAej7bdvgCN59zCRDm-SJOvL5GFZqisQWFkE-z6_USiEt-VZHtU946axe4rg=="
  #define INFLUXDB_ORG "f60c81dc8f0cda19"
  #define INFLUXDB_BUCKET "sensor_data"
  
  // Time zone info
  #define TZ_INFO "UTC+5"
  
  // Declare InfluxDB client instance with preconfigured InfluxCloud certificate
  InfluxDBClient client(INFLUXDB_URL, INFLUXDB_ORG, INFLUXDB_BUCKET, INFLUXDB_TOKEN, InfluxDbCloud2CACert);
  
  // Declare Data point
  Point sensor("wifi_status");
  
  void setup() {
    Serial.begin(115200);
  
    // Setup wifi
    WiFi.mode(WIFI_STA);
    wifiMulti.addAP(WIFI_SSID, WIFI_PASSWORD);
  
    Serial.print("Connecting to wifi");
    while (wifiMulti.run() != WL_CONNECTED) {
      Serial.print(".");
      delay(100);
    }
    Serial.println();
  
    // Accurate time is necessary for certificate validation and writing in batches
    // We use the NTP servers in your area as provided by: https://www.pool.ntp.org/zone/
    // Syncing progress and the time will be printed to Serial.
    timeSync(TZ_INFO, "pool.ntp.org", "time.nis.gov");
  
  
    // Check server connection
    if (client.validateConnection()) {
      Serial.print("Connected to InfluxDB: ");
      Serial.println(client.getServerUrl());
    } else {
      Serial.print("InfluxDB connection failed: ");
      Serial.println(client.getLastErrorMessage());
    }
    sensor.addTag("device", DEVICE);
    sensor.addTag("SSID", WiFi.SSID());
  }

  void loop() {
  sensor1 =random(20, 95);
    // Clear fields for reusing the point. Tags will remain the same as set above.
    sensor.clearFields();
  
    // Store measured value into point
    // Report RSSI of currently connected network
    sensor.addField("rssi", WiFi.RSSI());
    sensor.addField("sensor1", sensor1);

  
    // Print what are we exactly writing
    Serial.print("Writing: ");
    Serial.println(sensor.toLineProtocol());
  
    // Check WiFi connection and reconnect if needed
    if (wifiMulti.run() != WL_CONNECTED) {
      Serial.println("Wifi connection lost");
    }
  
    // Write point
    if (!client.writePoint(sensor)) {
      Serial.print("InfluxDB write failed: ");
      Serial.println(client.getLastErrorMessage());
    }
  
    // Serial.println("Waiting 1 second");
    // delay(1000);
    }
