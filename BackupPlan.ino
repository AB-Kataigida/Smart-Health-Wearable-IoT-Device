/*
  Smart Wearable IoT Medical Device (Offline Dashboard Mode)
  ESP32 + AD8232 (ECG) + MPU6050 + ILI9488 (8-bit parallel)
*/

#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

#include <TFT_eSPI.h>

// ECG pins
#define ECG_PIN 34
#define LO_PLUS 35
#define LO_MINUS 32

// Timing
#define DISPLAY_INTERVAL 200

// ================== OBJECTS ==================
TFT_eSPI tft = TFT_eSPI();  // pins from User_Setup.h
Adafruit_MPU6050 mpu;

// Sensor variables
int ecgValue = 0;
bool leadOff = false;

float ax, ay, az, gx, gy, gz;

unsigned long lastDisplay = 0;

// ECG plot buffer (480x320 landscape)
#define PLOT_WIDTH 460
#define PLOT_HEIGHT 80
int plotY[PLOT_WIDTH];
int plotIndex = 0;

// Forward declarations
void drawStaticUI();
void updateDisplay();

// ================== SETUP ==================
void setup() {
  Serial.begin(115200);
  delay(500);

  // TFT init
  tft.init();
  tft.setRotation(1);  // landscape 480x320
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(2);
  tft.setCursor(20, 100);
  tft.println("Smart Wearable");
  tft.println("Initializing...");

  // ECG lead-off pins
  pinMode(LO_PLUS, INPUT);
  pinMode(LO_MINUS, INPUT);

  // I2C (MPU6050 only)
  Wire.begin(21, 22);

  // MPU6050
  if (!mpu.begin(0x68, &Wire)) {
    Serial.println("MPU6050 not found!");
    tft.println("MPU6050 FAIL");
    delay(2000); // Wait 2 seconds instead of freezing
  } else {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  }

  // Draw the dashboard immediately!
  tft.fillScreen(TFT_BLACK);
  drawStaticUI();
  Serial.println("System ready (Offline Mode)");
}

// ================== LOOP ==================
void loop() {
  // --- AD8232 ECG ---
  leadOff = (digitalRead(LO_PLUS) == 1 || digitalRead(LO_MINUS) == 1);
  ecgValue = leadOff ? 0 : analogRead(ECG_PIN);

  // --- MPU6050 (m/s^2 and rad/s) ---
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  ax = a.acceleration.x;
  ay = a.acceleration.y;
  az = a.acceleration.z;
  gx = g.gyro.x;
  gy = g.gyro.y;
  gz = g.gyro.z;

  // --- Display ---
  if (millis() - lastDisplay > DISPLAY_INTERVAL) {
    lastDisplay = millis();
    updateDisplay();
  }
}

// ================== DISPLAY ==================
void drawStaticUI() {
  tft.fillScreen(TFT_BLACK);
  tft.setTextSize(2);
  tft.setTextColor(TFT_CYAN, TFT_BLACK);
  tft.setCursor(5, 5);
  tft.print("SMART WEARABLE IoT");
  tft.drawLine(0, 30, 480, 30, TFT_DARKGREY);

  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setCursor(5, 45);
  tft.print("ECG:");
  tft.setCursor(5, 75);
  tft.print("Accel:");
  tft.setCursor(5, 105);
  tft.print("Gyro:");
  tft.setCursor(5, 135);
  tft.print("Lead:");

  // ECG plot frame
  tft.drawRect(5, 175, PLOT_WIDTH, PLOT_HEIGHT, TFT_DARKGREY);
}

void updateDisplay() {
  tft.setTextSize(2);

  // Clear value fields
  tft.fillRect(100, 45, 250, 20, TFT_BLACK);
  tft.fillRect(100, 75, 370, 20, TFT_BLACK);
  tft.fillRect(100, 105, 370, 20, TFT_BLACK);
  tft.fillRect(100, 135, 200, 20, TFT_BLACK);

  // ECG value
  tft.setTextColor(TFT_GREEN, TFT_BLACK);
  tft.setCursor(100, 45);
  tft.print(ecgValue);

  // Accel (m/s^2)
  tft.setTextColor(TFT_YELLOW, TFT_BLACK);
  tft.setCursor(100, 75);
  tft.printf("%.1f %.1f %.1f", ax, ay, az);

  // Gyro (rad/s)
  tft.setCursor(100, 105);
  tft.printf("%.1f %.1f %.1f", gx, gy, gz);

  // Lead status
  tft.setCursor(100, 135);
  if (leadOff) {
    tft.setTextColor(TFT_RED, TFT_BLACK);
    tft.print("OFF");
  } else {
    tft.setTextColor(TFT_GREEN, TFT_BLACK);
    tft.print("OK");
  }

  // ECG scrolling plot
  int y = map(ecgValue, 0, 4095, PLOT_HEIGHT - 2, 2);
  y = constrain(y, 2, PLOT_HEIGHT - 2);

  int x = plotIndex;
  tft.drawPixel(6 + x, 176 + plotY[x], TFT_BLACK);  // erase old
  plotY[x] = y;
  tft.drawPixel(6 + x, 176 + y, TFT_GREEN);  // draw new

  plotIndex = (plotIndex + 1) % PLOT_WIDTH;
}