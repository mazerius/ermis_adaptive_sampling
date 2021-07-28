const Stream = require('./Stream.js');
const Query = require('./Query.js');
const request = require('request');
const Logger = require('./Logger.js');

/**
 * This class corresponds to the Scheduler component of the middleware, which is described in the paper.
 */
class Scheduler{

    constructor(logger){
        // registered queries
        this.queries = [];
        // discovered streams
        this.streams = [];
        this.stream_counter = 0;
        this.query_counter = 0;
        this.simulation_url = 'http://localhost:3030';
        // url of the SMIP gateway
        this.smip_url = 'http://192.168.0.220:'
        this.logger = logger;
    }

    // helper method to get a stream based on the device ID.
    getStreamByDeviceID(id){
    for (var i = 0; i < this.streams.length; i ++){
        //console.log(this.streams[i]);
        if (this.streams[i].device_id == id){
            return this.streams[i];
        }
    }
    return undefined;
    }

    // detects if the tags of a stream and query match.
    checkSubMatchTags(tags_stream, tags_query){
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

    // helper method to check if a collection of streams contains a stream with given id.
    includesStreamByID(lst, id){
        for (var i=0; i< lst.length; i++){
            if (lst[i].id == id){
                return true;
            }
        }
        return false;
    }

    // helper method to check if a collection of streams contains a stream with given device id.
    includesStreamByDeviceID(lst, id){
        for (var i=0; i< lst.length; i++){
            if (lst[i].device_id == id){
                return true;
            }
        }
        return false;
    }

    // helper method that returns all streams with which the given stream is associated by means of aggregate queries.
    getRelatedStreamsFor(stream){
        var result = [];
        var aggr_queries = stream.getAggregateQueries();
        for (var j = 0; j < aggr_queries.length; j++){
            var streams = this.getStreamsForQuery(aggr_queries[j]);
            for (var i =0; i< streams.length; i++){
                if (streams[i].id != stream.id && !this.includesStreamByID(result, streams[i].id)){
                    result.push(streams[i]);
                }
            }
        }
        return result;
    }

    // helper method for backtracking.
    f(lst, history){
        var result = [];
        for (var k = 0; k < lst.length; k++){
            var stream = lst[k];
            var aggr_queries = stream.getAggregateQueries();
            for (var j = 0; j < aggr_queries.length; j++){
                var streams = this.getStreamsForQuery(aggr_queries[j]);
                for (var i =0; i< streams.length; i++){
                    if (streams[i].id != stream.id && !this.includesStreamByID(result, streams[i].id) && !this.includesStreamByID(history, streams[i].id)){
                        result.push(streams[i]);
                    }
                }
            }
        }
        return result;
    }

    // Finds all related streams of a given collection of streams. Done through backtracking.
    g(lst, history){
        var next_level = this.f(lst, history);
        if (next_level.length == 0){
            return lst;
        }
        return lst.concat(this.g(next_level, history.concat(lst)));
    }


    // creates a new stream upon discovery of a new sensor from the IoT infrastructure.
    createStream(device_id, period, value,  tags, fixed, gts){
        this.stream_counter = this.stream_counter + 1;
        var stream = new Stream(device_id, this.stream_counter-1, period, value, tags, fixed, gts, this.logger);
        for (var i = 0; i < this.queries.length; i++){
            if (this.checkSubMatchTags(stream.tags, this.queries[i].tags)){
                // associate the new stream with matching queries
                stream.assignQuery(this.queries[i]);
                var dt = new Date();
                dt.setHours(dt.getHours() + 2)
                console.log(dt, ' == DEBUG | Added Stream ' + stream.id + ' to Query ' + this.queries[i].id);
            };
        }
        this.streams.push(stream);
        var related_streams = this.g([stream], []);
        var history = [];
        related_streams = this.extractUniqueElements(related_streams);
        // trigger to optimization state where the sampling periods of the related streams are recomputed.
        this.propagateUpdate(related_streams, history, true);
        return stream;
    }   


    createQuery(period, length, advanced, aggregate, tags){
        this.query_counter = this.query_counter + 1;
        var query = new Query(this.query_counter-1, period, length, advanced, aggregate, tags);
        var related_streams = [];
        for (var i = 0; i < this.streams.length; i++){
            if (this.checkSubMatchTags(this.streams[i].tags, query.tags)){
                // associate the new stream with matching queries
                this.streams[i].assignQuery(query);
                var dt = new Date();
                dt.setHours(dt.getHours() + 2)
                console.log(dt,' == DEBUG | Added Stream ' + this.streams[i].id + ' to Query ' + query.id);
                related_streams = related_streams.concat(this.g([this.streams[i]], []));
                
            };
        }
        this.queries.push(query);
        var history = [];
        related_streams = this.extractUniqueElements(related_streams);
        // trigger to optimization state where the sampling periods of the related streams are recomputed.
        this.propagateUpdate(related_streams, history, true);
        return query;
    }   

    convertStreamKeyToID(key){
        for (var i = 0; i < this.streams.length; i ++){
            if (this.streams[i].device_id == key){
                return this.streams[i].id;
            }
        }
        return undefined;
    }

    // returns the stream that corresponds to given id.
    getStreamByID(id){
        for (var i = 0; i < this.streams.length; i ++){
            if (this.streams[i].id == id){
                return this.streams[i];
            }
        }
        return undefined;
    }

    // returns the query that corresponds to given id.
    getQueryByID(id){
        for (var i = 0; i < this.queries.length; i ++){
            //console.log(this.queries[i]);
            if (this.queries[i].id == id){
                return this.queries[i];
            }
        }
        return -1;
    }
    
    // return all queries that are not delay-sensitive.
    getBasicQueries(queries){
        var result = [];
        for (var i =0; i < queries.length; i++){
            if (!queries[i].advanced){
                result.push(queries[i]);
            }
        }
        return result;
    }

    // returns all queries that are delay-sensitive.
    getAdvancedQueries(queries){
        var result = [];
        for (var i =0; i < queries.length; i++){
            if (queries[i].advanced){
                result.push(queries[i]);
            }
        }
        return result;
    }

    // removes a tag from a query.
    removeTagQuery(id, key){
        var id = Number(id);
        var query = this.getQueryByID(id);
        var related_streams = [];
        var old_tags = {};
        var old_keys = Object.keys(query.tags);
        for (var i =0; i < old_keys.length; i++){
            old_tags[old_keys[i]]=query.tags[old_keys[i]];
        }       
        var new_tags = query.tags;
        delete new_tags[key]
        for (var i = 0; i < this.streams.length; i++){
            var stream = this.streams[i];
            var matches_old  = this.checkSubMatchTags(stream.tags, old_tags);
            var matches_new = this.checkSubMatchTags(stream.tags, new_tags); 
            if (!matches_old && matches_new){
                if (!stream.hasQuery(id)){
                    stream.assignQuery(query);
                    var dt = new Date();
                    dt.setHours(dt.getHours() + 2)
                    console.log(dt, ' == DEBUG | Added Stream ' + stream.id + ' to Query ' + query.id);
                    related_streams = related_streams.concat(this.g([stream], []));
                }
            }
        }
        query.tags = new_tags;
        var history = [];
        // filter out duplicate elements
        var related_streams = this.extractUniqueElements(related_streams);
        // trigger to optimization state where the sampling periods of the related streams are recomputed.
        this.propagateUpdate(related_streams, history, true);
    }

    // helper method to eliminate duplicate objects in a list
    extractUniqueElements(lst){
        var result = [];
        for (var i = 0; i < lst.length; i++){
            if (!this.includesStreamByID(result, lst[i].id)){
                result.push(lst[i]);
            }
        }
        return result;
    }

    // adds a tag to a query.
    addTagQuery(id, key, value){
        var id = Number(id);
        var query = this.getQueryByID(id);
        var related_streams = [];
        var old_tags = {};
        var old_keys = Object.keys(query.tags);
        for (var i =0; i < old_keys.length; i++){
            old_tags[old_keys[i]]=query.tags[old_keys[i]];
        }       
        var new_tags = query.tags;
        new_tags[key] = value;
        for (var i = 0; i < this.streams.length; i++){
            var stream = this.streams[i];
            var matches_old  = this.checkSubMatchTags(stream.tags, old_tags);
            var matches_new = this.checkSubMatchTags(stream.tags, new_tags);
            if (matches_new){
                if (!stream.hasQuery(id)){
                    stream.assignQuery(query);
                    var dt = new Date();
                    dt.setHours(dt.getHours() + 2)
                    console.log(dt,' == DEBUG | Added Stream ' + stream.id + ' to Query ' + query.id);
                    related_streams = related_streams.concat(this.g([stream], []));
                    
                }
            }
            else{
                if (matches_old){
                    if (stream.hasQuery(id)){
                        related_streams = related_streams.concat(this.g([stream], []));
                        stream.removeQuery(id);
                        var dt = new Date();
                        dt.setHours(dt.getHours() + 2)
                        console.log(dt,' == DEBUG | Removed Stream ' + stream.id + ' from Query ' + query.id);
                    }
                }
            }
        }
        query.tags[key] = value;
        var history = [];
        var related_streams = this.extractUniqueElements(related_streams);
        // trigger to optimization state where the sampling periods of the related streams are recomputed.
        this.propagateUpdate(related_streams, history, true);
    }

    // removes a registered query based on its id.
    removeQuery(id){
        var id = Number(id);
        var query = this.getQueryByID(id);
        var related_streams  = [];
        for (var i = 0; i < this.streams.length; i++){
            var stream = this.streams[i];
            var matches  = this.checkSubMatchTags(stream.tags, query.tags);
            if (matches){
                if (stream.hasQuery(id)){
                    stream.removeQuery(id);
                    var dt = new Date();
                    dt.setHours(dt.getHours() + 2)
                    console.log(dt, ' == DEBUG | Removed Stream ' + stream.id + ' from Query ' + query.id);
                    related_streams = related_streams.concat(this.g([stream], []));
                }
            }
        }
        var history = [];
        this.removeQueryByID(id);
        var related_streams = this.extractUniqueElements(related_streams);
        // trigger to optimization state where the sampling periods of the related streams are recomputed.
        this.propagateUpdate(related_streams, history, true);
    }

    
    removeStreamFromList(lst,id){
        var result = [];
        for (var i = 0; i < lst.length; i++){
            if (lst[i].id != id){
                result.push(lst[i]);
            }
        }
        return result;
    }

    // deletes a discovered stream
    removeStream(id){
        var stream = this.getStreamByID(id);
        var related_streams = this.g([stream], []);
        for (var i = 0; i < this.queries.length; i++){
            var query= this.queries[i];
            var matches  = this.checkSubMatchTags(stream.tags, query.tags);
            if (matches){
                if (stream.hasQuery(query.id)){
                    stream.removeQuery(query.id);
                    var dt = new Date();
                    dt.setHours(dt.getHours() + 2)
                    console.log(dt, ' == DEBUG | Removed Stream ' + stream.id + ' from Query ' + query.id);
                }
            }
        }
        var history = [];
        this.removeStreamByID(id);
        related_streams = this.extractUniqueElements(related_streams);
        related_streams = this.removeStreamFromList(related_streams, id);
        // trigger to optimization state where the sampling periods of the related streams are recomputed.
        this.propagateUpdate(related_streams, history, true);

    }

    // helper method to remove a stream based on its ID 
    removeStreamByID(id){
        var result = []
        for (var i = 0; i < this.streams.length; i++){
            if (this.streams[i].id != id){
                result.push(this.streams[i]);
            }
        }
        this.streams = result;
    }
    
    // helper method to remove a query based on its ID
    removeQueryByID(id){
        var result = []
        for (var i = 0; i < this.queries.length; i++){
            if (this.queries[i].id != id){
                result.push(this.queries[i]);
            }
        }
        this.queries = result;
    }

    // reconfigures the length or period of a registered query.
    reconfigureQuery(id, period, length){
        var query = this.getQueryByID(id);
        query.period = period;
        query.length = length;
        var streams = this.getStreamsForQuery(query);
        var related_streams = [];
        for (var i = 0; i < streams.length; i++){
            var stream = streams[i];
            var other_streams = this.g([stream], []);
            for (var j = 0; j < other_streams.length; j++){
                if (!this.includesStreamByID(related_streams, other_streams[j])){
                    related_streams.push(other_streams[j]);
                }
            }
        }
        var history = [];
        var related_streams = this.extractUniqueElements(related_streams);
        // trigger to optimization state where the sampling periods of the related streams are recomputed.
        this.propagateUpdate(related_streams, history, true);
    }

    // recomputes the optimal sampling period for all given sensors
    propagateUpdate(streams, history, override){
        for (var j=0; j< streams.length; j++){
            var period_before = streams[j].period;
            this.optimizeSamplingPeriod(streams[j], history, override);
            var dt = new Date();
            dt.setHours(dt.getHours() + 2)
            console.log(dt, ' == DEBUG | Updating Stream ' + streams[j].id + ' from ' + period_before + ' to ' + streams[j].period);
            history.push(streams[j]);
         }
    }

    // returns the streams associated with a given query.
    getStreamsForQuery(query){
        var result = [];
        for (var i = 0; i < this.streams.length; i++){
            if (this.streams[i].hasQuery(query.id)){
                result.push(this.streams[i]);
            }
        }
        return result;
    }

    // adds a new tag to the tags of a stream
    extendTags(stream, key, value){
        var result = stream.tags;
        result[key] = value;
        return result;
    }
    
    // changes a tag of streams with a certain tag.
    changeTagStreams(key1,value1,key2,value2){
        var streams_to_change = []
        for (var i =0; i< this.streams.length; i++){
            if (this.streams[i].tags[key1] == value1){
                streams_to_change.push(this.streams[i]);
            }
        }
        for (var i = 0; i< streams_to_change.length; i++){
            this.changeTagsStream(streams_to_change[i], this.extendTags(streams_to_change[i], key2, value2));
        }
    }

    // changes the tags of a stream
    changeTagsStream(stream, new_tags){
        var related_streams_before = this.g([stream], []);
        for (var i = 0; i < this.queries.length; i++){
            var query= this.queries[i];
            var matches_old  = this.checkSubMatchTags(stream.tags, query.tags);
            var matches_new = this.checkSubMatchTags(new_tags,query.tags);
            if (matches_new){
                if (!stream.hasQuery(query.id)){
                    stream.assignQuery(query);
                    var dt = new Date();
                    dt.setHours(dt.getHours() + 2)
                    console.log(dt, ' == DEBUG | Added Stream ' + stream.id + ' to Query ' + query.id);
                }
            }
            else{
                if (matches_old){
                    if (stream.hasQuery(query.id)){
                        stream.removeQuery(query.id);
                        var dt = new Date();
                        dt.setHours(dt.getHours() + 2)
                        console.log(dt, ' == DEBUG | Removed Stream ' + stream.id + ' from Query ' + query.id);
                    }
                }
            }
        }
        var dt = new Date();
        dt.setHours(dt.getHours() + 2)
        console.log(dt, ' == DEBUG | Old Tags for Stream ' + stream.id + ': ' + stream.tags);
        stream.tags = new_tags;
        console.log(dt, ' == DEBUG | New Tags for Stream ' + stream.id + ': ' + stream.tags);
        var related_streams_after = this.g([stream], []);
        var related_streams = [];
        for (var i = 0; i < related_streams_before.length; i++){
            if (!this.hasElementWithID(related_streams, related_streams_before[i].id)){
                related_streams.push(related_streams_before[i]);
            }
        }
        for (var i = 0; i < related_streams_after.length; i++){
            if (!this.hasElementWithID(related_streams, related_streams_after[i].id)){
                related_streams.push(related_streams_after[i]);
            }
        }
        var related_streams = this.extractUniqueElements(related_streams);
        var history = [];
        // trigger to optimization state where the sampling periods of the related streams are recomputed.
        for (var j=0; j< related_streams.length; j++){
            this.optimizeSamplingPeriod(related_streams[j], history, true);
            history.push(related_streams[j]);
        }
}

    // adds a tag to a stream
    addTagStream(id, key, value){
        var stream = this.getStreamByID(id);
        var related_streams_before = this.g([stream], []);
        var old_tags = {};
        var old_keys = Object.keys(stream.tags);
        for (var i =0; i < old_keys.length; i++){
            old_tags[old_keys[i]]=stream.tags[old_keys[i]];
        }       
        var new_tags = stream.tags;
        new_tags[key] = value;
        for (var i = 0; i < this.queries.length; i++){
            var query= this.queries[i];
            var matches_old  = this.checkSubMatchTags(old_tags, query.tags);
            var matches_new = this.checkSubMatchTags(new_tags,query.tags);
            if (matches_new){
                if (!stream.hasQuery(query.id)){
                    stream.assignQuery(query);
                    var dt = new Date();
                    dt.setHours(dt.getHours() + 2)
                    console.log(dt,' == DEBUG | Added Stream ' + stream.id + ' to Query ' + query.id);
                }
            }
            else{
                if (matches_old){
                    if (stream.hasQuery(query.id)){
                        stream.removeQuery(query.id);
                        var dt = new Date();
                        dt.setHours(dt.getHours() + 2)
                        console.log(dt, ' == DEBUG | Removed Stream ' + stream.id + ' from Query ' + query.id);
                    }
                }
            }
        }
        stream.tags[key] = value;
        var related_streams_after = this.g([stream], []);
        var related_streams = [];
        for (var i = 0; i < related_streams_before.length; i++){
            if (!this.hasElementWithID(related_streams, related_streams_before[i].id)){
                related_streams.push(related_streams_before[i]);
            }
        }
        for (var i = 0; i < related_streams_after.length; i++){
            if (!this.hasElementWithID(related_streams, related_streams_after[i].id)){
                related_streams.push(related_streams_after[i]);
            }
        }
        var related_streams = this.extractUniqueElements(related_streams);
        var history = [];
        // trigger to optimization state where the sampling periods of the related streams are recomputed.
        for (var j=0; j< related_streams.length; j++){
            this.optimizeSamplingPeriod(related_streams[j], history, true);
            history.push(related_streams[j]);
        }
    }

    // removes a tag from a stream
    removeTagStream(id,key){
        var stream = this.getStreamByID(id);
        var related_streams_before = this.g([stream], []);
        var old_tags = {};
        var old_keys = Object.keys(stream.tags);
        for (var i =0; i < old_keys.length; i++){
            old_tags[old_keys[i]]=stream.tags[old_keys[i]];
        }       
        var new_tags = stream.tags;
        delete new_tags[key];
        for (var i = 0; i < this.queries.length; i++){
            var query= this.queries[i];
            var matches_old  = this.checkSubMatchTags(old_tags, query.tags);
            var matches_new = this.checkSubMatchTags(new_tags,query.tags);
            if (matches_old && !matches_new){
                if (stream.hasQuery(query.id)){
                    stream.removeQuery(query.id);
                    var dt = new Date();
                    dt.setHours(dt.getHours() + 2)
                    console.log(dt,' == DEBUG | Removed Stream ' + stream.id + ' from Query ' + query.id);
                }
            }
        }
        stream.tags = new_tags;
        var related_streams_after = this.g([stream], []);
        var related_streams = [];
        for (var i = 0; i < related_streams_before.length; i++){
            if (!this.hasElementWithID(related_streams, related_streams_before[i].id)){
                related_streams.push(related_streams_before[i]);
            }
        }
        for (var i = 0; i < related_streams_after.length; i++){
            if (!this.hasElementWithID(related_streams, related_streams_after[i].id)){
                related_streams.push(related_streams_after[i]);
            }
        }
        var history = [];
        var related_streams = this.extractUniqueElements(related_streams);
        // trigger to optimization state where the sampling periods of the related streams are recomputed.
        for (var j=0; j< related_streams.length; j++){
            this.optimizeSamplingPeriod(related_streams[j], history), true;
            history.push(related_streams[j]);
        }
    }


    // helper method to check if a collection has an object with given id
    hasElementWithID(lst, id){
        for (var i = 0; i < lst.length; i++){
            if (lst[i].id == id){
                return true;
            }
        }
        return false;
    }

    // find strictest basic query and strictest advanced query. Compare for each what's the smallest period, and set that as optimal.
    // Algorithm 1 in the paper.
    optimizeSamplingPeriod(stream, history, override){
        var period_to_record = undefined;
        if (history == undefined){
            history = []
        }
        var queries = stream.getRelevantQueries();
        var period = 21474836;
        var dominant = [];
        if (stream.fixed){
            var dt = new Date();
            dt.setHours(dt.getHours() + 2)
            console.log(dt, ' == DEBUG | Case 0');
            console.log(dt, ' == DEBUG | Optimize for Stream', stream.device_id, 'to', stream.period);
            period_to_record = stream.period;
            this.logger.recordCandidateStreamReconfiguration(stream.getAddress(), stream.getPeripheral(), period_to_record/1000, new Date().getTime());
            return;
        }
        if (queries.length == 0){
            var dt = new Date();
            dt.setHours(dt.getHours() + 2)
            console.log(dt, ' == DEBUG | Case 1');
            console.log(dt, ' == DEBUG | Optimize for Stream', stream.device_id, 'to', stream.default);
            if (stream.period != stream.default){
                this.reconfigureSamplingPeriod(stream.id, stream.default, override);
            }
            period_to_record = stream.default;
            this.logger.recordCandidateStreamReconfiguration(stream.getAddress(), stream.getPeripheral(), period_to_record/1000, new Date().getTime());
            return;
        }
        if (queries.length > 0){
            var dt = new Date();
            dt.setHours(dt.getHours() + 2)
            console.log(dt, ' == DEBUG | Case 2');
            for (var i = 0; i < queries.length; i++){
                var candidate = this.computePeriodForQuery(stream, queries[i], history);
                var dt = new Date();
                dt.setHours(dt.getHours() + 2)
                console.log(dt, ' == DEBUG | Candidate Period for Stream ' + stream.id + ' from Query ' + queries[i].id + ': ' + candidate);
                // in case query is already registered as soon as stream is discovered
                if (isNaN(candidate)){
                    this.logger.recordCandidateStreamReconfiguration(stream.getAddress(), stream.getPeripheral(), -1, new Date().getTime());
                    return;
                }
                if (candidate == period){
                    dominant.push(queries[i]);
                    var dt = new Date();
                    dt.setHours(dt.getHours() + 2)
                    console.log(dt, ' == DEBUG | Candidate == Period: Adding query to dominants.', stream.device_id);

                }

                if (candidate < period){
                    var dt = new Date();
                    dt.setHours(dt.getHours() + 2)
                    console.log(dt, ' == DEBUG | Candidate < Period: Setting period to candidate.', stream.device_id);
                    var dt = new Date();
                    dt.setHours(dt.getHours() + 2)
                    console.log(dt, ' == DEBUG | Candidate < Period: Setting dominant to query.', stream.device_id);
                    period = candidate;
                    dominant = [queries[i]];
                }
            }
        }
        stream.setDominantQueries(dominant);
        stream.setHistory(history);
        period_to_record = period;
        this.logger.recordCandidateStreamReconfiguration(stream.getAddress(), stream.getPeripheral(), period_to_record/1000, new Date().getTime());
        if (period != stream.period){
            this.reconfigureSamplingPeriod(stream.id, period, override);
        }
    }

    // checks if it is worth reconfiguring the stream with the new sampling period.
    worthReconfiguring(stream, new_period){
        var dominant = stream.getDominantQueries()[0];
        if (new_period < 10000){
            var dt = new Date();
            dt.setHours(dt.getHours() + 2)
            console.log(dt,' == DEBUG | Case 0: Not worth reconfiguring Stream', stream.device_id, 'to', new_period);
            //this.logger.recordErrorReconfiguration(stream.device_id, new_period, new Date().getTime());
            return;
        }

        if (stream.period == new_period){
            var dt = new Date();
            dt.setHours(dt.getHours() + 2)
            console.log(dt, ' == DEBUG | Case 1: Not worth reconfiguring Stream', stream.device_id, 'to', new_period);
            return false;
        }
        if (dominant == undefined){
            var dt = new Date();
            dt.setHours(dt.getHours() + 2)
            console.log(dt, ' == DEBUG | Case 2: Not worth reconfiguring Stream', stream.device_id, 'to', new_period);
            return false;
        }
        if (dominant.advanced){
           // var events_old = (dominant.period - stream.igd)/(stream.period + stream.igd);
            var events_old = (dominant.period - stream.trd)/(stream.period + stream.igd);
            var events_new = (dominant.period - stream.trd)/(new_period + stream.igd);
            var dt = new Date();
            dt.setHours(dt.getHours() + 2)
            console.log(dt,' == DEBUG | # Events with current period for Stream ', stream.device_id, ':', events_old);
            console.log(dt, ' == DEBUG | # Events with new period for Stream ', stream.device_id, ':', events_new);            
            if ((events_new < events_old) && (Math.abs((events_old - events_new)/events_old) < 0.1)){
                var dt = new Date();
                dt.setHours(dt.getHours() + 2)
                console.log(dt, ' == DEBUG | Case 3: Not worth reconfiguring Stream', stream.device_id);
                return false;
            }
        }
        else{
            var events_old = (dominant.period)/(stream.period + stream.igd);
            var events_new = (dominant.period)/(new_period + stream.igd);
            var dt = new Date();
            dt.setHours(dt.getHours() + 2)
            console.log(dt,' == DEBUG | # Events with current period for Stream ', stream.device_id, ':', events_old);
            console.log(dt, ' == DEBUG | # Events with new period for Stream ', stream.device_id, ':', events_new);
            // 0.1 corresponds to the 10% threshold mentioned in the paper. The user can reconfigure to for a more (or less) conservative approach.
            if ((events_new < events_old) && (Math.abs((events_old - events_new)/events_old) < 0.1)){
                var dt = new Date();
                dt.setHours(dt.getHours() + 2)
                console.log(dt, ' == DEBUG | Case 3: Not worth reconfiguring Stream', stream.device_id);
                return false;
            }
        }
        var dt = new Date();
        dt.setHours(dt.getHours() + 2)
        console.log(dt,' == DEBUG | Case 4: Worth reconfiguring Stream', stream.device_id);
        return true;
    }

    // sends a reconfiguration command to the simulation environment
    sendReconfigurationCommandSimulation(id, period){
        request({ url: this.simulation_url + '/reconfigureStream?id=' + id + '&period=' + period, method: 'POST', function (error, response, body) {
            console.error('error:', error);
            console.log('statusCode:', response && response.statusCode); 
            console.log('body:', body); 
        }})
    }

    // sends reconfiguration command to the SmartMesh IP network
    sendReconfigurationCommandSMIP(name, address, peripheral, period){
        var period = period/1000; //from ms to seconds for SMIP
        var url = 'https://192.168.0.220:8889/api/v1/devices/name/' + name + '/peripherals/' + peripheral +'/rate'
        var options = {'auth': {
            'user': 'username',
            'pass': 'password'
        }};
        request({ url: url, options, method: 'PUT', json: { "sampling_rate" : period }}, (error, res, body) => {
            if (error) {
                return  console.log(error)
            }; 

            if (!error && res.statusCode == 200) {
                var dt = new Date();
                dt.setHours(dt.getHours() + 2)
                console.log(dt, ' == DEBUG | Reconfiguration 200 OK for', peripheral + '|' + address, 'to', period);
                // do something with JSON, using the 'body' variable
            };
        });
        // effective sampling period recording
        this.logger.recordActualStreamReconfiguration(address, peripheral, period, new Date().getTime());
    }

    // issues a reconfiguration to the sensor corresponding to the stream with given id.
    reconfigureSamplingPeriod(id, period, override){
        //clearInterval(this.stream_to_loop[id]);
        var stream = this.getStreamByID(id);
        // candidate sampling period recording
        if (this.worthReconfiguring(stream, period)){
            if (override || stream.getCounter() == 0){
                if (override){
                    var dt = new Date();
                    dt.setHours(dt.getHours() + 2)
                    console.log(dt,' == DEBUG | Overriding counter to reconfigure Stream', stream.device_id);
                }
                stream.setPeriod(period);
                stream.resetCounter(10); // how many transmissions to wait before issuing another reconfiguration;
                this.sendReconfigurationCommandSMIP(stream.tags.name, stream.getAddress(), stream.getPeripheral(), period);
            }
            else{
                var dt = new Date();
                dt.setHours(dt.getHours() + 2)
                console.log(dt, ' == DEBUG | Attempt to reconfigure Stream', stream.device_id, 'but counter > 0:', stream.getCounter());
            }
        }
    }

    // computes the optimal sampling period for a stream given a query (Algorithm 2 in the paper).
    computePeriodForQuery(stream, query, history){
       if (query.aggregate){
           return this.resolveAggregateQuery(stream, query, history);
       }
       else{
           return this.resolveSimpleQuery(stream, query);
       }
    }

    // for non-aggregate query
    resolveSimpleQuery(stream, query){
        var result;
        if (!query.advanced){
            result = query.period/query.length -stream.igd;
        }
        if (query.advanced){
            result = (query.period - (stream.trd))/query.length-stream.igd;
        }
        return result;
    }

    // for aggregaet query
    resolveAggregateQuery(stream, query, history){
       var constraint_streams = this.getStreamsForQuery(query);
       var nb_streams_fixed = 0;
       var result = 21474836;
       var target = query.length;
       var current = 0;
       var dt = new Date();
       dt.setHours(dt.getHours() + 2)
       console.log(dt, ' == DEBUG | Resolving Aggregate Query', query.id, 'for Stream', stream.device_id);
       console.log(dt,' == DEBUG | Computing Existing Contributions from Streams');
        for (var i = 0; i < constraint_streams.length; i++){
            var dt = new Date();
            dt.setHours(dt.getHours() + 2)
            console.log(dt,' == DEBUG | From Stream', constraint_streams[i].device_id);
          console.log(dt,' == DEBUG | constraint_streams[i].id != stream.id:', constraint_streams[i].id != stream.id);
          console.log(dt, ' == DEBUG | constraint_streams[i].fixed:', constraint_streams[i].fixed);
          console.log(dt, ' == DEBUG | constraint_streams[i].getDominantQueries().length != 0', constraint_streams[i].getDominantQueries().length != 0);
          console.log(dt, ' == DEBUG | !this.includesStreamByID(constraint_streams[i].getDominantQueries(), query.id', !this.includesStreamByID(constraint_streams[i].getDominantQueries(), query.id));
          console.log(dt, ' == DEBUG | this.includesStreamByID(history, constraint_streams[i].id', this.includesStreamByID(history, constraint_streams[i].id));
          console.log(dt, ' == DEBUG | constraint_streams[i].getDominantQueries().length > 1', constraint_streams[i].getDominantQueries().length > 1);
          if (constraint_streams[i].id != stream.id && (constraint_streams[i].fixed || (constraint_streams[i].getDominantQueries().length != 0 && (!this.includesStreamByID(constraint_streams[i].getDominantQueries(), query.id) || constraint_streams[i].getDominantQueries().length > 1 || this.includesStreamByID(history, constraint_streams[i].id))))){
            if (!query.advanced){
                current += Math.floor(query.period/(constraint_streams[i].period + constraint_streams[i].igd));
                nb_streams_fixed +=1;
                }
                else{
                    current += Math.floor((query.period - constraint_streams[i].trd)/(constraint_streams[i].period + constraint_streams[i].igd));
                    nb_streams_fixed+=1;
                }
                var dt = new Date();
                dt.setHours(dt.getHours() + 2)
                console.log(dt,' == DEBUG | Found Existing Contribution of', current, ' Events');  
            }
        }
        var remainder = target - current;
        var nb_streams = constraint_streams.length - nb_streams_fixed;
        if (remainder <= 0){
            return result;
        }
        if (query.advanced){
            result = (query.period - (stream.trd))/Math.ceil(remainder/nb_streams)-stream.igd;
        }
        else{
            result = query.period/Math.ceil(remainder/nb_streams) - stream.igd;
        }
        return result;
    }   
}

module.exports = Scheduler