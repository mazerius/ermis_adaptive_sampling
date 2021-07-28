var PD = require("probability-distributions");

class BinomialDelay {
    
    constructor(nb_trials, probability){
            this.nb_trials = Number(nb_trials);
            this.probability = Number(probability);
    }

    sample(){
        return PD.rbinom(1, this.nb_trials, this.probability);
    }
}

module.exports = BinomialDelay