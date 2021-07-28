var distributions = require('probdist');
var X = distributions.gaussian(0, 1);

class Stream {
    

        constructor(id, period, ig_delay, tr_delay, value, tags, fixed){
            this.id = id;
            this.period = Number(period);
            this.value = Number(value);
            this.ig_delay_model = ig_delay;
            this.ig_delay = Math.round((this.ig_delay_model.sample() + Number.EPSILON) * 100) / 100
            this.tr_delay_model = tr_delay;
            this.tr_delay = Math.round((this.tr_delay_model.sample() + Number.EPSILON) * 100) / 100
            this.tags = tags;
            this.websockets=[];
            this.active = true;
            if (fixed == 0){
              this.fixed = false;
            }
            if (fixed ==1){
              this.fixed = true;
            }
        }
    
      addWebsocket(ws){
          this.websockets.push(ws);
      }

      getPeriod(){
        return this.period;
      }

      setPeriod(period){
        this.period = Number(period);
      }

      setActive(arg){
        this.active=active;
      }

      getTRD(){
        return this.tr_delay;
      }

      getIGD(){
        return this.ig_delay;
      }
    
      emitRandomEvent(date){
        var to_send = {"id":this.id, "period": this.period, "value":Math.floor(1000*Math.random()), "tags": this.tags, "fixed":this.fixed, "generation_timestamp": date};
        for (var i = 0; i < this.websockets.length; i++){
            this.websockets[i].send(JSON.stringify(to_send));
        }
        console.log('Stream ' + this.id + ' | ' + date.toLocaleTimeString() + ' EMIT' + ' period: ' + this.period);
        // this.updateInterGenerationDelay();
        // this.updateTransmissionDelay();
      }

      emitEvent(date){
        console.log('Generation Time In Emit: ', date);
        var to_send = {"id":this.id, "period": this.period, "igd":this.ig_delay, "trd": this.tr_delay, "value":this.value, "tags": this.tags, "fixed":this.fixed, "generation_timestamp": date};
        for (var i = 0; i < this.websockets.length; i++){
            //console.log('this.websockets[i]', this.websockets[i]);
            this.websockets[i].send(JSON.stringify(to_send));
        }
        console.log('Stream ' + this.id + ' | ' + date.toLocaleTimeString() + ' EMIT ' + 'period ' + to_send.period);
        // this.updateInterGenerationDelay();
        // this.updateTransmissionDelay();
      }

      updateTransmissionDelay(){
        this.tr_delay = Math.round((this.tr_delay_model.sample() + Number.EPSILON) * 100) / 100;
      }

      updateInterGenerationDelay(){
        var igd = this.ig_delay_model.sample();
        //console.log('igd: ', igd);
        this.ig_delay = Math.round((igd + Number.EPSILON) * 100) / 100;
      }
}

module.exports = Stream