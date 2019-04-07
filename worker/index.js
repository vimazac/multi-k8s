const keys = require('./keys'); //the port and hosts to connect to redis
const redis = require('redis');

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
  // if it looses connection to the server it has to automatically attempt 
  // to reconnect to the server once every one sec 
});

const rediSubscriber = redisClient.duplicate();

function fib (index) {
  if (index<=2) {return 1;}
  return fib(index - 1) + fib(index -2);
}

/**
 * message is the index value submitted to the form.
 * the key is the index(message) and the value the fibo calculated, it will be stored
 * in a hash called "values"
 */
rediSubscriber.on('message', (channel, message) => {
  redisClient.hset('values', message, fib(parseInt(message)));  
})

// worker will be watching redis, every time someone attempts 
// to insert a new value in redis we will calculate that value.
rediSubscriber.subscribe('insert'); 
