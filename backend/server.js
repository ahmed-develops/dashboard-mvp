// 'use strict'
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
const { InfluxDBClient, Point } = require('@influxdata/influxdb3-client');
const WebSocket = require('ws');

// Initialize Express and WebSocket server
const app = express();
const port = 3000;
const wss = new WebSocket.Server({ noServer: true });

// InfluxDB configuration
const token = process.env.INFLUXDB_TOKEN;
const client = new InfluxDBClient({ host: 'https://us-east-1-1.aws.cloud2.influxdata.com', token: token });

// Helper function to convert BigInt to string or return the value as is
const convertBigInt = (value) => (typeof value === 'bigint' ? value.toString() : value);

// Function to fetch historical data from InfluxDB
async function getHistoricalData() {
    const query = `SELECT *
    FROM "wifi_status"
    WHERE time >= now() - interval '4 day' AND time <= now() - interval '2 day'
    AND "potValue" IS NOT NULL`;

    let data = [];

    try {
        const rows = await client.query(query, 'sensor_data');
        for await (const row of rows) {
            let SSID = row.SSID || '';
            let device = row.device || '';
            let potValue = convertBigInt(row.potValue || '');
            let random = convertBigInt(row.random || '');
            let rssi = row.rssi || '';
            let sensor1 = row.sensor1 || '';
            
            console.log({
                SSID: typeof row.SSID,
                device: typeof row.device,
                potValue: typeof row.potValue,
                random: typeof row.random,
                rssi: typeof row.rssi,
                sensor1: typeof row.sensor1,
                time: typeof row.time
            });
            // Convert time if it's a BigInt or convert to ISO string for regular numbers
            let time = typeof row.time === 'bigint' ? row.time.toString() : new Date(Number(row.time)).toISOString();

            data.push({
                time: time,
                SSID: SSID,
                device: device,
                potValue: potValue,
                random: random,
                rssi: rssi,
                sensor1: sensor1
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

    // Simulating sensor data
    setInterval(() => {
        const sensorData = {
            time: new Date().toISOString(),
            value: Math.random() * 100, // Simulate sensor value
        };
        ws.send(JSON.stringify(sensorData));
    }, 1000); // Send new data every 1 second
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
