
class ConstantDelay {
    
    constructor(value){
            this.value = Number(value);
    }

    sample(){
        return this.value;
    }
}

module.exports = ConstantDelay