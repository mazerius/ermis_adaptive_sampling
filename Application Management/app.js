var fs = require('fs');
var Query = require('./Query.js');
var Buffer = require('./Buffer.js');
var Event = require('./Event.js')
const request = require('request');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
var init_queries = config.queries;
var queries = [];
var queries_to_loop = {};
var id = 0;
const bodyParser = require('body-parser');
const WebSocket = require('ws');
var express = require("express");
var url = 'http://localhost:3010';
var recording = false;
var session_name = undefined;


// connection to time management layer of Ermis
const ws = new WebSocket('ws://localhost:3040');

ws.on('open', function open() {
    ws.send('Websocket connected.');
  });
  // receive data from Ermis
  ws.on('message', function incoming(data) {
    var data = JSON.parse(data);
    var event = new Event(data.value, data.generation_timestamp);
    for (var i =0; i < data.queries.length; i ++){
        var query = getQueryFromID(data.queries[i]);
        if (query == undefined){
            var dt = new Date();
            dt.setHours(dt.getHours() + 2)
            console.log(dt,'Query', data.queries[i], 'is undefined.');
        }
        else{
            query.buffer.addEvent(event);
        }
    }
  });


function getQueryFromID(id){
    for (var i = 0; i < queries.length; i ++){
        if (queries[i].id == id){
            return queries[i];
        }
    }
}

// REST server for external reconfigurations
// Corresponds to the Application Management Layer in the architecture diagram. 
// It has been implemented as a separate REST server for scalability purposes, communicating with the Time Management layer of the middleware using REST.
var app = express();
app.use(bodyParser.json());


app.listen(3050, () => {
    console.log("Server running on port 3050");
   });


app.post('/reconfigureQuery', function (req, res) {
    let query_id = req.query.id;
    let length = req.query.length;
    let period = req.query.period;
    var query = getQueryFromID(query_id);
    query.length = length;
    query.period = period;
    var dt = new Date();
    dt.setHours(dt.getHours() + 2)
    console.log(dt,  ' | REST |  Reconfigure Query ' + query_id);
    request({ url: url + '/reconfigureQuery?id=' + query_id + '&period=' + period + '&length=' + length + '&advanced=' + req.query.advanced + '&aggregate=' + req.query.aggregate, method: 'POST', function (error, response, body) {
        console.error('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body);
    }})
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
    console.log(dt,  ' | REST |  Create Query ');
    var buffer = new Buffer(id);
    var query = new Query(id, req.query.period, req.query.length, advanced, aggregate, req.body.tags, buffer);
    //for recording a sessions
    query.setRecording(recording);
    query.setFilename(session_name + '.csv');

    queries.push(query);
    queries_to_loop[query.id] = setTimeout(function run() {
        query.processEvents();
        setTimeout(run, query.getPeriod());
      }, query.getPeriod());
   //setInterval(function(){query.processEvents()}, query.period);
   console.log('sending url: ' + url + '/createQuery?period=' + req.query.period + '&length=' + req.query.length + '&advanced=' + req.query.advanced + '&aggregate=' + req.query.aggregate);
    request({ url: url + '/createQuery?period=' + req.query.period + '&length=' + req.query.length + '&advanced=' + req.query.advanced + '&aggregate=' + req.query.aggregate, method: 'POST', json: {"tags":req.body.tags}, function (error, response, body) {
        console.error('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
    }})
    id+=1;
    res.send('Registered Query ' + query.id);
  })

// adds a tag to a query
app.post('/addTagQuery', function (req, res) {
    let query_id = req.query.id;
    let key = req.query.key;
    let value = req.query.value;
    var query = getQueryFromID(query_id);
    query[key]=value;
    var dt = new Date();
    dt.setHours(dt.getHours() + 2)
    console.log(dt, ' | REST |  Add Tag ' + key + ' = ' + value + 'for Query ' + query_id);
    request({ url: url + '/addTagQuery?id=' + query_id + '&key=' + key + '&value=' + value, method: 'POST', function (error, response, body) {
        console.error('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
    }})
    //scheduler.addTagQuery(query_id, key, value);
    res.send('Change Tag Registered for Query.');
  })


// changes the tag of streams that have a certain key with a given value
app.post('/changeTagStreams', function (req, res) {
    let on_key = req.query.key1;
    let on_value = req.query.value1;
    let new_key = req.query.key2;
    let new_value = req.query.value2;
    var dt = new Date();
    dt.setHours(dt.getHours() + 2)
    console.log(dt, ' | REST |  Change Tags for ' + on_key + ' = ' + on_value + 'to ' + new_key + ' = ' + new_value);
    request({ url: url + '/changeTagStreams?key1=' + on_key + '&value1=' + on_value + '&key2=' + new_key + '&value2=' + new_value, method: 'POST', function (error, response, body) {
        console.error('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
    }})
    res.send('Add Tag Registered for Stream.');
})

// adds a tag to a stream
app.post('/addTagStream', function (req, res) {
    let stream_id = req.query.id;
    let key = req.query.key;
    let value = req.query.value;
    var dt = new Date();
    dt.setHours(dt.getHours() + 2)
    console.log(dt, ' | REST |  Add Tag ' + key + ' = ' + value + 'for Stream ' + stream_id);
    request({ url: url + '/addTagStream?id=' + query_id + '&key=' + key + '&value=' + value, method: 'POST', function (error, response, body) {
        console.error('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
    }})
    res.send('Add Tag Registered for Stream.');
})

// changes the tag of a stream
app.post('/changeTagStream', function (req, res) {
    let stream_id = req.query.id;
    let key = req.query.key;
    let value = req.query.value;
    var dt = new Date();
    dt.setHours(dt.getHours() + 2)
    console.log(dt, ' | REST |  Change Tag ' + key + ' = ' + value + 'for Stream ' + stream_id);
    request({ url: url + '/changeTagStream?id=' + query_id + '&key=' + key + '&value=' + value, method: 'POST', function (error, response, body) {
        console.error('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
    }})
    res.send('Change Tag Registered for Stream.');
})

// removes the tag from a query
app.post('/removeTagQuery', function (req, res) {
    let query_id = req.query.id;
    var query = getQueryFromID(query_id);
    let key = req.query.key;
    var dt = new Date();
    dt.setHours(dt.getHours() + 2)
    console.log(dt,  ' | REST |  Remove Tag ' + key + 'from Query ' + query_id);
    request({ url: url + '/removeTagQuery?id=' + query_id + '&key=' + key, method: 'POST', function (error, response, body) {
        console.error('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
    }})
    delete query[key]
    res.send('Removed tag ' + key + 'for Query ' + query_id);
})

// removes a query
app.post('/removeQuery', function (req, res) {
    let query_id = req.query.id;
    var dt = new Date();
    dt.setHours(dt.getHours() + 2)
    console.log(dt,  ' | REST |  Remove Query ' + query_id);
    var new_queries = [];
    for (var i = 0; i < queries.length; i++){
        if (queries[i].id != query_id){
            new_queries.push(queries[i]);
        }
    }
    queries = new_queries;
    request({ url: url + '/removeQuery?id=' + query_id, method: 'POST', function (error, response, body) {
        console.error('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
    }})
    res.send('Removed Query ' + query_id);
})


// starts recording a session to log statistics for evaluation purposes
app.post('/startRecording', function (req, res) {
    recording = true;
    for ( var i  = 0; i < queries.length; i++){
        queries[i].setRecording(recording);
    }
    request({ url: url + '/startRecording', method: 'POST', function (error, response, body) {
        console.error('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
    }})
    console.log(new Date() +  ' | REST | Start Recording ');
    res.send('Started Recording');

  })

  // stops recording a session
  app.post('/stopRecording', function (req, res) {
    recording = false;
    for ( var i  = 0; i < queries.length; i++){
        queries[i].setRecording(recording);
    }
    var dt = new Date();
    dt.setHours(dt.getHours() + 2)
    console.log(dt,  ' | REST | Stop Recording ');
    request({ url: url + '/stopRecording', method: 'POST', function (error, response, body) {
        console.error('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
    }})
    res.send('Stopped Recording ');
  })