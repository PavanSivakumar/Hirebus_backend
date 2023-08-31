const mongoose = require("mongoose");
const { PublicCoupon } = require("../Coupons/publicCoupon.model");
const { Vendor } = require("../Vendors/vendor.model");
const Schema = mongoose.Schema;
var Float = require("mongoose-float").loadType(mongoose);
const _ = require('lodash')
const moment = require('moment');
const { getDistance } = require("../../routes/helpers/distance");

let tripSchema = new Schema({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: "Customer",
  },
  busDetails: {
    type: Schema.Types.ObjectId,
    ref: "Vehicle",
  },
  packageChosen: {
    type: Schema.Types.ObjectId,
    ref: "Package",
  },
  couponApplied: {
    type: Schema.Types.ObjectId,
    ref: "Coupon",
  },
  publicCouponApplied: {
    type: Schema.Types.ObjectId,
    ref: "PublicCoupon",
  },
  tripId: {
    type: String,
  },
  title: {
    type: String,
    required: true,
    maxlength: 300,
  },
  phoneNumber: {
    type: String,
  },
  address: {
    type: String,
  },
  name: {
    type: String,
  },
  enquiryTime: {
    type: Number, //Date.parse( stringDate) <-> new Date(parsedDate)
  },
  status: {
    type: Number,
  },
  departureDate: {
    type: String,
    required: true,
  },
  departureTime: {
    type: String,
    required: true,
  },
  destinationDate: {
    type: String,
    required: true,
  },
  destinationTime: {
    type: String,
    required: true,
  },
  returnDate: {
    type: String,
    required: true,
  },
  returnTime: {
    type: String,
    required: true,
  },
  passengerNumber: {
    type: Number,
    required: true,
  },
  roundTrip: {
    type: Boolean,
    required: true,
  },
  companyInfo: {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
    },
    chosenDate: {
      type: String,
    },
    people: {
      type: Number,
    },
  },
  startLocation: {
    name: {
      type: String,
    },
    cityName: {
      type: String,
    },
    lat: {
      type: String,
    },
    lng: {
      type: String,
    },
  },
  stopsLocation: [
    {
      name: {
        type: String,
      },
      lat: {
        type: String,
      },
      lng: {
        type: String,
      },
      date: {
        type: String,
      },
      time: {
        type: String,
      },
    },
  ],
  endLocation: {
    name: {
      type: String,
    },
    lat: {
      type: String,
    },
    lng: {
      type: String,
    },
  },
  city: {
    type: Number,
  },
  bookingDuration: {
    type: Number,
  },
  estimatedDistInKm: {
    type: Number,
    default: 0,
  },
  tripCost: {
    type: Number,
    default: 0,
  },
  baseFare: {
    type: Number,
  },
  GST: {
    type: Number,
  },
  securityDeposit: {
    type: Number,
  },
  driverAllowance: {
    type: Number,
  },
  driverId: {
    type: Schema.Types.ObjectId,
    ref: "Driver",
  },
  partialAmountToPay: {
    type: Number,
  },
  remainingAmount: {
    type: Number,
    default: 0,
  },
  additionalCosts: [
    {
      description: {
        type: String,
      },
      amount: {
        type: Number,
      },
    },
  ],
  CBC: {
    type: Number,
    default: 0,
  },
  refund: {
    type: Number,
    defualt: 0,
  },
  endExtraCost: {
    type: Number,
  },
  paymentIds: [
    {
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },
  ],
  extraDistance: {
    type: Number,
  },
  extraDuration: {
    type: Number,
  },
  tripStartTime: {
    type: Number,
  },
  tripEndTime: {
    type: Number,
  },
  odoMeterStartNumber: {
    type: Number,
  },
  odoMeterStartScreenshotURL: {
    type: String,
  },
  odoMeterEndNumber: {
    type: Number,
  },
  odoMeterEndScreenshotURL: {
    type: String,
  },
});

async function createTrip(tripObj, cb) {
  try {
    let trip = await new Trip(tripObj).save();
    trip = await trip.populate({
      path: "customerId",
      select: "email firstName lastName email phoneNumber busDetails owner packageChosen packages",
    })
      .populate({ path: "busDetails", populate: { path: "owner" } })
      .populate({ path: "busDetails", model: 'Package' })
      .populate("packageChosen")
      .populate("companyInfo.companyId").execPopulate();
    if (!trip) cb({ status: 0, message: "Trip has not been registered yet!" })
    cb({ status: 1, trip: trip });
  } catch (err) {
    cb({ status: 0, message: err });
  }
}

async function updateTrip(
  tripId,
  totalAmount,
  phoneNumber,
  name,
  address,
  amountPaid,
  tripStatus,
  field,
  couponId,
  paymentId,
  cb
) {
  let object;

  console.log("totalCost...", totalAmount);
  console.log("totalCost...", typeof totalAmount);
  console.log("amountPaid...", amountPaid);
  console.log("amountPaid...", typeof amountPaid);

  let couponAmt = 0;
  let discount = 0;

  if (field === "couponApplied" && !_.isEmpty(couponId)) {
    let couponResponse = await PublicCoupon.findOne({ _id: couponId });
    object = {
      status: tripStatus,
      phoneNumber: phoneNumber,
      address,
      name,
      // publicCouponApplied: couponId,
    };
    if (!_.isEmpty(couponResponse)) {
      couponAmt += couponResponse.isPercentage ? (couponResponse.discount * 0.01 * totalAmount) :
      (couponResponse.discount);
      discount = couponResponse.discount;
    }
  }

  if (field === null) {
    object = {
      status: tripStatus,
      phoneNumber: phoneNumber,
      address,
      name,
      // publicCouponApplied: null,
    };
  }

  try {
    Trip.findOneAndUpdate(
      { _id: tripId },
      {
        $set: {
          ...object, remainingAmount: totalAmount - amountPaid - couponAmt,
        },
        $push: {
          paymentIds: paymentId,
        },
      }
    ).exec((err, resp) => {
      if (err) {
        console.log(err);
        return cb({ status: 0, message: err });
      }
      if (!resp) return cb({ status: 0, message: "Something went wrong!" });
      return cb({ status: 1, trip: resp });
    });
  } catch (err) {
    return cb({ status: 0, message: err });
  }
}



function getDifferenceInTimeByHours(startDate, endDate, startTime, endTime) {
  let start = moment(startDate + ' ' + startTime.split(":")[0].padStart(2, "0") + ':' + startTime.split(":")[1].padStart(2, "0"), 'DD-MM-YYYY HH:mm'); //todays date
  let end = moment(endDate + ' ' + endTime.split(":")[0].padStart(2, "0") + ':' + endTime.split(":")[1].padStart(2, "0"), 'DD-MM-YYYY HH:mm');
  let duration = moment.duration(end.diff(start));
  let hours = duration.asHours();
  return hours;
}


async function updateTripInfo(
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
  cb,
) {
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

  try {

    let tripObj = {
      departureDate: startDate,
      departureTime: startTime,
      destinationDate: destinationDate,
      destinationTime: destinationTime,
      returnDate: endDate,
      returnTime: endTime,
      startLocation: startLocation,
      stopsLocation: stopsLocations,
      endLocation: endLocation,
      estimatedDistInKm: 0,
      bookingDuration: diffinHours,
      passengerNumber: passengerNumber
    }
    let lastOrigin = startLocation;
    tripObj.stopsLocation.push(endLocation);
    let locations = [];
    locations.push({ a: lastOrigin, b: tripObj.stopsLocation[0] });
    for (let i = 1; i < tripObj.stopsLocation.length; i++) {
      locations.push({ a: tripObj.stopsLocation[i - 1], b: tripObj.stopsLocation[i] });
    }
    console.log(locations)
    let distance = {}
    await getDistance(locations, (data) => {
      if (data.status === 0)
        return cb({ status: 0, message: "Distance could not be calculated!" });
      distance = data
    });
    if (distance.status === 0)
      return cb({ status: 0, message: "Distance could not be calculated!" });
    tripObj.estimatedDistInKm = Math.round(distance.totalDistance * 2 + 10);
    tripObj.endLocation = tripObj.startLocation;
    console.log(tripObj)
    console.log(tripId)
    Trip.findOneAndUpdate(
      { _id: tripId },
      {
        $set: {
          ...tripObj,
        },
      }
    ).populate({
      path: "customerId",
      select: "email firstName lastName email phoneNumber busDetails owner packageChosen packages",
    })
      .populate({ path: "busDetails", populate: { path: "owner" } })
      .populate({ path: "busDetails", model: 'Package' })
      .populate("packageChosen")
      .populate("companyInfo.companyId")
      .exec(async (err, resp) => {
        if (err) {
          console.log(err);
          return cb({ status: 0, message: err });
        }
        if (!resp) return cb({ status: 0, message: "Something went wrong!" });
        return cb({ status: 1, trip: resp });
      });
  } catch (err) {
    return cb({ status: 0, message: err });
  }
}


async function updateTripStatusWithCoupon(
  tripId,
  body,
  cb
) {
  try {
    Trip.findOneAndUpdate(
      { _id: tripId },
      {
        $set: body,
      }
    ).exec((err, resp) => {
      if (err) {
        return cb({ status: 0, message: err });
      }
      if (!resp) return cb({ status: 0, message: "Something went wrong!" });
      return cb({ status: 1, trip: resp });
    });
  } catch (err) {
    return cb({ status: 0, message: err });
  }
}

async function updateTripStatus(
  tripId,
  status,
  cb
) {
  try {
    Trip.findOneAndUpdate(
      { _id: tripId },
      {
        $set: { status: status },
      }
    ).exec((err, resp) => {
      if (err) {
        return cb({ status: 0, message: err });
      }
      if (!resp) return cb({ status: 0, message: "Something went wrong!" });
      return cb({ status: 1, trip: resp });
    });
  } catch (err) {
    return cb({ status: 0, message: err });
  }
}

async function getTrip(tripId) {
  try {
    let trip = await Trip.findOne({ _id: tripId })
      .populate({
        path: "customerId",
        select: "email firstName lastName email phoneNumber busDetails packageChosen paymentIds publicCouponApplied",
      })
      .populate({ path: "busDetails", populate: [{ path: "packages" }, { path: "cancellationPolicies" }, { path: "owner" }] })
      .populate("packageChosen")
      .populate("publicCouponApplied")
      // .populate("companyInfo.companyId")
      .populate("driverId")
      .populate("paymentIds")
      .exec();
    if (!trip) return { status: 0, message: "No trip found!" };
    var coupon = trip.publicCouponApplied
    trip.publicCouponApplied = coupon?._id
    let couponAmt = 0;

  if (!_.isEmpty(coupon?._id)) {
    let couponResponse = await PublicCoupon.findOne({ _id: coupon._id });
    if (!_.isEmpty(couponResponse)) {
      couponAmt += couponResponse.isPercentage ? (couponResponse.discount * 0.01 * trip.baseFare) :
      (couponResponse.discount);
    }
  }
    return { status: 1, trip: trip, couponAmt: couponAmt };
  } catch (err) {
    console.log(err)
    return { status: 0, message: err };
  }
}


async function getTripByCondition(props) {
  try {
    let trip = await Trip.find({ ...props })
      .populate({
        path: "customerId",
        select: "email firstName lastName email phoneNumber busDetails owner packageChosen packages paymentIds",
      })
      .populate({ path: "busDetails", populate: { path: "owner" } })
      .populate({ path: "busDetails", model: 'Package' })
      .populate("packageChosen")
      .populate("companyInfo.companyId")
      .populate("paymentIds")
      .exec();
    console.log('trip...', trip);
    if (!trip) return { status: 0, message: "Trip Not found!" };
    return { status: 1, trip: trip };
  } catch (err) {
    return { status: 0, message: err };
  }
}

async function getTrips(pageNumber, status) {
  try {
    let trips = await Trip.find({ status: status })
      .populate({ path: "customerId", select: "firstName lastName" })
      .sort({ $natural: -1 })
      .skip(15 * pageNumber)
      .limit(15)
      .exec();
    if (!trips) {
      return { status: 0, message: "Trip Not found!" };
    }
    return { status: 1, trips: trips };
  } catch (err) {
    return { status: 0, message: err };
  }
}

async function getTripsinDays(days) {
  let time = 1000 * 60 * 60 * 24 * (days + 1) + 1;
  let timeNow = Date.parse(new Date());
  time = timeNow - time;
  let revenue;
  try {
    let enquiry = await Trip.countDocuments({
      enquiryTime: { $gte: time },
      status: 0,
    });
    if (!enquiry) return { status: 0, message: "Counldn't count enquiry!" };
    let scheduled = await Trip.countDocuments({
      enquiryTime: { $gte: time },
      status: 1,
    })
      .then()
      .catch((err) => {
        return { status: 0, message: err };
      });
    let progress = await Trip.countDocuments({
      enquiryTime: { $gte: time },
      staus: 2,
    })
      .then()
      .catch((err) => {
        return { status: 0, message: err };
      });
    let completed = await Trip.countDocuments({
      enquiryTime: { $gte: time },
      staus: 3,
    })
      .then()
      .catch((err) => {
        return { status: 0, message: err };
      });
    await Trip.aggregate([
      { $match: { enquiryTime: { $gte: time } } },
      {
        $group: {
          _id: null,
          total: { $sum: "$tripCost" },
        },
      },
    ])
      .exec()
      .then((res) => {
        revenue = res;
      })
      .catch((err) => {
        if (err) return { status: 0, message: "Revenue not found!" };
      });
    return {
      status: 1,
      enquiry: enquiry,
      scheduled: scheduled,
      progress: progress,
      completed: completed,
      revenue: revenue[0].total,
    };
  } catch (err) {
    return { status: 0, message: err };
  }
}

const Trip = mongoose.model("Trip", tripSchema);
module.exports = {
  Trip,
  createTrip,
  updateTrip,
  updateTripStatus,
  getTrip,
  getTrips,
  getTripsinDays,
  getTripByCondition,
  updateTripInfo,
  updateTripStatusWithCoupon,
};
