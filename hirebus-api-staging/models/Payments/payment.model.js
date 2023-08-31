const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let paymentSchema = new Schema({
    transactionId : {
        type : String,
    },
    customerId : {
        type :Schema.Types.ObjectId,
        ref : "Customer",
    },
    tripId : {
        type : Schema.Types.ObjectId,
    },
    amount : {
        type : Number,
    },
    status : {
        type : String,  //PENDING PAID
    },
    description :{
        type : String, //advanced payment //left payment // full payment
    }
}); 

async function getPayments(pageNumber){
    try{
        let payments = await Payment.find({}).sort({ "$natural": -1 }).skip(15*pageNumber).limit(15)
        .populate('customerId');
        // console.log(payments);
        if(!payments){
            throw new Error("No payments found!");
        }
        // console.log(payments);
        return ({status : 1 ,  payments : payments });
    }
    catch(err){
        return ({status : 0 , payments : NULL , message : err.message});
    }
}

async function addPayment(rzpId , customerId, tripId, amount, status, description ,  cb){
    let paymentObj = {
        transactionId : rzpId,
        customerId : customerId,
        tripId : tripId,
        amount : amount,
        status : status,
        description : description,
    }
    console.log("Adding to Payment Model...", paymentObj)
    let payment = await new Payment(paymentObj).save();
    if(payment){
        return cb({status : 1 , payment : payment});
    }
    return cb({status : 0 , message : "Payment is not added!"});
}

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = {
    Payment,
    getPayments,
    addPayment,
}