/**
 * A class that represents a parsed sensor message that was generated from the simulation environment.
 */
class SimulationMessage{

    constructor(stream_id, period,igd, trd, value, tags, fixed, gts, ats){
        // identifier of the source of the message
        this.id = stream_id;
        // value of the measurement
        this.value = value;
        // sampling period of the source
        this.period = period;
        // inter generation delay
        this.igd = igd;
        // transmission delay
        this.trd = trd;
        this.tags = tags;
        // fixed = True means that the source of this message cannot have its sampling period reconfigured.
        this.fixed= fixed;
        // generation timestamp
        this.gts = gts;
        // arrival timestamp
        this.ats = ats;
    }
}

module.exports = SimulationMessage