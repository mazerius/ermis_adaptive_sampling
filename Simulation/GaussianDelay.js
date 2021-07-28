var PD = require("probability-distributions");

class GaussianDelay {
    
    constructor(mean, std){
            this.mean = Number(mean);
            this.std = Number(std);
    }

    sample(){
        return PD.rnorm(1,this.mean, this.std)[0];
    }
}

module.exports = GaussianDelay