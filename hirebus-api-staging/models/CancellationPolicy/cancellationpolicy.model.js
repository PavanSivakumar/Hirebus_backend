const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let cancellationPolicySchema = new Schema({
    durationInDays: {
        type: Number,
    },
    percentRefund: {
        type: Number,
    },
    vendor: {
        type: Schema.Types.ObjectId,
        ref: "Vendor",
    },
    isEnabled: {
        type: Boolean,
        default: true,
    }
});

async function getCancellationPolicyByVendor(vendor, pageNumber) {
    try {
        let cancellationPolicies = await CancellationPolicy.find({ vendor: vendor })
            .sort({ "$natural": -1 })
        if (!cancellationPolicies) {
            throw new Error("No cities found!");
        }
        return ({ status: 1, cancellationPolicies: cancellationPolicies });
    }
    catch (err) {
        return ({ status: 0, cancellationPolicies: NULL, message: err.message });
    }
}

async function addCancellationPolicy(cpObj) {
    try {
        let cancellationPolicy = await CancellationPolicy(cpObj).save();
        if (!cancellationPolicy) {
            return ({ status: 0, message: "Cancellation Policy has npt been added!" })
        }
        return ({ status: 1, cancellationPolicy: cancellationPolicy });
    }
    catch (err) {
        return ({ status: 0, message: err.message });
    }
}

async function updateCancellationPolicy(cpId, cpObj) {
    try {
        let cancellationPolicy = await CancellationPolicy.findOneAndUpdate({ _id: cpId }, cpObj)
        if (!cancellationPolicy) {
            return ({ status: 0, message: "Invalid Cancellation Policy" });
        }
        return ({ status: 1, cancellationPolicy: cancellationPolicy });
    }
    catch (err) {
        return ({ status: 0, message: err.message });
    }
}

async function deleteCancellationPolicy(cpId) {
    try {
        CancellationPolicy.findOneAndRemove({ _id: cpId }).exec((err, res) => {
            if (err) return ({ status: 0, message: "Cancellation Policy has not been deleted!" });
        })
        return ({ status: 1, message: "Cancellation Policy has been deleted!" });
    }
    catch (err) {
        return ({ status: 0, message: err.message });
    }
}

const CancellationPolicy = mongoose.model('CancellationPolicy', cancellationPolicySchema);
module.exports = {
    CancellationPolicy,
    getCancellationPolicyByVendor,
    addCancellationPolicy,
    updateCancellationPolicy,
    deleteCancellationPolicy,
}