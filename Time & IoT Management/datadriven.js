const regression = require('regression');
const WebSocket = require('ws');
const request = require('request');
const SMIPMessage = require('./SMIPMessage.js');
const OutputData = require('./OutputData.js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

//simulation
//const ws = new WebSocket('ws://localhost:3020');
//vs gateway
const ws = new WebSocket('wss://192.168.0.220:8889');

var clients = [];

var discovered_devices = {};

const wss = new WebSocket.Server({ port: 3040 });

wss.on('connection', function connection(ws) {
  clients.push(ws);
});

ws.on('open', function open() {
  ws.send('Websocket connected.');
});

ws.on('message', function incoming(data) {
  console.log('data',data);
  var modified_data = monitor.receiveDataSMIP(data);
  for (var i =0; i < clients.length; i ++){
    if (modified_data != undefined){
      clients[i].send(JSON.stringify(modified_data));
    }
  }
});

var N = 1000
var T = 30
var T_aunit = 2;
var T_sunit = 5;
var T_min = 5;
var T_max = 50;
var omega_1 = 20000;
var omega_2 = 10000;

var queries = {};

var query_counter = 0;


function receiveData(data){
    var data = JSON.parse(data);
    if (data.type != "sensor-data"){
        return;
    }
    if (data.contents.data.length == 0){
        return;
    }
    //var message = this.convertToMessageSMIP(data);
    var id = data.contents.identifier + '|' + data.contents.mac;
    var value = data.contents.data[0].value;
    var tags = {};
    tags.location = data.contents.location;
    tags.name = data.contents.name;
    tags.peripheral = data.contents.identifier;
    var gts = data.contents.timestamp/1000;
    var ats = Number(new Date().getTime());
    var message = new SMIPMessage(id, value, tags, gts, ats);
    // if not discovered before, request period.
    if (discovered_devices[id] == undefined){
        requestPeriod(message.tags.name, id.split('|')[0], id)
    }
    else{
        var x_i = new Date(message.gts);
        // requires conversion (maybe)
        var y_i = message.value;
        var period = computeNextPeriod(computeOmega(x_i, y_i));
        sendReconfigurationCommandSMIP(message.tags.name, id.split('|')[0], period);
    }   
    // {'key1':1, ...}
    var relevant_queries = getRelevantQueries(message.tags);
    var queries_to_add = [];
    for (var i  = 0; i < relevant_queries.length; i++){
        queries_to_add.push(relevant_queries[i].id);
    }
        //data.queries = queries_to_add;
    return new OutputData(message.value, queries_to_add, message.gts);
}

var app = express();
app.use(bodyParser.json());


app.listen(3010, () => {
 console.log("Server running on port 3010");
});

function getRelevantQueries(tags){
    var result = [];
    for (var i = 0; i < queries.length; i ++){
        var query_tags = queries[i];
    }
    if (checkSubMatchTags(tags, query_tags)){
        result.push(queries[i]);
    }
    return result;
}

function checkSubMatchTags(tags_stream, tags_query){
    var keys_tags_query = Object.keys(tags_query);
    var keys_tags_stream = Object.keys(tags_stream);
    if (keys_tags_query.length > keys_tags_stream.length){
        return false;
    }
    for (var i = 0; i < keys_tags_query.length; i++){
        if (!keys_tags_stream.includes(keys_tags_query[i])){
            return false;
        }
        if (tags_query[keys_tags_query[i]] != tags_stream[keys_tags_query[i]]){
            return false;
        }
    }
    return true;
}

function requestPeriod(name, peripheral, id){
    console.log('Requesting Sampling Period for', name, 'with peripheral:', peripheral);
    var url =  'https://192.168.0.247:8889/api/v1/devices/name/' + name + '/peripherals';
    var options = {'auth': {
        'user': 'username',
        'pass': 'password'
    }};
    request.get(url, options, (error, res, body) => {
        if (error) {
            return  console.log(error)
        }; 

        if (!error && res.statusCode == 200) {
            console.log('BODY:', body);
            var data = JSON.parse(body);
            for (var i = 0; i < data.length; i++){
                if (data[i].identifier == peripheral){
                    discovered_devices[id] = 1000*data[i].sampling_rate; //convert to ms
                }
            }
            // do something with JSON, using the 'body' variable
        };
    });
}

function sendReconfigurationCommandSMIP(name, peripheral, period){
    var period = period/1000; //from ms to seconds for SMIP
    if (period < 10){
        console.log('PERIOD < 10 -> CANCEL');
        return;
    }
    var url = 'https://192.168.0.247:8889/api/v1/devices/name/' + name + '/peripherals/' + peripheral +'/rate'
    var options = {'auth': {
        'user': 'username',
        'pass': 'password'
    }};
    request({ url: url, options, method: 'PUT', json: { "sampling_rate" : period }}, (error, res, body) => {
        if (error) {
            return  console.log(error)
        }; 

        if (!error && res.statusCode == 200) {
            console.log('Reconfiguration 200 OK');
            // do something with JSON, using the 'body' variable
        };
    });
}

app.post('/reconfigureQuery', function (req, res) {
    let query_id = req.query.id;
    let length = req.query.length;
    let period = req.query.period;
    console.log(new Date() +  ' | REST |  Reconfigure Query ' + query_id);
    //scheduler.reconfigureQuery(query_id, period, length);
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
    console.log(new Date() +  ' | REST |  Create Query ');
    var old_query_counter = query_counter;
    queries[old_query_counter] = req.body.tags;
    query_counter+=1;
    res.send('Registered Query ' + old_query_counter);
  })

app.post('/addTagQuery', function (req, res) {
    let query_id = req.query.id;
    let key = req.query.key;
    let value = req.query.value;
    console.log(new Date() +  ' | REST |  Add Tag ' + key + ' = ' + value + 'for Query ' + query_id);
    queries[query_id][key] = value;
    res.send('Change Tag Registered for Query.');
  })

app.post('/removeTagQuery', function (req, res) {
    let query_id = req.query.id;
    let key = req.query.key;
    console.log(new Date() +  ' | REST |  Remove Tag ' + key + 'from Query ' + query_id);
    var old_tags = queries[query_id];
    var new_tags = {};
    var keys = Object.keys(old_tags);
    for (var i = 0; i < keys.length; i++){
        if (keys[i] != key){
            new_tags[keys[i]] = old_tags[keys[i]];
        }
    }
    queries[query_id] = new_tags;
    res.send('Removed tag ' + key + 'for Query ' + query_id);
})


app.post('/removeQuery', function (req, res) {
    let query_id = req.query.id;
    console.log(new Date() +  ' | REST |  Remove Query ' + query_id);
    var result = {};
    var queries_so_far = Object.keys(queries);
    for (i = 0; i < queries_so_far.len; i++){
        if (queries_so_far[i] != query_id){
            result[queries_so_far[i]] = queries[queries_so_far[i]];
        }
    }
    queries = result;
    res.send('Removed Query ' + query_id);
})

////////// little test demo

// var data = [[0,20.5],[30, 20.3], [60, 20.8], [90, 21.2], [120, 20.1], [150, 19.8], [180, 22]];

// var time = 0;

// function getRandomArbitrary(min, max) {
//     return Math.random() * (max - min) + min;
// }

// var N = 1000
// //var T = 30
// var data = []
// for (var i = 0; i < N; i ++){
//     time += T;
//     data.push([time, getRandomArbitrary(20,21)]);
// }

var T_aunit = 2;
var T_sunit = 5;
var T_min = 5;
var T_max = 50;
var omega_1 = 20000;
var omega_2 = 10000;


function addToBoundedList(x,y){
    if (data.length < N){
        data.push([x,y]);
    }
    else{
        data = data.slice(1, data.length);
        data.push([x,y]);
    }
}

function computeOmega(x_i,y_i){
    addToBoundedList(x_i,y_i);
    //data.push([x_i,y_i]);
    var [a_i, b_i] = regression.linear(data).equation; // [alpha,beta]
    var omega = 0;
    for (var k = 0; k < data.length - 1; k++){
        var x_i_min_N = data[0][0];
        var x_i_min_1 = data[N-2][0];
        omega += Math.abs(a_i + b_i*(x_i_min_N + x_i_min_1)/2 - data[k][1]);
    }
    data = data.slice(1, data.length);
    return omega;
}

function computeNextPeriod(omega){
    var T = undefined;
    if (omega < omega_2){
        T = Math.min(T + T_aunit, T_max);
    }
    if (omega > omega_1){
        T = Math.max(T - T_sunit, T_min);
    }
    return T;
}

console.log('data', data.slice(data.length-10, data.length));

var point = [time+T, 80000]
console.log('Adding: ' + point);
var omega = computeOmega(point[0], point[1]);
console.log('Omega:', omega);
computeNextPeriod(omega);
console.log('T_before', T);
console.log('T_after', T);
