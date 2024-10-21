require('dotenv').config();
const express = require('express');
const cors = require('cors'); // CORS for testing, remove if not needed
const { InfluxDB } = require('@influxdata/influxdb-client');
const WebSocket = require('ws');

// Initialize Express and WebSocket server
const app = express();
app.use(cors()); // CORS enabled for cross-origin requests
const port = 3001;
const wss = new WebSocket.Server({ noServer: true });

// InfluxDB configuration
const token = process.env.INFLUXDB_TOKEN;
const url = process.env.INFLUXDB_URL || 'https://us-east-1-1.aws.cloud2.influxdata.com'; // Your InfluxDB URL
const org = process.env.INFLUXDB_ORG; // Organization in InfluxDB
const bucket = process.env.INFLUXDB_BUCKET || 'sensor_data'; // Your InfluxDB bucket

const client = new InfluxDB({ url, token });
const queryApi = client.getQueryApi(org); // Get query API for your organization

// Function to fetch historical data from InfluxDB using Flux
async function getHistoricalData(range) {
    const totalPoints = 10; // We want exactly 10 points

    // Ensure range is a valid time duration (e.g., -24h)
    const timeRange = range.startsWith('-') ? range : `-${range}`;

    // Calculate windowDuration in minutes based on the range
    const hours = parseInt(range.replace(/\D/g, ''), 10); // Extract numeric part from range (assuming "h" is passed)
    const windowDuration = `${(hours) / totalPoints}m`; // Convert hours to minutes and divide by totalPoints

    const fluxQuery = `
        from(bucket: "${bucket}")
            |> range(start: ${timeRange})
            |> filter(fn: (r) => r._measurement == "wifi_status" and r._field == "random")
            |> aggregateWindow(every: ${windowDuration}, fn: mean, createEmpty: false)
            |> sort(columns: ["_time"], desc: false)
    `;

    let data = [];

    return new Promise((resolve, reject) => {
        queryApi.queryRows(fluxQuery, {
            next(row, tableMeta) {
                const tableObject = tableMeta.toObject(row);
                data.push({
                    time: new Date(tableObject._time).toISOString(), // Convert to ISO string
                    random: tableObject._value !== undefined ? Number(tableObject._value) : 0 // Aggregated "random" value
                });
            },
            error(error) {
                console.error(`Error executing Flux query: ${error.message}`);
                reject(error);
            },
            complete() {
                console.log('Flux query completed');
                
                // Manually adjust last point if it's not matching expected interval
                if (data.length > 1) {
                    const expectedInterval = 12 * 60 * 1000; // 12 minutes in milliseconds
                    const secondLastPoint = new Date(data[data.length - 2].time).getTime();
                    const lastPoint = new Date(data[data.length - 1].time).getTime();
                    const difference = lastPoint - secondLastPoint;

                    if (difference !== expectedInterval) {
                        // Correct the last point's timestamp
                        const correctedTime = new Date(secondLastPoint + expectedInterval).toISOString();
                        data[data.length - 1].time = correctedTime;
                    }
                }

                resolve(data);
            }
        });
    });
}

// Serve static files (client-side HTML/JS for the graph)
app.use(express.static('public'));

// Endpoint for getting historical data
app.get('/historical-data/:range', async (req, res) => {
    try {
        const { range } = req.params;
        console.log(range)

        const historicalData = await getHistoricalData(range);
        res.json(historicalData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// WebSocket server for real-time data
wss.on('connection', (ws) => {
    console.log('New client connected for real-time data');

    // Listen for real-time sensor data sent by the Arduino
    ws.on('message', (message) => {
        try {
            const sensorData = JSON.parse(message); // Parse the sensor data from Arduino
            // console.log('Received sensor data:', sensorData);

            // Broadcast the sensor data to all connected clients
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(sensorData)); // Send the sensor data to each connected client
                }
            });
        } catch (error) {
            console.error('Error parsing sensor data:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Handling WebSocket upgrade
app.server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

app.server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
