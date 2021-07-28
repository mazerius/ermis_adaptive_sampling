
database = 'Ermis_ASM'

const influx= new Influx.InfluxDB({
    host: '192.168.0.253',
    database: database,
    port:8086
    });
module.exports=influx;

influx.getDatabaseNames()
.then(names=>{
if(!names.include(database)){
return influx.createDatabase('statistics');
}
});



function writeToDB(array_points){
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