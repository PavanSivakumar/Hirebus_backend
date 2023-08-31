const express = require("express");
mongoose = require("mongoose");
const _ = require('lodash')
const moment = require('moment');

const {
  Customer,
  getCustomer,
  updateCustomerProfile,
} = require("../../models/Users/customer.model");

const {
  Company,
  getCompanies,
  getAllowedDates,
} = require("../../models/Companies/company.model");

const {
  getPilgrimages,
} = require("../../models/Pilgrimages/pilgrimage.model");

const { getCities } = require("./../../models/Cities/city.model");

const {
  Trip,
  createTrip,
  updateTrip,
  updateTripStatus,
  getTrip,
  updateTripInfo,
  updateTripStatusWithCoupon,
} = require("../../models/Trips/trip.model");

const {
  Vehicle,
  getVehicles,
  getVehicle,
} = require("../../models/Vehicles/vehicle.model");

const {
  CancellationPolicy
} = require("../../models/CancellationPolicy/cancellationpolicy.model");

const {
  Package
} = require("../../models/Packages/package");

const { Coupon, createCoupon } = require("../../models/Coupons/coupon.model");

const {
  insertCouponHistory,
} = require("../../models/Coupons/couponHistory.model");

const { Vendor } = require("../../models/Vendors/vendor.model");
const { capturePayment } = require("../helpers/payment");
const { getDistance } = require("../helpers/distance");

const {
  addVendorEarning,
} = require("../../models/vendorEarnings/vendorEarning");

const { PublicCoupon, getDetailsWithCouponId } = require("../../models/Coupons/publicCoupon.model");

const cors = require("../cors");
const { getNumberId } = require("../helpers/randomId");
const { getAllPricing, getTempPricing } = require("../../models/Pricing/pricing.model");
const { getDriverAllowance } = require("../../utils");
const { editCouponWithId } = require("../../models/Coupons/publicCoupon.model");
let customerRouter = express.Router();



const removeEnquiries = async () => {
  try {
    console.log('deleting enquired trips....')
    const filter = {
      status: 0,
      enquiryTime: {
        $lt: Date.parse(new Date(Date.now() - 24 * 60 * 60 * 1000)) // 24 hours ago
      }
    };

    const result = await Trip.deleteMany(filter);
    console.log(`${result.deletedCount} trips deleted`);
  } catch (err) {
    console.error(err);
  }
}

// try {
// setInterval(removeEnquiries, 1000);
// }
// catch (err) {
//   console.error(err);
// }

customerRouter.post("/login", cors.cors, async (req, res) => {
  let {
    email,
    userImageURL,
    firstName,
    lastName,
    uid,
    phoneNumber,
    pushToken,
  } = req.body || {};
  let user = await Customer.findOne({ email: email });
  if (user) {
    await Customer.findOne({ _id: user._id }, (err, customer) => {
      if (err) return res.status(500).send({ status: 0, message: err });
      else
        return res.status(200).send({
          status: 2,
          message: "user already Exists",
          customer: customer,
        });
    });
  } else {
    let tempUser = await Customer.findOne({ uid: uid });
    if (tempUser) {
      return res.status(500).send({
        status: 0,
        message: "You can't log in with someone else's account!",
      });
    }
    let couponObj;
    await getNumberId(true, (numId) => {
      if (numId.status === 0) return res.status(500).send({ status: 0, message: "Coupon could not be found!" });
      let coupon = numId.s;
      couponObj = {
        couponCode: coupon,
        discount: 100,
        phoneNumber: phoneNumber,
      };
    });
    try {
      await createCoupon(couponObj, (resp) => {
        if (resp.status === 1) {
          let customerObject = {
            email: email,
            uid: uid,
            firstName: firstName,
            lastName: lastName,
            userImageURL: userImageURL,
            emailVerified: false,
            pushTokens: [pushToken],
            phoneNumber: phoneNumber,
            userInviteCode: {
              id: resp.coupon._id,
              code: resp.coupon.couponCode,
            },
          };
          try {
            new Customer(customerObject)
              .save()
              .then((customer) => {
                if (!customer) return res.status(500).send({ status: 0, message: "Customer not saved!" });
                // TODO: update pushToken here
                return res.status(200).send({
                  status: 1,
                  message: "Customer Created",
                  customer: customer,
                });
              })
              .catch((err) => {
                return res.status(500).send({ status: 0, message: err });
              });
          } catch (err) {
            return res.status(500).send({ status: 0, message: err });
          }
        } else
          return res
            .status(500)
            .send({ status: resp.status, message: resp.message });
      });
    } catch (err) {
      return res
        .status(500)
        .send({ status: 0, message: err ?? "failed to create customer" });
    }
  }
});





customerRouter.post("/getProfile", cors.cors, async (req, res) => {
  // TODO GET PROFILE
  try {
    let { customerId } = req.body || {};
    let myCustomerResult = await getCustomer(customerId);
    if (!myCustomerResult) {
      return res.status(500).send({ status: 0, message: "Customer not found!" });
    } else if (!myCustomerResult["status"]) {
      return res
        .status(500)
        .send({ status: 0, customer: null, message: err.message });
    }
    return res.status(200).send({ status: 0, customer: myCustomerResult });
  } catch (err) {
    return res
      .status(500)
      .send({ status: 0, customer: null, message: err.message });
  }
});




customerRouter.post("/updateProfile", cors.cors, async (req, res) => {
  // TODO UPDATE PROFILE 
  // TODO IN CUSTOMER MODEL DOC
  let updatedFlag = false;
  try {
    let {
      customerId,
      firstName,
      lastName,
      email,
      phoneNumber,
      phoneCountryCode,
    } = req.body || {};

    let myReqBodyToUpdate = {
      _id: customerId,
      firstName: firstName,
      lastName: lastName,
      email: email,
      userImageURL: userImageURL,
      phoneNumber: phoneNumber,
      phoneCountryCode: phoneCountryCode,
    };

    let myCustomerResult = await updateCustomerProfile(myReqBodyToUpdate);
    if (myCustomerResult.status === 0) {
      return res.status(500).send({ status: 0, message: "Error while updating customer profile!" });
    }
    return res.status(200).send(myCustomerResult);
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .send({ status: 0, updated: updatedFlag, message: err.message });
  }
});




customerRouter.post("/deleteAccount", cors.cors, async (req, res) => {
  try {
    let { customerIdToDelete, iWantToDelete } = req.body || {};
    let deletedStatus;
    if (iWantToDelete === true && req._uid) {
      deletedStatus = await Customer.findOneAndDelete({
        _id: customerIdToDelete,
        uid: req._uid,
      });
    }
    if (deletedStatus) {
      return res.status(200).send({ status: 1, data: deletedStatus });
    } else {
      let err = new Error(
        "There was an error while deleting, please try again later."
      );
      return res.status(500).send({ status: 0, message: err });
    }
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .send({ status: 0, data: null, message: err.message });
  }
});





customerRouter.post("/getCompanyPage", cors.cors, async (req, res) => {
  try {
    Company.distinct("preferredBranches").exec((err, result) => {
      if (err) return res.status(500).send({ status: 0, message: err });
      Company.distinct("cityName").exec((err2, result2) => {
        if (err2) return res.status(500).send({ status: 0, message: err2 });
        Company.find({})
          .sort({ $natural: -1 })
          .limit(20)
          .exec((err3, result3) => {
            if (err3) return res.status(500).send({ status: 0, message: err3 });
            return res.status(500).send({
              status: 1,
              cities: result2,
              branches: result,
              companies: result3,
            });
          });
      });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





customerRouter.post("/getCompanies", cors.cors, async (req, res) => {
  try {
    let { city, dept, pageNumber } = req.body || {};
    let docs = await getCompanies(city, dept, pageNumber);
    if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
    return res.status(200).send({ status: 1, companies: docs.companies });
  } catch (err) {
    return res.status(500).send({ status: 0, error: err });
  }
});





customerRouter.post("/getAllowedDates", cors.cors, async (req, res) => {
  let { companyId } = req.body || {};
  try {
    await getAllowedDates(companyId, (docs) => {
      if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
      return res.status(200).send({ status: 1, allowedDates: docs.dates });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





customerRouter.post("/getPilgrimages", cors.cors, async (req, res) => {
  try {
    let { state, pageNumber } = req.body || {};
    let docs = await getPilgrimages(state, pageNumber);
    if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
    return res.status(200).send({ status: 1, pilgrimages: docs.pilgrimages });
  } catch (err) {
    return res.status(500).send({ status: 0, error: err.message });
  }
});




customerRouter.post("/getCities", cors.cors, async (req, res) => {
  try {
    let { state, pageNumber } = req.body || {};
    let docs = await getCities(state, pageNumber);
    if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
    return res.status(200).send({ status: 1, cities: docs.cities });
  } catch (err) {
    return res.status(500).send({ status: 0, error: err.message });
  }
});




customerRouter.post("/updateTripInfo", cors.cors, async (req, res) => {
  let {
    tripId,
    startDate,
    destinationDate,
    endDate,
    startTime,
    destinationTime, //new
    endTime,
    passengerNumber,
    startLocation,
    endLocation,
    stopsLocations,
  } = req.body
  try {
    await updateTripInfo(
      tripId,
      startDate,
      destinationDate,
      endDate,
      startTime,
      destinationTime, //new
      endTime,
      passengerNumber,
      startLocation,
      endLocation,
      stopsLocations,
      (docs) => {
        if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
        return res.status(200).send({ status: 1, trips: docs.trip });
      });
  } catch (err) {
    return res.status(500).send({ status: 0, error: err.message });
  }
});




function getDifferenceInTimeByHours(startDate, endDate, startTime, endTime) {
  let start = moment(startDate + ' ' + startTime.split(":")[0].padStart(2, "0") + ':' + startTime.split(":")[1].padStart(2, "0"), 'DD-MM-YYYY HH:mm'); //todays date
  let end = moment(endDate + ' ' + endTime.split(":")[0].padStart(2, "0") + ':' + endTime.split(":")[1].padStart(2, "0"), 'DD-MM-YYYY HH:mm');
  let duration = moment.duration(end.diff(start));
  let hours = duration.asHours();
  return hours;
}





customerRouter.post("/createTripEnquiry", cors.cors, async (req, res) => {
  let {
    customerId,
    startDate,
    title,
    destinationDate, //new
    endDate,
    startTime,
    destinationTime, //new
    endTime,
    roundTrip,
    companyInfo,
    passengerNumber,
    startLocation,
    endLocation,
    stopsLocations,
  } = req.body || {};
  let enquiryTime = Date.parse(new Date());
  let diffinHours = getDifferenceInTimeByHours(
    startDate,
    destinationDate,
    startTime,
    destinationTime
  ) + getDifferenceInTimeByHours(
    destinationDate,
    endDate,
    destinationTime,
    endTime,
  );

  let totalDistance = 0;
  let tripObj;
  await getNumberId(false, (numId) => {
    if (numId.status === 0) return res.status(500).send({ status: 0, message: "Trip could not be saved!" });
    let id = numId.s;
    tripObj = {
      customerId: customerId,
      tripId: id,
      title: title,
      enquiryTime: enquiryTime,
      status: 0,
      departureDate: startDate,
      departureTime: startTime,
      destinationDate: destinationDate,
      destinationTime: destinationTime,
      returnDate: endDate,
      returnTime: endTime,
      companyInfo: companyInfo,
      passengerNumber: passengerNumber,
      roundTrip: roundTrip,
      startLocation: startLocation,
      stopsLocation: stopsLocations,
      endLocation: endLocation,
      estimatedDistInKm: totalDistance,
      bookingDuration: diffinHours,
      additionalCosts: [],
      tripCost: 0,
      remainingAmount: 0,
    };
  });





  // TODO:
  // 1. If roundTrip, End Location will be same as start Location ( whileSavingToModel)
  // 2.  and Distance will be twice of computation generated
  // 3. If roundTrip is false -> endLocation and stopLocations[lastIndex] will be same (coming fine)
  //
  try {
    let lastOrigin = startLocation;
    stopsLocations.push(endLocation);
    let locations = [];
    locations.push({ a: lastOrigin, b: stopsLocations[0] });
    for (let i = 1; i < stopsLocations.length; i++) {
      locations.push({ a: stopsLocations[i - 1], b: stopsLocations[i] });
    }
    await getDistance(locations, (data) => {
      if (data.status === 0)
        return res.status(500).send({ status: 0, message: "Distance could not be calculated!" });
      if (roundTrip) {
        tripObj.estimatedDistInKm = data.totalDistance * 2 + 10;
        tripObj.endLocation = tripObj.startLocation;
      } else {
        tripObj.estimatedDistInKm = data.totalDistance;
      }
      tripObj.estimatedDistInKm = Math.round(tripObj.estimatedDistInKm);
      createTrip(tripObj, (docs) => {
        if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
        return res.status(200).send({ status: 1, trips: docs.trip });
      });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});






customerRouter.post("/getVehicles", cors.cors, async (req, res) => {
  let { tripId, pageNumber, isAC, busType } = req.body || {};
  console.log('body....', req.body)
  try {
    let tripInfo = await Trip.findOne({ _id: tripId },
      "estimatedDistInKm startLocation passengerNumber departureDate departureTime returnDate returnTime")

    if (_.isEmpty(tripInfo)) {
      return res.status(500).send({ status: 0, message: "Trip not found!" });
    }

    let result = await getVehicles(
      tripInfo.startLocation.cityName,
      tripInfo.passengerNumber,
      pageNumber,
      isAC,
      busType,
      tripInfo.departureDate,
      tripInfo.departureTime,
      tripInfo.returnDate,
      tripInfo.returnTime,
    );

    if (_.isEmpty(result)) return res.status(500).send({ status: 0, message: "Vehicles not found!" });
    else {
      return res.status(200).send({
        //result,
        status: 1,
        totalDist: tripInfo.estimatedDistinKm,
        vehicles: result,
      });
    }

  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





customerRouter.post("/getVehicleDetails", cors.cors, async (req, res) => {
  let { vehicleId } = req.body || {};
  try {
    await getVehicle(vehicleId, (docs) => {
      if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
      return res.status(200).send({ status: 1, vehicle: docs.vehicle });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




// customerRouter.post("/saveVehicleForATrip", cors.cors, async (req, res) => {
//   let { tripId, vehicleId } = req.body || {};
//   // Set Vehicle ID to this  tripID, and based on VehcileCost/km and securityDeposit
//   //  if(vehcileId and vehcielId != currentVechiled)
//   // set that as TripCost, remainingCost
//   try {
//     const trip = await Trip.findById(tripId);
//     if (!trip) {
//       return res.status(404).json({ status: 0, message: "Trip Not Found!" });
//     }
//     const vehicle = await Vehicle.findById(vehicleId);
//     if (!vehicle) {
//       return res.status(404).json({ status: 0, message: "Vehicle Not Found!" });
//     }
//     if (trip.busDetails.toString() !== vehicleId) {
//       const amount = trip.estimatedDistInKm * vehicle.costPerKm;
//       let costArray = [
//         {
//           description: "Security Deposit To Collect",
//           amount: vehicle.securityDepositToCollect,
//         },
//         {
//           description: "Base Travel Cost",
//           amount: amount,
//         },
//       ];
//       trip.busDetails = vehicleId;
//       trip.tripCost = amount + amount / 20 + vehicle.securityDepositToCollect;
//       trip.GST = amount / 20;
//       trip.securityDeposit = vehicle.securityDepositToCollect;
//       trip.additionalCosts = [...costArray];
//       trip.driverAllowance = getDriverAllowance(trip.departureDate, trip.departureTime, trip.returnDate, trip.returnTime);
//       trip.baseFare = amount;
//       trip.partialAmountToPay = 0.1 * trip.tripCost;
//       trip.remainingAmount = amount + amount / 20 + vehicle.securityDepositToCollect;
//       await trip.save();
//       return res
//         .status(200)
//         .json({ status: 1, message: "Trip has been updated", trip });
//     } else {
//       return res
//         .status(200)
//         .json({ status: 1, message: "Trip has been updated", trip });
//     }
//   } catch (err) {
//     console.log("Error in trip Update: " + JSON.stringify(err));
//     return res.status(500).send({ status: 0, message: err });
//   }
// });








customerRouter.post(
  "/saveVehicleAndPackageForTrip",
  cors.cors,
  async (req, res) => {
    let { tripId, vehicleId, packageId } = req.body || {};
    try {

      let trip = await Trip.findOneAndUpdate({ _id: tripId },
        { $set: { busDetails: vehicleId, packageChosen: packageId } }).
        populate("packageChosen");

      if (_.isEmpty(trip)) {
        return res
          .status(500)
          .send({ status: 0, message: "Trip Not Found!" })
      }

      console.log('updated...', trip)

      let amount = await getAllPricing({
        tripId: trip._id,
      });

      console.log('amount...', amount)

      if (!amount || amount.status !== 1) return ({ status: 0, message: "Unable to save Package!" });

      amount = amount.pricing;

      //Additional Payments
      let costArray = [
        {
          description: "Security Deposit To Collect",
          amount: _.get(amount, 'securityDepositToCollect', 0)
        },
        {
          description: "Driver Allowance",
          amount: _.get(amount, 'driverAllowance', 0),
        },
        {
          description: "GST",
          amount: _.get(amount, 'gst', 0),
        },
        {
          description: "Fuel Cost",
          amount: _.get(amount, 'petrolCost', 0),
        }
      ];

      let tripInfo = await Trip.findOneAndUpdate(
        { _id: tripId },
        {
          $set: {
            CBC: 0,
            driverAllowance: _.get(amount, 'driverAllowance', 0),
            baseFare: _.get(amount, 'basePrice', 0),
            GST: _.get(amount, 'gst', 0),
            partialAmountToPay: _.get(amount, 'advanceAmount', 0),
            securityDeposit: _.get(amount, 'securityDepositToCollect', 0),
            tripCost: _.get(amount, 'totalCost', 0),
            remainingAmount: _.get(amount, 'totalCost', 0),
            additionalCosts: costArray,
          },
        }
      )

      if (_.isEmpty(tripInfo)) {
        return res
          .status(200)
          .send({ status: 0, message: "Trip has not been updated!" });
      }
      return res
        .status(200)
        .send({ status: 1, message: "Trip has been updated!" });

    } catch (err) {
      console.log("Error in trip Update: ", err);
      return res.status(500).send({ status: 0, message: err });
    }
  }
);






// authenticate.verifyFirebaseUser,
customerRouter.post("/couponApply", cors.cors, async (req, res) => {
  let { couponId, tripId } = req.body || {};
  try {
    let publicCouponResponse = await getDetailsWithCouponId({ couponId: couponId });
    if (!_.isEmpty(publicCouponResponse)) {

      // let coupon = await PublicCoupon.findOneAndUpdate({ _id: couponId },
      //   { $set: { enability: false } });

      let trip = await Trip.findOne({ _id: tripId })
      console.log(publicCouponResponse.customers)
      console.log(trip)
      if (publicCouponResponse.isPrivate && publicCouponResponse.customers.indexOf(trip.customerId) < 0) {
        return res.status(500).send({ status: 0, message: "Coupon not available! Please select another one!" });
      } else if (publicCouponResponse.isPrivate && publicCouponResponse.customers.indexOf(trip.customerId) >= 0 && publicCouponResponse.usedCustomers.indexOf(trip.customerId) >= 0) {
        return res.status(500).send({ status: 0, message: "Coupon already used! Please select another one!" });
      } else if (moment(publicCouponResponse.expiresOn).isSameOrBefore(moment())) {
        return res.status(500).send({ status: 0, message: "Coupon expired! Please select another one!" });
      }

      trip = await Trip.findOneAndUpdate({ _id: tripId },
        { $set: { publicCouponApplied: couponId } });

      if (!_.isEmpty(trip))
        return res.status(200).send({ status: 1, coupon: publicCouponResponse });
      return res.status(500).send({ status: 0, message: "Couldn't able to apply coupon" });
    }

    return res.status(500).send({ status: 0, message: "Couldn't able to apply coupon2" });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





// NOt Requred, but go through to understand
customerRouter.post("/proceedToPayment", cors.cors, async (req, res) => {
  let { tripId } = req.body || {};
  try {
    Trip.findOne({ _id: tripId }).exec((err, trip) => {
      if (err || !trip)
        return res
          .status(500)
          .send({ status: 0, message: err || "Trip not found!" });
      return res.status(200).send({ status: 1, trip: trip });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





customerRouter.post("/paymentMade", cors.cors, async (req, res) => {
  let {
    tripId,
    phoneNumber,
    userId,
    isPublic,
    couponId,
    totalAmount,
    description,
    amountPaid,
    rzp_paymentId,
    name,
    address,
  } = req.body || {};

  console.log('body........', req.body)

  if (!description) {
    description = "Payment for Trip";
  }

  let trip = await getTrip(tripId);
  trip = trip.trip;



  let couponAmt = 0;
  if (!_.isEmpty(couponId)) {
    let publicCouponResponse = await PublicCoupon.findOne({ _id: couponId });
    if (!_.isEmpty(couponId) && !_.isEmpty(publicCouponResponse)) {
      let coupon = await PublicCoupon.findOneAndUpdate({ _id: couponId },
        {
          $push: {
            usedCustomers: trip.customerId,
          },
        });
      if (!_.isEmpty(coupon)) {
        couponAmt += publicCouponResponse.isPercentage ? (publicCouponResponse.discount * 0.01 * totalAmount) :
          publicCouponResponse.discount;
      }
    }
  }


  if (rzp_paymentId) {
    await capturePayment(
      rzp_paymentId,
      userId,
      tripId,
      (amountPaid),
      description,
      (payment) => {
        if (payment.status === 1 || payment.status === 2) {
          let paymentId = payment.id;
          console.log('CAPTURING PAYMENT ..................');
          console.log("totalCost...", totalAmount);
          console.log("totalCost...", typeof totalAmount);
          console.log("amountPaid...", amountPaid);
          console.log("couponAmt...", couponAmt);
          console.log("amountPaid - couponAmt...", amountPaid - couponAmt);
          console.log("amountPaid...", typeof amountPaid);
          try {
            updateTrip(
              tripId,
              totalAmount,
              phoneNumber,
              name,
              address,
              amountPaid,
              1,
              _.isEmpty(couponId) ? null : "couponApplied",
              couponId,
              paymentId,
              (trip) => {
                if (trip.status === 0) return res.status(500).send({ status: 0, message: trip.message });

                Trip.findOne({ _id: tripId }).exec((err, trip) => {
                  if (err || !trip) return res.status(500).send({ status: 0, message: "Trip not found!" });
                  getVehicle(trip.busDetails, (docs) => {
                    if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
                    if (!_.isEmpty(docs.vehicle.owner)) {
                      console.log("amt...", typeof amountPaid);
                      let vendorEarningObj = {
                        vendor: docs.vehicle.owner._id,
                        trip: tripId,
                        amount: amountPaid,
                        transactionDate: new Date(),
                        customer: userId,
                      };
                      addVendorEarning(vendorEarningObj, (earning) => {
                        if (earning.status === 0)
                          return res.status(500).send({ status: 0, message: earning.message });
                      });
                      Vendor.findOneAndUpdate(
                        { _id: docs.vehicle.owner },
                        { $inc: { amountEarned: amountPaid } } // this should also increase to totalCost once tirp Ends
                      ).exec((err, resp) => {
                        if (err) return res.status(500).send({ status: 0, message: err });
                        if (!resp)
                          return res.status(500).send({ status: 0, message: "Earnings of vendor could not be added!" });
                      });
                    }
                    Customer.findOneAndUpdate(
                      { _id: userId },
                      {
                        $push: { paymentIds: paymentId },
                        $inc: { amountSpent: amountPaid, tripsTaken: 1 },
                      }
                    ).exec((err, resp) => {
                      if (err || !resp) return res.status(500).send({ status: 0, message: "No user found!" });
                    });
                    let message = "Payment has been made";
                    if (payment.status === 2) message = "Payment is pending!";
                    return res
                      .status(200)
                      .send({ status: 1, message: message });
                  });
                });
              }
            );
          } catch (err) {
            return res.status(500).send({ status: 0, message: err });
          }
        } else {
          return res.status(500).send({ status: 0, message: payment.message });
        }
      }
    );
  } else {
    return res
      .status(500)
      .send({ status: 0, message: "No payment data found!" });
  }
});




customerRouter.post("/remainingPaymentMade", cors.cors, async (req, res) => {
  let {
    tripId,
    phoneNumber,
    name,
    address,
    userId,
    isPublic,
    couponId,
    totalAmount,
    description,
    amountPaid,
    rzp_paymentId,
  } = req.body || {};

  console.log({
    tripId,
    phoneNumber,
    name,
    address,
    userId,
    isPublic,
    couponId,
    totalAmount,
    description,
    amountPaid,
    rzp_paymentId,
  });

  if (!description) {
    description = "Payment for Trip";
  }

  let tripDetail = await Trip.findOne({ _id: tripId });

  if (!tripDetail) return res.status(500).send({ status: 0, message: "Trip not found!" });


  if (rzp_paymentId) {
    await capturePayment(
      rzp_paymentId,
      userId,
      tripId,
      (amountPaid),
      description,
      async (payment) => {
        if (payment.status === 1 || payment.status === 2) {
          let paymentId = payment.id;

          console.log("totalCost...", totalAmount);
          console.log("totalCost...", typeof totalAmount);
          console.log("amountPaid...", amountPaid);
          console.log("amountPaid...", typeof amountPaid);

          try {
            updateTrip(
              tripId,
              tripDetail.remainingAmount,
              phoneNumber,
              name,
              address,
              amountPaid,
              description == 'Remaining Amount' ? tripDetail.status : 1,
              null,
              null,
              paymentId,
              (trip) => {
                if (trip.status === 0) return res.status(500).send({ status: 0, message: trip.message });

                Trip.findOne({ _id: tripId }).exec((err, trip) => {
                  if (err || !trip) return res.status(500).send({ status: 0, message: "Trip not found!" });
                  getVehicle(trip.busDetails, (docs) => {
                    if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
                    if (!_.isEmpty(docs.vehicle.owner)) {
                      console.log("amt...", typeof amountPaid);
                      let vendorEarningObj = {
                        vendor: docs.vehicle.owner._id,
                        trip: tripId,
                        amount: amountPaid,
                        transactionDate: new Date(),
                        customer: userId,
                      };
                      addVendorEarning(vendorEarningObj, (earning) => {
                        if (earning.status === 0)
                          return res.status(500).send({ status: 0, message: earning.message });
                      });
                      Vendor.findOneAndUpdate(
                        { _id: docs.vehicle.owner },
                        { $inc: { amountEarned: amountPaid } } // this should also increase to totalCost once tirp Ends
                      ).exec((err, resp) => {
                        if (err) return res.status(500).send({ status: 0, message: err });
                        if (!resp)
                          return res.status(500).send({ status: 0, message: "Earnings of vendor could not be added!" });
                      });
                    }
                    Customer.findOneAndUpdate(
                      { _id: userId },
                      {
                        $push: { paymentIds: paymentId },
                        $inc: { amountSpent: amountPaid, tripsTaken: 1 },
                      }
                    ).exec((err, resp) => {
                      if (err || !resp) return res.status(500).send({ status: 0, message: "No user found!" });
                    });
                    let message = "Payment has been made";
                    if (payment.status === 2) message = "Payment is pending!";
                    return res
                      .status(200)
                      .send({ status: 1, message: message });
                  });
                });
              }
            );
          } catch (err) {
            return res.status(500).send({ status: 0, message: err });
          }
        } else {
          return res.status(500).send({ status: 0, message: payment.message });
        }
      }
    );
  } else {
    return res
      .status(500)
      .send({ status: 0, message: "No payment data found!" });
  }
});




customerRouter.post("/cancelTrip", cors.cors, async (req, res) => {
  let { tripId } = req.body || {};
  try {
    let body = { status: 5 };

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



customerRouter.post("/removeCoupon", cors.cors, async (req, res) => {
  let { tripId } = req.body || {};
  try {
    let body = { _id: tripId };

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


customerRouter.post("/getTripDetails", cors.cors, async (req, res) => {
  let { tripId } = req.body || {};
  try {
    let docs = await getTrip(tripId); //static function (get all details)
    if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
    return res.status(200).send({ status: 1, trip: docs.trip });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});


customerRouter.post("/deleteAllTrips", cors.cors, async (req, res) => {
  try {
    Trip.collection.remove();
    return res.status(200).send({ status: 1 });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});

customerRouter.post("/deleteAllVendors", cors.cors, async (req, res) => {
  try {
    Trip.collection.remove();
    Vendor.collection.remove();
    Vehicle.collection.remove();
    CancellationPolicy.collection.remove();
    Package.collection.remove();
    return res.status(200).send({ status: 1 });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});

customerRouter.post("/deleteAllCoupons", cors.cors, async (req, res) => {
  try {
    PublicCoupon.collection.remove();
    return res.status(200).send({ status: 1 });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





customerRouter.post("/getTripCostDetails", cors.cors, async (req, res) => {
  try {
    let docs = await getAllPricing(req.body || {});
    return res.status(200).send(docs);
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});



customerRouter.post("/getTempTripCostDetails", cors.cors, async (req, res) => {
  try {
    let docs = await getTempPricing(req.body || {});
    return res.status(200).send(docs);
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





customerRouter.post("/getUserTrips", cors.cors, async (req, res) => {
  let { customerId, pageNumber } = req.body || {};
  try {
    Trip.find({ customerId: customerId })
      .populate({
        path: "customerId",
        select: "email firstName lastName email phoneNumber",
      })
      .populate({ path: "busDetails", populate: { path: "owner" } })
      .populate({ path: "busDetails", model: 'Package' })
      .populate("packageChosen")
      // .populate("companyInfo.companyId")
      .populate("paymentIds")
      //.populate("customerId")
      //.populate("driverId")
      .populate({
        path: "driverId",
        select: "email firstName lastName email phoneNumber userImageURL vendorId",
      })
      .sort({ $natural: -1 })
      .skip(15 * pageNumber)
      .limit(15)
      .exec((err, trips) => {
        if (err) return res.status(500).send({ status: 0, message: err });
        if (!trips) return res.status(500).send({ status: 0, message: "Couldn't load trips!" });
        return res.status(200).send({ status: 1, trips: trips });
      });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





customerRouter.post("/getPayments", cors.cors, async (req, res) => {
  let { customerId, pageNumber } = req.body || {};
  try {
    Customer.findOne({ _id: customerId }, "paymentIds")
      .populate("paymentIds")
      .skip(15 * pageNumber)
      .limit(15)
      .exec((err, resp) => {
        if (err || !resp) return res.status(500).send({ status: 0, message: err || "No Payments found!" });
        return res.status(200).send({ status: 1, payments: resp.paymentIds });
      });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





module.exports = customerRouter;
