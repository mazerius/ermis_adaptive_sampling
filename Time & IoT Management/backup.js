function updateIGD(gts){
    var dt = new Date();
    dt.setHours(dt.getHours() + 2)
    console.log(dt,' == DEBUG | Updating IGD for Stream', this.id);

    // ignore the next X observations after a reconfiguration due to delay.
    this.logger.recordCounter(this.getAddress(), this.getPeripheral(), this.counter);

    // if (this.counter > 0){
    //   this.counter -= 1;
    //     return;
    // }

    // console.log('gts', gts);
    // console.log('this.period', this.period);
    // console.log('this.gts', this.gts)
    var igd = gts - this.gts - this.period;
    this.logger.recordIGD_Measurement(this.getAddress(), this.getPeripheral(), igd/1000);
    this.logger.recordAlpha(this.getAddress(), this.getPeripheral(), this.alpha);
    this.logger.recordBeta(this.getAddress(), this.getPeripheral(),this.beta);
    //console.log('igd:', igd)
    this.gts = gts;
    if (this.igd_mean == undefined){
      this.igd_mean = igd;
      this.igd_var = Math.abs(igd/2);
      this.first = true;
    }
    else{
      if (Math.abs(igd - this.igd_mean) > 4* this.igd_var ){
        if (Math.abs(igd - this.igd_mean) < 10*this.igd_var){
          console.log('========= MAYBE OUTLIER:', igd);
          this.igd_mean = this.beta*this.igd_mean + (1-this.beta)*igd
        }
        else{
          console.log('========= OUTLIER:', igd);
        }
      }
      else{
        console.log('========= NORMAL:', igd);
        if (this.first){
          this.igd_var = Math.abs(igd-this.igd_mean)
          this.first = false;
        }
        else{
          this.igd_var = this.alpha*this.igd_var + (1-this.alpha)*Math.abs(igd-this.igd_mean)
        }
        this.igd_mean = this.beta*this.igd_mean + (1-this.beta)*igd
        this.igd = this.igd_mean + Math.min(4*this.igd_var, 8)
        this.logger.recordIGD_Var(this.getAddress(), this.getPeripheral(),this.igd_var/1000);
        this.logger.recordIGD_Mean(this.getAddress(), this.getPeripheral(),this.igd_mean/1000);
      }
      //this.logger.recordIGD_Var(this.getAddress(), this.getPeripheral(),this.igd_var/1000);
      //this.logger.recordIGD_Mean(this.getAddress(), this.getPeripheral(),this.igd_mean/1000);

      // console.log('alpha', this.alpha);
      // console.log('beta', this.beta);
      // if (this.past_igd.length == this.size){
      //   console.log(dt,' == DEBUG | Math.abs(this.igd_mean - igd)',Math.abs(this.igd_mean - igd));
      //   console.log(dt,' == DEBUG | this.igd_var',Math.abs(this.igd_var));
      //   if (Math.abs(igd - this.igd_mean) < this.igd_var){
      //     this.igd_var = this.alpha*this.igd_var + (1-this.alpha)*(Math.abs(this.igd_mean - igd));
      //     this.past_igd = this.appendToSlidingWindow(this.igd_mean - igd, this.past_igd);
      //   }
      //   else{
      //     console.log(dt,' == DEBUG | IGNORING IGD:', igd);
      //     return;
      //   }
      }
      // var candidate_igd_var = this.alpha*this.igd_var + (1-this.alpha)*Math.min(Math.abs(this.igd_mean - igd));
      // console.log(dt,' == DEBUG | Candidate IGD VAR', candidate_igd_var);
      // if (this.past_igd.length < this.size){
      //   this.past_igd = this.appendToSlidingWindow(candidate_igd_var, this.past_igd);
      //   this.igd_var = candidate_igd_var;
      // }
      // else{
      //   console.log(dt,' == DEBUG | STD for IGD VAR', math.std(this.past_igd));
      //   if (candidate_igd_var - this.igd_var > 4*math.std(this.past_igd)){
      //     console.log(dt,' == DEBUG | > 6 STD difference, setting IGD VAR to', this.igd_var + 6*math.std(this.past_igd));
      //     this.igd_var = this.igd_var + 6*math.std(this.past_igd);
      //   }
      //   else{
      //     this.igd_var = candidate_igd_var;
      //   }
      // }
      //this.past_igd = this.appendToSlidingWindow(candidate_igd_var, this.past_igd);
     
      //this.igd_var = math.median(this.past_igd);

      //if (this.past_igd.length == this.size){
        // console.log(dt,' == DEBUG | STD for IGD VAR', math.std(this.past_igd));
        // if (candidate_igd_var - this.igd_var > 4*math.std(this.past_igd)){
        //   console.log(dt,' == DEBUG | > 6 STD difference, setting IGD VAR to', this.igd_var + 6*math.std(this.past_igd));
        //   this.igd_var = this.igd_var + 6*math.std(this.past_igd);
        // }
        // else{
        //   this.igd_var = candidate_igd_var;
        // }
      // }
      // else{
      //   this.igd_var = candidate_igd_var;
      // }

      //this.igd_var = this.alpha*this.igd_var + (1-this.alpha)*Math.abs(this.igd_mean - igd);
      // this.igd_mean = this.beta*this.igd_mean + (1-this.beta)*igd
      // this.igd = this.igd_mean + this.igd_var;
    this.logger.recordIGD_Estimate(this.getAddress(), this.getPeripheral(), this.igd/1000);
    // console.log('--')
    // console.log('Stream ' + this.id  + ' IGD Current: ' + igd);
    // console.log('Stream ' + this.id  + ' IGD_mean Estimate: ' + this.igd_mean);
    // console.log('Stream ' + this.id  + ' IGD_var Estimate: ' + this.igd_var);
    // console.log('Stream ' + this.id  + ' IGD Estimate: ' + this.igd);
    // console.log('--')
  }