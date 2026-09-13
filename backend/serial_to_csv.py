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
import sys
import time
from datetime import datetime

import serial  # pyserial

# ---------- EDIT THESE ----------
PORT = "COM15"          # <-- change to your ESP32's port
BAUD_RATE = 115200
CSV_FILENAME = "sensor_log.csv"
# ---------------------------------

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
    try:
        ser = serial.Serial(PORT, BAUD_RATE, timeout=2)
    except serial.SerialException as e:
        print(f"Could not open port {PORT}: {e}")
        print("Check the PORT variable at the top of this script.")
        sys.exit(1)

    print(f"Listening on {PORT} at {BAUD_RATE} baud. Logging to {CSV_FILENAME}")
    print("Press Ctrl+C to stop.\n")

    # Open in append mode so re-running the script doesn't erase old data.
    # Write the header only if the file is new/empty.
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

                print(raw_line)  # echo everything to console, same as Serial Monitor

                fields = raw_line.split(",")

                if fields == EXPECTED_HEADER:
                    # Header line from a sketch restart; already have our own header.
                    continue

                if looks_like_data_row(fields):
                    timestamp = datetime.now().isoformat(timespec="seconds")
                    writer.writerow([timestamp] + fields)
                    csv_file.flush()

        except KeyboardInterrupt:
            print("\nStopped logging. Data saved to", CSV_FILENAME)
        finally:
            ser.close()


if __name__ == "__main__":
    main()
