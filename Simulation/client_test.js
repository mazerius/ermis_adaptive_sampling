let i = 1;
var period = 5000;

function sample_igd(){
  var result =  Math.random();
  return result*1000;
}

function sample_trd(){
  var result =  Math.random();
  return result*2000;
}

setTimeout(function run() {
  setTimeout(function(){console.log(new Date() + 'EMIT')}, sample_trd());
  setTimeout(run, period + sample_igd());
}, period + sample_igd());
