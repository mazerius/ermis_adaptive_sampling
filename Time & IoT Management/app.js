var express = require("express");
const Scheduler = require('./Scheduler.js');
const Monitor = require('./Monitor.js')
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const request = require('request');
const Logger = require('./Logger.js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

//simulation
//const ws = new WebSocket('ws://localhost:3020');

//vs gateway
const ws = new WebSocket('wss://192.168.0.247:8889');

var clients = [];

const wss = new WebSocket.Server({ port: 3040 });

wss.on('connection', function connection(ws) {
  clients.push(ws);
});

ws.on('open', function open() {
  ws.send('Websocket connected.');
});

ws.on('message', function incoming(data) {
  // connects to gateway websocket
  var modified_data = monitor.receiveDataSMIP(data, session_active);
  for (var i =0; i < clients.length; i ++){
    if (modified_data != undefined){
      clients[i].send(JSON.stringify(modified_data));
    }
  }
});



var app = express();
app.use(bodyParser.json());

var logger = new Logger();
var scheduler = new Scheduler(logger);
var monitor = new Monitor(scheduler, logger);


app.listen(3010, () => {
 console.log("Server running on port 3010");
});


var session_active = false;

// starts recording a session, logging statistics to the database for evaluation purposes.
app.post('/startRecording', function (req, res) {
  logger.setRecordingActive();
  var dt = new Date();
  dt.setHours(dt.getHours() + 2)
  console.log(dt, ' | REST |  Start Session ');
  res.send('Started Session');
})

// stops recording a session, logging statistics to the database for evaluation purposes.
app.post('/stopRecording', function (req, res) {
  var dt = new Date();
  dt.setHours(dt.getHours() + 2)
  console.log(dt, ' | REST |  Stop Session ');
  res.send('Stopped Session' );
})

// used by applications to reconfigure a query.
app.post('/reconfigureQuery', function (req, res) {
    let query_id = req.query.id;
    let length = req.query.length;
    let period = req.query.period;
    var dt = new Date();
    dt.setHours(dt.getHours() + 2)
    console.log(dt,' | REST |  Reconfigure Query ' + query_id);
    scheduler.reconfigureQuery(query_id, period, length);
    logger.recordRestAPICall('reconfigure_query');
    res.send('Reconfigured Query ' + query_id);
  })


// register a query, with parameters id, period, length, tags
app.post('/createQuery', function (req, res) {
    let advanced = req.query.advanced;
    let aggregate = req.query.aggregate;
    if (advanced == 1){
        advanced = true;
    }
    else{
        advanced = false;
    }
    if (aggregate == 1){
        aggregate = true;
    }
    else{
        aggregate = false;
    }
    var dt = new Date();
    dt.setHours(dt.getHours() + 2)
    console.log(dt, ' | REST |  Create Query ');
    console.log('tags:', req.body.tags)
    var query = scheduler.createQuery(req.query.period, req.query.length, advanced, aggregate, req.body.tags);
    //logger.recordQueryCreation(query.id, req.query.length, req.query.period, JSON.stringify(req.body.tags), advanced, aggregate, new Date().getTime());
    logger.recordRestAPICall('create_query');
    res.send('Registered Query ' + query.id);
  })

// adds a tag to a query.
app.post('/addTagQuery', function (req, res) {
    let query_id = req.query.id;
    let key = req.query.key;
    let value = req.query.value;
    var dt = new Date();
    dt.setHours(dt.getHours() + 2)
    console.log(dt, ' | REST |  Add Tag ' + key + ' = ' + value + 'for Query ' + query_id);
    scheduler.addTagQuery(query_id, key, value);
    //ogger.recordQueryChangeTag(query_id, query.tags, new Date().getTime());
    logger.recordRestAPICall('add_tag_query');
    res.send('Change Tag Registered for Query.');
  })

// removes a tag from a query.
app.post('/removeTagQuery', function (req, res) {
    let query_id = req.query.id;
    let key = req.query.key;
    var dt = new Date();
    dt.setHours(dt.getHours() + 2)
    console.log(dt,' | REST |  Remove Tag ' + key + 'from Query ' + query_id);
    scheduler.removeTagQuery(query_id, key);
    //logger.recordQueryChangeTag(query_id, query.tags, new Date().getTime());
    logger.recordRestAPICall('remove_tag_query');
    res.send('Removed tag ' + key + 'for Query ' + query_id);
})

// deletes a query.
app.post('/removeQuery', function (req, res) {
    let query_id = req.query.id;
    var dt = new Date();
    dt.setHours(dt.getHours() + 2)
    console.log(dt, ' | REST |  Remove Query ' + query_id);
    scheduler.removeQuery(query_id);
    //logger.recordQueryRemove(query_id, new Date().getTime());
    logger.recordRestAPICall('remove_query');
    res.send('Removed Query ' + query_id);
})



// adds a tag to a stream
app.post('/addTagStream', function (req, res) {
let stream_id = req.query.id;
let key = req.query.key;
let value = req.query.value;
var dt = new Date();
dt.setHours(dt.getHours() + 2);
console.log(dt, ' | REST |  Add Tag ' + key + ' = ' + value + 'for Stream ' + stream_id);
scheduler.addTagStream(stream_id, key, value);
res.send('Added Tag ' + key + ' = ' + value + ' for Stream ' + stream_id);
})

// modifies the tags of a group of stream
app.post('/changeTagStreams', function (req, res) {
  let key1 = req.query.key1;
  let key2 = req.query.key2;
  let value1 = req.query.value1;
  let value2 = req.query.value2;
  var dt = new Date();
  dt.setHours(dt.getHours() + 2);
  console.log(dt, ' | REST |  Change Tags for ' + key1 + ' = ' + value1 + 'to ' + key2 + ' = ' + value2);
  scheduler.changeTagStreams(key1, value1, key2, value2);
  res.send('Changed Tag');
  })

// modifies the tag of an individual stream
app.post('/changeTagStream', function (req, res) {
  let stream_id = req.query.id;
  let key = req.query.key;
  let value = req.query.value;
  var dt = new Date();
  dt.setHours(dt.getHours() + 2);
  console.log(dt, ' | REST |  Add Tag ' + key + ' = ' + value + 'for Stream ' + stream_id);
  scheduler.changeTagStream(stream_id, key, value);
  res.send('Added Tag ' + key + ' = ' + value + ' for Stream ' + stream_id);
  })


