class SMIPMessage{

    constructor(id, value, tags, gts, ats){
        // identifier of the source of the message
        this.id = id;
        // value of the measurement
        this.value = value;
        // sampling period of the source
        this.tags = tags;
        // fixed = True means that the source of this message cannot have its sampling period reconfigured.
        this.fixed= false;
        // generation timestamp
        this.gts = gts;
        // arrival timestamp
        this.ats = ats;
    }
}

module.exports = SMIPMessage