#include <Arduino.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <HttpClient.h>
#include <Ethernet.h>
#include <EthernetClient.h>

#define SEALEVELPRESSURE_HPA (1013.25)
#define IN1 36

// HTTPClient http;
Adafruit_BME280 bme; 
OneWire oneWire(33);
DallasTemperature sensors(&oneWire);
String SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODkzNjc3NjAsImV4cCI6MTk0NzA0Nzc2MH0.HC39l6omcv2FQfBEFPWTNLet2h8DdndSOJsnwUKaYmY";
const String supabase_url = "http://192.168.10.158:8000/rest/v1/sensors";
void sendValues();

void setup()
{
  pinMode(IN1, INPUT);
  Serial.begin(9600);
  Wire.begin(4,16);
  bool status = bme.begin(0x76);  
  if (!status) {
    Serial.println("Could not find a valid BME280 sensor, check wiring!");
    while (1);
  }
  sensors.begin();
}

void loop()
{
  sendValues();
  delay(10000);
} 

void sendValues()
{
  sensors.requestTemperatures();
  float temperature = sensors.getTempCByIndex(0);
  float pressure = bme.readPressure() / 100.0F;
  float altitude = bme.readAltitude(SEALEVELPRESSURE_HPA);
  float humidity = bme.readHumidity();
  bool locked = false;

  JsonDocument doc;

  doc["location"] = "SQU";
  doc["mac_address"] = "Muscat";
  doc["ip_address"] = "Al-Seeb";
  doc["locked"] = digitalRead(IN1)==LOW;
  doc["temperature"] = temperature;
  doc["pressure"] = pressure;
  doc["altitude"] = altitude;
  doc["humidity"] = humidity;

  String output;
  serializeJson(doc, output);

  Serial.println(output);
  // http.begin(supabase_url);
  // http.addHeader("Content-Type", "application/json");
  // http.addHeader("apikey", SERVICE_ROLE_KEY);
  // int code = http.POST(output);
}