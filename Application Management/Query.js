
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var request = require('request');



class Query{

     
    constructor(id, period, length, advanced,aggregate, tags, buffer) {
        this.id = id;
        this.period = Number(period);
        this.length = Number(length);
        this.tags = tags;
        buffer.belongsToQuery(this);
        this.buffer = buffer;
        this.processed_events_so_far = 0;
        this.available_events_so_far = 0;
        this.successes = 0;
        this.advanced = advanced;
        this.aggregate = aggregate;
        this.recording = false;
        this.last_check = new Date();
        this.filename = undefined;
        this.sliding_window_dr = [];
        this.sliding_window_qv = [];
        this.size = 4;
      }

    getPeriod(){
        return this.period;
    }

    getLength(){
        return this.length;
    }

    setRecording(arg){
        this.recording = arg;
    }

    setFilename(arg){
        this.filename = arg;
    }

    appendToSlidingWindow(element, lst){
        if (lst.length < this.size){
            lst.push(element)
        }
        else{
            lst = lst.slice(1,lst.length)
            lst.push(element)
        }
        return lst
    }


    computeDR(valid, required){
        var ratio = 0;
        if (valid > required){
            ratio = (valid - required)/required;
        }
        this.sliding_window_dr = this.appendToSlidingWindow(ratio, this.sliding_window_dr)
    }

    computeQV(valid, required){
        var value = 0;
        if (valid < required){
            value = 1;
        }
        this.sliding_window_qv = this.appendToSlidingWindow(value, this.sliding_window_qv)
    }

    recordDR(){
        if (this.recording && (this.sliding_window_dr.length == this.size)){
            const arrSum = arr => arr.reduce((a,b) => a + b, 0)
            var value = 100*arrSum(this.sliding_window_dr)/this.size; // percentage
            var array_points = [];
            array_points.push({
                measurement: 'Data_Redundancy',
                tags: {
                  query: this.id,
                  approach: 'Hades'
                },
                fields: {
                  value: value
                }
            });
          this.writeToDB(array_points)
        }
    }

    recordQV(){
        if (this.recording && (this.sliding_window_qv.length == this.size)){
            const arrSum = arr => arr.reduce((a,b) => a + b, 0)
            var value = 100*arrSum(this.sliding_window_qv)/this.size; // percentage
            var array_points = [];
            array_points.push({
                measurement: 'Query_Violation',
                tags: {
                  query: this.id,
                  approach: 'Hades'
                },
                fields: {
                  value: value
                }
            });
          this.writeToDB(array_points)
        }
    }


//     interm_num = {}
//     interm_denom = {}
//     result = {}
//     for (var i = 0; i < Object.keys(x); i++){
//         var key = Object.keys(x)[i];
//         interm_num[key] = []
//         interm_denom[key] = []
//         result[key] = []
//         for (var j = 0; j < x[key].length; j++){
//             var value = x[key][j];
//             if (value[0][0] >= value[0][1]){
//                 //#print('Valid events:', value[0][0])
//                 //#print('Required events:', value[0][1])
//                 //#print('Adding to numerator:', (value[0][0] - value[0][1], value[1]))
//                 //#print('Adding to denominator:', (value[0][1], value[1]))
//                 interm_num[key] = appendToSlidingWindow((value[0][0] - value[0][1], value[1]),interm_num[key],size)
//                 interm_denom[key] = appendToSlidingWindow((value[0][1], value[1]),interm_denom[key],size)
//             }
//             if (interm_num[key].length == size){
//                 //#print('Total additional events:',sumListTuples(interm_num[key]))
//                 //#print('Total required events:', sumListTuples(interm_denom[key]))
//                 result[key].push((100*sumListTuples(interm_num[key])/sumListTuples(interm_denom[key]), value[1]))
//                 //#print('Adding to result:', (sumListTuples(interm_num[key])/sumListTuples(interm_denom[key]), value[1]))
//             }
//     return result
// }

    recordAvailableEvents(available_events){
        if (this.recording){
            var array_points = [];
            array_points.push({
                measurement: 'Nb_Available_Events',
                tags: {
                  query: this.id,
                  approach: 'Hades'
                },
                fields: {
                  value: available_events
                }
            });
          this.writeToDB(array_points)
        }
    }

    recordRequiredEvents(required_events){
        if (this.recording){
            var array_points = [];
            array_points.push({
                measurement: 'Nb_Required_Events',
                tags: {
                  query: this.id,
                  approach: 'Hades'
                },
                fields: {
                  value: required_events
                }
            });
          this.writeToDB(array_points)
        }
    }


    recordValidEvents(valid_events){
        if (this.recording){
            var array_points = [];
            array_points.push({
                measurement: 'Nb_Valid_Events',
                tags: {
                  query: this.id,
                  approach: 'Hades'
                },
                fields: {
                  value: valid_events
                }
            });
          this.writeToDB(array_points)
        }
    }

    writeToDB(array_points){
        try {
        // Input the measurement.
        request({ url: 'http://localhost:5555/writeToDB/Ermis_SWQ', method: 'PUT', json: array_points, function() 
            {
                console.log('Done!')
            }
        });

        // Log.
        var dt = new Date();
        dt.setHours(dt.getHours() + 2)
        console.log(dt,'info', '[INFLUXDB] Data pushed to InfluxDB: ' + JSON.stringify(array_points));
        } catch (e) {
        // Log.
        var dt = new Date();
        dt.setHours(dt.getHours() + 2)
        console.log(dt,'error', '[INFLUXDB] No connection with InfluxDB.');
        }
    }

    //     var date = date.getTime();
    //     var to_write = "Query{id:" + this.id + ";nb_valid:"+ valid_events.length + ";nb_req:" + this.length + ";freq:" + this.period + ";ts:" + date+"}\n";  
    //     fs.appendFile(this.filename, to_write, (err) => {
    //         // throws an error, you could also catch it here
    //         if (err) throw err;
    //         // success case, the file was saved
    //         console.log('Recording Successfull.');
    //     });
    // }

    // returns #
    processEvents(){
        var valid_events = [];
        if (!this.advanced){
            valid_events = this.buffer.events;
        }
        else{
            for (var i = 0; i < this.buffer.events.length; i++){
                //console.log('last check ' + this.last_check);
                //console.log('timestamp of event: ' + this.buffer.events[i].timestamp);
                //console.log(this.buffer.events[i].timestamp + ' >= ' + this.last_check + ' = ' + this.buffer.events[i].timestamp >= this.last_check)
                //console.log('GTS of received event:', this.buffer.events[i].timestamp);
                //console.log('TS of last check', this.last_check);
                //console.log('GTS > TS_Last:', this.buffer.events[i].timestamp > this.last_check)
                if (new Date(this.buffer.events[i].timestamp) > new Date(this.last_check)){
                    //console.log(this.buffer.events[i].timestamp + ' >= ' + this.last_check)
                    valid_events.push(this.buffer.events[i]);
                }
            }
        }
        this.computeQV(valid_events.length, this.length);
        this.computeDR(valid_events.length, this.length);
        if (this.recording){
            this.recordValidEvents(valid_events.length);
            this.recordAvailableEvents(this.buffer.events.length);
            this.recordRequiredEvents(this.length);
            this.recordQV();
            this.recordDR();
        }
        this.last_check = new Date();
        let result = valid_events.length / this.length;
        var dt = new Date();
        dt.setHours(dt.getHours() + 2)
        console.log(dt,'Query ' + this.id + ' | available events: ' + this.buffer.events.length + ', valid events: ' + valid_events.length + ' , required events: ' + this.length);
        let relevant_events = valid_events.slice(valid_events.length- this.length, valid_events.length);
        if (relevant_events.length >= this.length){
            this.successes += 1
            this.processed_events_so_far += Math.min(this.buffer.events.length, this.length);
            this.available_events_so_far += this.buffer.events.length
        }
       this.buffer.clearBuffer();
       // record if activated
       
       return result;
    }  
}

module.exports = Query

