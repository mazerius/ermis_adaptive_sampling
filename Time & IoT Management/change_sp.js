const request = require('request');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env.UV_THREADPOOL_SIZE=128

/**
 * A script to modify the sampling periods of the IoT devices in the infrastructure.
 */

function putRequestRecursively(url, timeout, json){
    request({ url: url, method: 'PUT',timeout: timeout, json: json},
    function(error, response, body) {
        if (error) {
                console.error('Reconfiguration failed:', error);
                console.error('Resending reconfiguration command.');
                putRequestRecursively(url, timeout,json);

        }
        console.log('Peripheral responded with body:', body);
        })
}



function setPeriod(period){
    //console.log('Requesting Sampling Period for', name, 'with peripheral:', peripheral);
    var url =  'https://192.168.0.220:8889/api/v1/devices';
    var options = {'auth': {
        'user': 'username',
        'pass': 'password'
    }};
    request.get(url, options, (error, res, body) => {
        if (error) {
            return  console.log(error)
        }; 

        if (!error && res.statusCode == 200) {
            var data = JSON.parse(body);
            for (var i = 0; i < data.length; i++){
                if (data[i].status == "OPERATIONAL"){
                    var mac = data[i].mac;
                    for (var j = 0; j < data[i].peripherals.length; j++){
                        var pids = data[i].peripherals[j].identifier.split('/');
                        if (pids.length == 2){
                            var url = 'https://192.168.0.220:8889/api/v1/devices/' + mac + '/peripherals/' + pids[0] + '/' + pids[1] + '/rate';
                            putRequestRecursively(url, 120000, {sampling_rate: period});
                            // request({ url: url, method: 'PUT',timeout: 120000, json: {sampling_rate: period}},
                            // function(error, response, body) {
                            //         if (error) {
                            //                 console.error('Reconfiguration failed:', error);
                            //         }
                            //         console.log('Peripheral responded with body:', body);
                            //         })
                        }
                        if (pids.length ==3){
                            var url = 'https://192.168.0.220:8889/api/v1/devices/' + mac + '/peripherals/' + pids[0] + '/' + pids[1] + '/' + pids[2] + '/rate';
                            putRequestRecursively(url, 120000, {sampling_rate: period});

                        //     request({ url: url, method: 'PUT', timeout: 120000, json: {sampling_rate: period}},
                        //     function(error, response, body) {
                        //             if (error) {
                        //                     console.error('Reconfiguration failed:', error);
                        //             }
                        //             console.log('Peripheral responded with body:', body);
                        //             })
                        // }
                    }  
                }        
            // do something with JSON, using the 'body' variable
            }
        }
    }});
}


setPeriod(900);
