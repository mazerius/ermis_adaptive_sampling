class OverwriteBuffer extends Buffer{
     
    constructor(id, size) {
        super(id);
        this.size = size;
        this.counter = 0;
      }


    incrementCounter(){
        if (this.counter < this.size - 1){
            this.counter+=1;
        }
        else{
            this.counter = 0;
        }
    }
    
    addEvent(event){
        this.events_so_far += 1;
        if (this.events.length < this.size){
            this.events.push(event);
        }
        else{
            this.events[this.counter] = event;
            this.incrementCounter();
        }
    }
        
}

module.exports = OverwriteBuffer

