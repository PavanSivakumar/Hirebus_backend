console.log(process.env.NODE_ENV); //undefined
const env = process.env.NODE_ENV || "test";
console.log(env); 

if (env === "development" || env === "test" || env === "prod" || env === "production") {
  const config = require("./config.json");
  const envConfig = config[env];
  Object.keys(envConfig).forEach(key => {
    process.env[key] = envConfig[key];
  });
}