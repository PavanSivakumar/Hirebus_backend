const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let vendorSchema = new Schema({
    vendorId: {
        type: String
    },
    travelCompanyName: {
        type: String,
        maxlength: 300,
    },
    firstName: {
        type: String,
        maxlength: 200,
        required: true,
    },
    lastName: {
        type: String,
        maxlength: 200,
    },
    companyLogo: {
        type: String,
    },
    phoneNumber: {
        type: String,
        maxlength: 20
    },
    whatsAppNumber: {
        type: String,
        maxlength: 20
    },
    email: {
        type: String,
        unique: true,
        required: true,
        maxlength: 324,
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    officeAddress: {
        type: String,
        required: true,
    },
    about: {
        type: String,
    },
    photoURL: {
        type: String,
    },
    registrationDate: {
        type: Date,
    },
    vehicles: [{
        type: Schema.Types.ObjectId,
        ref: "Vehicle",
    }],
    amountEarned: {
        type: Number,
        default: 0,
    },
    trips: [{
        type: Schema.Types.ObjectId,
        ref: "Trip"
    }],
    password: {
        type: String,
        maxlength: 15,
        required: true,
    },
});



async function getVehiclesForVendor(vendorId, pageNumber, cb) {
    try {
        await Vendor.findOne({ _id: vendorId }, 'vehicles').populate('vehicles')
            .sort({ "$natural": -1 })
            .exec().then((vendor) => {
                if (!vendor || !vendor.vehicles) {
                    return cb({ status: 0, message: "No Vehicles found for the requested vendor!" });
                }
                return cb({ status: 1, vehicles: vendor.vehicles });
            }).catch((err) => {
                throw new Error(err);
            });
    }
    catch (err) {
        return cb({ status: 0, vehicles: NULL, message: err });
    }
}


async function getVendors(pageNumber) {
    try {
        let vendors = await Vendor.find({})
            .sort({ "$natural": -1 }).sort({ "$natural": -1 });
        if (!vendors) {
            return ({ status: 0, message: "No Vendors found!" });
        }
        return ({ status: 1, vendors: vendors });
    }
    catch (err) {
        return ({ status: 0, message: err.message });
    }
}


async function getVendor(vendorId) {
    try {
        let vendor = await Vendor.find({ _id: vendorId });
        if (!vendor) {
            return ({ status: 0, message: "No Vendors found!" });
        }
        return ({ status: 1, vendor: vendor });
    }
    catch (err) {
        return ({ status: 0, message: err.message });
    }
}

async function saveVehicleForVendor(vendorId, vehicleId) {
    try {
        let vendor = await Vendor.findOneAndUpdate({ _id: vendorId },
            { $addToSet: { vehicles: vehicleId } });
        if (!vendor) {
            return ({ status: 0, message: "No Vendors found!" });
        }
        return ({ status: 1, vendor: vendor });
    }
    catch (err) {
        return ({ status: 0, vendor: NULL, message: err.message });
    }
}

async function deleteVehicleForVendor(vendorId, vehicleId) {
    try {
        let vendor = await Vendor.findOneAndUpdate({ _id: vendorId }, { $pull: { vehicles: vehicleId } });
        if (!vendor) {
            return ({ status: 0, message: "No Vendors found!" });
        }
        return ({ status: 1, vendor: vendor });
    }
    catch (err) {
        return ({ status: 0, vendor: NULL, message: err.message });
    }
}


async function getVendor(vendorId) {
    try {
        let vendor = await Vendor.findOne({ _id: vendorId });
        if (!vendor) {
            return ({ status: 0, message: "No Vendors found!" });
        }
        return ({ status: 1, vendor: vendor });
    }
    catch (err) {
        return ({ status: 0, message: err.message });
    }
}

const Vendor = mongoose.model('Vendor', vendorSchema);
module.exports = {
    Vendor,
    getVehiclesForVendor,
    getVendors,
    getVendor,
    saveVehicleForVendor,
    deleteVehicleForVendor,
}
