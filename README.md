The ESP32 based Smart Healthcare IoT device reads ECG waves and motion (acceleration and rotation) using an AD8232 and MPU-6050 sensors.
ECG function: Using an AD8232 sensor with 3 electrodes with colored patches to placed onto the skin.
Placement of electrodes is: Red patch - right upper chest, Green - below the diaphragm / where right kidney is located, Yellow - Left upper chest.
The sensor detects heart activity, collects the data then sends it to the ESP32 GPIO pins.

Motion sensor: The MPU-6050 with an I2C backpack. Detects motion in 3-axis; X, Y, and Z-axis.
Uses an accelerometer for forward or backward movement sensing relevant to Earths gravity.
Uses a gyroscope for rotation motion.

ESP32 simultaneously reads the data via Arduino IDE then sends it to Firebase Realtime database (for live feed) data storage and update, 
and web dashboard via path "/Device", for monitoring.
