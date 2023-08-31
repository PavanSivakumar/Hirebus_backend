const { google } = require('googleapis');
const credentials = require('./credentials.json');
const scopes = ['https://www.googleapis.com/auth/drive'];

const driveAuth = new google.auth.GoogleAuth({
  credentials,
  scopes,
});

module.exports = driveAuth;
