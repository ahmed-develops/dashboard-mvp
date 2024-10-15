import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [sliderValue, setSliderValue] = useState(0);
  const ws = useRef(null);  // Using useRef to hold WebSocket

  useEffect(() => {
    // Initialize WebSocket connection
    ws.current = new WebSocket('ws://192.168.137.69:3001');  // Replace 'localhost' with the actual backend server IP or domain in production

    // Handle WebSocket events
    ws.current.onopen = () => {
      console.log('WebSocket connection opened');
      ws.current.send('Frontend Connected');  // Send identification to the backend
    };

    ws.current.onclose = (event) => {
      console.log(`WebSocket connection closed: ${event.reason} (Code: ${event.code})`);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error occurred:', error.message);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
        console.log('WebSocket connection closed by component unmount');
      }
    };
  }, []);

  const handleSliderChange = (event) => {
    const value = event.target.value;
    setSliderValue(value);

    // Send the slider value to the server only if WebSocket is open
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(value);  // Send slider value through WebSocket
    } else {
      console.error('WebSocket is not open. Cannot send message.');
    }
  };

  return (
    <div className="App">
      <h1>ESP32 LED PWM Control</h1>
      <input
        type="range"
        min="0"
        max="100"
        value={sliderValue}
        onChange={handleSliderChange}
      />
      <p>LED Brightness: {sliderValue}</p>
    </div>
  );
}

export default App;
