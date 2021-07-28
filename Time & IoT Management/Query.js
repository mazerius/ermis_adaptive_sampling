/**
 * A class that represents a sliding window query, as defined in the research paper, where the "advanced" attribute
 * corresponds to the delay-sensitive property. 
 */
class Query{  
    constructor(id, period, length, advanced,aggregate, tags) {
        this.id = id;
        this.period = period;
        this.length = length;
        this.tags = tags;
        this.advanced = advanced;
        this.aggregate = aggregate;
      }

    }

module.exports = Query

