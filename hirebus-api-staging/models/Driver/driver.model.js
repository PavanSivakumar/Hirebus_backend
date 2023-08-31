const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash');

let driverSchema = new Schema({
    firstName: {
        type: String,
        maxlength: 300,
        required: true
    },
    lastName: {
        type: String,
        maxlength: 300
    },
    userImageURL: {
        type: String,
        maxlength: 3000,
        default: "https://mynotarybucket1.s3.us-east-2.amazonaws.com/default/images/161743577905020619.png"
    },
    email: {
        type: String,
        maxlength: 324,
        unique: true,
    },
    phoneNumber: {
        type: String,
        maxlength: 15,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        maxlength: 15,
        required: true,
    },
    amountEarned: {
        type: Number,
        default: 0,
    },
    balance: {
        type: Number,
        default: 0,
    },
    vendorId: {
        type: Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
    },
    isEnabled: {
        type: Boolean,
        default: true,
    },
});


async function getDrivers(pageNumber) {
    try {
        let drivers = await Driver.find({})
            .sort({ "$natural": -1 }).sort({ "$natural": -1 });
        if (!drivers) {
            return ({ status: 0, message: "No Drivers found!" });
        }
        return ({ status: 1, drivers: drivers });
    }
    catch (err) {
        return ({ status: 0, message: err.message });
    }
}


async function getDriver(driverId) {
    try {
        let driver = await Driver.findOne({ _id: driverId });
        if (!driver) {
            return ({ status: 0, message: "No Drivers found!" });
        }
        return ({ status: 1, driver: driver });
    }
    catch (err) {
        return ({ status: 0, message: err.message });
    }
}


async function getDriversForVendor(vendorId, pageNumber) {
    try {
        await Driver.find({ vendorId: vendorId })
            .populate({
                path: "vendorId",
                select: "firstName lastName phoneNumber",
            })
            .sort({ "$natural": -1 })
            
            .exec().then((driver) => {
                console.log(_.isEmpty(driver))
                if (_.isEmpty(driver)) {
                    return ({ status: 0, message: "No Drivers found for the requested vendor!" });
                }
                return ({ status: 1, drivers: driver });
            }).catch((err) => {
                return ({ status: 0, message: "err1" });
            });
    }
    catch (err) {
        return ({ status: 0, message: "err2" });
    }
}




const Driver = mongoose.model('Driver', driverSchema);

module.exports = {
    Driver,
    getDrivers,
    getDriver,
    getDriversForVendor,
}