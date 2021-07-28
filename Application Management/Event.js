class Event{

    constructor(value, timestamp){
        this.value = value;
        this.timestamp = timestamp;
    }
    
    toString(){
        return this.value + ", " + this.timestamp;
    }
}

module.exports = Event