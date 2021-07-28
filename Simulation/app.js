var fs = require('fs');
var express = require("express");
const Stream = require('./Stream.js');
const ConstantDelay = require('./ConstantDelay.js');
const BinomialDelay = require('./BinomialDelay.js');
const GaussianDelay = require('./GaussianDelay.js');
const UniformDelay = require('./UniformDelay.js');

var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
var init_streams = config.streams;
var streams = [];
var streams_to_loop_outer = {};
var streams_to_loop_inner = {};
var clients=[];
var id = 0;
var max_period =  21474836;
const WebSocket = require('ws');

// A simulation environment for sensor data streams. 
// This was used for early testing purposes, before setting up the physical SmartMeshIP network.
// None of the evaluation results are based on this simulation environment.

const wss = new WebSocket.Server({ port: 3020 });

// returns a delay model for a stream, based on desired delay profile
function generateDelayModel(delay){
  if (delay.type == "constant"){
    return new ConstantDelay(delay.value);
  }
  if (delay.type == "binomial"){
    return new BinomialDelay(delay.nb_trials, delay.probability);
  }
  if (delay.type == "uniform"){
    return new UniformDelay(delay.from, delay.to);
  }
  if (delay.type == "gaussian"){
    return new GaussianDelay(delay.mean, delay.std);
  }
}



function addWebsocketToStreams(ws){
  for (var i =0; i< streams.length; i++){
    streams[i].addWebsocket(ws);
  }
}


function removeStream(id){
  var result = [];
  var to_remove;
  for (var i = 0; i < streams.length; i++){
    if (streams[i].id != id){
      result.push(streams[i]);
    }
    else{
      to_remove = streams[i];
    }
  }
  if (to_remove != undefined){
    clearInterval(streams_to_loop_outer[to_remove.id])
    clearInterval(streams_to_loop_inner[to_remove.id])
    delete streams_to_loop_outer[to_remove.id];
    delete streams_to_loop_inner[to_remove.id];
  }
  streams=result;
}


function getStreamByID(id){
  for (var i =0; i < streams.length; i++){
    if (streams[i].id == id){
      return streams[i];
    }
  }
}

function startStream(stream){
  streams_to_loop_outer[stream.id] = setTimeout(function run() {
    stream.updateInterGenerationDelay();
    streams_to_loop_outer[stream.id]=setTimeout(run, stream.getPeriod() + stream.getIGD());
    var generationTime = new Date();
    streams_to_loop_inner[stream.id] = setTimeout(function(){stream.emitEvent(generationTime); }, stream.getTRD());
    stream.updateTransmissionDelay();
    }, stream.getPeriod() + stream.getIGD());
}


function reconfigureInterruptableStream(stream, period){
  stream.period = Number(period);
  clearInterval(streams_to_loop_outer[stream.id])
  clearInterval(streams_to_loop_inner[stream.id])
  streams_to_loop_outer[stream.id] = setTimeout(function run() {
  stream.updateInterGenerationDelay();
  streams_to_loop_outer[stream.id]=setTimeout(run, stream.getPeriod() + stream.getIGD());
  var generationTime = new Date();
  streams_to_loop_inner[stream.id] = setTimeout(function(){stream.emitEvent(generationTime); }, stream.getTRD());
  stream.updateTransmissionDelay();
  }, stream.getPeriod() + stream.getIGD());

}

function reconfigureNonInterruptableStream(stream, period){
  if (Number(stream.period) >= max_period){
    clearInterval(streams_to_loop_outer[stream.id])
    clearInterval(streams_to_loop_inner[stream.id])
    stream.period = Number(period);
    streams_to_loop_outer[stream.id] = setTimeout(function run() {
      stream.updateInterGenerationDelay();
      streams_to_loop_outer[stream.id]=setTimeout(run, stream.getPeriod() + stream.getIGD());
      var generationTime = new Date();
      streams_to_loop_inner[stream.id] = setTimeout(function(){stream.emitEvent(generationTime); }, stream.getTRD());
      stream.updateTransmissionDelay();
      }, stream.getPeriod() + stream.getIGD());
  }
  else{
    stream.period = Number(period);
  }
}

wss.on('connection', function connection(ws) {
  clients.push(ws);
  addWebsocketToStreams(ws);
});


const bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.json());

app.listen(3030, () => {
  console.log("Server running on port 3030");
 });


 app.post('/removeStream', function (req, res) {
  var stream_id = req.query.id;
  console.log(new Date() +  ' | REST |  Remove Stream ' + stream_id);
  clearTimeout(streams_to_loop_outer[stream_id]);
  clearTimeout(streams_to_loop_inner[stream_id]);
  removeStream(stream_id);
  res.send('Removed Stream ' + stream_id);
})

// non-interruptable loop
// streams_to_loop[stream.id] = setTimeout(function run() {
//   stream.updateInterGenerationDelay();
//   setTimeout(run, stream.getPeriod() + stream.getIGD());
//   var generationTime = new Date();
//   setTimeout(function(){stream.emitEvent(generationTime); }, stream.getTRD());
//   stream.updateTransmissionDelay();
// }, stream.getPeriod() + stream.getIGD());


app.post('/reconfigureStream', function (req, res){
  var stream_id = req.query.id;
  var stream = getStreamByID(stream_id);
  var period = req.query.period;
  console.log(new Date() +  ' | REST |  Reconfigure Stream ' + stream_id + 'to Period '  + period);
  
  reconfigureNonInterruptableStream(stream,period);
  
  // interruptable
  // clearInterval(streams_to_loop_outer[stream.id])
  // clearInterval(streams_to_loop_inner[stream.id])
  // streams_to_loop_outer[stream.id] = setTimeout(function run() {
  //   stream.updateInterGenerationDelay();
  //   streams_to_loop_outer[stream.id]=setTimeout(run, stream.getPeriod() + stream.getIGD());
  //   var generationTime = new Date();
  //   streams_to_loop_inner[stream.id] = setTimeout(function(){stream.emitEvent(generationTime); }, stream.getTRD());
  //   stream.updateTransmissionDelay();
  // }, stream.getPeriod() + stream.getIGD());

  //streams_to_loop[stream.id] = setInterval(function() {setTimeout(function() {stream.emitEvent(); }, stream.tr_delay)}, stream.period + stream.ig_delay -1)
  res.send('Reconfigured Stream '  + stream_id + ' to period ' + period);
})


app.post('/addTagStream', function (req, res) {
var stream_id = req.query.id;
var key = req.query.key;
var value = req.query.value;
var stream = getStreamByID(stream_id);
console.log(new Date() +  ' | REST |  Add Tag ' + key + ' = ' + value + 'for Stream ' + stream_id);
stream.tags[key]=Number(value);
res.send('Added Tag ' + key + ' = ' + value + ' for Stream ' + stream_id);
})


app.post('/removeTagStream', function (req, res) {
  var stream_id = req.query.id;
  var key = req.query.key;
  var stream = getStreamByID(stream_id);
  console.log(new Date() +  ' | REST |  Remove Tag ' + key + 'from Stream ' + stream_id);
  delete stream.tags[key];
  res.send('Removed tag ' + key + 'from Stream ' + stream_id);
})



app.post('/createStream', function (req, res) {
  console.log(new Date() +  ' | REST |  Create Stream ');
  var ig_delay = generateDelayModel(req.body.delay.ig_delay);
  var tr_delay = generateDelayModel(req.body.delay.tr_delay);
  var stream = new Stream(id, req.query.period, ig_delay, tr_delay, req.query.value, req.body.tags, req.query.fixed);
  for (var i=0; i < clients.length; i++){
    stream.addWebsocket(clients[i]);
  }
  streams.push(stream);
  for (var i = 0; i < streams.length; i++){
    console.log(streams[i].id);
  }
  startStream(stream);
  id+=1;
  res.send('Registered Stream ' + stream.id);
})







