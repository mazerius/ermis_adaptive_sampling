
const math = require('mathjs');

/**
 * A class that represents the streams, as defined in the paper. 
 */
class Stream {
    

        constructor(device_id, id, period, value, tags, fixed, gts, logger){
            // sensor identifier
            this.device_id = device_id;
            // source identifier, typically the same as the sensor identifier
            this.id = id;
            // sampling period
            this.period = Number(period);
            // default sampling period
            this.default = Number(period);
            // value of last received message
            this.value = Number(value);
            this.logger = logger;
            // key-value pairs, e.g. "Location = A"
            this.tags = tags;
            // queries that are associated with this stream
            this.queries = [];
            // queries that determine the sampling period of this stream.
            this.dominant_queries = [];
            this.gts = Number(gts);
            this.just_changed = false;
            // exponential smoothing parameters for delay models
            this.alpha = 7/8;
            this.beta = 7/8
            this.igd = 0;
            this.trd = 0;
            if (fixed == 0){
              this.fixed = false;
            }
            if (fixed ==1){
              this.fixed = true;
            }
            this.history = undefined;
            this.counter = 0;
            this.past_igd = [];
            this.size = 10;
            this.first = false;
            this.consequtive_candidate_wins = 0;
            this.threshold_shift = 3;
          }

        setHistory(history){
          this.history = history;
        }

        resetCounter(counter){
          this.counter = counter
        }
        
        getCounter(){
          return this.counter;
        }

        getPeripheral(){
          return this.device_id.split('|')[0];
        }

        getAddress(){
          return this.device_id.split('|')[1];
        }

        setJustChanged(arg){
          this.just_changed = arg;
        }

        setPeriod(period){
          this.last_period = this.period;
          this.period = period;
          // used to determine if last_period or period should be used for computing IGD
          this.changed = true;
        }

        candidateBetterPredictionThanCurrent(igd){
          var distance_from_current = Math.abs(igd-this.igd_mean);
          var distance_from_candidate = Math.abs(igd-this.igd_candidate_mean);
          if (distance_from_candidate < distance_from_current){
            this.consequtive_candidate_wins += 1;
          }
          else{
            this.consequtive_candidate_wins = 0;
          }
        }

        updateIGD(gts){
          var dt = new Date();
          dt.setHours(dt.getHours() + 2)
          console.log(dt,' == DEBUG | Updating IGD for Stream', this.id);
          this.logger.recordCounter(this.getAddress(), this.getPeripheral(), this.counter);
          // ignore the next X observations after a reconfiguration due to unstable inter-generation delay.
          var igd = gts - this.gts - this.period;
          this.logger.recordIGD_Measurement(this.getAddress(), this.getPeripheral(), igd/1000);
          this.logger.recordAlpha(this.getAddress(), this.getPeripheral(), this.alpha);
          this.logger.recordBeta(this.getAddress(), this.getPeripheral(),this.beta);
          this.gts = gts;
          // initialization for igd model
          if (this.igd_mean == undefined){
            this.igd_mean = igd;
            this.igd_candidate_mean = this.igd_mean;
            this.igd_var = Math.abs(igd/2);
          }
          else{
            // since the paper publication, I have improved the delay model for IGD by introducing outlier detection.
            this.candidateBetterPredictionThanCurrent(igd);
            if (this.consequtive_candidate_wins == this.threshold_shift){
              this.igd_mean = this.igd_candidate_mean;
              this.consequtive_candidate_wins = 0;
            }
            // outlier
            if (Math.abs(igd - this.igd_mean) > 4* this.igd_var ){
              this.igd_candidate_mean = igd;
              this.igd_candidate_estimate = this.igd_candidate_mean + 4*this.igd_var + 5
            }
            // ## Comment out to disable the improved IGD model with outlier detection.
            else{
              this.igd_var = this.alpha*this.igd_var + (1-this.alpha)*Math.abs(igd-this.igd_mean)
              this.igd_mean = this.beta*this.igd_mean + (1-this.beta)*igd;
              this.igd_candidate_mean = this.igd_mean;
              this.igd = this.igd_mean + 4*this.igd_var
              if (this.igd <0){
                this.igd = this.igd/2;
              }
              this.logger.recordIGD_Var(this.getAddress(), this.getPeripheral(),this.igd_var/1000);
              this.logger.recordIGD_Mean(this.getAddress(), this.getPeripheral(),this.igd_mean/1000);
            }
            // ## Remove comments below to enable the IGD model described in the paper. 
            // else{
            //   this.igd_var = 3/4*this.igd_var + (1-3/4)*Math.abs(this.igd_mean - igd);
            //   this.igd_mean = 7/8*this.igd_mean + (1-7/8)*Math.abs(igd);
            //   this.logger.recordIGD_Mean(this.getAddress(), this.getPeripheral(), this.igd_mean/1000);
            //   this.logger.recordIGD_Var(this.getAddress(), this.getPeripheral(), this.igd_var/1000);
            // }
            // this.igd = this.igd_mean + 4*this.igd_var;
            
            }
            
          this.logger.recordIGD_Estimate(this.getAddress(), this.getPeripheral(), this.igd/1000);
          
        }

        increaseAlpha(){
          this.alpha = Math.max(19/20, this.alpha + 0.015);
        }

        increaseBeta(){
          this.beta = Math.max(19/20, this.alpha + 0.015);
        }

        decreaseAlpha(){
          this.alpha = Math.max(19/20, this.alpha - 0.025);
        }

        decreaseBeta(){
          this.beta = Math.max(19/20, this.beta - 0.025);
        }

        setAlpha(alpha){
          this.alpha = alpha;
        }

        setBeta(beta){
          this.beta = beta;
        }
  
        // updates the transmission delay based on the most recently received message from the corresponding source sensor.
        updateTRD(trd){
          var dt = new Date();
          dt.setHours(dt.getHours() + 2)
          console.log(dt,' == DEBUG | Updating TRD for Stream', this.id);
          this.logger.recordTRD_Measurement(this.getAddress(), this.getPeripheral(), trd/1000);
          if (this.trd_mean == undefined){
            this.trd_mean = trd;
            this.trd_var = Math.abs(trd/2);
            this.logger.recordTRD_Mean(this.getAddress(), this.getPeripheral(), this.trd_mean/1000);
            this.logger.recordTRD_Var(this.getAddress(), this.getPeripheral(), this.trd_var/1000);
          }
          else{
            this.trd_var = 3/4*this.trd_var + (1-3/4)*Math.abs(this.trd_mean - trd);
            this.trd_mean = 7/8*this.trd_mean + (1-7/8)*Math.abs(trd);
            this.logger.recordTRD_Mean(this.getAddress(), this.getPeripheral(), this.trd_mean/1000);
            this.logger.recordTRD_Var(this.getAddress(), this.getPeripheral(), this.trd_var/1000);
          }
          this.trd = this.trd_mean + 4*this.trd_var;
          this.logger.recordTRD_Estimate(this.getAddress(), this.getPeripheral(), this.trd/1000);
        }

      // updates the dominant queries for this stream.
      setDominantQueries(queries){
        var dt = new Date();
        dt.setHours(dt.getHours() + 2)
        console.log(dt,' == DEBUG | Setting Dominant for Stream ' + this.id + ' to ' +  queries);
        this.dominant_queries = queries;
      }

      getDominantQueries(){
         return this.dominant_queries;
      }

      resetDominantQueries(){
        this.dominant_queries = [];
      }

      // checks if this stream is associated with given query based on its ID.
      hasQuery(id){
        for (var i = 0; i < this.queries.length; i++){
          var query = this.queries[i];
          if (query.id == id){
            return true;
          }
        }
        return false;
      }
    
      // associates this stream with given query.
      assignQuery(query){
          this.queries.push(query)
      }

      // removes query with id from associated queries.
      removeQuery(id){
        var result = [];
        for (var i =0; i < this.queries.length; i++){
          if (this.queries[i].id != id){
            result.push(this.queries[i]);
          }
        }
        this.queries = result;
      }

      // helper method to add element to a moving sliding window.
      appendToSlidingWindow(element, lst){
        if (lst.length < this.size){
            lst.push(element)
        }
        else{
            lst = lst.slice(1,lst.length)
            lst.push(element)
        }
        return lst
    }


      // gets all queries associated with this stream.
      getRelevantQueries(){
          var result = [];
          for (var i =0; i< this.queries.length; i++){
            result.push(this.queries[i]);
          }
          return result;
      }

      //gets all aggregate queries associated with this stream.
      getAggregateQueries(){
        var result = [];
        var queries = this.getRelevantQueries();
        for (var i = 0; i < queries.length; i++){
          if (queries[i].aggregate){
            result.push(queries[i]);
          }
        }
        return result;
      }
}

module.exports = Stream