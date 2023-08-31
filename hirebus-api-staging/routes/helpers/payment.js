const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const { addPayment } = require('../../models/Payments/payment.model');

let rzp = new Razorpay({
  key_id: "rzp_live_xMg3MMN3f1Emc8", // your `KEY_ID`
  key_secret: "Kh7ryGoGD2FtPt3cgC4pLDVU" // your `KEY_SECRET`
});

let rzptest = new Razorpay({
  key_id: "rzp_test_1KNe1AHnwCrgS2", // your `KEY_ID`
  key_secret: "bnBtAg4zGEOz2oBqLxzzcmEt" // your `KEY_SECRET`
});


async function capturePayment(paymentId , customerId, tripId, amount, description , cb){
  console.log("Trying to capture Payment" + (amount*100));
  console.log("Trying to capture Payment" + Math.trunc(amount*100));
  rzptest.payments.capture(paymentId,  Math.trunc(amount*100), "INR" )
  .then(async data => {
    console.log("Response....", data);
    console.log("Response from Captured Payment:" + JSON.stringify(data));

    if(data.captured || data.status === "Authorized") {
      if( data.status === "Authorized") {

          await addPayment(paymentId , customerId, tripId, amount, "PENDING", description , (payment)=>{
            if(!payment) cb({ status : 0 , message : payment.message});
            cb({status : 2 , message : "Pending" , id : payment.payment_id});
          });
      }
      console.log("captured True Payment");
      addPayment(paymentId , customerId, tripId, amount, "PAID", description , (payment) =>{
        if(!payment || !payment.status)  throw new Error(payment.message);
        // sendTRIPSMS(tripId, vehicleName, tripStart);
        cb({status : 1, id : payment.payment._id }); 
      });
    }
    else {
      console.log('response...');
      cb({ status: 0, message: "Could not capture" });
    }
  })
  .catch(err => {
    console.log("Error in capture " + JSON.stringify(err));
    cb({status : 0 , message : err});
  });
}


module.exports = {
    capturePayment,
}