const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let customerSchema = new Schema({
    isAgent: {
        type: Boolean,
        default: false,
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    firstName: {
        type: String,
        maxlength: 300,
        required: true
    },
    pushTokens: [String],
    lastName: {
        type: String,
        maxlength: 300
    },
    userImageURL: {
        type: String,
        maxlength: 3000,
        default: "https://mynotarybucket1.s3.us-east-2.amazonaws.com/default/images/161743577905020619.png"
    },
    uid: { // FIREBASE
        type: String,
        maxlength: 4000,
        unique: true,
        required: true
    },
    email: {
        type: String,
        maxlength: 324,
        unique: true,
        required: true
    },
    userInviteCode: {
        id: {
            type: Schema.Types.ObjectId,
            ref: "Coupon"
        },
        code: {
            type: String
        },
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    phoneNumber: {
        type: String,
        maxlength: 15
    },
    paymentIds: [{
        type: Schema.Types.ObjectId,
        ref: "Payment",
    }],
    amountSpent: {
        type: Number,
    },
    tripsTaken: {
        type: Number,
        default: 0
    }
},
{
    timestamps: true
});


async function getCustomers(pageNumber) {
    try {
        let customers = await Customer.find({}).sort({ "$natural": -1 });
        if (!customers) {
            return ({ status: 0, message: "No Customers Found!" });
        }
        return ({ status: 1, customers: customers });
    }
    catch (err) {
        return ({ status: 0, message: err.message });
    }
}

async function getCustomer(customerId) {
    try {
        let customer = await Customer.find({ _id: customerId });
        if (!customer) {
            return ({ status: 0, message: "No Customer Found!" });
        }
        return ({ status: 1, customer: customer });
    }
    catch (err) {
        return ({ status: 0, message: err });
    }
}

const Customer = mongoose.model('Customer', customerSchema);

// Customer.findOne({ email: "admin@hirebus.in" }).then((data) => {
//     if (!data) {
//         Customer.create({
//             email: "admin@hirebus.in",
//             uid: "4gb5pUKxhEg8pkrRpl64tXss8m82",
//             firstName: "Hirebus Admin",
//             isAdmin: true
//         });
//         console.log("Master Admin Created")
//     }
// }).catch((error) => console.log(error));

module.exports = {
    Customer,
    getCustomers,
    getCustomer
};