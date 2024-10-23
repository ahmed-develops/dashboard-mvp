import websocket
import json
import argparse
import time
from concurrent.futures import ThreadPoolExecutor

DEFAULT_WEBSOCKET_URL = "ws://13.201.132.202:3001"

def simulate_device(device_id, num_of_sensors, websocket_url):
    try:
        ws = websocket.WebSocket()
        ws.connect(websocket_url)
        print(f"Device {device_id}: Connected to WebSocket")

        for data_point in range(num_of_sensors):
            sensor_data = {
                "device_id": device_id,
                "temperature": 20,  
                "humidity": 50,      
            }

            ws.send(json.dumps(sensor_data))
            print(f"Device {device_id}: Sent data {sensor_data}")

            try:
                response = ws.recv()
                print(f"Device {device_id}: Received response: {response}")
            except Exception as recv_error:
                print(f"Device {device_id}: Error receiving response: {recv_error}")

        ws.close()
        print(f"Device {device_id}: Connection closed after sending {num_of_sensors} data points")

    except Exception as e:
        print(f"Device {device_id}: Error occurred: {e}")

def simulate_devices(num_of_devices, num_of_sensors, websocket_url):
    start_time = time.time()

    with ThreadPoolExecutor(num_of_devices) as executor:
        futures = [executor.submit(simulate_device, device_id, num_of_sensors, websocket_url) for device_id in range(1, num_of_devices + 1)]

        for future in futures:
            future.result()

    end_time = time.time()
    print(f"All {num_of_devices} devices' {num_of_sensors} sensors completed sending data points in {end_time - start_time:.2f} seconds")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Simulate multiple devices sending WebSocket messages.")
    
    parser.add_argument('--devices', type=int, default=50, help='Number of devices to simulate')
    parser.add_argument('--sensors', type=int, default=500, help='Number of sensors each device should have')
    parser.add_argument('--url', type=str, default=DEFAULT_WEBSOCKET_URL, help='WebSocket URL to connect to')

    args = parser.parse_args()

    print(f"Simulating {args.devices} devices, each having {args.sensors} which are sending WebSocket messages to {args.url}...")

    simulate_devices(args.devices, args.sensors, args.url)