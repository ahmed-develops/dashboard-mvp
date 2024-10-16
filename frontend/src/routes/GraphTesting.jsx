import React, { useState, useEffect, useRef } from 'react';
import { Dropdown, Button } from 'flowbite-react';
import ReactApexChart from 'react-apexcharts';
import axios from 'axios';

function App() {
  const [sliderValue1, setSliderValue1] = useState(0); // For LED on D23
  const [sliderValue2, setSliderValue2] = useState(0); // For LED on D22
  const [temperature, setTemperature] = useState(null); // Temperature from ESP32
  const [humidity, setHumidity] = useState(null); // Humidity from ESP32
  const [graphData, setGraphData] = useState([]); // To store the transformed graph data (random and time)
  const [loading, setLoading] = useState(true); // Loading state for data fetching
  const ws = useRef(null); // WebSocket connection reference

  // WebSocket connection setup
  useEffect(() => {
    ws.current = new WebSocket('ws://192.168.137.98:3001'); // Replace with your backend server IP

    ws.current.onopen = () => {
      console.log('WebSocket connection opened');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data); // Parse the incoming JSON data

      // Check if the data is sensor data (from ESP32)
      if (data.type === 'sensor') {
        setTemperature(data.temperature); // Update temperature in state
        setHumidity(data.humidity); // Update humidity in state
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

  // Fetch historical data when the component mounts
  useEffect(() => {
    fetchHistoricalData();
  }, []);

  const fetchHistoricalData = async () => {
    try {
      const response = await axios.get("http://192.168.137.98:3001/historical-data");
      // Transform the data into the required format for the chart
      const transformedData = response.data.map((entry) => ({
        x: new Date(entry.time).toLocaleTimeString(), // Format the time for x-axis
        y: entry.random, // Use random for y-axis
      }));
      setGraphData(transformedData); // Update the graphData state with the transformed data
      setLoading(false); // Data is fetched and processed, so disable loading state
    } catch (error) {
      console.error("Error fetching historical data:", error);
      setLoading(false); // Disable loading even if there is an error
    }
  };

  // Handle slider change for LED on D23
  const handleSliderChange1 = (event) => {
    const value = parseInt(event.target.value, 10); // Parse the slider value as an integer
    setSliderValue1(value);

    // Send slider value for LED on D23
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ led: 1, value })); // Send as JSON
    }
  };

  // Handle slider change for LED on D22
  const handleSliderChange2 = (event) => {
    const value = event.target.value;
    setSliderValue2(value);

    // Send slider value for LED on D22
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ led: 2, value })); // Send as JSON
    }
  };

  // ApexCharts options for the graph
  const chartOptions = {
    chart: {
      height: "100%",
      maxWidth: "100%",
      type: "area",
      fontFamily: "Inter, sans-serif",
      zoom: {
        enabled: true, // Enable zooming
        type: 'x', // Zoom along the x-axis only
        autoScaleYaxis: true, // Automatically scale the y-axis when zooming
      },
      toolbar: {
        show: true, // Show the toolbar for zoom, pan, and reset
        tools: {
          zoom: true, // Enable zooming
          zoomin: true,
          zoomout: true,
          pan: true, // Enable panning
          reset: true, // Allows the user to reset the zoom
          selection: 'zoom', // Selection zoom tool enabled
        },
        autoSelected: 'zoom', // Automatically select zoom tool
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
      },
    },
    tooltip: {
      enabled: true,
      x: {
        show: true,
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
        shade: "#1C64F2",
        gradientToColors: ["#1C64F2"],
      },
    },
    markers: {
      size: 5, // Display markers on the data points
      colors: ['#1C64F2'], // Marker color
      strokeColors: '#fff',
      strokeWidth: 2,
      hover: {
        size: 7,
      },
      discrete: [], // Reset discrete markers
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      width: 6,
    },
    grid: {
      show: false,
      strokeDashArray: 4,
      padding: {
        left: 2,
        right: 2,
        top: 0,
      },
    },
    series: [
      {
        name: "Potentiometer Values",
        data: graphData.length ? graphData : [{ x: 0, y: 0 }], // The transformed graph data (x: time, y: random)
        color: "#1A56DB",
      },
    ],
    xaxis: {
      type: 'category', // Using category type for time labels
      labels: {
        show: true,
      },
      axisBorder: {
        show: true,
      },
      axisTicks: {
        show: true,
      },
    },
    yaxis: {
      show: true,
    },
  };

  return (
    <div className="App">
      {/* Graph Component */}
      <div className="max-w-sm w-full bg-white rounded-lg shadow dark:bg-gray-800 p-4 md:p-6">
        <div className="flex justify-between">
          <div>
            <h5 className="leading-none text-3xl font-bold text-gray-900 dark:text-white pb-2">Potentiometer Values Over Time</h5>
            <p className="text-base font-normal text-gray-500 dark:text-gray-400">Visualizing the potentiometer values</p>
          </div>
        </div>

        <div id="area-chart" className="pt-5">
          {/* Show the chart only after data has been fetched */}
          {loading ? (
            <p>Loading...</p>
          ) : (
            <ReactApexChart options={chartOptions} series={chartOptions.series} type="area" height={350} />
          )}
        </div>
      </div>

      <h1>ESP32 Dual LED Control & Sensor Data</h1>

      {/* LED Control Sliders */}
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

      {/* Sensor Data Display */}
      <div>
        <h2>Sensor Data from ESP32</h2>
        <p>Temperature: {temperature !== null ? `${temperature} °C` : 'Loading...'}</p>
        <p>Humidity: {humidity !== null ? `${humidity} %` : 'Loading...'}</p>
      </div>
    </div>
  );
}

export default App;
