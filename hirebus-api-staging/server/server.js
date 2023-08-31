// require('./config/config'); // moved to setup.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
let helmet = require('helmet');

let app = express();

app.use(logger('combined'));
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(helmet());
app.use(cookieParser());
app.use(express.static('public'));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, auth_token");
    next();
});

app.use(function (err, req, res, next) {
    try {
        console.log(err);
        return res.status(err.status || 500).send({status:0, message:err.message});
    }
    catch (e) {
        console.log(e);
        return res.status(e.status || 500).send({status:0, message:e.message});
    }
});

// server setup in setup.js file
app.get('/v1', function(req,res){
	return res.status(200).send('Request Success...');
});

module.exports = app;