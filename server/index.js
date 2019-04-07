const keys = require('./keys');
//Express app setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); //requests from one domain to another.

const app = express();
app.use(cors());
app.use(bodyParser.json()); //incoming request from react into json values

//postgress client setup
const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
});
pgClient.on('error', () => console.log('lost PG connection')); 
pgClient
  .query('CREATE TABLE IF NOT EXISTS values (number INT)')
  .catch(err => console.log(err));

// redist client setup

const redis = require('redis');
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
});
// if we ever have a client listening or publishing info on redis we have to make a duplicate 
// because when a conection is created for listening, subscribe or publish info, it cannot be
// used for other purposes.
const redisPublisher = redisClient.duplicate();

// express route handlers

app.get('/', (req, rsp) => {
  rsp.send('hi');
});

app.get('/values/all', async (req, rsp) => {
  const values = await pgClient.query('Select * from values');
  rsp.send(values.rows);
});

app.get('/values/current', async(req, rsp) => {
  redisClient.hgetall('values', (err, values) =>{ //redis does not have promises so we use callbacks
    rsp.send(values);
  });
});

app.post('/values', async(req, rsp)=> {
  const index = req.body.index;
  if(parseInt(index)>40){
    return rsp.status(422).send('index too high');
  }
  redisClient.hset('values', index, 'nothing yet!'); //put the value into our redis data store
  redisPublisher.publish('insert', index); //wake up worker and said is time to pull a value out of redis, time to calculate the fibo value.
  pgClient.query('insert into values (number) VALUES($1)',[index]);

  rsp.send({working: true});
});

app.listen(5000, err => {
  console.log('listening');
})