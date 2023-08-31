const mongoose = require('mongoose');
const _ = require('lodash');
const { getDaysDifference } = require('../../utils');
const { getTrip } = require('../Trips/trip.model');
const { getLogger } = require('nodemailer/lib/shared');
const { PublicCoupon } = require('../Coupons/publicCoupon.model');
const { Package } = require('../Packages/package');
const { getSettings } = require('../Settings/settings.model');
const Schema = mongoose.Schema;

let pricingSchema = new Schema({
    maxHours: {
        type: Number,
    },
    maxKms: {
        type: Number,
    },
    cost: {
        type: Number,
    }
});

async function  getAllPricing(req) {
    let {
        tripId,
    } = req || {};

    try {
        let trip = await getTrip(tripId);
        if (trip.status != 1) return ({ status: 0, message: trip.message });
        trip = trip.trip;
        let perDayCoverage = await getSettings();
        let totalKms = _.get(trip, 'estimatedDistInKm', 0);
        let totalHours = _.get(trip, 'bookingDuration', 0);
        let extraDistance = _.get(trip, 'extraDistance', 0);
        let extraDuration = _.get(trip, 'extraDuration', 0);
        let endExtraCost = _.get(trip, 'endExtraCost', 0);
        let perDayRent = _.get(trip, 'packageChosen.perDayRent', 0);
        let extraCostPerKm = _.get(trip, 'packageChosen.extraCostPerKm', 0);
        let costPerKm = _.get(trip, 'packageChosen.costPerKm', 0);
        let extraCostPerHour = _.get(trip, 'packageChosen.extraCostPerHour', 0);
        let startDate = _.get(trip, 'departureDate');
        let publicCouponApplied = _.get(trip, 'publicCouponApplied');
        let startTime = _.get(trip, 'departureTime');
        let returnDate = _.get(trip, 'returnDate');
        let returnTime = _.get(trip, 'returnTime');
        let totalGST = _.get(trip, 'GST');
        let additionalCosts = _.get(trip, 'additionalCosts', []);
        let advanceAmount = _.get(trip, 'packageChosen.advanceAmount', 0);
        let driverAllowance = _.get(trip, 'packageChosen.driverAllowance', 0);
        let securityDepositToCollect = _.get(trip, 'packageChosen.securityDepositToCollect', 0);
        let mileage = _.get(trip, 'packageChosen.mileage', 0);
        let coverage = _.get(trip, 'packageChosen.perDayCoverage', (perDayCoverage?.settings?.perDayCoverage ?? 350));
        let paymentIds = _.get(trip, 'paymentIds', 0);
        let amountPaid = 0
        if (!_.isEmpty(paymentIds)) {
            paymentIds.map((item) => {
                amountPaid += item.status === 'PAID' ? (item.amount ?? 0) : 0;
            })
        }


        console.log("publicCouponApplied...", publicCouponApplied);
        console.log("totalKms...", totalKms);
        console.log("totalHours...", totalHours);
        console.log("perDayRent...", perDayRent);
        console.log("extraCostPerKm...", extraCostPerKm);
        console.log("startDate...", startDate);
        console.log("startTime...", startTime);
        console.log("returnDate...", returnDate);
        console.log("returnTime...", returnTime);
        console.log("additionalCosts...", additionalCosts);
        console.log("advanceAmount...", advanceAmount);
        console.log("driverAllowance...", driverAllowance);
        console.log("securityDepositToCollect...", securityDepositToCollect);
        console.log("amountPaid...", amountPaid);
        console.log("mileage...", mileage);
        console.log("coverage...", coverage);

        let noOfDays = getDaysDifference(
            startDate,
            startTime,
            returnDate,
            returnTime,
        );


        if (totalKms > coverage) {
            let totalPrice = (totalKms * costPerKm)
            console.log("totalKms...", totalKms);
            console.log("costPerKm...", costPerKm);
            console.log("totalPrice...", totalPrice);

            let couponAmt = 0;
            let discount = 0;

            let couponResponse = await PublicCoupon.findOne({ _id: publicCouponApplied });

            if (!_.isEmpty(publicCouponApplied) && !_.isEmpty(couponResponse)) {
                couponAmt += couponResponse.isPercentage ? (couponResponse.discount * 0.01 * totalPrice) :
                    (couponResponse.discount);
                discount = couponResponse.discount;
            }

            console.log("couponAmt...", couponAmt);
            console.log("discount...", discount);

            securityDepositToCollect = totalPrice * securityDepositToCollect * 0.01;
            driverAllowance = (noOfDays * driverAllowance);
            let gst = 0.05 * (totalPrice + securityDepositToCollect + 
                driverAllowance);
            advanceAmount = totalPrice * advanceAmount * 0.01;

            return ({
                status: 1,
                pricing: {
                    exceedCoverage: totalKms > coverage,
                    basePrice: totalPrice,
                    additionalCosts: additionalCosts,
                    couponAmt: couponAmt,
                    perDayRent: perDayRent,
                    couponId: publicCouponApplied,
                    discount: discount,
                    advanceAmount: advanceAmount,
                    driverAllowance: driverAllowance,
                    securityDepositToCollect: securityDepositToCollect,
                    amountPaid: amountPaid,
                    //petrolCost: (totalKms / mileage) * 100,
                    petrolCost: 0,
                    gst: gst,
                    extraCostPerKm: extraCostPerKm,
                    extraCostPerHour: extraCostPerHour,
                    totalCost: (totalPrice + driverAllowance + securityDepositToCollect +
                        gst - couponAmt + endExtraCost),
                    remainingAmount: (totalPrice + driverAllowance + securityDepositToCollect +
                        gst - couponAmt + endExtraCost) - amountPaid,
                    package: _.get(trip, 'packageChosen', {}),
                    extraDistance: extraDistance,
                    extraDistanceCost: extraDistance * extraCostPerKm,
                    totalDistanceTravelled: Number(totalKms) + Number(extraDistance),
                    extraDuration: extraDuration,
                    extraDurationCost: extraDuration * extraCostPerHour,
                    endExtraCost: endExtraCost,
                },
                trip: trip,
            });
        }
        else {
            let totalPrice = (perDayRent * noOfDays)

            console.log("totalPrice...", totalPrice);
            let couponAmt = 0;
            let discount = 0;

            let couponResponse = await PublicCoupon.findOne({ _id: publicCouponApplied });

            if (!_.isEmpty(publicCouponApplied) && !_.isEmpty(couponResponse)) {
                couponAmt += couponResponse.isPercentage ? (couponResponse.discount * 0.01 * totalPrice) :
                (couponResponse.discount);
                discount = couponResponse.discount;
            }

            console.log("couponAmt...", couponAmt);
            console.log("discount...", discount);

            securityDepositToCollect = totalPrice * securityDepositToCollect * 0.01;
            driverAllowance = (noOfDays * driverAllowance);
            let gst = 0.05 * (totalPrice + securityDepositToCollect + 
                driverAllowance + ((totalKms / mileage) * 100));
            advanceAmount = totalPrice * advanceAmount * 0.01;

            return ({
                status: 1,
                pricing: {
                    exceedCoverage: totalKms > coverage,
                    basePrice: totalPrice,
                    additionalCosts: additionalCosts,
                    advanceAmount: advanceAmount,
                    couponAmt: couponAmt,
                    discount: discount,
                    perDayRent: perDayRent,
                    couponId: publicCouponApplied,
                    driverAllowance: driverAllowance,
                    securityDepositToCollect: securityDepositToCollect,
                    petrolCost: (totalKms / mileage) * 100,
                    gst: gst,
                    extraCostPerKm: extraCostPerKm,
                    extraCostPerHour: extraCostPerHour,
                    totalCost: (totalPrice + driverAllowance + 
                        securityDepositToCollect +
                        ((totalKms / mileage) * 100) + gst - 
                        couponAmt + endExtraCost),
                    package: _.get(trip, 'packageChosen', {}),
                    amountPaid: amountPaid,
                    remainingAmount: (totalPrice + driverAllowance + securityDepositToCollect +
                        ((totalKms / mileage) * 100) + gst - couponAmt + endExtraCost) - amountPaid,
                    totalDistanceTravelled: Number(totalKms) + Number(extraDistance),
                    extraDistance: extraDistance,
                    extraDistanceCost: extraDistance * extraCostPerKm,
                    extraDuration: extraDuration,
                    extraDurationCost: extraDuration * extraCostPerHour,
                    endExtraCost: endExtraCost,
                },
                trip: trip,
            });
        }
    }
    catch (err) {
        return ({ status: 0, message: err.message });
    }
}

async function getTempPricing(req) {
    let {
        tripId,
        packageId,
    } = req || {};

    try {
        let trip = await getTrip(tripId);
        let package = await Package.findOne({ _id: packageId });
        console.log('package... ', package)
        if (trip.status != 1) return ({ status: 0, message: trip.message });
        if (!package || _.isEmpty(package)) return ({ status: 0, message: "Invalid Package" });
        trip = trip.trip;
        let perDayCoverage = await getSettings();
        let totalKms = _.get(trip, 'estimatedDistInKm', 0);
        let totalHours = _.get(trip, 'bookingDuration', 0);
        let perDayRent = _.get(package, 'perDayRent', 0);
        let extraCostPerKm = _.get(package, 'extraCostPerKm', 0);
        let costPerKm = _.get(package, 'costPerKm', 0);
        let extraCostPerHour = _.get(package, 'extraCostPerHour', 0);
        let startDate = _.get(trip, 'departureDate');
        let publicCouponApplied = _.get(trip, 'publicCouponApplied');
        let startTime = _.get(trip, 'departureTime');
        let returnDate = _.get(trip, 'returnDate');
        let returnTime = _.get(trip, 'returnTime');
        let additionalCosts = _.get(trip, 'additionalCosts', []);
        let advanceAmount = _.get(package, 'advanceAmount', 0);
        let driverAllowance = _.get(package, 'driverAllowance', 0);
        let securityDepositToCollect = _.get(package, 'securityDepositToCollect', 0);
        let mileage = _.get(package, 'mileage', 0);
        let coverage = _.get(trip, 'packageChosen.perDayCoverage', (perDayCoverage?.settings?.perDayCoverage ?? 350));


        console.log("publicCouponApplied...", publicCouponApplied);
        console.log("totalKms...", totalKms);
        console.log("totalHours...", totalHours);
        console.log("perDayRent...", perDayRent);
        console.log("extraCostPerKm...", extraCostPerKm);
        console.log("startDate...", startDate);
        console.log("startTime...", startTime);
        console.log("returnDate...", returnDate);
        console.log("returnTime...", returnTime);
        console.log("additionalCosts...", additionalCosts);
        console.log("advanceAmount...", advanceAmount);
        console.log("driverAllowance...", driverAllowance);
        console.log("securityDepositToCollect...", securityDepositToCollect);
        console.log("mileage...", mileage);
        console.log("coverage...", coverage);

        let noOfDays = getDaysDifference(
            startDate,
            startTime,
            returnDate,
            returnTime,
        );


        if (totalKms > coverage) {
            let totalPrice = (totalKms * costPerKm)
            console.log("totalKms...", totalKms);
            console.log("costPerKm...", costPerKm);
            console.log("totalPrice...", totalPrice);

            let couponAmt = 0;
            let discount = 0;

            let couponResponse = await PublicCoupon.findOne({ _id: publicCouponApplied });

            if (!_.isEmpty(publicCouponApplied) && !_.isEmpty(couponResponse)) {
                couponAmt += couponResponse.isPercentage ? (couponResponse.discount * 0.01 * totalPrice) :
                (couponResponse.discount);
                discount = couponResponse.discount;
            }

            console.log("couponAmt...", couponAmt);
            console.log("discount...", discount);

            securityDepositToCollect = totalPrice * securityDepositToCollect * 0.01;
            driverAllowance = (noOfDays * driverAllowance);
            let gst = 0.05 * (totalPrice + securityDepositToCollect + driverAllowance);
            advanceAmount = totalPrice * advanceAmount * 0.01;

            return ({
                status: 1,
                pricing: {
                    basePrice: totalPrice,
                    additionalCosts: additionalCosts,
                    couponAmt: couponAmt,
                    perDayRent: perDayRent,
                    couponId: publicCouponApplied,
                    discount: discount,
                    advanceAmount: advanceAmount,
                    driverAllowance: driverAllowance,
                    securityDepositToCollect: securityDepositToCollect,
                    //petrolCost: (totalKms / mileage) * 100,
                    petrolCost: 0,
                    gst: gst,
                    extraCostPerKm: extraCostPerKm,
                    extraCostPerHour: extraCostPerHour,
                    totalCost: (totalPrice + driverAllowance + securityDepositToCollect + gst - couponAmt),
                    package: package,
                },

                trip: trip,
            });
        } else {
            let totalPrice = (perDayRent * noOfDays)

            console.log("totalPrice...", totalPrice);
            let couponAmt = 0;
            let discount = 0;

            let couponResponse = await PublicCoupon.findOne({ _id: publicCouponApplied });

            if (!_.isEmpty(publicCouponApplied) && !_.isEmpty(couponResponse)) {
                couponAmt += couponResponse.isPercentage ? (couponResponse.discount * 0.01 * totalPrice) :
                (couponResponse.discount);
                discount = couponResponse.discount;
            }

            console.log("couponAmt...", couponAmt);
            console.log("discount...", discount);

            securityDepositToCollect = totalPrice * securityDepositToCollect * 0.01;
            driverAllowance = (noOfDays * driverAllowance);
            let gst = 0.05 * (totalPrice + securityDepositToCollect + driverAllowance + ((totalKms / mileage) * 100));
            advanceAmount = totalPrice * advanceAmount * 0.01;

            return ({
                status: 1,
                pricing: {
                    basePrice: totalPrice,
                    perDayRent: perDayRent,
                    additionalCosts: additionalCosts,
                    advanceAmount: advanceAmount,
                    couponAmt: couponAmt,
                    discount: discount,
                    couponId: publicCouponApplied,
                    driverAllowance: driverAllowance,
                    securityDepositToCollect: securityDepositToCollect,
                    petrolCost: (totalKms / mileage) * 100,
                    gst: gst,
                    extraCostPerKm: extraCostPerKm,
                    extraCostPerHour: extraCostPerHour,
                    totalCost: (totalPrice + driverAllowance + securityDepositToCollect +
                        ((totalKms / mileage) * 100) + gst - couponAmt),
                    package: package,
                },
                trip: trip,
            });
        }
    }
    catch (err) {
        return ({ status: 0, message: err.message });
    }
}

const Pricing = mongoose.model('Pricing', pricingSchema);
module.exports = {
    Pricing,
    getAllPricing,
    getTempPricing
}