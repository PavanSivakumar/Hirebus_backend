let admin = require("firebase-admin");

//let serviceAccount = require("./firebase-service-helper.json");
let serviceAccount = require("./firebase-cred.json");
const { databaseURL } = require("./db/firebase-db");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL : databaseURL
});

//admin.initializeApp();

module.exports = admin;