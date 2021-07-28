
const SimulationMessage = require('./SimulationMessage.js');
const SMIPMessage = require('./SMIPMessage.js');
const OutputData = require('./OutputData.js');
const request = require('request');
var fs = require('fs');
const Logger = require('./Logger.js');


/**
 * A class responsible for connecting to the gateway of the IoT infrastructure, enabling two-way communication.
 * Through this class, the middleware can request sensor sampling periods and issue reconfigurations, but also incoming sensor messages.
 * This class implements the IoT management layer, integrating the  functionalities of the Connector, Monitor and Stream Manager.
 */
class Monitor{

    constructor(scheduler, logger){
        this.scheduler = scheduler;
        this.streams = [];
        // IP address of the SMIP gateway.
        this.smip_url = 'http://192.168.0.220:'
        this.logger=logger;
    }

    // called whenever a sensor message arrives from any IoT network or simulation.
    receiveData(data){
        var data = JSON.parse(data);
        var message = this.convertToMessage(data);
        var stream = undefined;
        if (!this.scheduler.includesStreamByID(this.scheduler.streams, message.id)){
            stream = this.scheduler.createStream(message.id, message.period, message.value, message.tags, message.fixed, message.gts);
        }
        else{
            stream = this.scheduler.getStreamByDeviceID(message.id);
            stream.updateIGD(message.gts);
            stream.updateTRD(message.ats-message.gts);
            this.changed = false;
            if (!this.checkMatchTags(message.tags, stream.tags)){
                var dt = new Date();
                dt.setHours(dt.getHours() + 2)
                console.log(dt, ' == DEBUG | Change Tags Stream ' + stream.id);
                this.scheduler.changeTagsStream(stream, message.tags);
            }
            else{
                this.scheduler.optimizeSamplingPeriod(stream, stream.history);
            }
        }
        var relevant_queries = stream.getRelevantQueries();
        var queries_to_add = [];
        for (var i  = 0; i < relevant_queries.length; i++){
            queries_to_add.push(relevant_queries[i].id);
        }
        return new OutputData(message.value, queries_to_add, message.gts);
    }


    // called whenever a sensor message arrives from the SMIP network
    receiveDataSMIP(data){
        var data = JSON.parse(data);
        var stream = undefined;
        if (data.type == "sensor-event"){
            if (data.contents["event"] == "peripheral-disconnected"){
                var dt = new Date();
                dt.setHours(dt.getHours() + 2)
                console.log(dt,' == DEBUG | Peripheral Disonnected: ' + data.contents.identifier + '|' + data.contents.address);
                this.scheduler.removeStream(this.scheduler.convertStreamKeyToID(data.contents.identifier + '|' + data.contents.address))
            }
            if (data.contents["event"] == "peripheral-connected"){
                var dt = new Date();
                dt.setHours(dt.getHours() + 2)
                console.log(dt,' == DEBUG | Peripheral Connected: ' + data.contents.identifier + '|' + data.contents.address);
                this.requestPeriod(data.contents.name, data.contents.identifier,data.contents.identifier + '|' + data.contents.address, undefined, {'name': data.contents.name, 'location': data.contents.location, 'peripheral': data.contents.identifier}, false, data.contents.timestamp);
            }
        }
        if (data.type != "sensor-data"){
            return;
        }
        if (data.contents.data.length == 0){
            return;
        }
        var message = this.convertToMessageSMIP(data);
        if (!this.scheduler.includesStreamByDeviceID(this.scheduler.streams, message.id)){
            this.requestPeriod(message.tags.name, message.tags.peripheral, message.id, message.value, message.tags, message.fixed, message.gts);
            var queries_to_add = [];
            for (var i = 0; i < this.scheduler.queries.length; i++){
                if (this.scheduler.checkSubMatchTags(message.tags, this.scheduler.queries[i].tags)){
                    queries_to_add.push(this.scheduler.queries[i].id);
                }
            }
            data.queries = queries_to_add;
        }
        else{
            stream = this.scheduler.getStreamByDeviceID(message.id);
            var dt = new Date();
            dt.setHours(dt.getHours() + 2)
            console.log(dt,' == DEBUG | Stream Exists:', stream.device_id);
            stream.updateIGD(message.gts);
            stream.updateTRD(message.ats-message.gts);
            this.changed = false;
            var relevant_queries = stream.getRelevantQueries();
            var queries_to_add = [];
            for (var i  = 0; i < relevant_queries.length; i++){
                queries_to_add.push(relevant_queries[i].id);
            }
            data.queries = queries_to_add;
            if (!this.checkMatchTags(message.tags, stream.tags)){
                var dt = new Date();
                dt.setHours(dt.getHours() + 2)
                console.log(dt, ' == DEBUG | Change Tags Stream ' + stream.id);
                this.scheduler.changeTagsStream(stream, message.tags);
            }
            else{
                this.scheduler.optimizeSamplingPeriod(stream, stream.history, false);
            }
        }
        return new OutputData(message.value, queries_to_add, message.gts);
        
    }

    // checks if tags of a stream and a query match.
    checkMatchTags(tags1, tags2){
        var keys_tags1 = Object.keys(tags1);
        var keys_tags2 = Object.keys(tags2);
        if (keys_tags1.length != keys_tags2.length){
            return false;
        }
        for (var i = 0; i < keys_tags1.length; i++){
            if (!keys_tags2.includes(keys_tags1[i])){
                return false;
            }
            if (tags2[keys_tags1[i]] != tags1[keys_tags1[i]]){
                return false;
            }
        }
        return true;
    }

    // used for simulated IoT network
    convertToMessage(data){
        var gts = Number(new Date(data.generation_timestamp).getTime());
        var ats = Number(new Date().getTime());
        return new SimulationMessage(data.id, data.period, data.igd, data.trd, data.value, data.tags, data.fixed, gts, ats);
    }

    setFilename(fn){
        this.filename = fn;
    }


    // Parses incoming raw sensor message from SMIP infrastructure.
    convertToMessageSMIP(data){
        var id = data.contents.identifier + '|' + data.contents.address     
        var value = data.contents.data[0].value;
        var tags = {};
        tags.location = data.contents.location;
        tags.name = data.contents.name;
        tags.peripheral = data.contents.identifier;
        var gts = data.contents.timestamp/1000;
        var ats = Number(new Date().getTime());
        return new SMIPMessage(id, value, tags, gts, ats);
    }
    
    // Requests the sampling period from sensor in the IoT infrastructure.
    requestPeriod(name, peripheral, id, value, tags, fixed, gts){
        var url =  'https://192.168.0.220:8889/api/v1/devices/name/' + name + '/peripherals';
        var options = {'auth': {
            'user': 'username',
            'pass': 'password'
        }};
        request.get(url, options, (error, res, body) => {
            if (error) {
                return  console.log(error)
            }; 

            if (!error && res.statusCode == 200) {
                var data = JSON.parse(body);
                for (var i = 0; i < data.length; i++){
                    if (data[i].identifier == peripheral){
                        var period = 1000*data[i].sampling_rate;
                        var stream = this.scheduler.createStream(id, period, value, tags, fixed, gts);
                        var dt = new Date();
                        dt.setHours(dt.getHours() + 2)
                        console.log(dt,' == DEBUG | Requested Sampling Period for Stream', stream.device_id, ':', period);
                    }
                }
            };
        });
    }
}

module.exports = Monitor