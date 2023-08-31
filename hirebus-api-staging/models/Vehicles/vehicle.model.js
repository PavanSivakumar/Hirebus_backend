const _ = require('lodash')
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { Trip } = require("../Trips/trip.model");
const moment = require('moment')

let vehicleSchema = new Schema({
  vehicleId: {
    type: String,
  },
  placeOfOrigin: {
    type: String,
  },
  busPlateNumber: {
    type: String,
    required: true,
  },
  busType: {
    type: String,
    required: true,
  },
  leftSeatSize: {
    type: Number,
  },
  rightSeatSize: {
    type: Number,
  },
  instructions: [
    {
      type: String,
    },
  ],
  vehicleName: {
    type: String,
    maxlength: 200,
    required: true,
  },
  seatCapacity: {
    type: Number,
  },
  facilities: [
    {
      type: String,
    },
  ],
  busImages: [
    {
      type: String
    },
  ],
  about: {
    type: String,
  },
  packages: [{
    type: Schema.Types.ObjectId,
    ref: "Package",
  }],
  cancellationPolicies: [{
    type: Schema.Types.ObjectId,
    ref: "CancellationPolicy",
  }],
  travelAgencyNumber: {
    type: String,
    maxlength: 20
  },
  travelAgencyName: {
    type: String,
    required: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "Vendor",
  },
  isEnabled: {
    type: Boolean,
    default: true,
  },
});



async function getVehicles(
  placeOfOrigin,
  passengers,
  pageNumber,
  isAC,
  busType,
  startDate,
  startTime,
  returnDate,
  returnTime
) {

  let body = {
    placeOfOrigin: placeOfOrigin,
    isEnabled: true,
    seatCapacity: { $gte: passengers },
    packages: { $gt: [] }
  };

  if (busType !== undefined && !_.isEmpty(busType)) {
    body = {
      ...body,
      busType: busType,
    }
  }

  let s = moment(`${startDate} ${startTime}`, 'DD-MM-YYYY HH:mm');
  let e = moment(`${returnDate} ${returnTime}`, 'DD-MM-YYYY HH:mm');


  let result = await Vehicle.find({ ...body })
    .populate("owner packages cancellationPolicies")
    .populate({ path: "owner", populate: { path: "vehicles" } })
    .populate({ path: "owner", populate: { path: "vehicles", populate: [{ path: "packages" }, { path: "cancellationPolicies" }] } })
    .sort({ $natural: -1 })
    .limit(15);

  let filteredVehicles = [];

  console.log('checking.... isAC..', isAC)

  if (!_.isEmpty(result)) {
     await Promise.all(_.filter(result, (item) => {
      if (!_.isUndefined(isAC))
        return !_.isEmpty(_.filter(item.packages, ['isAc', isAC]));
      return true;
    })
      .map(async (item) => {
    
        if (!_.isEmpty(item.packages)) {

          let hasMinDuration = false;
          let packageCount = 0;
          item.packages.forEach((package) => {
            if(package.minimumDuration <= (e.diff(s) / 3600000) ){
              packageCount++;
            }
          })

          hasMinDuration = packageCount == item.packages.length;

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
            ], busDetails: item._id
          });

          let hasTrip = false;

          //check whether the vehicle has any trips on the requested time duration
          if (!_.isEmpty(trips)) {
            await trips.map(async (trip) => {
              let start = moment(`${trip.departureDate} ${trip.departureTime}`, 'DD-MM-YYYY HH:mm');
              let end = moment(`${trip.returnDate} ${trip.returnTime}`, 'DD-MM-YYYY HH:mm').add({ hours: 11, minutes: 59 });          

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
          // console.log('hastrip,,,,', hasTrip)
          //if no trips means, filtering the vehilce
          if (!hasTrip && hasMinDuration) {
            filteredVehicles.push(item);
          }
        }

      }));

    return filteredVehicles;
  }

  return [];
}



async function getVehicle(vehicleId, cb) {
  try {
    Vehicle.findOne({ _id: vehicleId })
      .populate("owner packages cancellationPolicies")
      .exec((err, resp) => {
        if (err || !resp) return cb({ status: 0, message: "No Vehicles Found!" });
        return cb({ status: 1, vehicle: resp });
      });
  } catch (err) {
    return cb({ status: 0, message: err });
  }
}

const Vehicle = mongoose.model("Vehicle", vehicleSchema);
module.exports = {
  Vehicle,
  getVehicles,
  getVehicle,
};
