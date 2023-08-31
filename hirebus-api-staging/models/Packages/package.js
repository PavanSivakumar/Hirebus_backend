const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let packageSchema = new Schema({
    packageName : {
        type:String,
    },
    packageFacilities : [{
        type :String,
    }],
    perDayRent : {
        type: Number,  //in amount
        default: 0,
    },
    costPerKm : {
        type : Number,
    },
    extraCostPerKm : {
        type : Number,
    },
    extraCostPerHour : {
        type : Number,
    },
    minimumDuration : {
        type : Number,
    },
    perDayCoverage : {
        type : Number,
        default: 0
    },
    securityDepositToCollect : {
        type :Number,  //in percentage
        default : 0,
    },
    driverAllowance: {
        type : Number,
        default : 0,
    },
    isAc: {
        type : Boolean,
        default : false,
        required: true
    },
    advanceAmount : {
        type : Number,
        default: 0,
    },
    mileage : {
        type : Number,
        default: 0,
    },
});

const Package = mongoose.model('Package', packageSchema);

module.exports = { 
    Package
}