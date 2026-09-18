#include <Arduino.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <WiFi.h>
#include <ETH.h>
#include <HTTPClient.h>
#include <ESPSupabase.h>
#include <ESPSupabaseRealtime.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/queue.h>
#include <freertos/semphr.h>
#include <freertos/event_groups.h>

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

const char *NODE_NAME = "Node X";
const char *SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODkzNjc3NjAsImV4cCI6MTk0NzA0Nzc2MH0.HC39l6omcv2FQfBEFPWTNLet2h8DdndSOJsnwUKaYmY";
const char *SUPABASE_URL = "http://192.168.0.232:8000";
const char *SUPABASE_NODES_TABLE = "nodes";
const char *SUPABASE_SENSORS_TABLE = "sensors";
const char *SUPABASE_LOCKS_TABLE = "locks";

const int interruptPin = 36;
volatile bool lockStableState = false;

const uint8_t LOCK_STABLE_SAMPLES = 6;
const unsigned long LOCK_RETRIGGER_BLOCK_MS = 1000;
const uint32_t SENSOR_POST_INTERVAL_DEFAULT_MS = 20000;
const uint8_t TEMP_READ_RETRIES = 3;
const unsigned long TEMP_CONVERSION_DELAY_MS = 750;
const uint8_t WRITE_RETRIES = 3;
const uint32_t WRITE_RETRY_BACKOFF_MS = 500;

enum WriteKind : uint8_t {
  WRITE_SENSOR = 0,
  WRITE_LOCK = 1,
};

struct SensorSnapshot {
  float temperature;
  float pressure;
  float altitude;
  float humidity;
  bool locked;
};

struct OutboundWrite {
  WriteKind kind;
  SensorSnapshot sensor;
  bool lockState;
};

struct NodeConfigUpdate {
  bool queryOk;
  bool exists;
  bool enabled;
  uint32_t periodMs;
};

struct RuntimeState {
  bool ethConnected;
  bool nodeExists;
  bool nodeEnabled;
  uint32_t transmissionPeriodMs;
};

RuntimeState runtimeState = {
  false,
  false,
  false,
  SENSOR_POST_INTERVAL_DEFAULT_MS,
};

SemaphoreHandle_t runtimeStateMutex = nullptr;
QueueHandle_t writeQueue = nullptr;
QueueHandle_t nodeConfigQueue = nullptr;
EventGroupHandle_t stateEvents = nullptr;
TaskHandle_t lockTaskHandle = nullptr;

Supabase db;
SupabaseRealtime realtime;
bool useEspsupabase = false;

const EventBits_t BIT_ETH_CONNECTED = BIT0;
const EventBits_t BIT_NODE_EXISTS = BIT1;
const EventBits_t BIT_NODE_ENABLED = BIT2;
const EventBits_t BIT_NODE_ALLOWED = BIT3;

void taskSensor(void *);
void taskLock(void *);
void taskSupabaseWrite(void *);
void taskStartupNodeCheck(void *);
void taskRealtime(void *);
void taskNodeConfigApply(void *);

void enqueueLockWrite(bool locked);
bool readSensorsSnapshot(SensorSnapshot &snapshot);
bool queryNodeConfig(NodeConfigUpdate &update);
int sendJsonPost(const char *table, const String &payload);
int sendSelectRequest(const String &pathWithQuery, String &responseBody);
String urlEncode(const char *input);
uint32_t normalizePeriodMs(int raw);
void applyNodeConfig(const NodeConfigUpdate &update);
bool canSendSensors();
uint32_t readTransmissionPeriodMs();
void onRealtimeMessage(String payload);
void WiFiEvent(WiFiEvent_t event);
void IRAM_ATTR onLockChange();

void setup()
{
  Serial.begin(9600);
  Wire.begin(4, 16);
  sensors.begin();

  // Prime the first DS18B20 conversion so early task reads are valid.
  sensors.requestTemperatures();
  delay(TEMP_CONVERSION_DELAY_MS);
  sensors.getTempCByIndex(0);

  pinMode(interruptPin, INPUT_PULLUP);
  lockStableState = !digitalRead(interruptPin);

  runtimeStateMutex = xSemaphoreCreateMutex();
  stateEvents = xEventGroupCreate();
  writeQueue = xQueueCreate(12, sizeof(OutboundWrite));
  nodeConfigQueue = xQueueCreate(8, sizeof(NodeConfigUpdate));

  if (runtimeStateMutex == nullptr || stateEvents == nullptr || writeQueue == nullptr || nodeConfigQueue == nullptr) {
    Serial.println("FreeRTOS primitive allocation failed.");
    while (1) {
      delay(1000);
    }
  }

  attachInterrupt(digitalPinToInterrupt(interruptPin), onLockChange, CHANGE);

  WiFi.onEvent(WiFiEvent);
  ETH.begin(ETH_PHY_ADDR, ETH_PHY_POWER, ETH_PHY_MDC, ETH_PHY_MDIO, ETH_PHY_TYPE, ETH_CLK_MODE);

  bool status = bme.begin(0x76);
  if (!status) {
    Serial.println("Could not find a valid BME280 sensor, check wiring!");
    while (1) {
      delay(1000);
    }
  }

  String supabaseUrlStr = String(SUPABASE_URL);
  useEspsupabase = supabaseUrlStr.startsWith("https://");

  if (useEspsupabase) {
    db.begin(supabaseUrlStr, String(SERVICE_ROLE_KEY));
    realtime.begin(supabaseUrlStr, String(SERVICE_ROLE_KEY), onRealtimeMessage);
    realtime.addChangesListener(SUPABASE_NODES_TABLE, "INSERT", "public", "");
    realtime.addChangesListener(SUPABASE_NODES_TABLE, "UPDATE", "public", "");
    realtime.listen();
    Serial.println("ESPSupabase realtime enabled.");
  } else {
    Serial.println("ESPSupabase realtime disabled for non-HTTPS endpoint. Using HTTP polling compatibility mode.");
  }

  // Core 0: network and database orchestration.
  xTaskCreatePinnedToCore(taskSupabaseWrite, "SupabaseWrite", 8192, nullptr, 2, nullptr, 0);
  xTaskCreatePinnedToCore(taskNodeConfigApply, "NodeConfigApply", 4096, nullptr, 2, nullptr, 0);
  xTaskCreatePinnedToCore(taskStartupNodeCheck, "StartupNode", 6144, nullptr, 2, nullptr, 0);
  xTaskCreatePinnedToCore(taskRealtime, "Realtime", 6144, nullptr, 1, nullptr, 0);

  // Core 1: sensor and lock inputs.
  xTaskCreatePinnedToCore(taskSensor, "Sensor", 6144, nullptr, 1, nullptr, 1);
  xTaskCreatePinnedToCore(taskLock, "Lock", 4096, nullptr, 2, &lockTaskHandle, 1);
}

void loop()
{
  vTaskDelay(pdMS_TO_TICKS(1000));
}

void taskSensor(void *)
{
  TickType_t lastWake = xTaskGetTickCount();

  while (true) {
    uint32_t periodMs = readTransmissionPeriodMs();
    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(periodMs));

    SensorSnapshot snapshot;
    if (!readSensorsSnapshot(snapshot)) {
      continue;
    }

    OutboundWrite req = {};
    req.kind = WRITE_SENSOR;
    req.sensor = snapshot;

    if (xQueueSend(writeQueue, &req, 0) != pdPASS) {
      Serial.println("Sensor queue full; dropping sample.");
    }
  }
}

void taskLock(void *)
{
  unsigned long lastLockPostMs = 0;

  while (true) {
    ulTaskNotifyTake(pdTRUE, portMAX_DELAY);

    while (ulTaskNotifyTake(pdTRUE, 0) > 0) {
      // Drain burst notifications; one debounce pass is enough.
    }

    unsigned long now = millis();
    if (now - lastLockPostMs < LOCK_RETRIGGER_BLOCK_MS) {
      continue;
    }

    bool candidate = !digitalRead(interruptPin);
    uint8_t stableSamples = 0;

    while (stableSamples < LOCK_STABLE_SAMPLES) {
      vTaskDelay(pdMS_TO_TICKS(5));
      bool rawState = !digitalRead(interruptPin);

      if (rawState == candidate) {
        stableSamples++;
      } else {
        candidate = rawState;
        stableSamples = 0;
      }
    }

    if (candidate != lockStableState) {
      lockStableState = candidate;
      lastLockPostMs = now;
      enqueueLockWrite(candidate);
    }
  }
}

void taskSupabaseWrite(void *)
{
  OutboundWrite req;

  while (true) {
    if (xQueueReceive(writeQueue, &req, portMAX_DELAY) != pdPASS) {
      continue;
    }

    if (req.kind == WRITE_SENSOR && !canSendSensors()) {
      Serial.println("Skipping sensor write: gating denied (ETH/node flags).");
      continue;
    }

    JsonDocument doc;
    doc["name"] = NODE_NAME;
    doc["mac_address"] = ETH.macAddress();
    doc["ip_address"] = ETH.localIP().toString();

    const char *table = nullptr;
    if (req.kind == WRITE_SENSOR) {
      table = SUPABASE_SENSORS_TABLE;
      doc["locked"] = req.sensor.locked;
      doc["temperature"] = req.sensor.temperature;
      doc["pressure"] = req.sensor.pressure;
      doc["altitude"] = req.sensor.altitude;
      doc["humidity"] = req.sensor.humidity;
    } else {
      table = SUPABASE_LOCKS_TABLE;
      doc["locked"] = req.lockState;
    }

    String payload;
    serializeJson(doc, payload);

    int code = -999;
    for (uint8_t attempt = 0; attempt < WRITE_RETRIES; attempt++) {
      code = sendJsonPost(table, payload);
      if (code >= 200 && code < 300) {
        break;
      }

      uint32_t backoffMs = WRITE_RETRY_BACKOFF_MS * (1UL << attempt);
      Serial.printf("Write attempt %u failed with code %d, retry in %lu ms\n", attempt + 1, code, backoffMs);
      vTaskDelay(pdMS_TO_TICKS(backoffMs));
    }

    if (req.kind == WRITE_SENSOR) {
      Serial.printf("Sensor write result: %d\n", code);
    } else {
      Serial.printf("Lock write result: %d\n", code);
    }
  }
}

void taskStartupNodeCheck(void *)
{
  for (uint8_t attempt = 1; attempt <= 3; attempt++) {
    NodeConfigUpdate update;
    if (queryNodeConfig(update)) {
      xQueueSend(nodeConfigQueue, &update, portMAX_DELAY);
      Serial.println("Startup node query succeeded.");
      vTaskDelete(nullptr);
      return;
    }

    Serial.printf("Startup node query failed (attempt %u/3).\n", attempt);
    if (attempt < 3) {
      vTaskDelay(pdMS_TO_TICKS(10000));
    }
  }

  Serial.println("Startup node query exhausted 3 retries; sensors remain gated.");
  vTaskDelete(nullptr);
}

void taskRealtime(void *)
{
  NodeConfigUpdate lastPolled = {};
  bool hasLastPolled = false;

  while (true) {
    if (useEspsupabase) {
      realtime.loop();
      vTaskDelay(pdMS_TO_TICKS(20));
      continue;
    }

    NodeConfigUpdate update;
    if (queryNodeConfig(update)) {
      bool changed = !hasLastPolled ||
                     update.exists != lastPolled.exists ||
                     update.enabled != lastPolled.enabled ||
                     update.periodMs != lastPolled.periodMs;

      if (changed) {
        xQueueSend(nodeConfigQueue, &update, 0);
        lastPolled = update;
        hasLastPolled = true;
      }
    }

    vTaskDelay(pdMS_TO_TICKS(5000));
  }
}

void taskNodeConfigApply(void *)
{
  NodeConfigUpdate update;

  while (true) {
    if (xQueueReceive(nodeConfigQueue, &update, portMAX_DELAY) != pdPASS) {
      continue;
    }

    if (!update.queryOk) {
      continue;
    }

    applyNodeConfig(update);
    Serial.printf("Node config applied: exists=%d enabled=%d periodMs=%lu\n", update.exists, update.enabled, update.periodMs);
  }
}

void enqueueLockWrite(bool locked)
{
  OutboundWrite req = {};
  req.kind = WRITE_LOCK;
  req.lockState = locked;

  if (xQueueSend(writeQueue, &req, 0) != pdPASS) {
    Serial.println("Lock queue full; dropping lock change.");
  }
}

bool readSensorsSnapshot(SensorSnapshot &snapshot)
{
  float temperature = DEVICE_DISCONNECTED_C;
  for (uint8_t attempt = 0; attempt < TEMP_READ_RETRIES; attempt++) {
    sensors.requestTemperatures();
    vTaskDelay(pdMS_TO_TICKS(TEMP_CONVERSION_DELAY_MS));
    temperature = sensors.getTempCByIndex(0);
    if (temperature != DEVICE_DISCONNECTED_C) {
      break;
    }
    Serial.println("Invalid DS18B20 reading (-127C), retrying...");
  }

  if (temperature == DEVICE_DISCONNECTED_C) {
    Serial.println("Skipping sensor sample: temperature sensor returned -127C.");
    return false;
  }

  snapshot.temperature = temperature;
  snapshot.pressure = bme.readPressure() / 100.0F;
  snapshot.altitude = bme.readAltitude(SEALEVELPRESSURE_HPA);
  snapshot.humidity = bme.readHumidity();
  snapshot.locked = lockStableState;
  return true;
}

bool queryNodeConfig(NodeConfigUpdate &update)
{
  update = {};
  update.queryOk = false;
  update.periodMs = SENSOR_POST_INTERVAL_DEFAULT_MS;

  if ((xEventGroupGetBits(stateEvents) & BIT_ETH_CONNECTED) == 0) {
    return false;
  }

  String response;
  if (useEspsupabase) {
    response = db.from(SUPABASE_NODES_TABLE)
                 .select("name,enabled,transmission_period")
                 .eq("name", String(NODE_NAME))
                 .limit(1)
                 .doSelect();
    db.urlQuery_reset();
  } else {
    String query = String(SUPABASE_NODES_TABLE) +
                   "?select=name,enabled,transmission_period&name=eq." +
                   urlEncode(NODE_NAME) +
                   "&limit=1";

    int code = sendSelectRequest(query, response);
    if (code < 200 || code >= 300) {
      Serial.printf("Node select failed with code %d\n", code);
      return false;
    }
  }

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, response);
  if (err) {
    Serial.printf("Node select JSON parse failed: %s\n", err.c_str());
    return false;
  }

  if (!doc.is<JsonArray>() || doc.size() == 0) {
    update.queryOk = true;
    update.exists = false;
    update.enabled = false;
    update.periodMs = SENSOR_POST_INTERVAL_DEFAULT_MS;
    return true;
  }

  JsonObject row = doc[0];
  update.queryOk = true;
  update.exists = true;
  update.enabled = row["enabled"] | false;
  update.periodMs = normalizePeriodMs(row["transmission_period"] | (int)SENSOR_POST_INTERVAL_DEFAULT_MS);
  return true;
}

int sendSelectRequest(const String &pathWithQuery, String &responseBody)
{
  HTTPClient http;
  WiFiClient client;
  String url = String(SUPABASE_URL) + "/rest/v1/" + pathWithQuery;

  if (!http.begin(client, url)) {
    Serial.println("HTTP begin() failed for select.");
    return -100;
  }

  http.addHeader("apikey", String(SERVICE_ROLE_KEY));
  http.addHeader("Authorization", String("Bearer ") + SERVICE_ROLE_KEY);
  http.addHeader("Accept", "application/json");

  int code = http.GET();
  responseBody = http.getString();
  http.end();
  return code;
}

int sendJsonPost(const char *table, const String &payload)
{
  if ((xEventGroupGetBits(stateEvents) & BIT_ETH_CONNECTED) == 0) {
    return -1;
  }

  if (useEspsupabase) {
    int code = db.insert(String(table), payload, false);
    db.urlQuery_reset();
    return code;
  }

  HTTPClient http;
  WiFiClient client;
  String url = String(SUPABASE_URL) + "/rest/v1/" + table;

  if (!http.begin(client, url)) {
    Serial.println("HTTP begin() failed for POST.");
    return -100;
  }

  http.addHeader("apikey", String(SERVICE_ROLE_KEY));
  http.addHeader("Authorization", String("Bearer ") + SERVICE_ROLE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=representation");

  int code = http.POST(payload);
  String response = http.getString();
  if (response.length() > 0) {
    Serial.println(response);
  }
  http.end();

  return code;
}

String urlEncode(const char *input)
{
  const char *hex = "0123456789ABCDEF";
  String out;

  while (*input) {
    unsigned char c = static_cast<unsigned char>(*input);
    bool unreserved = (c >= 'a' && c <= 'z') ||
                      (c >= 'A' && c <= 'Z') ||
                      (c >= '0' && c <= '9') ||
                      c == '-' || c == '_' || c == '.' || c == '~';
    if (unreserved) {
      out += static_cast<char>(c);
    } else {
      out += '%';
      out += hex[(c >> 4) & 0x0F];
      out += hex[c & 0x0F];
    }
    input++;
  }

  return out;
}

uint32_t normalizePeriodMs(int raw)
{
  if (raw <= 0) {
    return SENSOR_POST_INTERVAL_DEFAULT_MS;
  }
  if (raw < 500) {
    return 500;
  }
  return static_cast<uint32_t>(raw);
}

void applyNodeConfig(const NodeConfigUpdate &update)
{
  if (xSemaphoreTake(runtimeStateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
    runtimeState.nodeExists = update.exists;
    runtimeState.nodeEnabled = update.enabled;
    runtimeState.transmissionPeriodMs = update.periodMs;
    xSemaphoreGive(runtimeStateMutex);
  }

  EventBits_t bitsToSet = 0;
  EventBits_t bitsToClear = BIT_NODE_EXISTS | BIT_NODE_ENABLED | BIT_NODE_ALLOWED;

  if (update.exists) {
    bitsToSet |= BIT_NODE_EXISTS;
  }
  if (update.enabled) {
    bitsToSet |= BIT_NODE_ENABLED;
  }
  if (update.exists && update.enabled) {
    bitsToSet |= BIT_NODE_ALLOWED;
  }

  xEventGroupClearBits(stateEvents, bitsToClear);
  xEventGroupSetBits(stateEvents, bitsToSet);
}

bool canSendSensors()
{
  EventBits_t bits = xEventGroupGetBits(stateEvents);
  const EventBits_t required = BIT_ETH_CONNECTED | BIT_NODE_ALLOWED;
  return (bits & required) == required;
}

uint32_t readTransmissionPeriodMs()
{
  uint32_t period = SENSOR_POST_INTERVAL_DEFAULT_MS;

  if (xSemaphoreTake(runtimeStateMutex, pdMS_TO_TICKS(20)) == pdTRUE) {
    period = runtimeState.transmissionPeriodMs;
    xSemaphoreGive(runtimeStateMutex);
  }

  return period;
}

void onRealtimeMessage(String payload)
{
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    return;
  }

  String tableName = doc["table"] | "";
  String eventType = doc["type"] | "";

  if (tableName != SUPABASE_NODES_TABLE) {
    return;
  }
  if (eventType != "INSERT" && eventType != "UPDATE") {
    return;
  }

  JsonVariant row = doc["record"];
  if (row.isNull()) {
    return;
  }

  String rowName = row["name"] | "";
  if (rowName != NODE_NAME) {
    return;
  }

  NodeConfigUpdate update = {};
  update.queryOk = true;
  update.exists = true;
  update.enabled = row["enabled"] | false;
  update.periodMs = normalizePeriodMs(row["transmission_period"] | (int)SENSOR_POST_INTERVAL_DEFAULT_MS);
  xQueueSend(nodeConfigQueue, &update, 0);
}

void WiFiEvent(WiFiEvent_t event)
{
  switch (event) {
    case ARDUINO_EVENT_ETH_START:
      Serial.println("ETH Started");
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

      if (xSemaphoreTake(runtimeStateMutex, pdMS_TO_TICKS(20)) == pdTRUE) {
        runtimeState.ethConnected = true;
        xSemaphoreGive(runtimeStateMutex);
      }
      xEventGroupSetBits(stateEvents, BIT_ETH_CONNECTED);
      break;

    case ARDUINO_EVENT_ETH_DISCONNECTED:
      Serial.println("ETH Disconnected");
      if (xSemaphoreTake(runtimeStateMutex, pdMS_TO_TICKS(20)) == pdTRUE) {
        runtimeState.ethConnected = false;
        xSemaphoreGive(runtimeStateMutex);
      }
      xEventGroupClearBits(stateEvents, BIT_ETH_CONNECTED);
      break;

    case ARDUINO_EVENT_ETH_STOP:
      Serial.println("ETH Stopped");
      if (xSemaphoreTake(runtimeStateMutex, pdMS_TO_TICKS(20)) == pdTRUE) {
        runtimeState.ethConnected = false;
        xSemaphoreGive(runtimeStateMutex);
      }
      xEventGroupClearBits(stateEvents, BIT_ETH_CONNECTED);
      break;

    default:
      break;
  }
}

void IRAM_ATTR onLockChange()
{
  BaseType_t higherPriorityTaskWoken = pdFALSE;
  if (lockTaskHandle != nullptr) {
    vTaskNotifyGiveFromISR(lockTaskHandle, &higherPriorityTaskWoken);
    portYIELD_FROM_ISR(higherPriorityTaskWoken);
  }
}
