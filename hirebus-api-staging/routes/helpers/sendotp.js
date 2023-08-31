var SendOtp = require('sendotp') ;
const sendOtp = new SendOtp("366850AKmG69J8GI6135fa09P1");
let senderId = "HireBus" ; 

async function sendOTP( phoneNumber, cb ){
    let intnumber = parseInt("91" + phoneNumber);  
    sendOtp.send(intnumber, senderId,  function(error, data) {
        // console.log(error, data);
        if (data.type === "success") {
            return cb({status : 1 , otpSent : true});
        }
        else{
            return cb({status : 0 , otpSent : false});
        }
    })
}

async function verifyOTP( phoneNumber , otp, cb){
    let number = "91" + phoneNumber;
    let intnumber = parseInt(number);
    sendOtp.verify(intnumber, otp, function(error, data) {
        // console.log(error, data);
        if (data.type === "success") {
            return cb({status : 1 , otpVerified : true});
        }
        else{
            return cb({status : 0 , otpVerified : false});
        }
    })
}

module.exports = {
    sendOTP,
    verifyOTP
}