const express = require('express');
let router = express.Router();
let { sendOTP, verifyOTP } = require('../helpers/sendotp');
let { addVendorEarning } = require('../../models/vendorEarnings/vendorEarning');
let { Trip, updateTripStatus, updateTripStatusWithCoupon } = require('../../models/Trips/trip.model');
let { Vendor, getVendor } = require('../../models/Vendors/vendor.model');
const cors = require('../cors');
const { Driver, getDrivers, getDriversForVendor, getDriver } = require('../../models/Driver/driver.model');
const _ = require('lodash');
const { getAllPricing } = require('../../models/Pricing/pricing.model');
const moment = require('moment');
const { updateSettings, getSettings, Settings } = require("../../models/Settings/settings.model");
const { getDetailsWithCouponId, editCouponWithId } = require('../../models/Coupons/publicCoupon.model');

router.post('/addDriver', cors.cors, async (req, res) => {
    let { firstName, lastName, userImageURL, email, phoneNumber, vendorId, password } = req.body || {};
    try {
        let vendor = await Vendor.findOne({ _id: vendorId })
        if (!vendor || _.isEmpty(vendor)) {
            return res.status(500).send({ status: 0, message: "Vendor not found!" });
        } else {
            let tempDriver = await Driver.findOne({ phoneNumber: phoneNumber });

            if (tempDriver) {
                return res.status(500).send({ status: 0, message: "Driver already found" });
            }

            new Driver({
                firstName: firstName,
                lastName: lastName,
                userImageURL: userImageURL,
                email: email,
                phoneNumber: phoneNumber,
                vendorId: vendorId,
                password: password,
            })
                .save()
                .then((driver) => {
                    if (!driver) return res.status(500).send({ status: 0, message: "Driver not saved!" });
                    return res.status(200).send({
                        status: 1,
                        message: "Driver Created",
                        driver: driver,
                    });
                })
                .catch((err) => {
                    console.log('err')
                    return res.status(500).send({ status: 0, message: "Email already found!" });
                });
        }
    } catch (err) {
        console.log('err2')
        return res.status(500).send({ status: 0, message: err });
    }
})




router.post("/editDriver", async (req, res) => {
    let {
        firstName, lastName, userImageURL, email, phoneNumber, vendorId, driverId
    } = req.body || {};
    const driverObj = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        userImageURL: userImageURL,
        phoneNumber: phoneNumber,
        vendorId: vendorId,
    };

    try {

        let vendor = await Vendor.findOne({ _id: vendorId })
        if (!vendor || _.isEmpty(vendor)) {
            return res.status(500).send({ status: 0, message: "Vendor not found!" });
        }

        Driver.findOneAndUpdate({ _id: driverId }, driverObj).exec(
            (err, driver) => {
                if (err) return res.status(500).send({ status: 0, message: err });
                if (!driver) return res.status(500).send({ status: 0, message: "Couldn't find Driver!" });
                else return res.status(200).send({ status: 1, driver: driver });
            }
        );
    } catch (err) {
        return res.status(500).send({ status: 0, message: err });
    }
});




// router.post("/cancelTrip", cors.cors, async (req, res) => {
//     let { tripId } = req.body || {};
//     try {
//         await updateTripStatus(tripId, 8, (trip) => {
//             console.log("trip...", trip);
//             if (trip.status === 0) return res.status(500).send({ status: 0, message: trip.message });
//             return res.status(200).send({ status: 1, trip: trip.trip });
//         }); //static function (get all details)
//     } catch (err) {
//         return res.status(500).send({ status: 0, message: err });
//     }
// });


router.post("/cancelTrip", cors.cors, async (req, res) => {
    let { tripId } = req.body || {};
    try {
      let body = { status: 8 };
  
      let tripInfo = await Trip.findOne({ _id: tripId });
  
      console.log("tripInfo...", tripInfo);
  
      if (tripInfo.publicCouponApplied != null && !_.isEmpty(tripInfo.publicCouponApplied)) {
        console.log('coupon applied')
        body.publicCouponApplied = null
        let coupon = await getDetailsWithCouponId({ couponId: tripInfo.publicCouponApplied })
        if (!_.isEmpty(coupon)) {
          console.log(coupon)
          coupon.usedCustomers.remove(tripInfo.customerId)
          console.log(coupon)
  
          await editCouponWithId(tripInfo.publicCouponApplied, {
            usedCustomers: coupon.usedCustomers,
          }, async (revokedCoupon) => {
            console.log('after coupon revoke....', revokedCoupon)
          })
        }
      }
  
      await updateTripStatusWithCoupon(tripId, body, async (trip) => {
  
        if (trip.status === 0) return res.status(500).send({ status: 0, message: trip.message });
        //publicCouponApplied - revoke
  
        return res.status(200).send({ status: 1, trip: trip.trip });
      }); //static function (get all details)
    } catch (err) {
      return res.status(500).send({ status: 0, message: err });
    }
  });




router.post("/getDrivers", async (req, res) => {
    let { pageNumber } = req.body || {};
    try {
        let drivers = await getDrivers(pageNumber);
        if (drivers.status === 0) return res.status(500).send({ status: 0, message: drivers.message });
        return res.status(200).send({ status: 1, drivers: drivers.drivers });
    } catch (err) {
        return res.status(500).send({ status: 0, message: err });
    }
});



router.post("/login", async (req, res) => {
    let { phoneNumber, password } = req.body || {};
    try {
        let vendor = await Vendor.findOne({ phoneNumber: phoneNumber, password: password });
        if (!vendor || _.isEmpty(vendor))
            return res.status(500).send({ status: 0, message: "Invalid Login" });
        return res.status(200).send({ status: 1, vendor: vendor });
    } catch (err) {
        return res.status(500).send({ status: 0, message: err });
    }
});



router.post("/getDriversForVendor", async (req, res) => {
    let { pageNumber, vendorId } = req.body || {};
    try {
        let vendor = await Vendor.findOne({ _id: vendorId })
        if (_.isEmpty(vendor)) {
            return res.status(500).send({ status: 0, message: "Vendor not found!" });
        } else {
            let drivers = await Driver.find({ vendorId: vendorId })
                .populate({
                    path: "vendorId",
                    select: "firstName lastName phoneNumber",
                })
                .sort({ "$natural": -1 })
            // .skip(15 * pageNumber).limit(15);
            console.log("else", drivers)
            if (!drivers) return res.status(500).send({ status: 0, message: "No Drivers Found for this Vendor!" });
            return res.status(200).send({ status: 1, drivers: drivers });
        }
    } catch (err) {
        return res.status(500).send({ status: 0, message: "err22" });
    }
});


router.post("/getDriversAvailableForTrip", async (req, res) => {
    let {
        pageNumber,
        vendorId,
        tripId
    } = req.body || {}

    try {
        let vendor = await Vendor.findOne({ _id: vendorId })
        if (_.isEmpty(vendor)) {
            return res.status(500).send({ status: 0, message: "Vendor not found!" });
        } else {
            let tripInfo = await Trip.findOne({
                _id: tripId, $or: [
                    {
                        status: 1,
                    },
                    {
                        status: 2,
                    },]
            },
                "estimatedDistInKm startLocation passengerNumber departureDate departureTime returnDate returnTime")

            if (_.isEmpty(tripInfo)) {
                return res.status(500).send({ status: 0, message: "Trip not found!" });
            }

            let startDate = tripInfo.startDate
            let startTime = tripInfo.startTime
            let returnDate = tripInfo.returnDate
            let returnTime = tripInfo.returnTime

            let drivers = await Driver.find({ vendorId: vendorId })
                .populate({
                    path: "vendorId",
                    select: "firstName lastName phoneNumber",
                })
                .sort({ "$natural": -1 })
                // .skip(15 * pageNumber).limit(15);
            if (!drivers) return res.status(500).send({ status: 0, message: "No Drivers Found for this Vendor!" });

            let availableDrivers = []

            await Promise.all(_.map(drivers, async (item) => {
                let trips = await Trip.find({
                    $or: [
                        {
                            status: 1,
                        },
                        {
                            status: 2,
                        },
                        {
                            status: 3,
                        },
                        {
                            status: 4,
                        },
                    ], driverId: item._id,
                })

                let hasTrip = false

                if (!_.isEmpty(trips)) {
                    await trips.map(async (trip) => {
                        let start = moment(`${trip.departureDate} ${trip.departureTime}`, 'DD-MM-YYYY HH:mm');
                        let end = moment(`${trip.returnDate} ${trip.returnTime}`, 'DD-MM-YYYY HH:mm').add({ hours: 11, minutes: 59 });
                        //New
                        let s = moment(`${startDate} ${startTime}`, 'DD-MM-YYYY HH:mm');
                        let e = moment(`${returnDate} ${returnTime}`, 'DD-MM-YYYY HH:mm');

                        if (
                            (s.isSameOrAfter(start) && s.isSameOrBefore(end)) ||
                            (e.isSameOrAfter(start) && e.isSameOrBefore(end))
                        ) {
                            if (!hasTrip) {
                                hasTrip = true;
                            }
                        }
                    })
                }

                if (!hasTrip) {
                    availableDrivers.push(item)
                }
            }))

            return res.status(200).send({ status: 1, drivers: availableDrivers });
        }
    } catch (err) {
        return res.status(500).send({ status: 0, message: "err22" });
    }
});



router.post("/getVendor", async (req, res) => {
    let { vendorId } = req.body || {};
    try {
        let vendor = await getVendor(vendorId);
        if (vendor.status === 0) return res.status(500).send({ status: 0, message: vendor.message });
        return res.status(200).send({ status: 1, vendor: vendor.vendor });
    } catch (err) {
        return res.status(500).send({ status: 0, message: err });
    }
});



router.post("/getVendorTrips", async (req, res) => {
    let { vendorId, pageNumber } = req.body || {};
    try {
        let vehicles = await Vendor.findOne({ _id: vendorId })
        vehicles = vehicles.vehicles
        let tripResponse = await Trip.find({ busDetails: { $in: vehicles } },)
            //.populate('trips')
            .populate({
                path: "customerId",
                select: "email firstName lastName email phoneNumber",
            })
            .populate("busDetails")
            .populate("driverId")
            .populate({ path: "busDetails", populate: { path: "owner" } })
            .populate("packageChosen")
            .populate("companyInfo.companyId")
            .populate("paymentIds")
            //.sort({ "$natural": -1 })
            // .skip(15 * pageNumber).limit(15)
            .exec().then((trips) => {
                //console.log('rs...', trips);
                if (!trips || !trips) {
                    throw new Error("No Trips found for the requested driver!");
                    // return res.status(500).send({ status: 0, message: "No Trips found for the requested driver!" });
                }
                // return res.status(200).send({ status: 1, trips: trips });
                return trips;
            }).catch((err) => {
                throw new Error(err);
                // return res.status(500).send({ status: 0, message: err });
            });

        if (tripResponse.status === 0) throw new Error(tripResponse.message);

        let tripsList = [];

        await Promise.all(tripResponse.map(async (item) => {
            let pricing = await getAllPricing({ tripId: item._id });
            tripsList.push({
                details: item,
                pricing: pricing.pricing,
            });
        }));

        return res.status(200).send({
            status: 1,
            trips: tripsList,
        });
    } catch (err) {
        console.log(err)
        return res.status(500).send({ status: 0, message: err });
    }
});




router.post('/assignTripToDriver', cors.cors, async (req, res) => {
    let { tripId, driverId } = req.body;
    try {
        Trip.findOne({ $or: [{ $and: [{ status: 1 }, { _id: tripId }] }, { $and: [{ status: 2 }, { _id: tripId }] }] }).exec(async (err, resp) => {
            console.log('resp...', !resp)
            if (err || !resp)
                return res.status(500).send({ status: 0, message: err ?? "No Trip Exists or Driver already assigned!" });
            else {
                Trip.findOneAndUpdate(
                    { _id: tripId },
                    { $set: { driverId: driverId, status: 2 } } // this should also increase to totalCost once tirp Ends
                )
                    .exec((err, trip) => {
                        if (err)
                            throw err
                        else if (!trip)
                            throw "Driver could not be assigned!"
                    });
                console.log('Trip updated....');
                // await Driver.findByIdAndUpdate({
                //     _id: driverId
                // },
                //     {
                //         $addToSet: { trips: tripId },
                //     }
                // ).exec((err, trip) => {
                //     if (err) return res.status(500).send({ status: 0, message: err });
                //     if (!trip)
                //         return res.status(500).send({ status: 0, message: "Driver could not be updated!" });
                //     else return res.status(200).send({ status: 1, message: "Driver assigned!" });
                // });
                return res.status(200).send({ status: 1, message: "Driver assigned!" });
            }
        })
    } catch (err) {
        return res.status(500).send({ status: 0, message: err });
    }
})


// router.post('/startTrip', cors.cors, async (req, res) => {
//     let {tripId, odometer} = req.body;
//     try {
//         Trip.findOne({ _id: tripId }).exec((err, resp) => {
//             if (err || !resp) res.status(500).send({ status: 0, message: "No Trip Exists!" });
//             return res.status(200).send({ status: 1, phoneNumber: resp.phoneNumber, message: "OTP  has been sent!" });
//         })
//     } catch (err) {
//         return res.status(500).send({ status: 0, message: err });
//     }
// })





router.post('/verifyStartTrip', cors.cors, async (req, res) => {
    let { otp, tripId, odoMeterStartNumber, odoMeterStartScreenshotURL } = req.body || {};
    try {
        Trip.findOne({ _id: tripId }).exec((er, trip) => {
            if (er || !trip) return res.status(500).send({ status: 0, message: (er || "Trip not found!!") });
            Trip.findOneAndUpdate({ _id: tripId }, {
                $set: {
                    odoMeterStartNumber: odoMeterStartNumber,
                    odoMeterStartScreenshotURL: odoMeterStartScreenshotURL,
                    tripStartTime: Date.now(),
                    status: 3,
                }
            }).exec((err, resp) => {
                if (err || !resp) return res.status(500).send({ status: 0, message: "Couldn't start trip!" });
                return res.status(200).send({ status: 1, message: "Trip has been started!" });
            })
        });
    } catch (err) {
        return res.status(500).send({ status: 0, message: err });
    }
})





router.post('/collectedPayment', cors.cors, async (req, res) => {
    let { tripId, paymentCollected, amount, driverId } = req.body || {};
    try {
        if (!paymentCollected)
            return res.status(500).send({ status: 0, message: "Payment has not been collected" });

        let trip = await Trip.findOne({ _id: tripId, driverId: driverId });
        console.log(trip);
        if (!trip)
            return res.status(500).send({ status: 0, message: "Trip not found!" });

        if (amount < trip.remainingAmount) {
            return res.status(500).send({ status: 0, message: `Invalid Amount! You should collect Rs. ${trip.remainingAmount}!` });
        }

        Trip.findOneAndUpdate({ _id: tripId }, { $set: { remainingAmount: 0, status: 4 } }).populate('busDetails').exec((err, resp) => {
            if (err)
                return res.status(500).send({ status: 0, message: "Trip not found!" });

            let vendorEarningObj = {
                vendor: resp.busDetails.owner,
                trip: tripId,
                amount: amount,
                transactionDate: new Date(),
                customer: resp.customerId
            };

            addVendorEarning(vendorEarningObj, (earning) => {
                if (earning.status === 0) return res.status(500).send({ status: 0, message: earning.message });
            });

            Vendor.findOneAndUpdate({ _id: resp.busDetails.owner }, { $inc: { amountEarned: amount } })
                .exec((err, resp) => {
                    if (err) return res.status(500).send({ status: 0, message: err });
                    if (!resp)
                        return res.status(500).send({ status: 0, message: "Earnings of vendor could not be added!" });
                });

            return res.status(200).send({ status: 1, message: "Amount has been collected!" });
        })

    } catch (err) {
        return res.status(500).send({ status: 0, message: "Something went wrong. Try again!" });
    }
})



// router.post('/endTrip', cors.cors, async (req, res) => {
//     let tripId = req.query.tripId;
//     try {
//         Trip.findOne({ _id: tripId }).exec((err, resp) => {
//             if (err || !resp) return res.status(500).send({ status: 0, message: err || "Couldn't End Trip!" });
//             Trip.findOneAndUpdate({ _id: tripId }, { $set: { tripEndTime: Date.now(), status: 3 } }).exec((err2, resp2) => {
//                 if (err2 || !resp2) return res.status(500).send({ status: 0, message: err || "Couldn't update trip!" });
//                 return res.status(200).send({ status: 1, phoneNumber: resp.phoneNumber, message: "Trip Ended Successfully!" });
//             })
//         })
//     } catch (err) {
//         return res.status(500).send({ status: 0, message: err });
//     }
// })


router.post('/verifyEndTrip', cors.cors, async (req, res) => {
    let { otp, tripId, odoMeterEndNumber, odoMeterEndScreenshotURL, additionalCosts = [] } = req.body || {};

    let cost = 0;
    if (additionalCosts) {
        for (let i = 0; i < additionalCosts.length; i++) {
            cost += parseFloat(additionalCosts[i].amount);
        }
    }

    additionalCosts = additionalCosts.map((item) => {
        return {
            ...item,
            amount: parseFloat(item.amount)
        }
    })
    console.log('cost...', cost);
    console.log('additionalCosts...', additionalCosts);
    let extraTime = 0, extraDistance = 0;

    try {
        let trip = Trip.findOne({ _id: tripId });

        if (!trip)
            return res.status(500).send({ status: 0, message: "Trip not found!" });

        Trip.findOneAndUpdate({ _id: tripId }, {
            odoMeterEndNumber: odoMeterEndNumber,
            odoMeterEndScreenshotURL: odoMeterEndScreenshotURL,
            tripEndTime: Date.now(),
            status: 7,
            $push: {
                additionalCosts: additionalCosts,
            },
            $inc: {
                remainingAmount: cost,
                tripCost: cost,
            }
        }).then((resp) => {
            //console.log('resp', resp)
            if (!resp) return res.status(500).send({ status: 0, message: "Couldn't update trip" });
            try {
                Trip.findOne({ _id: tripId }).populate('packageChosen').exec(async (err, trip) => {
                    if (err || !trip)
                        return res.status(500).send({ status: 0, message: "Trip not found!" });

                    extraTime = ((trip.tripEndTime - trip.tripStartTime) / 3600000 - (trip.bookingDuration)); // hours

                    extraDistance = trip.odoMeterEndNumber - trip.odoMeterStartNumber - trip.estimatedDistInKm; // kms

                    console.log('extraTime...', extraTime)
                    console.log('extraTime...', typeof extraTime)
                    console.log('extraDistance...', typeof extraDistance)
                    console.log('extraDistance...', extraDistance)

                    let extraCost = 0;
                    let perDayCoverage = await getSettings();
                    let coverage = _.get(trip, 'packageChosen.perDayCoverage', (perDayCoverage?.settings?.perDayCoverage ?? 350));
                    if (trip.estimatedDistInKm > coverage) {
                        // (hours * Extra cost per hour) + (kms * Extra cost per km)
                        console.log('(hours * Extra cost per hour) ', (extraTime * trip.packageChosen.extraCostPerHour))
                        console.log('(kms * Extra cost per km) ', (extraDistance * trip.packageChosen.extraCostPerKm))
                        extraCost = (extraTime * trip.packageChosen.extraCostPerHour) + (extraDistance * trip.packageChosen.extraCostPerKm);
                    } else {
                        // (days * Per Day Rent) + (kms * petrol cost)
                        console.log('(days * Per Day Rent) ', (Math.ceil(extraTime / 24)))
                        console.log('(kms * petrol cost) ', ((extraDistance / trip.packageChosen.mileage) * 100))
                        extraCost = (Math.ceil(extraTime / 24) * trip.packageChosen.perDayRent) + ((extraDistance / trip.packageChosen.mileage) * 100);
                    }

                    console.log('extraCost...', typeof extraCost)
                    console.log('extraCost...', extraCost)

                    let extraDriverAllowance = (trip.packageChosen.driverAllowance * Math.ceil(extraTime / 24));
                    console.log('extraDriverAllowance...', extraDriverAllowance)

                    // $push: {
                    //     additionalCosts: additionalCosts,
                    // },
                    // $inc: {
                    //     remainingAmount: cost,
                    //     tripCost: cost,
                    // }

                    let extraGST = ((extraCost + extraDriverAllowance + cost) * 0.05);

                    Trip.findOneAndUpdate({ _id: tripId }, {
                        $inc: {
                            remainingAmount: extraCost + extraDriverAllowance + extraGST + cost,
                            tripCost: extraCost + extraDriverAllowance + extraGST + cost,
                            GST: extraGST,
                        },
                        $push: {
                            additionalCosts: [
                                { 'description': 'Extra cost', amount: extraCost },
                                { 'description': 'Extra Driver Allowance', amount: extraDriverAllowance },
                                { 'description': 'Extra GST', amount: extraGST },
                            ]
                        },
                        $set: {
                            extraDistance: extraDistance,
                            extraDuration: extraTime,
                            endExtraCost: cost + extraCost + extraDriverAllowance + extraGST,
                        }
                    }).exec((err2, resp) => {

                        if (err2 || !resp) {
                            console.log("Error" + JSON.stringify(err2))
                            console.log("Resposne " + JSON.stringify(resp))
                            return res.status(500).send({ status: 0, message: err2 });
                        }

                        let fareBreakup = trip.additionalCosts;

                        fareBreakup.push({ 'description': 'Extra cost', amount: extraCost },
                            { 'description': 'Extra Driver Allowance', amount: extraDriverAllowance },);

                        if (trip.remainingAmount + extraCost + extraDriverAllowance + extraGST < 0) {
                            Trip.findOneAndUpdate({ _id: tripId },
                                { remainingAmount: 0, refund: - (trip.remainingAmount + extraCost + extraDriverAllowance + extraGST) },
                                (err3, data) => {
                                    if (err3 || !data) return res.status(500).send({ status: 0, message: err3 || "Error while updating trip! Try again later!" });
                                    return res.status(200).send({ status: 1, fareBreakup: fareBreakup, refund: -(trip.remainingAmount + extraCost + extraDriverAllowance + extraGST), remainingAmount: 0 });
                                });
                        }
                        else {
                            return res.status(200).send({ status: 1, fareBreakup: fareBreakup, refund: 0, remainingAmount: (trip.remainingAmount + extraCost + extraDriverAllowance + extraGST) });
                        }

                    })
                })
            } catch (err) {
                return res.status(500).send({ status: 0, message: err });
            }
        }).catch((err) => {
            return res.status(500).send({ status: 0, message: err });
        })

    } catch (err) {
        return res.status(500).send({ status: 0, message: err });
    }
})





// router.post('/getFare', cors.cors, async (req, res) => {
//     let { tripId } = req.body || {};
//     try {
//         Trip.findOne({ _id: tripId }).exec((err, trip) => {
//             if (err || !trip) return res.status(500).send({ status: 0, message: "Trip not found!" });
//             res.status(200).send({ status: 1, trip: trip, fareBreakup: trip.additionalCosts, refund: trip.refund, remainingAmount: trip.remainingAmount });
//         })
//     } catch (err) {
//         return res.status(500).send({ status: 0, message: err });
//     }
// })




// // TODO: 
// router.post("/fullpaymentCollected", (req, res) => {
//     // udpate tripStatus : to completed 
//     // send thank you mail to customer
// });





// router.post('/refund', cors.cors, async (req, res) => {
//     let { tripId } = req.body || {};
//     try {
//         Trip.findOneAndUpdate({ _id: tripId }, { refund: 0 }).populate('busDetails').exec((err, resp) => {
//             if (err || !resp) return res.status(500).send({ status: 0, message: "Amount not refunded" });
//             console.log(resp);
//             let vendorEarningObj = {
//                 vendor: resp.busDetails.owner,
//                 trip: tripId,
//                 amount: - resp.refund,
//                 transactionDate: new Date(),
//                 customer: resp.customerId
//             };

//             addVendorEarning(vendorEarningObj, (earning) => {
//                 if (earning.status === 0) throw new Error(earning.message);
//             });

//             Vendor.findOneAndUpdate({ _id: resp.busDetails.owner }, { $inc: { amountEarned: - resp.refund } })
//                 .exec((err, resp) => {
//                     if (err) return res.status(500).send({ status: 0, message: err });
//                     if (!resp)
//                         return res.status(500).send({ status: 0, message: "Earnings of vendor could not be added!" });
//                 });
//             return res.status(200).send({ status: 1, message: "Amount has been refunded!" });
//         })
//     } catch (err) {
//         return res.status(500).send({ status: 0, message: err });
//     }
// })





module.exports = router;
