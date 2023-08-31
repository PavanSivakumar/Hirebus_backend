const mongoose = require("mongoose");

// Build the connection string
const dbURI = process.env.MONGODB_URI;
console.log(dbURI);

// Create the database connection
mongoose.connect(
  dbURI,
  { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true }
)
.then(conn => {console.log("Connected")})
.catch(console.error);

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on("connected", function() {
  console.log("Moongoose Connected");
});

// If the connection throws an error
mongoose.connection.on("error", function(err) {
  console.log("Mongoose default connection error: " + err);
});

// When the connection is disconnected
mongoose.connection.on("disconnected", function() {
  console.log("Mongoose default connection disconnected.");
});

// If the Node process ends, close the Mongoose connection
process.on("SIGINT", function() {
  mongoose.connection.close(function() {
    console.log(
      "Mongoose default connection disconnected through app termination."
    );
    process.exit(0);
  });
});
