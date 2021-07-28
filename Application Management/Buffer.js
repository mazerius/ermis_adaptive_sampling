class Buffer{
     
    constructor(id) {
        this.id = id;
        this.events_so_far = 0;
        this.events = [];
      }


    belongsToQuery(query){
        this.query=query;
    }
    
    addEvent(event){
        console.log('event', event);
        this.events_so_far += 1;
        console.log('== Buffer ', this.id, "adding event at", event.timestamp);
        this.events.push(event);
    }

    clearBuffer(){
        this.events = [];
    }

    toString(){
        let result = "";
        for (var i = 0; i < this.events.length; i++){
            result = result + this.events[i].value + ' , ' + this.events[i].timestamp +';\n';
        }
        return result;
    }
        
}

module.exports = Buffer

