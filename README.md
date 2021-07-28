# Ermis: a middleware for bridging data collection and data processing in IoT streaming applications
The source code of the middleware corresponding to the research paper: "Ermis: a middleware for bridging data collection and data processing in IoT streaming applications", accepted for publication at the 3rd International Workshop on IoT Applications and Industry 4.0 (IoTI4).

## Getting Started

The source code consists of three folders: Application Management, Time & IoT Management, Simulation.
The "Application Management" folder contains the necessary code for running the application management layer of the middleware. After installing the necessary node dependencies, running the command "node app.js" will start up the REST server that provides applications with the API to register and reconfigure sliding window queries. Note that first, the Time & IoT management layer should be started, as described next, since the Application Management connects to it.

The "Time & IoT Management" folder contains the necessary code for running the time managament and IoT management of the middleware. After installing the necessary node dependencies, running the command "node app.js" will start up the REST server that provides the "Application Management" layer with the API to register and reconfigure sliding window queries. This server also connects and listens to the WebSocket that is served by the gateway of the IoT infrastructure for incoming sensor messages.
