"""
serial_to_csv.py
-----------------
Reads CSV lines printed by the ESP32 sketch over Serial and writes them
into a real .csv file on your computer.

SETUP
1. Install pyserial:      pip install pyserial
2. Close the Arduino IDE Serial Monitor (only one program can use the
   COM port / /dev/tty device at a time).
3. Edit PORT below to match your ESP32's serial port:
     Windows:  "COM5" (check Device Manager -> Ports)
     macOS:    "/dev/cu.usbserial-XXXX" or "/dev/cu.SLAB_USBtoUART"
     Linux:    "/dev/ttyUSB0"
4. Run:  python serial_to_csv.py
5. Press Ctrl+C to stop logging. The file sensor_log.csv will be in the
   same folder as this script.

The script recognizes two kinds of lines from the ESP32:
  - The header line: "millis,temperature_C,humidity_pct,soil_moisture_pct,buzzer_state"
  - Data lines that match that same 5-field CSV shape
Everything else (human-readable status text, WiFi/ThingSpeak messages) is
printed to the console but not written to the CSV, so the file stays clean.
"""

import csv
import os
import sys
import time
from datetime import datetime
import requests
import serial  # pyserial

# ---------- CONFIGURATION ----------
# Serial Port for ESP32 (e.g. "/dev/ttyUSB0" on Linux, "COM5" on Windows, "/dev/cu.usbserial-*" on macOS)
PORT = os.getenv("ESP32_PORT", "COM15")
BAUD_RATE = int(os.getenv("ESP32_BAUD", "115200"))
CSV_FILENAME = os.getenv("CSV_FILENAME", "sensor_log.csv")

# Set to your deployed Render URL to stream IoT telemetry live to the cloud!
# Example: "https://flash-flood-prediction.onrender.com" or "http://localhost:8000"
CLOUD_BACKEND_URL = os.getenv("CLOUD_BACKEND_URL", "").strip()
# -----------------------------------

EXPECTED_HEADER = ["millis", "temperature_C", "humidity_pct", "soil_moisture_pct", "buzzer_state"]


def looks_like_data_row(fields):
    """A valid data row has 5 comma-separated fields, all numeric."""
    if len(fields) != len(EXPECTED_HEADER):
        return False
    try:
        [float(f) for f in fields]
        return True
    except ValueError:
        return False


def main():
    target_port = sys.argv[1] if len(sys.argv) > 1 else PORT
    cloud_url = sys.argv[2] if len(sys.argv) > 2 else CLOUD_BACKEND_URL

    try:
        ser = serial.Serial(target_port, BAUD_RATE, timeout=2)
    except serial.SerialException as e:
        print(f"❌ Could not open port {target_port}: {e}")
        print("Tip: Check device manager or run: python serial_to_csv.py /dev/ttyUSB0")
        sys.exit(1)

    print(f"📡 Listening on {target_port} at {BAUD_RATE} baud.")
    print(f"💾 Local CSV logging to: {CSV_FILENAME}")
    if cloud_url:
        print(f"☁️  Cloud live sync active -> {cloud_url}/api/sensors/ingest")
    else:
        print("ℹ️  Cloud sync disabled. (Set CLOUD_BACKEND_URL to stream to your deployed Render app)")
    print("Press Ctrl+C to stop.\n")

    # Open in append mode so re-running the script doesn't erase old data.
    write_header = True
    try:
        with open(CSV_FILENAME, "r", newline="") as f:
            if f.readline().strip():
                write_header = False
    except FileNotFoundError:
        pass

    with open(CSV_FILENAME, "a", newline="") as csv_file:
        writer = csv.writer(csv_file)
        if write_header:
            writer.writerow(["timestamp"] + EXPECTED_HEADER)
            csv_file.flush()

        try:
            while True:
                raw_line = ser.readline().decode("utf-8", errors="ignore").strip()
                if not raw_line:
                    continue

                fields = raw_line.split(",")

                if fields == EXPECTED_HEADER:
                    # Header line from a sketch restart; ignore
                    continue

                if looks_like_data_row(fields):
                    timestamp = datetime.now().astimezone().isoformat(timespec="seconds")
                    writer.writerow([timestamp] + fields)
                    csv_file.flush()

                    status_msg = f"[{timestamp}] 🌡️ Temp: {fields[1]}°C | 💧 Humidity: {fields[2]}% | 🌱 Soil: {fields[3]}%"

                    if cloud_url:
                        try:
                            payload = {
                                "millis": int(float(fields[0])),
                                "temperature_C": float(fields[1]),
                                "humidity_pct": float(fields[2]),
                                "soil_moisture_pct": float(fields[3]),
                                "buzzer_state": int(float(fields[4])),
                                "timestamp": timestamp,
                            }
                            res = requests.post(
                                f"{cloud_url.rstrip('/')}/api/sensors/ingest",
                                json=payload,
                                timeout=4
                            )
                            if res.ok:
                                status_msg += " ☁️ [Cloud Ingested]"
                            else:
                                status_msg += f" ⚠️ [Cloud HTTP {res.status_code}]"
                        except Exception as post_err:
                            status_msg += f" ⚠️ [Cloud Error: {post_err}]"

                    print(status_msg)
                else:
                    print(f"ℹ️  [ESP32 Serial]: {raw_line}")

        except KeyboardInterrupt:
            print("\n🛑 Stopped logging. Data saved to", CSV_FILENAME)
        finally:
            ser.close()


if __name__ == "__main__":
    main()

