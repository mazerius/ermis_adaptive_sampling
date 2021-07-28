
var fs = require('fs');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var request = require('request');

/**
 * A class responsible for logging various statistics to the database.
 */
class Logger{

    constructor(){
        this.recording = false;
        this.database = 'Ermis_ASM';
    }

    setRecordingActive(){
        this.recording = true;
    }


    writeToDB(array_points){
        try {
        // Input the measurement.
        request({ url: 'http://localhost:5555/writeToDB/' + this.database, method: 'PUT', json: array_points, function() 
            {
                console.log('Done!')
            }
        });

        // Log.
        // console.log('info', '[INFLUXDB] Data pushed to InfluxDB: ' + JSON.stringify(array_points));
        } catch (e) {
        // Log.
        console.log('error', '[INFLUXDB] No connection with InfluxDB.');
        }
    }


    recordRestAPICall(type){
        if (this.recording){
            var array_points = [];
            // add bwmult
          array_points.push({
          measurement: 'REST_API',
              tags: {
                  type: type,
                  approach: 'Hades'
              },
              fields: {
                  value: 1
              }
              //timestamp: message.timestamp * 1000
          });
          this.writeToDB(array_points);
        } 
    }

    recordIGD_Measurement(address, peripheral, value){
        if (this.recording){
            var array_points = [];
            array_points.push({
                measurement: 'IGD_Measurement',
                tags: {
                  mote: address,
                  peripheral: peripheral,
                  approach: 'Hades'
                },
                fields: {
                  value: value
                }
            });
          this.writeToDB(array_points)
        }
    }

    recordIGD_Mean(address, peripheral, value){
        if (this.recording){
            var array_points = [];
            array_points.push({
                measurement: 'IGD_Mean',
                tags: {
                  mote: address,
                  peripheral: peripheral,
                  approach: 'Hades'
                },
                fields: {
                  value: value
                }
            });
          this.writeToDB(array_points)
        }
    }

    recordIGD_Var(address, peripheral, value){
        if (this.recording){
            var array_points = [];
            array_points.push({
                measurement: 'IGD_Var',
                tags: {
                  mote: address,
                  peripheral: peripheral,
                  approach: 'Hades'
                },
                fields: {
                  value: value
                }
            });
          this.writeToDB(array_points)
        }
    }

    recordIGD_Estimate(address, peripheral, value){
        if (this.recording){
            var array_points = [];
            array_points.push({
                measurement: 'IGD_Estimate',
                tags: {
                  mote: address,
                  peripheral: peripheral,
                  approach: 'Hades'
                },
                fields: {
                  value: value
                }
            });
          this.writeToDB(array_points)
        }
    }

    recordCounter(address, peripheral, value){
      if (this.recording){
          var array_points = [];
          array_points.push({
              measurement: 'Counter',
              tags: {
                mote: address,
                peripheral: peripheral,
                approach: 'Hades'
              },
              fields: {
                value: value
              }
          });
        this.writeToDB(array_points)
      }
  }

    recordTRD_Measurement(address, peripheral, value){
        if (this.recording){
            var array_points = [];
            array_points.push({
                measurement: 'TRD_Measurement',
                tags: {
                  mote: address,
                  peripheral: peripheral,
                  approach: 'Hades'
                },
                fields: {
                  value: value
                }
            });
          this.writeToDB(array_points)
        }
    }

    recordTRD_Mean(address, peripheral, value){
        if (this.recording){
            var array_points = [];
            array_points.push({
                measurement: 'TRD_Mean',
                tags: {
                  mote: address,
                  peripheral: peripheral,
                  approach: 'Hades'
                },
                fields: {
                  value: value
                }
            });
          this.writeToDB(array_points)
        }
    }

    recordTRD_Var(address, peripheral, value){
        if (this.recording){
            var array_points = [];
            array_points.push({
                measurement: 'TRD_Var',
                tags: {
                  mote: address,
                  peripheral: peripheral,
                  approach: 'Hades'
                },
                fields: {
                  value: value
                }
            });
          this.writeToDB(array_points)
        }
    }

    recordTRD_Estimate(address, peripheral, value){
        if (this.recording){
            var array_points = [];
            array_points.push({
                measurement: 'TRD_Estimate',
                tags: {
                  mote: address,
                  peripheral: peripheral,
                  approach: 'Hades'
                },
                fields: {
                  value: value
                }
            });
          this.writeToDB(array_points)
        }
    }

    recordAlpha(address, peripheral, value){
        if (this.recording){
            var array_points = [];
            array_points.push({
                measurement: 'Alpha',
                tags: {
                  mote: address,
                  peripheral: peripheral,
                  approach: 'Hades'
                },
                fields: {
                  value: value
                }
            });
          this.writeToDB(array_points)
        }
    }

    recordBeta(address, peripheral, value){
        if (this.recording){
            var array_points = [];
            array_points.push({
                measurement: 'Beta',
                tags: {
                  mote: address,
                  peripheral: peripheral,
                  approach: 'Hades'
                },
                fields: {
                  value: value
                }
            });
          this.writeToDB(array_points)
        }
    }



    recordCandidateStreamReconfiguration(address, peripheral, new_period, ts){
        if (this.recording){
            var array_points = [];
            array_points.push({
                measurement: 'Candidate_Sampling_Period',
                tags: {
                  mote: address,
                  peripheral: peripheral,
                  approach: 'Hades'
                },
                fields: {
                  value: new_period
                }
            });
          this.writeToDB(array_points)
        }
    }

    recordActualStreamReconfiguration(address, peripheral, new_period, ts){
        if (this.recording){
            var array_points = [];
            array_points.push({
                measurement: 'Actual_Sampling_Period',
                tags: {
                  mote: address,
                  peripheral: peripheral,
                  approach: 'Hades'
                },
                fields: {
                  value: new_period
                }
            });
          this.writeToDB(array_points)
        }
    }
}

module.exports = Logger