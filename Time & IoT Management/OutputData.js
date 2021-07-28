/**
 * This class represents a parsed sensor message from the IoT network.
 */
class OutputData{

    constructor(value, queries, gts){
        this.value = value;
        this.queries = queries;
        this.generation_timestamp = gts;
    }
}

module.exports = OutputData