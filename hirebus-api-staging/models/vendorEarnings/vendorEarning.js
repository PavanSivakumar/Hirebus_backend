const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let vendorEarningSchema = new Schema({
    vendor: {
        type: Schema.Types.ObjectId,
        ref: "Vendor",
    },
    trip: {
        type: Schema.Types.ObjectId,
        ref: "Trip",
    },
    amount: {
        type: Number,
    },
    transactionDate: {
        type: Date,
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: "Customer",
    },
});

async function addVendorEarning(earningObj, cb) {
    try {
        VendorEarning.findOne({ trip: earningObj.trip }).exec((err, resp) => {
            if (err) return cb({ status: 0, message: err });
            if (!resp) {
                let earning = new VendorEarning(earningObj).save();
                if (!earning) return cb({ status: 0, message: "Earning has not been saved!" });
                else return cb({ status: 1, earning: earning });
            }
            else {
                VendorEarning.findOneAndUpdate({ _id: resp._id }, { $inc: { amount: earningObj.amount } }).exec((err, resp) => {
                    if (err) return cb({ status: 0, message: err });
                    else return cb({ status: 1, earning: resp });
                })
            }
        })
    } catch (err) {
        return cb({ status: 0, message: err });
    }
}

async function getTopEarnings(vendorId, pageNumber) {
    let topEarnings = await VendorEarning.find({ vendor: vendorId })
        .populate('vendor')
        .populate('trip')
        .populate('customer')
        .sort({ amount: -1 }).exec();
    if (!topEarnings) return ({ status: 0, message: "Vendor not found!" });
    return ({ status: 1, topEarnings: topEarnings });
}


const VendorEarning = mongoose.model('VendorEarning', vendorEarningSchema);
module.exports = {
    VendorEarning,
    addVendorEarning,
    getTopEarnings,
}