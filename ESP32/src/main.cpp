#include <Arduino.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <WiFi.h>
#include <ETH.h>

// HKL-EA2 Ethernet LAN8720 Hardware Pin Definitions
#define ETH_PHY_TYPE        ETH_PHY_LAN8720
#define ETH_PHY_ADDR        0
#define ETH_PHY_MDC         23
#define ETH_PHY_MDIO        18
#define ETH_PHY_POWER       -1 // Not controlled by a specific GPIO pin
#define ETH_CLK_MODE        ETH_CLOCK_GPIO17_OUT

// Calibration for BME280 sensor
#define SEALEVELPRESSURE_HPA (1013.25)

Adafruit_BME280 bme; 
OneWire oneWire(33);
DallasTemperature sensors(&oneWire);
const String SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODkzNjc3NjAsImV4cCI6MTk0NzA0Nzc2MH0.HC39l6omcv2FQfBEFPWTNLet2h8DdndSOJsnwUKaYmY";
const char* SUPABASE_HOST = "192.168.0.232";
const uint16_t SUPABASE_PORT = 8000;
const char* SUPABASE_SENSORS_PATH = "/rest/v1/sensors";
const char* SUPABASE_LOCK_PATH = "/rest/v1/locks";
const int interruptPin = 36;
volatile bool eth_connected = false;
volatile bool lockChangePending = false;
unsigned long lastLockPostMs = 0;
unsigned long lastSensorPostMs = 0;
bool lockDebounceActive = false;
bool lockCandidateState = false;
bool lockStableState = false;
uint8_t lockStableSamples = 0;
const uint8_t LOCK_STABLE_SAMPLES = 6;
const unsigned long LOCK_RETRIGGER_BLOCK_MS = 1000;
const unsigned long SENSOR_POST_INTERVAL_MS = 60000;

// Prototypes
void sendSensorsValues();
void sendLockState(bool locked);
void processLockInput();
int sendJsonPost(const char* host, uint16_t port, const char* path, const String& payload, const String& apiKey);
void WiFiEvent(WiFiEvent_t event);
void IRAM_ATTR onLockChange();



void setup()
{
  Serial.begin(9600);
  Wire.begin(4,16);
  sensors.begin();
  pinMode(interruptPin, INPUT_PULLUP);
  lockStableState = !digitalRead(interruptPin);
  lockCandidateState = lockStableState;
  attachInterrupt(digitalPinToInterrupt(interruptPin), onLockChange, CHANGE);
  WiFi.onEvent(WiFiEvent);
  ETH.begin(ETH_PHY_ADDR, ETH_PHY_POWER, ETH_PHY_MDC, ETH_PHY_MDIO, ETH_PHY_TYPE, ETH_CLK_MODE);
  bool status = bme.begin(0x76);  
  if (!status) {
    Serial.println("Could not find a valid BME280 sensor, check wiring!");
    while (1);
  }
}

void loop()
{
  processLockInput();

  unsigned long now = millis();
  if (now - lastSensorPostMs >= SENSOR_POST_INTERVAL_MS) {
    lastSensorPostMs = now;
    sendSensorsValues();
  }

  delay(10);
} 

void sendSensorsValues()
{
  if (!eth_connected) {
    Serial.println("Skipping POST: Ethernet is disconnected.");
    return;
  }

  sensors.requestTemperatures();
  float temperature = sensors.getTempCByIndex(0);
  float pressure = bme.readPressure() / 100.0F;
  float altitude = bme.readAltitude(SEALEVELPRESSURE_HPA);
  float humidity = bme.readHumidity();

  JsonDocument doc;

  doc["location"] = "Server Room";
  doc["mac_address"] = ETH.macAddress();
  doc["ip_address"] = ETH.localIP().toString();
  doc["locked"] = lockStableState;
  doc["temperature"] = temperature;
  doc["pressure"] = pressure;
  doc["altitude"] = altitude;
  doc["humidity"] = humidity;

  String output;
  serializeJson(doc, output);
  int code = sendJsonPost(SUPABASE_HOST, SUPABASE_PORT, SUPABASE_SENSORS_PATH, output, SERVICE_ROLE_KEY);

  if (code > 0) {
    Serial.print("POST response code: ");
    Serial.println(code);
  } else {
    Serial.print("POST failed: ");
    Serial.println(code);
  }
}

int sendJsonPost(const char* host, uint16_t port, const char* path, const String& payload, const String& apiKey)
{
  WiFiClient client;

  if (!client.connect(host, port)) {
    Serial.println("Connection to server failed.");
    return -1;
  }

  String request = String("POST ") + path + " HTTP/1.1\r\n";
  request += String("Host: ") + host + "\r\n";
  request += "Content-Type: application/json\r\n";
  request += String("apikey: ") + apiKey + "\r\n";
  request += String("Authorization: Bearer ") + apiKey + "\r\n";
  request += String("Content-Length: ") + payload.length() + "\r\n";
  request += "Connection: close\r\n\r\n";
  request += payload;

  client.print(request);

  unsigned long start = millis();
  while (!client.available() && millis() - start < 5000) {
    delay(10);
  }

  if (!client.available()) {
    Serial.println("Server timeout waiting for response.");
    client.stop();
    return -2;
  }

  String statusLine = client.readStringUntil('\n');
  statusLine.trim();
  Serial.println(statusLine);

  int firstSpace = statusLine.indexOf(' ');
  int secondSpace = statusLine.indexOf(' ', firstSpace + 1);
  int statusCode = -3;
  if (firstSpace > 0 && secondSpace > firstSpace) {
    statusCode = statusLine.substring(firstSpace + 1, secondSpace).toInt();
  }

  while (client.connected() || client.available()) {
    if (client.available()) {
      String line = client.readStringUntil('\n');
      Serial.println(line);
    }
  }

  client.stop();
  return statusCode;
}

void processLockInput()
{
  unsigned long now = millis();

  if (now - lastLockPostMs < LOCK_RETRIGGER_BLOCK_MS) {
    // Keep the filter idle during lockout to suppress immediate retriggers.
    lockDebounceActive = false;
    return;
  }

  if (lockChangePending) {
    noInterrupts();
    lockChangePending = false;
    interrupts();

    lockDebounceActive = true;
    lockCandidateState = !digitalRead(interruptPin);
    lockStableSamples = 0;
  }

  if (!lockDebounceActive) {
    return;
  }

  bool rawState = !digitalRead(interruptPin);
  if (rawState == lockCandidateState) {
    if (lockStableSamples < LOCK_STABLE_SAMPLES) {
      lockStableSamples++;
    }
  } else {
    lockCandidateState = rawState;
    lockStableSamples = 0;
  }

  if (lockStableSamples >= LOCK_STABLE_SAMPLES) {
    lockDebounceActive = false;
    if (lockCandidateState != lockStableState) {
      lockStableState = lockCandidateState;
      lastLockPostMs = now;
      sendLockState(lockStableState);
    }
  }
}

void sendLockState(bool locked)
{
  if (!eth_connected) {
    Serial.println("Skipping lock POST: Ethernet is disconnected.");
    return;
  }

  JsonDocument doc;

  doc["location"] = "Server Room";
  doc["mac_address"] = ETH.macAddress();
  doc["ip_address"] = ETH.localIP().toString();
  doc["locked"] = locked;

  String output;
  serializeJson(doc, output);
  int code = sendJsonPost(SUPABASE_HOST, SUPABASE_PORT, SUPABASE_LOCK_PATH, output, SERVICE_ROLE_KEY);

  if (code > 0) {
    Serial.print("Lock POST response code: ");
    Serial.println(code);
  } else {
    Serial.print("Lock POST failed: ");
    Serial.println(code);
  }
}

// Event handling for Ethernet states
void WiFiEvent(WiFiEvent_t event) {
  switch (event) {
    case ARDUINO_EVENT_ETH_START:
      Serial.println("ETH Started");
      // Set the hostname if desired
      ETH.setHostname("esp32-hkl-ea2");
      break;
    case ARDUINO_EVENT_ETH_CONNECTED:
      Serial.println("ETH Connected");
      break;
    case ARDUINO_EVENT_ETH_GOT_IP:
      Serial.print("ETH MAC: ");
      Serial.print(ETH.macAddress());
      Serial.print(", IPv4: ");
      Serial.println(ETH.localIP());
      eth_connected = true;
      break;
    case ARDUINO_EVENT_ETH_DISCONNECTED:
      Serial.println("ETH Disconnected");
      eth_connected = false;
      break;
    case ARDUINO_EVENT_ETH_STOP:
      Serial.println("ETH Stopped");
      eth_connected = false;
      break;
    default:
      break;
  }
}

void IRAM_ATTR onLockChange() {
  lockChangePending = true;
}
