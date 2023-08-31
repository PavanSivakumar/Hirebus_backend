#!/usr/bin/env node

/**
 * Setup the config
 */

require('./config/config');

/**
 * Connect to MongoDB
 */

require('./db/db');

/**
 * Connect to firebase
 */

let admin = require('./firebase');
/**
 * Initiate cron-jobs
 */

// require('../cron-jobs/cron-jobs');

/**
 * Module dependencies.
 */

let express  = require('express');

const app = require('./server');
const debug = require('debug')('notary-server:server');
const http = require('http');
const customerRouter = require('../routes/customer/customer');
const adminRouter = require('../routes/admin/admin.common');
const driverRouter = require('../routes/driver/driver');
const vendorRouter = require('../routes/vendor/vendor');
var cors = require('cors')
/**
 * Get port from environment and store in Express.
 */

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.use(cors());
let port = normalizePort(process.env.PORT || '3000');
app.set('port', port);
app.use(express.json({limit: '50mb'}));

//ROUTES
app.use('/v1/customer', customerRouter );
app.use('/v1/admin' , adminRouter );
app.use('/v1/driver' , driverRouter );
app.use('/v1/vendor' , vendorRouter );



/**
 * Setup host
 */

console.log("Host (Host): "+process.env.HOST);
console.log("Host (Domain name): "+process.env.DOMAIN_NAME);
let host = process.env.DOMAIN_NAME || 'localhost';
console.log("Host: "+host);
/**
 * Create HTTP server.
 */

let server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port, () => {
  console.log(`Server running at http://${host}:${port}`);
});

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}
