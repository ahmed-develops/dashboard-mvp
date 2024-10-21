require('dotenv').config();
const express = require('express');
const cors = require('cors'); 
const { InfluxDB } = require('@influxdata/influxdb-client');
const WebSocket = require('ws');
const aedes = require('aedes')();
const net = require('net');
const mqttWs = require('websocket-stream'); // For MQTT over WebSocket

const app = express();
app.use(cors()); 
const port = 3001;
const mqttPort = 1883;  // Standard MQTT port
const mqttWsPort = 8883; // MQTT over WebSocket port

// InfluxDB configuration
const token = process.env.INFLUXDB_TOKEN;
const url = process.env.INFLUXDB_URL || 'https://us-east-1-1.aws.cloud2.influxdata.com'; 
const org = process.env.INFLUXDB_ORG; 
const bucket = process.env.INFLUXDB_BUCKET || 'sensor_data';

const client = new InfluxDB({ url, token });
const queryApi = client.getQueryApi(org);

// Function to fetch historical data from InfluxDB using Flux
async function getHistoricalData(range) {
    const totalPoints = 10;
    const timeRange = range.startsWith('-') ? range : `-${range}`;
    const hours = parseInt(range.replace(/\D/g, ''), 10);
    const windowDuration = `${(hours) / totalPoints}m`;

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
                    time: new Date(tableObject._time).toISOString(),
                    random: tableObject._value !== undefined ? Number(tableObject._value) : 0
                });
            },
            error(error) {
                console.error(`Error executing Flux query: ${error.message}`);
                reject(error);
            },
            complete() {
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
        const historicalData = await getHistoricalData(range);
        res.json(historicalData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create TCP server for MQTT
const mqttServer = net.createServer(aedes.handle);
mqttServer.listen(mqttPort, function () {
    console.log(`MQTT broker started on port ${mqttPort}`);
});

// MQTT over WebSocket server
const mqttWsServer = require('http').createServer();
mqttWs.createServer({ server: mqttWsServer }, aedes.handle);
mqttWsServer.listen(mqttWsPort, function () {
    console.log(`MQTT over WebSocket server started on port ${mqttWsPort}`);
});

// Aedes event listeners for broker
aedes.on('client', (client) => {
    console.log(`Client connected: ${client.id}`);
});

aedes.on('clientDisconnect', (client) => {
    console.log(`Client disconnected: ${client.id}`);
});

aedes.on('publish', (packet, client) => {
    console.log(`Message published on topic ${packet.topic}: ${packet.payload}`);
});

// WebSocket server for real-time data
const wss = new WebSocket.Server({ noServer: true });
wss.on('connection', (ws) => {
    console.log('New client connected for real-time data');

    ws.on('message', (message) => {
        try {
            const sensorData = JSON.parse(message);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(sensorData));
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
app.server = app.listen(port, "0.0.0.0" () => {
    console.log(`Server running on port ${port}`);
});

app.server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
