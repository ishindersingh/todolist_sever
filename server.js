const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mqtt = require('mqtt');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// MQTT broker configuration
const mqttOptions = {
  host: 'broker.hivemq.com',
  port: 1883,
  clientId: 'NodeJS_Server_' + Math.random().toString(16).slice(3)
};
const mqttClient = mqtt.connect(mqttOptions);

// MQTT topics
const topics = ['esp32/temperature', 'esp32/humidity'];

// Basic route to confirm server is running
app.get('/', (req, res) => {
  res.send('MQTT-WebSocket server for ESP32 DHT11 sensor is running');
});

// Handle MQTT connection
mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  topics.forEach((topic) => {
    mqttClient.subscribe(topic, (err) => {
      if (!err) {
        console.log(`Subscribed to ${topic}`);
      } else {
        console.error(`Failed to subscribe to ${topic}:`, err);
      }
    });
  });
});

// Handle MQTT messages
mqttClient.on('message', (topic, message) => {
  const value = message.toString();
  console.log(`Received ${value} on ${topic}`);

  // Relay to WebSocket clients
  const data = JSON.stringify({ topic, value });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
