'use strict'
// /** @module query 
//  * Queries a data point in InfluxDB using the Javascript client library with Node.js.
// **/
// require('dotenv').config();
// const { InfluxDB, Point } = require('@influxdata/influxdb-client');

// /** Environment variables **/
// const url = process.env.INFLUX_URL || ''
// const token = process.env.INFLUX_TOKEN
// const org = process.env.INFLUX_ORG || ''

// /**
//  * Instantiate the InfluxDB client
//  * with a configuration object.
//  *
//  * Get a query client configured for your org.
//  **/
// const queryApi = new InfluxDB({url, token}).getQueryApi(org)

// /** To avoid SQL injection, use a string literal for the query. */
// const fluxQuery = 'from(bucket:"sensor_data") |> range(start: -2d) |> filter(fn: (r) => r._measurement == "wifi_status")'

// const myQuery = async () => {
//   for await (const {values, tableMeta} of queryApi.iterateRows(fluxQuery)) {
//     const o = tableMeta.toObject(values)
//     console.log(
//       `${o._time} ${o._measurement} in '${o.location}' (${o.sensor_id}): ${o._field}=${o._value}`
//     )
//   }
// }

// /** Execute a query and receive line table metadata and rows. */
// myQuery()



// require('dotenv').config();
// const {InfluxDBClient, Point} = require('@influxdata/influxdb3-client');

// const token = process.env.INFLUXDB_TOKEN

// async function main() {
//     const client = new InfluxDBClient({host: 'https://us-east-1-1.aws.cloud2.influxdata.com', token: token})

// const query = `SELECT *
// FROM "wifi_status"
// WHERE
// time >= now() - interval '4 day' AND time <= now() - interval '2 day'
// AND
// ("potValue" IS NOT NULL)`

// const rows = await client.query(query, 'sensor_data')

// console.log(`${"SSID".padEnd(10)}${"device".padEnd(10)}${"potValue".padEnd(10)}${"random".padEnd(10)}${"rssi".padEnd(10)}${"sensor1".padEnd(10)}${"time".padEnd(15)}`);
// for await (const row of rows) {
//     let SSID = row.SSID || '';
//     let device = row.device || '';
//     let potValue = row.potValue || '';
//     let random = row.random || '';
//     let rssi = row.rssi || '';
//     let sensor1 = row.sensor1 || '';
//     let time = new Date(row.time);
//     console.log(`${SSID.toString().padEnd(10)}${device.toString().padEnd(10)}${potValue.toString().padEnd(10)}${random.toString().padEnd(10)}${rssi.toString().padEnd(10)}${sensor1.toString().padEnd(10)}${time.toString().padEnd(15)}`);
// }

//     client.close()
// }

// main()




require('dotenv').config();
const express = require('express');
const cors = require('cors'); // remove if using the same port, for testing now
const { InfluxDBClient, Point } = require('@influxdata/influxdb3-client');
const WebSocket = require('ws');

// Initialize Express and WebSocket server
const app = express();
app.use(cors()); // remove if using the same port, for testing now
const port = 3001;
const wss = new WebSocket.Server({ noServer: true });

// InfluxDB configuration
const token = process.env.INFLUXDB_TOKEN;
const client = new InfluxDBClient({ host: 'https://us-east-1-1.aws.cloud2.influxdata.com', token: token });

// Function to fetch historical data from InfluxDB
async function getHistoricalData() {
    const query = `SELECT *
    FROM "wifi_status"
    WHERE time >= now() - interval '3 hours' order by time asc`;

    let data = [];

    try {
        const rows = await client.query(query, 'sensor_data');
        for await (const row of rows) {
            let SSID = row.SSID || '';
            let device = row.device || '';
            // let potValue = typeof row.potValue === 'bigint' ? Number(row.potValue) : row.potValue;
            // let random = typeof row.random === 'bigint' ? Number(row.random) : row.random;
            let potValue_converted = row.potValue !== undefined ? Number(row.potValue) : 0;  // Handle missing potValue
            let random_converted = row.random !== undefined ? Number(row.random) : 0;  // Handle missing random
            let rssiValue = row.rssiValue !== undefined ? Number(row.rssiValue) : 0;
            let sensor1Value = row.sensor1Value !== undefined ? Number(row.sensor1Value) : 0;
            let time_converted = new Date(row.time).toISOString();  // Convert the number to a Date object and then to ISO string
            // let potValue = convertBigInt(row.potValue || '');
            // let random = convertBigInt(row.random || '');
            // let rssi = row.rssi || '';
            // let sensor1 = row.sensor1 || '';
            // let time = new Date(row.time);
            
            console.log({
                SSID: typeof SSID,
                device: typeof device,
                potValue: typeof potValue_converted,
                random: typeof random_converted,
                rssi: typeof rssiValue,
                sensor1: typeof sensor1Value,
                time: typeof time_converted
            });
            // Convert time if it's a BigInt or convert to ISO string for regular numbers
            // let time = typeof row.time === 'bigint' ? row.time.toString() : new Date(Number(row.time)).toISOString();

            data.push({
                time: time_converted,
                SSID: SSID,
                device: device,
                potValue: potValue_converted,
                random: random_converted,
                rssi: rssiValue,
                sensor1: sensor1Value
            });
        }
    } catch (err) {
        console.error(`Error fetching historical data: ${err.message}`);
    }
    return data;
}

// Serve static files (client-side HTML/JS for the graph)
app.use(express.static('public'));

// Endpoint for getting historical data
app.get('/historical-data', async (req, res) => {
    try {
        const historicalData = await getHistoricalData();
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
            console.log('Received sensor data:', sensorData);

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