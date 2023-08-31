const express = require("express");
const _ = require('lodash')
const moment = require('moment');
const multer = require('multer');
const path = require('path');
const { google } = require('googleapis');
const fs = require('fs');
const driveAuth = require('../../utils/drive.config');
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });
const {
  Vendor,
  getVehiclesForVendor,
  getVendors,
  getVendor,
  saveVehicleForVendor,
} = require("../../models/Vendors/vendor.model");

const {
  Customer,
  getCustomers,
  getCustomer,
} = require("../../models/Users/customer.model");

const { Vehicle } = require("../../models/Vehicles/vehicle.model");

const {
  Trip,
  getTripsinDays,
  getTrips,
  getTrip,
} = require("../../models/Trips/trip.model");

const {
  Company,
  addCompany,
  updateCompany,
  deleteCompany,
  setAllowedDates,
  getAllowedDates,
} = require("../../models/Companies/company.model");

const { getPayments } = require("../../models/Payments/payment.model");

const {
  getTopEarnings,
  addVendorEarning,
} = require("../../models/vendorEarnings/vendorEarning");

const {
  City,
  addCity,
  updateCity,
  deleteCity,
} = require("../../models/Cities/city.model");

const {
  Pilgrimage,
  addPilgrimage,
  updatePilgrimage,
  deletePilgrimage,
} = require("../../models/Pilgrimages/pilgrimage.model");

const { Package } = require("../../models/Packages/package");

const {
  CouponHistory,
  getAllCouponHistory,
} = require("../../models/Coupons/couponHistory.model");

const { MasterCity } = require("../../models/masterCity/masterCity.model");

const { getId } = require("../../routes/helpers/randomId");

const {
  PublicCoupon,
  createCoupon,
  getCouponWithId,
  getCoupons,
  editCouponWithId,
  deleteCouponWithId,
} = require("../../models/Coupons/publicCoupon.model");

const cors = require("../cors");
const authenticate = require("../authenticate");
const { Coupon, getCoupon } = require("../../models/Coupons/coupon.model");
const { CancellationPolicy } = require("../../models/CancellationPolicy/cancellationpolicy.model");
const { Driver } = require("../../models/Driver/driver.model");
const { updateSettings, getSettings, Settings } = require("../../models/Settings/settings.model");

let router = express.Router();

async function uploadImageToDrive(imagePath, fileName) {
  try {
    // const drive = google.drive({ version: 'v3', driveAuth });
    const drive = google.drive({
      version: 'v3',
      auth: driveAuth
    });
    const fileMetadata = {
      name: fileName, // Name of the image file
      // sarmila - 16z-6pugowheMCLRV3dcAHHK7hUlpIsRF
      parents: ['1KAq3Gmq1yirt34hpRyILAZLsV_wHDi1k'],  // ID of the folder in Google Drive where you want to store the image
    };

    const media = {
      mimeType: 'image/jpeg',
      body: fs.createReadStream(imagePath),
    };

    const res = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });
    console.log('Image uploaded successfully! File ID:', res.data.id);
    return { status: 1, image: `https://drive.google.com/uc?export=view&id=${res.data.id}` }
  } catch (er) {
    console.log('error')
    // return {status: 0, message: err}
  }
  return { status: 0, message: "Failed" }
}

router.post('/upload',
  upload.single('image'),
  async (req, res) => {
    try {
      // const fileUrl = `${req.protocol}://${req.get('host')}/v1/admin/${req.file.path}`;
      // const fileUrl = `${req.file.path}`;
      let img = await uploadImageToDrive(req.file.path, req.file.filename);
      if (img.status == 1) {
        return res.json({ status: 1, fileUrl: img.image, message: 'Image uploaded successfully' })
      } else {

      }
    } catch (err) {
      return res.json({ status: 0, message: 'Failed to upload! Try again later!' })
    }
  });

router.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  res.sendFile(filename, { root: 'uploads' });
});

router.post("/searchCity", async (req, res) => {
  let { str } = req.body || {};
  let s = "";
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "_") s += " ";
    else s += str[i];
    s += ".*";
  }
  try {
    MasterCity.find({ name: { $regex: s, $options: "i" } }, "name state")
      .limit(10)
      .exec((err, list) => {
        if (err) throw new Error(err);
        return res.status(200).send({ status: 1, cities: list });
      });
  } catch (err) {
    return res.sendStatus(500).send({ status: 0, message: err });
  }
});


router.get("/getAllCities", async (req, res) => {
  try {
    MasterCity.find({}, "name state")
      .exec((err, list) => {
        if (err) throw new Error(err);
        return res.status(200).send({ status: 1, cities: list });
      });
  } catch (err) {
    return res.sendStatus(500).send({ status: 0, message: err });
  }
});



router.post("/search", async (req, res) => {
  let { str } = req.body || {};
  let s = "";
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "_") s += " ";
    else s += str[i];
    s += ".*";
  }
  try {
    Customer.find(
      { "userInviteCode.code": { $regex: s, $options: "i" } },
      "firstName lastName userInviteCode"
    )
      .limit(10)
      .exec((err, list) => {
        if (err) throw new Error(err);
        Trip.find({ tripId: { $regex: s, $options: "i" } }, "tripId title")
          .limit(10)
          .exec((err2, list2) => {
            if (err2) throw new Error(err2);
            Vehicle.find(
              { vehicleId: { $regex: s, $options: "i" } },
              "vehicleId vehicleName"
            )
              .limit(10)
              .exec((err3, list3) => {
                if (err3) throw new Error(err3);
                Vendor.find(
                  { vendorId: { $regex: s, $options: "i" } },
                  "vendorId firstName lastName"
                )
                  .limit(10)
                  .exec((err4, list4) => {
                    if (err4) throw new Error(err4);
                    return res.status(200).send({
                      status: 1,
                      users: list,
                      trips: list2,
                      vehicles: list3,
                      vendors: list4,
                    });
                  });
              });
          });
      });
  } catch (err) {
    return res.sendStatus(500).send({ status: 0, message: err });
  }
});

// authenticate.verifyAdmin,

router.post("/login", async (req, res) => {
  let { email, password } = req.body || {};
  try {

    let admin = await Customer.findOne({ email: email });

    if (!admin) throw new Error("failed to login admin!");
    else if (password != 'master!admin@23') throw new Error("failed to login admin!");

    else if (admin && admin.isAdmin) {

      await Customer.findOne({ _id: admin._id })
        .then((tempAdmin) => {
          return res.status(200).send({ status: 1, admin: tempAdmin });
        })
        .catch((err) => {
          return res.status(404).send({ status: 0, message: "Invalid admin credentials!" });
        });

    } else {
      return res.status(404).send({ status: 0, message: "Invalid admin credentials!" });
    }
  } catch (err) {
    return res.status(500).send({ status: 0, message: "Invalid admin credentials!" });
  }
});




router.post("/getProfile", async (req, res) => {
  try {
    let { adminId } = req.body || {};
    let myAdminResult = await Customer.findOne({ _id: adminId });
    if (!myAdminResult) {
      return res.status(500).send({ status: 0, admin: null, message: "There was an error fetching admin profile." })
    }
    return res.status(200).send({ status: 1, admin: myAdminResult });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/updateProfile", async (req, res) => {
  try {
    let { adminId, firstName, lastName, email, phoneNumber } = req.body || {};

    let { userImageURL } = req.body || {};

    let myReqBodyToUpdate = {
      firstName: firstName,
      lastName: lastName,
      email: email,
      userImageURL: userImageURL,
      phoneNumber: phoneNumber,
    };

    let myAdminResult = await Customer.findOneAndUpdate(
      { _id: adminId },
      myReqBodyToUpdate
    );

    if (!myAdminResult) {
      return res.status(500).send({
        status: 0,
        updated: false,
        updatedData: null,
        admin: null,
        message: "There was an error while updating admin profile.",
      });
    }

    return res.status(200).send(myAdminResult);

  } catch (err) {

    console.log(err);

    return res.status(500).send({
      status: 0,
      updated: false,
      updatedData: null,
      admin: null,
      message: err.message,
    });
  }
});





router.post("/getDashboard", async (req, res) => {
  let arr = [7, 14, 30];
  let trips = [];
  let vendors, vehicles, companies, enquiredTrips, customers;
  try {
    try {
      vendors = await Vendor.countDocuments({});
    } catch (err) {
      return res.status(500).send({ status: 0, message: err });
    }
    try {
      vehicles = await Vehicle.countDocuments({});
    } catch (err) {
      return res.status(500).send({ status: 0, message: err });
    }
    try {
      companies = await Company.countDocuments({});
    } catch (err) {
      return res.status(500).send({ status: 0, message: err });
    }
    try {
      enquiredTrips = await Trip.countDocuments({ status: 0 });
    } catch (err) {
      return res.status(500).send({ status: 0, message: err });
    }

    try {
      enquiredList = await Trip.find({}, "tripId title customerId")
        .sort({ enquiryTime: -1 })
        .populate({
          path: "customerId",
          select: "firstName lastName phoneNumber userInviteCode",
        })
        .limit(10)
        .exec();
    } catch (err) {
      return res.status(500).send({ status: 0, message: err });
    }

    try {
      customers = await Customer.countDocuments({});
    } catch (err) {
      return res.status(500).send({ status: 0, message: err });
    }

    for (let i = 0; i < 3; i++) {
      let trip = await getTripsinDays(arr[i]);
      if (trip.status !== 0)
        //return res.status(500).send({ status: 0, message: "Unable to fetch data" });
        trips.push(trip);
    }

    return res.status(200).send({
      status: 1,
      vendors: vendors,
      vehicles: vehicles,
      companies: companies,
      enquiredTrips: enquiredTrips,
      customers: customers,
      trips: trips,
      enquiredList: enquiredList,
    });

  } catch (err) {
    console.log(err);
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/getTrips", async (req, res) => {
  let { pageNumber, status } = req.body || {};
  try {
    let tripdocs = await getTrips(pageNumber, status);
    if (tripdocs.status === 0) return res.status(500).send({ status: 0, message: tripdocs.message });
    return res.status(200).send({ status: 1, trips: tripdocs.trips });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/getTripDetails", cors.cors, async (req, res) => {
  let { tripId } = req.body || {};
  try {
    let tripdocs = await getTrip(tripId);
    if (tripdocs.status === 0) return res.status(500).send({ status: 0, message: tripdocs.message });
    return res.status(200).send({ status: 1, trips: tripdocs.trip, couponAmt: tripdocs.couponAmt });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/getCustomers", async (req, res) => {
  let { pageNumber } = req.body || {};
  try {
    let customerdocs = await getCustomers(pageNumber);
    if (customerdocs.status === 0) return res.status(500).send({ status: 0, message: customerdocs.message });
    return res
      .status(200)
      .send({ status: 1, customers: customerdocs.customers });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




//TODO: 
router.post("/updateTripStatuswithDriverDetails", (req, res) => {
  // 0 -> enquir, 1 payment made, 2 > driver alloted , 3 started, 4 in progress, 5 completed
  // let {tripId, driverName, driverPhoneNumber,status} = req,body 
  // add this to trip MOdel and send details to user as mail / sms 
  // change the trip statys to 2 ( ie.driver alloted)
  // send driver Number to customer No aling with tirpstartURL
  // tripStratURL = "https://driver.hirebus.in?tripId=" + tripId; 
  // send trip.customerPHoneNumber to drivrPhoneNUmber
})






router.post("/getPayments", async (req, res) => {
  let { pageNumber } = req.body || {};
  try {
    let paymentdocs = await getPayments(pageNumber);
    if (paymentdocs.status === 0) return res.status(500).send({ status: 0, message: paymentdocs.message });
    return res.status(200).send({ status: 1, payments: paymentdocs.payments });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/addCouponHistory", async (req, res) => {
  let { couponBody } = req.body || {};
  try {
    let ans = await new CouponHistory(couponBody).save();
    if (!ans) return res.status(500).send({ status: 0, message: "Coupon has not been saved!" });
    let rep2 = await Coupon.findOneAndUpdate(
      { _id: couponBody.coupon },
      { $push: { history: ans._id } }
    );
    if (!rep2) return res.status(500).send({ status: 0, message: "Coupon has not been saved!" });
    return res.status(200).send({ status: 1, ans: ans });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/getCouponHistory", async (req, res) => {
  let { pageNumber } = req.body || {};
  try {
    await getAllCouponHistory(pageNumber, (docs) => {
      if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
      return res.status(200).send({ status: 1, history: docs.history });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/getCoupon", async (req, res) => {
  let { couponId } = req.body || {};
  try {
    await getCoupon(couponId, (docs) => {
      if (docs.status === 0) {
        return res.status(500).send({ status: 0, message: docs.message });
      }
      return res.status(200).send({ status: 1, docs: docs.coupon });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/getCustomer", async (req, res) => {
  let { customerId } = req.body || {};
  try {
    let customerdocs = await getCustomer(customerId);
    if (customerdocs.status === 0) return res.status(500).send({ status: 0, message: customerdocs.message });
    return res.status(200).send({ status: 1, customer: customerdocs.customer });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/getTripsForUser", async (req, res) => {
  let { customerId, pageNumber } = req.body || {};
  try {
    await Trip.find({ customerId: customerId })
      .sort({ $natural: -1 })
      .skip(15 * pageNumber)
      .limit(15)
      .exec()
      .then((trips) => {
        if (!trips) return res.status(500).send({ status: 0, message: "Couldn't find trips" });
        return res.status(200).send({ status: 1, trips: trips });
      })
      .catch((err) => {
        return res.status(500).send({ status: 0, message: err });
      });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/changeTripStatus", async (req, res) => {
  let { tripId, status } = req.body || {};
  try {
    let trip = await Trip.findOneAndUpdate({ _id: tripId }, { status: status });
    if (!trip) return res.status(500).send({ status: 0, message: "Coundn't find trip!" });
    return res.status(200).send({ status: 1, trip: trip });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/addExtraPayments", async (req, res) => {
  let { tripId, description, amount } = req.body || {};
  try {
    let Obj = {
      description: description,
      amount: amount,
    };
    Trip.findOneAndUpdate(
      { _id: tripId },
      {
        $push: { additionalCosts: Obj },
        $inc: { tripCost: amount, remainingAmount: amount },
      }
    ).exec((err, trip) => {
      if (err) return res.status(500).send({ status: 0, message: err });
      return res.status(200).send({ status: 1, trip: trip });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/getVehiclesForVendor", async (req, res) => {
  let { vendorId, pageNumber } = req.body || {};
  try {
    await getVehiclesForVendor(vendorId, pageNumber, (vehicledocs) => {
      if (vehicledocs.status === 0) return res.status(500).send({ status: 0, message: vehicledocs.message });
      return res
        .status(200)
        .send({ status: 1, vehicles: vehicledocs.vehicles });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/getVendors", async (req, res) => {
  let { pageNumber } = req.body || {};
  try {
    let vendordocs = await getVendors(pageNumber);
    if (vendordocs.status === 0) return res.status(500).send({ status: 0, message: vendordocs.message });
    return res.status(200).send({ status: 1, vendors: vendordocs.vendors });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/getVendor", async (req, res) => {
  let { vendorId } = req.body || {};
  try {
    let vendordocs = await getVendor(vendorId);
    if (vendordocs.status === 0) return res.status(500).send({ status: 0, message: vendordocs.message });
    return res.status(200).send({ status: 1, vendor: vendordocs.vendor });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/editVendor", async (req, res) => {
  let {
    vendorId,
    firstName,
    lastName,
    email,
    photoURL,
    phoneNumber,
    whatsAppNumber,
    travelCompanyName,
    companyLogo,
    officeAddress,
    about,
  } = req.body || {};
  const vendorObj = {
    firstName: firstName,
    lastName: lastName,
    email: email,
    photoURL: photoURL,
    phoneNumber: phoneNumber,
    whatsAppNumber: whatsAppNumber,
    travelCompanyName: travelCompanyName,
    companyLogo: companyLogo,
    officeAddress: officeAddress,
    about: about,
  };
  try {
    Vendor.findOneAndUpdate({ _id: vendorId }, vendorObj).exec(
      (err, vendor) => {
        if (err) return res.status(500).send({ status: 0, message: err });
        if (!vendor) return res.status(500).send({ status: 0, message: "Couldn't find vendor!" });
        else return res.status(200).send({ status: 1, vendor: vendor });
      }
    );
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/addVendor", async (req, res) => {
  let {
    travelCompanyName,
    firstName,
    lastName,
    companyLogo,
    phoneNumber,
    whatsAppNumber,
    email,
    officeAddress,
    about,
    photoURL,
    password,
  } = req.body || {};


  let oldVendor = await Vendor.find({
    $or: [{ phoneNumber }, { email }],
  })

  if (!_.isEmpty(oldVendor))
    return res.status(500).send({ status: 0, message: "Contact details already taken!" });
  else {
    //Generate new vendor unique ID
    let id = await getId(firstName + lastName);

    while (await Vendor.findOne({ vendorId: id }))
      id = await getId(firstName + lastName);

    const data = {
      vendorId: id,
      travelCompanyName: travelCompanyName,
      firstName: firstName,
      lastName: lastName,
      companyLogo: companyLogo,
      phoneNumber: phoneNumber,
      whatsAppNumber: whatsAppNumber,
      email: email,
      officeAddress: officeAddress,
      about: about,
      photoURL: photoURL,
      password: password,
      registrationDate: new Date(),
    };


    try {
      let vendor = await new Vendor(data)
        .save();
      if (!vendor)
        return res.status(500).send({ status: 0, message: "Vendor couldn't be added!" })
      else
        return res.status(200).send({ status: 1, vendor: vendor });
    } catch (err) {
      console.log(err);
      return res.status(500).send({ status: 0, message: err });
    }
  }
});




router.post("/deleteVendor", async (req, res) => {
  let { vendorId } = req.body || {};
  try {
    await Vehicle.deleteMany({ owner: vendorId })
      .populate("owner")
      .then(() => {
        Vendor.findOneAndDelete({ _id: vendorId })
          .then(() => {
            return res.status(200).send({
              status: 1,
              message: "vendor has been successfully deleted",
            });
          })
          .catch((err) => {
            return res.status(500).send({ status: 0, message: err });
          });
      })
      .catch((err) => {
        return res.status(500).send({ status: 0, message: err });
      });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/saveVehicleForVendor", async (req, res) => {
  let { vehicleId, vendorId } = req.body || {};
  try {
    let vendordocs = await saveVehicleForVendor(vendorId, vehicleId);
    if (vendordocs.status === 0) return res.status(500).send({ status: 0, message: vendordocs.message });
    return res.status(200).send({ status: 1, vendor: vendordocs.vendor });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/deleteVehicleForVendor", async (req, res) => {
  let { vehicleId, vendorId } = req.body || {};
  try {
    let vendordocs = await deleteVehicleForVendor(vendorId, vehicleId);
    if (vendordocs.status === 0) return res.status(500).send({ status: 0, message: vendordocs.message });
    return res.status(200).send({ status: 1, vendor: vendordocs.vendor });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/addPackage", async (req, res) => {
  let {
    packageName,
    packageFacilities,
    perDayRent,
    costPerKm,
    extraCostPerKm,
    extraCostPerHour,
    minimumDuration,
    securityDepositToCollect, // Percentage
    driverAllowance,
    isAc,
    advanceAmount, //Percentage
    mileage,
    perDayCoverage,
  } = req.body || {};

  if (!_.isNumber(perDayCoverage) || _.isUndefined(perDayCoverage) || (_.isNumber(perDayCoverage) && perDayCoverage == 0)) {
    let setting = await getSettings()
    perDayCoverage = setting?.settings?.perDayCoverage ?? 350
  }

  perDayRent = _.toNumber(perDayRent)
  costPerKm = _.toNumber(costPerKm)
  extraCostPerKm = _.toNumber(extraCostPerKm)
  extraCostPerHour = _.toNumber(extraCostPerHour)
  minimumDuration = _.toNumber(minimumDuration)
  securityDepositToCollect = _.toNumber(securityDepositToCollect)
  driverAllowance = _.toNumber(driverAllowance)
  advanceAmount = _.toNumber(advanceAmount)
  mileage = _.toNumber(mileage)
  perDayCoverage = _.toNumber(perDayCoverage)
  isAc = isAc == "yes"

  const packageObj = {
    packageName: packageName,
    packageFacilities: packageFacilities,
    perDayRent: perDayRent,
    costPerKm: costPerKm,
    extraCostPerKm: extraCostPerKm,
    extraCostPerHour: extraCostPerHour,
    minimumDuration: minimumDuration,
    securityDepositToCollect: securityDepositToCollect,
    driverAllowance: driverAllowance,
    isAc: isAc,
    advanceAmount: advanceAmount,
    mileage: mileage,
    perDayCoverage: perDayCoverage,
  };

  try {
    if (_.isEmpty(packageName)) {
      return res.status(500).send({ status: 0, message: "Package Name must not be empty" });
    } else if (_.isEmpty(packageFacilities)) {
      return res.status(500).send({ status: 0, message: "Package Facilities must not be empty" });
    }
    else if (!(_.isNumber(perDayRent) && perDayRent > 0)) {
      console.log(perDayRent)
      return res.status(500).send({ status: 0, message: "Per Day Rent must not be invalid number" });
    }
    else if (!(_.isNumber(costPerKm) && costPerKm > 0)) {
      return res.status(500).send({ status: 0, message: "Cost/Km must not be empty" });
    }
    else if (!(_.isNumber(extraCostPerKm) && extraCostPerKm > 0)) {
      return res.status(500).send({ status: 0, message: "Extra Cost/Km must not be empty" });
    }
    else if (!(_.isNumber(extraCostPerHour) && extraCostPerHour > 0)) {
      return res.status(500).send({ status: 0, message: "Extra Cost/Hr must not be empty" });
    }
    else if (!(_.isNumber(securityDepositToCollect) && securityDepositToCollect < 100)) {
      return res.status(500).send({ status: 0, message: "Security Deposit must be a valid percentage!" });
    }
    else if (!(_.isNumber(driverAllowance) && driverAllowance >= 0)) {
      return res.status(500).send({ status: 0, message: "Driver Allowance must not be empty" });
    }
    else if (!_.isBoolean(isAc)) {
      return res.status(500).send({ status: 0, message: "Vehicle Type (Ac/Non-Ac) must not be empty" });
    }
    else if (!(_.isNumber(advanceAmount) && advanceAmount < 100)) {
      return res.status(500).send({ status: 0, message: "Invalid Advance Amount. Advance Amount must be a valid percentage!" });
    }
    else if (!(_.isNumber(mileage) && mileage > 0)) {
      return res.status(500).send({ status: 0, message: "Mileage must not be empty" });
    }

    // console.log(packageObj)

    await new Package(packageObj).save().then((package) => {
      if (!package) return res.status(500).send({ status: 0, message: "Package couldn't be added" });
      return res.status(200).send({ status: 1, package: package });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/addCancellationPolicy", async (req, res) => {
  let {
    durationInDays,
    percentRefund,
    vendor,
  } = req.body || {};
  const cpObj = {
    durationInDays: durationInDays,
    percentRefund: percentRefund,
    vendor: vendor,
  };
  try {
    await new CancellationPolicy(cpObj).save().then((cp) => {
      if (!cp) return res.status(500).send({ status: 0, message: "Cancellation Policy couldn't be added" });
      return res.status(200).send({ status: 1, cancellationPolicy: cp });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});







router.post("/addVehicle", async (req, res) => {
  let {
    placeOfOrigin,
    busPlateNumber,
    busType,//seater / sleeper / semi-sleeper
    leftSeatSize,
    rightSeatSize,
    instructions,
    vehicleName,
    seatCapacity,
    facilities,
    busImages,
    about,
    cancellationPolicies,
    packages,
    travelAgencyNumber,
    travelAgencyName,
    vendorId,
  } = req.body || {};

  let vehicleFound = await Vehicle.findOne({ busPlateNumber: busPlateNumber })
  if (!_.isEmpty(vehicleFound))
    return res.status(500).send({ status: 0, message: "Vehicle couldn't be added! Duplicate Plate Number Found!" })

  if (_.isEmpty(packages))
    return res.status(500).send({ status: 0, message: "Vehicle couldn't be added! Please add atleast 1 Package!" })

  let id = await getId(vehicleName);

  while (await Vehicle.findOne({ vehicleId: id }))
    id = await getId(vehicleName);

  const vehicleObj = {
    vehicleId: id,
    placeOfOrigin: placeOfOrigin,
    busPlateNumber: busPlateNumber,
    busType: busType,
    leftSeatSize: leftSeatSize,
    rightSeatSize: rightSeatSize,
    instructions: instructions,
    vehicleName: vehicleName,
    seatCapacity: seatCapacity,
    facilities: facilities,
    busImages: busImages,
    about: about,
    packages: packages,
    cancellationPolicies: cancellationPolicies,
    travelAgencyNumber: travelAgencyNumber,
    travelAgencyName: travelAgencyName,
    owner: vendorId,
  };

  try {
    let vehicle = await new Vehicle(vehicleObj).save();
    if (!vehicle)
      return res.status(500).send({ status: 0, message: "Vehicle couldn't be added!" })
    await Vendor.findOneAndUpdate(
      { _id: vehicle.owner },
      { $addToSet: { vehicles: vehicle._id } } // this should also increase to totalCost once tirp Ends
    )
    return res.status(200).send({ status: 1, vehicle: vehicle });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/editVehicle", async (req, res) => {
  let {
    vehicleId,
    vehicleName,
    travelAgencyName,
    busPlateNumber,
    busType,
    vendorId,
    facilities,
    cancellationPolicy,
    packages,
    instructions,
    imagesArray,
    minDistance,
    minCost,
    seatCapacity,
    leftSeatSize,
    rightSeatSize,
    totalSeats,
    placeOfOrigin,
  } = req.body || {};


  const vehicleObj = {
    vehicleName: vehicleName,
    travelAgencyName: travelAgencyName,
    busPlateNumber: busPlateNumber,
    busType: busType,
    owner: vendorId,
    facilities: facilities,
    cancellationPolicy: cancellationPolicy,
    packages: packages,
    instructions: instructions,
    imagesArray: imagesArray,
    minDistance: minDistance,
    minCost: minCost,
    seatCapacity: seatCapacity,
    leftSeatSize: leftSeatSize,
    rightSeatSize: rightSeatSize,
    totalSeats: totalSeats,
    placeOfOrigin: placeOfOrigin,
  };


  try {
    Vehicle.findOneAndUpdate({ _id: vehicleId }, vehicleObj).exec(
      (err, vehicle) => {
        if (err) return res.status(500).send({ status: 0, message: err });
        if (!vehicle)
          return res.status(500).send({ status: 0, message: "Vehicle couldn't be added!" });
        return res.status(200).send({ status: 1, vehicle: vehicle });
      }
    );
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/toggleVehicleStatus", async (req, res) => {
  let { vehicleId } = req.body || {};
  try {
    Vehicle.findOneAndUpdate({ _id: vehicleId }, [
      { $set: { isEnabled: { $eq: [false, "$isEnabled"] } } },
    ]).exec((err, resp) => {
      if (err || !resp) return res.status(500).send({ status: 0, message: "Vehicle not found!" });
      return res
        .status(200)
        .send({ status: 1, vehicleEnability: !resp.isEnabled });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/toggleUserStatus", async (req, res) => {
  let { customerId } = req.body || {};
  try {
    Customer.findOneAndUpdate({ _id: customerId }, [
      { $set: { isAgent: { $eq: [false, "$isAgent"] } } },
    ]).exec((err, resp) => {
      if (err || !resp) return res.status(500).send({ status: 0, message: "Customer not found!" });
      return res.status(200).send({ status: 1, isUserAgent: !resp.isAgent });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/toggleCityStatus", async (req, res) => {
  let { cityId } = req.body || {};
  try {
    City.findOneAndUpdate({ _id: cityId }, [
      { $set: { isEnabled: { $eq: [false, "$isEnabled"] } } },
    ]).exec((err, resp) => {
      if (err || !resp) return res.status(500).send({ status: 0, message: "City not found!" });
      return res
        .status(200)
        .send({ status: 1, isCityEnabled: !resp.isEnabled });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/getVehicle", async (req, res) => {
  let { vehicleId } = req.body || {};
  try {
    Vehicle.findOne({ _id: vehicleId })
      .populate("packages")
      .exec((err, vehicle) => {
        if (err || !vehicle) return res.status(500).send({ status: 0, message: "Vehicle not found!" });
        return res.status(200).send({ status: 1, vehicle: vehicle });
      });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/deleteVehicle", async (req, res) => {
  let { vehicleId } = req.body || {};
  try {
    await Vehicle.findOneAndDelete({ _id: vehicleId })
      .then((resp) => {
        return res
          .status(200)
          .send({ status: 1, message: "vehicle has been deleted!" });
      })
      .catch((err) => {
        return res.status(500).send({ status: 0, message: err });
      });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});


router.post("/addVendorEarning", async (req, res) => {
  let { vendorId, tripId, amount, transactionDate, customerId } =
    req.body || {};
  let vendorEarningObj = {
    vendor: vendorId,
    trip: tripId,
    amount: amount,
    transactionDate: transactionDate,
    customer: customerId,
  };
  try {
    let earning = await addVendorEarning(vendorEarningObj);
    if (earning.status === 0) return res.status(500).send({ status: 0, message: earning.message });
    return res.status(200).send({ status: 1, vendorEarning: earning.earning });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/getTopEarnings", async (req, res) => {
  let { vendorId, pageNumber } = req.body || {};
  try {
    let earnings = await getTopEarnings(vendorId, pageNumber);
    if (earnings.status === 0) return res.status(500).send({ status: 0, message: earning.message });
    return res
      .status(200)
      .send({ status: 1, topEarning: earnings.topEarnings });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});




router.post("/getCities", async (req, res) => {
  let { pageNumber } = req.body || {};
  try {
    City.find({ isEnabled: true })
      .sort({ $natural: -1 })
      .skip(15 * pageNumber)
      .limit(15)
      .exec((err, docs) => {
        if (err) return res.status(500).send({ status: 0, message: err });
        return res.status(200).send({ status: 1, city: docs });
      });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/getCity", async (req, res) => {
  let { cityId } = req.body || {};
  try {
    City.find({ _id: cityId }).exec((err, docs) => {
      if (err) return res.status(500).send({ status: 0, message: err });
      return res.status(200).send({ status: 1, city: docs });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/addCity", async (req, res) => {
  let { cityName, state, images, information, thingsToDo } = req.body || {};
  let cityObj = {
    cityName: cityName,
    state: state,
    images: images,
    information: information,
    thingsToDo: thingsToDo,
  };
  try {
    let docs = await addCity(cityObj);
    if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
    return res.status(200).send({ status: 1, city: docs.city });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/updateCity", async (req, res) => {
  let { cityId, cityName, state, images, information, thingsToDo } =
    req.body || {};
  let cityObj = {
    cityName: cityName,
    state: state,
    images: images,
    information: information,
    thingsToDo: thingsToDo,
  };
  try {
    let docs = await updateCity(cityId, cityObj);
    if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
    return res.status(200).send({ status: 1, city: docs.city });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/deleteCity", async (req, res) => {
  let { cityId } = req.body || {};
  try {
    let docs = await deleteCity(cityId);
    if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
    return res
      .status(200)
      .send({ status: 1, message: "City has been deleted" });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/getPilgrimages", async (req, res) => {
  let { pageNumber } = req.body || {};
  try {
    let pilgrimages = await Pilgrimage.find()
      .skip(15 * pageNumber)
      .limit(15);
    if (!pilgrimages) return res.status(500).send({ status: 0, message: "Couldn't find pilgrimage!" });
    return res.status(200).send({ status: 1, pilgrimages: pilgrimages });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/getPilgrimage", async (req, res) => {
  let { pilgrimageId } = req.body || {};
  try {
    Pilgrimage.find({ _id: pilgrimageId }).exec((err, resp) => {
      if (err) return res.status(500).send({ status: 0, message: err });
      return res.status(200).send({ status: 1, pilgrimage: resp });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/getCompany", async (req, res) => {
  let { companyId } = req.body || {};
  try {
    Company.find({ _id: companyId }).exec((err, resp) => {
      if (err) return res.status(500).send({ status: 0, message: err });
      return res.status(200).send({ status: 1, company: resp });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/addPilgrimage", async (req, res) => {
  let { cityName, state, images, information, pilgrimagesToVisit } =
    req.body || {};
  let pilgrimageObj = {
    cityName: cityName,
    state: state,
    images: images,
    information: information,
    pilgrimagesToVisit: pilgrimagesToVisit,
  };
  try {
    let docs = await addPilgrimage(pilgrimageObj);
    if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
    return res.status(200).send({ status: 1, pilgrimage: docs.pilgrimage });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/updatePilgrimage", async (req, res) => {
  let {
    pilgrimageId,
    cityName,
    state,
    images,
    information,
    pilgrimgesToVisit,
  } = req.body || {};
  let pilgrimageObj = {
    cityName: cityName,
    state: state,
    images: images,
    information: information,
    pilgrimgesToVisit: pilgrimgesToVisit,
  };
  try {
    let docs = await updatePilgrimage(pilgrimageId, pilgrimageObj);
    if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
    return res.status(200).send({ status: 1, pilgrimage: docs.pilgrimage });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/deletePilgrimage", async (req, res) => {
  let { pilgrimageId } = req.body || {};
  try {
    let docs = await deletePilgrimage(pilgrimageId);
    if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
    return res
      .status(200)
      .send({ status: 1, message: "Pilgrimage has been deleted" });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/getCompanies", async (req, res) => {
  let { pageNumber } = req.body || {};
  try {
    let companies = await Company.find({})
      .sort({ $natural: -1 })
      .skip(15 * pageNumber)
      .limit(15);
    if (!companies) return res.status(500).send({ status: 0, message: docs.message });
    return res.status(200).send({ status: 1, companies: companies });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/addCompany", async (req, res) => {
  let {
    companyName,
    desc,
    logo,
    address,
    pinCode,
    maxPerson,
    costPerPerson,
    videoURL,
    companyImages,
    preferredBranches,
    cityName,
    contactPersonName,
    designation,
    contactPersonPhonenumber,
    officePhone,
  } = req.body || {};
  let companyObj = {
    companyName: companyName,
    logo: logo,
    desc: desc,
    companyImages: companyImages,
    address: address,
    pinCode: pinCode,
    maxPerson: maxPerson,
    costPerPerson: costPerPerson,
    videoURL: videoURL,
    preferredBranches: preferredBranches,
    cityName: cityName,
    contactPersonName: contactPersonName,
    designation: designation,
    contactPersonPhonenumber: contactPersonPhonenumber,
    officePhone: officePhone,
  };
  console.log(companyObj);
  try {
    await addCompany(companyObj, (docs) => {
      if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
      return res.status(200).send({ status: 1, company: docs.company });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/updateCompany", async (req, res) => {
  let {
    companyId,
    companyName,
    logo,
    address,
    pinCode,
    maxPerson,
    costPerPerson,
    videoURL,
    preferredBranches,
    cityName,
    contactPersonName,
    designation,
    companyImages,
    contactPersonPhonenumber,
    officePhone,
  } = req.body || {};
  let companyObj = {
    companyName: companyName,
    logo: logo,
    address: address,
    pinCode: pinCode,
    maxPerson: maxPerson,
    companyImages: companyImages,
    costPerPerson: costPerPerson,
    videoURL: videoURL,
    preferredBranches: preferredBranches,
    cityName: cityName,
    contactPersonName: contactPersonName,
    designation: designation,
    contactPersonPhonenumber: contactPersonPhonenumber,
    officePhone: officePhone,
  };
  try {
    let docs = await updateCompany(companyId, companyObj);
    if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
    return res.status(200).send({ status: 1, company: docs.company });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/deleteCompany", async (req, res) => {
  let { companyId } = req.body || {};
  try {
    let docs = await deleteCompany(companyId);
    if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
    return res
      .status(200)
      .send({ status: 1, message: "Company has been deleted" });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/setAllowedDates", async (req, res) => {
  let { companyId, dates } = req.body || {};
  try {
    await setAllowedDates(companyId, dates, (docs) => {
      if (docs.status === 0) return res.status(500).send({ status: 0, message: docs.message });
      return res.status(200).send({ status: 1, message: docs.message });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/getAllowedDates", async (req, res) => {
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





router.post("/getAgentsList", async (req, res) => {
  let { pageNumber } = req.body || {};
  try {
    Coupon.find({ totalAmount: { $gte: 1 } })
      .sort({ $natural: -1 })
      .skip(15 * pageNumber)
      .limit(15)
      .exec((err, data) => {
        if (err || !data) return res.status(500).send({ status: 0, message: "No data found!" });
        return res.status(200).send({ status: 1, users: data });
      });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/listAgentTripsAndClaims", async (req, res) => {
  let { couponId, pageNumber } = req.body || {};
  try {
    Coupon.findOne({ _id: couponId }, "pastClaims")
      .limit(15)
      .skip(pageNumber * 15)
      .exec((err, resp) => {
        if (err || !resp) return res.status(500).send({ status: 0, message: "No data found!" });
        return res.status(200).send({ status: 1, pastClaims: resp.pastClaims });
      });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/claimRewards", async (req, res) => {
  let { couponCode } = req.body || {};
  try {
    Coupon.findOne({ couponCode: couponCode }).exec((err, coupon) => {
      if (err || !coupon) return res.status(500).send({ status: 0, message: "Cou[on not found!" });
      Coupon.findOneAndUpdate(
        { couponCode: couponCode },
        {
          unclaimedAmount: 0,
          unclaimedTrips: 0,
          $inc: {
            totalAmount: coupon.unclaimedAmount,
            totalTrips: coupon.unclaimedTrips,
          },
          $push: {
            pastClaims: {
              claimedAt: Date.now(),
              claimedAmount: coupon.unclaimedAmount,
            },
          },
        }
      ).exec((err2, resp) => {
        if (err2 || !resp) return res.status(500).send({ status: 0, message: "Couldn't claim coupon!" });
        return res
          .status(200)
          .send({ status: 1, message: "Rewards have been claimed!" });
      });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/deleteCoupon", async (req, res) => {
  let { couponId } = req.body || {};
  try {
    await deleteCouponWithId(couponId, (data) => {
      if (data.status === 0) return res.status(500).send({ status: 0, message: data.message });
      return res.status(200).send({ status: 1, message: data.message });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/createCoupon", async (req, res) => {
  let { couponCode, discount, couponDescription, imageURL, isPrivate = false, isPercentage = true, customers = [],
    usedCustomers = [], expiresOn,
  } = req.body || {};
  try {
    const couponObj = {
      couponCode: couponCode,
      discount: discount,
      couponDescription: couponDescription,
      imageURL: imageURL,
      isPrivate,
      isPercentage,
      customers,
      usedCustomers,
      expiresOn,
    };

    if (!isPrivate) {
      couponObj.expiresOn = moment().add({ days: 10 })
    }

    if (isPrivate && _.isEmpty(customers)) {
      return res.status(500).send({ status: 0, message: "Please select aleast one customer to create private coupons" });
    } else if (_.isEmpty(couponObj.expiresOn) || !moment(couponObj.expiresOn).isValid || moment(couponObj.expiresOn).isSameOrBefore(new Date())) {
      return res.status(500).send({ status: 0, message: "Please select valid expiry date" });
    } else if (_.isEmpty(discount)) {
      return res.status(500).send({ status: 0, message: "Please enter valid discount" });
    } else if (_.isEmpty(couponDescription)) {
      return res.status(500).send({ status: 0, message: "Please enter valid description" });
    }

    let isValid = []
    await Promise.all(customers.map(async (item) => {
      let customer = await Customer.findOne({
        _id: item,
      })
      if (!_.isEmpty(customer))
        isValid.push(true)
    }))

    if (isValid.length != customers.length) {
      return res.status(500).send({ status: 0, message: "Please select valid customers" });
    }

    await createCoupon(couponObj, (data) => {
      if (data.status !== 1)
        return res
          .status(500)
          .send({ status: data.status, message: data?.message ?? 'Failed to create coupons!' });
      return res.status(200).send({ status: 1, coupon: data.coupon });
    })
      .then()
      .catch((err) => {
        return res.status(500).send({ status: 0, message: err ?? 'Failed to create coupon!' });
      });
  } catch (err) {
    console.log(err)
    return res.status(500).send({ status: 0, message: 'Failed to create coupon!' });
  }
});





router.post("/editCoupon", async (req, res) => {
  let { couponId, couponCode, discount, couponDescription, imageURL } =
    req.body || {};
  try {
    const couponObj = {
      couponCode: couponCode,
      discount: discount,
      couponDescription: couponDescription,
      imageURL: imageURL,
    };
    await editCouponWithId(couponId, couponObj, (data) => {
      if (data.status === 0) return res.status(500).send({ status: 0, message: data.message });
      return res.status(200).send({ status: 1, coupon: data.coupon });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});

router.post("/editSettings", async (req, res) => {
  let { perDayCoverageInKms } =
    req.body || {};
  try {
    await updateSettings(perDayCoverageInKms, (data) => {
      if (data.status === 0) return res.status(500).send({ status: 0, message: data.message });
      return res.status(200).send({ status: 1, settings: data.settings });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});

router.post("/addSettings", async (req, res) => {
  try {
    let setting = await Settings(req.body).save();
    if (!setting) return res.status(500).send({ status: 0, message: "Failed to ass settings" });
    return res.status(500).send({ status: 1, message: setting });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});

router.get("/getSettings", async (req, res) => {
  try {
    let settings = await getSettings();
    if (settings.status == 0) return res.status(500).send({ status: 0, message: settings.message })
    return res.status(200).send({ status: 1, settings: settings.settings })
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/getPublicCoupons", async (req, res) => {
  let { pageNumber, customerId } = req.body || {};
  try {
    PublicCoupon.find({
      "expiresOn": { $gt: new Date().toISOString() },
      $or: [
        {
          $and: [
            {
              'customers': { $in: [customerId] }
            },
            { isPrivate: true },
            {
              'usedCustomers': { $nin: [customerId] }
            }
          ],
        },
        { isPrivate: false }
      ]
    })
      .skip(30 * pageNumber)
      .limit(30)
      .populate("customers")
      .populate("usedCustomers")
      .exec()
      .then((coupons) => {
        if (coupons) {
          return res.status(200).send({ status: 1, coupons: coupons });
        } else {
          return res.status(500)({ status: 0, message: "No data available" });
        }
      })
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});



router.post("/getAllPublicCoupons", async (req, res) => {
  try {
    PublicCoupon.find({
    })
      .populate("customers")
      .populate("usedCustomers")
      .exec()
      .then((coupons) => {
        if (coupons) {
          return res.status(200).send({ status: 1, coupons: coupons });
        } else {
          return res.status(500)({ status: 0, message: "No data available" });
        }
      })
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/getPublicCoupon", async (req, res) => {
  let { couponId } = req.body || {};
  try {
    await getCouponWithId(couponId, (data) => {
      if (data.status === 0) return res.status(500).send({ status: 0, message: data.message });
      return res.status(200).send({ status: 1, coupon: data.coupon });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/toggleCouponStatus", async (req, res) => {
  let { couponId } = req.body || {};
  try {
    PublicCoupon.findOneAndUpdate({ _id: couponId }, [
      { $set: { expiresOn: new Date() } },
    ]).exec((err, resp) => {
      if (err || !resp) return res.status(500).send({ status: 0, message: "Coupon Not found!" });
      return res
        .status(200)
        .send({ status: 1, coupon: resp });
    });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});





router.post("/getTripsOnCoupon", async (req, res) => {
  let { couponId, pageNumber } = req.body || {};
  try {
    Trip.find({ couponApplied: couponId })
      .sort({ $natural: -1 })
      .skip(15 * pageNumber)
      .limit(15)
      .exec((err, trips) => {
        if (err || !trips) return res.status(500).send({ status: 0, message: "No data found!" });
        return res.status(200).send({ status: 1, trips: trips });
      });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});






router.post("/getTripsOnPublicCoupon", async (req, res) => {
  let { couponId, pageNumber } = req.body || {};
  try {
    Trip.find({ publicCouponApplied: couponId })
      .sort({ $natural: -1 })
      .skip(15 * pageNumber)
      .limit(15)
      .exec((err, trips) => {
        if (err || !trips) return res.status(500).send({ status: 0, message: "No data found!" });
        return res.status(200).send({ status: 1, trips: trips });
      });
  } catch (err) {
    return res.status(500).send({ status: 0, message: err });
  }
});






module.exports = router;
