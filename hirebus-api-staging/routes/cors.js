const cors = require('cors');
const express = require('express');

//white list the sources
const whiteList = [ "127.0.0.1", "127.0.0.1:5500","http://127.0.0.1:5501", "http://localhost:3000", "http://localhost:3000", "https://abhis-snippets.github.io/"];

// set Origin header as source e.g. "http://localhost:3000/" 
let corsOptionsDelegate = function (req, callback) {
    let corsOptions;
    let myorigin = req.header('Origin');
    if (myorigin.lastIndexOf('/') === (myorigin.length-1)) {
        myorigin = myorigin.slice(0,myorigin.length-1);
    }
    console.log("Origin : ", myorigin);
    if (whiteList.includes(myorigin)) {
        console.log("Yes origin accepted");
        corsOptions = { origin: true };
    }
    else {
        console.log("Origin not accepted");
        corsOptions = { origin: false };
    }
    callback(null, corsOptions);
};

exports.cors = cors();
exports.corsWithOptions = cors(corsOptionsDelegate);