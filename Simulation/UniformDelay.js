var PD = require("probability-distributions");

class UniformDelay {
    
    constructor(from, to){
            this.from =  Number(from);
            this.to =  Number(to);
    }

    sample(){
        return PD.runif(1,this.from, this.to)[0];
    }
}

module.exports = UniformDelay