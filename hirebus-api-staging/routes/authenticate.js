const jwt = require('jsonwebtoken');
const passport = require('passport');

const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

const { Customer } = require('../models/Users/customer.model');

const expiresInSec = 10800; //JWT expires in 10800 seconds i.e. 3 hours
const mySecretKey = "58945-20145-76845-24152";

const myPasswort = "WJGk2RdzmKsw2IVsLnx0SieFHYSA6q3CAuMn5WnKmn856A";

const admin = require("../server/firebase");

exports.getToken = function (user) {
    return jwt.sign(user, mySecretKey, { expiresIn:expiresInSec });
};

const opts = {
    jwtFromRequest : ExtractJwt.fromHeader("auth_token"),
    secretOrKey : mySecretKey
};
// Pass JWT in header under the name "auth_token"

exports.jwtPassport = passport.use(new JwtStrategy(opts, (jwt_payload, done) => {
    // console.log('JWT PAYLOAD: ',jwt_payload);
    if (""+jwt_payload["_id"]===myUserId) {
        return done(null, user);
    }
    else {
        let err = new Error("Unauthorized");
        return done(err, false);
    }
}));

exports.verifyUser = passport.authenticate('jwt', { session: false });

/* FIREBASE AUTH MIDDLEWARE */

exports.verifyFirebaseUser = async function (req, res, next) {
    let resAlreadySent=false;
    try {
        // console.log(req.ip);
        // console.log(typeof(req.ip));
        let retryAfterSeconds;
        let currIp, nowTime, ipInLimiter, ipUpdateLimiter;
        nowTime = new Date();
        let bearerToken = req.header("Authorization");
        if (bearerToken) {
            bearerToken = (""+bearerToken).split(" ");
            if (bearerToken[0]!=="bearer" && bearerToken[0]!=="Bearer") {
                // increment log
                return res.sendStatus(401);
            }
            admin.auth().verifyIdToken(bearerToken[1])
            .then(function (decodedToken) {
                req._uid = decodedToken.uid;
                req._passwort = myPasswort;
            })
            .catch(async function (reason) {
                // console.error(reason);
                if (resAlreadySent) {
                    return;
                }
                return res.sendStatus(401);
            });
        }
        else {
            console.error("Authorization header not found!");
            return res.sendStatus(401);
        }
    } catch (err) {
        console.error(err);
        if (resAlreadySent) {
            return;
        }
        else {
            return res.sendStatus(401);
        }
    }
};

exports.verifyAdmin = async function (req, res, next) {
    let resAlreadySent=false;
    try {
        // console.log(req.ip);
        // console.log(typeof(req.ip));
        let retryAfterSeconds;
        let currIp, nowTime, ipInLimiter, ipUpdateLimiter;
        nowTime = new Date();
        let bearerToken = req.header("Authorization");
        console.log(bearerToken);
        if (bearerToken) {
            bearerToken = (""+bearerToken).split(" ");
            if (bearerToken[0]!=="bearer" && bearerToken[0]!=="Bearer") {
                // increment log
                return res.sendStatus(401);
            }
            admin.auth().verifyIdToken(bearerToken[1])
            .then(function (decodedToken) {
                req._uid = decodedToken.uid;
                req._passwort = myPasswort;
                Customer.findOne({email : req.body.email})
                .then(function (userFound) {
                    if (userFound.isAdmin===true) {
                        next();
                        resAlreadySent = true;
                    }
                    else {
                        return res.sendStatus(403);
                    }
                })
                .catch(console.error);
            })
            .catch(async function (reason) {
                // console.error(reason);
                if (resAlreadySent) {
                    return;
                }
                return res.sendStatus(401);
            });
        }
        else {
            console.error("Authorization header not found!");
            return res.sendStatus(401);
        }
    } catch (err) {
        console.error(err);
        if (resAlreadySent) {
            return;
        }
        else {
            return res.sendStatus(401);
        }
    }
};

exports.passwort = myPasswort;