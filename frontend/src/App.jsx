import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [sliderValue1, setSliderValue1] = useState(0);  // For LED on D23
  const [sliderValue2, setSliderValue2] = useState(0);  // For LED on D22
  const [temperature, setTemperature] = useState(null);  // Temperature from ESP32
  const [humidity, setHumidity] = useState(null);  // Humidity from ESP32
  const ws = useRef(null);  // WebSocket connection reference

  useEffect(() => {
    // Initialize WebSocket connection
    ws.current = new WebSocket('ws://192.168.137.69:3001');  // Replace with your backend server IP

    ws.current.onopen = () => {
      console.log('WebSocket connection opened');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);  // Parse the incoming JSON data

      // Check if the data is sensor data (from ESP32) or slider value
      if (data.type === 'sensor') {
        setTemperature(data.temperature);  // Update temperature in state
        setHumidity(data.humidity);  // Update humidity in state
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed');
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const handleSliderChange1 = (event) => {
    const value = event.target.value;
    setSliderValue1(value);

    // Send the slider value for LED on D23 (as "led1")
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ led: 1, value }));  // Send as JSON
    }
  };

  const handleSliderChange2 = (event) => {
    const value = event.target.value;
    setSliderValue2(value);

    // Send the slider value for LED on D22 (as "led2")
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ led: 2, value }));  // Send as JSON
    }
  };

  return (
    <div className="App">
      <h1>ESP32 Dual LED Control & Sensor Data</h1>

      <div>
        <label>LED on D23:</label>
        <input
          type="range"
          min="0"
          max="100"
          value={sliderValue1}
          onChange={handleSliderChange1}
        />
        <p>Brightness: {sliderValue1}</p>
      </div>

      <div>
        <label>LED on D22:</label>
        <input
          type="range"
          min="0"
          max="100"
          value={sliderValue2}
          onChange={handleSliderChange2}
        />
        <p>Brightness: {sliderValue2}</p>
      </div>

      <div>
        <h2>Sensor Data from ESP32</h2>
        <p>Temperature: {temperature !== null ? `${temperature} °C` : 'Loading...'}</p>
        <p>Humidity: {humidity !== null ? `${humidity} %` : 'Loading...'}</p>
      </div>
    </div>
  );
}

export default App;
