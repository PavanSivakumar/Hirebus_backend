const mongoose = require("mongoose");
const { Schema } = mongoose;

const { Customer } = require("../Users/customer.model");
const { CouponHistory } = require("./couponHistory.model");

const PublicCouponSchema = new Schema({
  couponCode: {
    type: String,
    required: true,
  },
  discount: {
    type: Number,
    required: false,
    default: 0,
  },
  couponDescription: {
    type: String,
    default: "Get Exciting Coupons!",
    required: false,
  },
  imageURL: {
    type: String,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  isPercentage: {
    type: Boolean,
    default: true,
  },
  customers: [{
    type: Schema.Types.ObjectId,
    ref: "Customer"
  }],
  expiresOn: {
    type: String,
    required: true,
  },
  usedCustomers: [{
    type: Schema.Types.ObjectId,
    ref: "Customer"
  }],
});

async function createCoupon(newData, cb) {
  PublicCoupon.findOne({
    couponCode: newData.couponCode,
  })
    .then((coupon) => {
      if (coupon) {
        cb({ status: 0, message: "Coupon with this code already exists" });
      } else {
        let newCoupon = new PublicCoupon(newData);
        newCoupon
          .save()
          .then((coupon) => {
            return cb({ status: 1, coupon: coupon });
          })
          .catch((err) => {
            return cb({ status: 0, message: err ?? 'Something went wrong'});
          });
      }
    })
    .catch((err) => {
      return cb({ status: 0, message: err ?? 'Something went wrong!' });
    });
}

async function getCouponWithId(couponId, cb) {
  PublicCoupon.findOne({ _id: couponId })
    .then((coupon) => {
      if (coupon) {
        cb({ status: 1, coupon: coupon });
      } else {
        cb({ status: 0, message: "coupon not found" });
      }
    })
    .catch((err) => {
      console.log(err);
      cb({ status: 1, message: err });
    });
}

async function getDetailsWithCouponId({ couponId }) {
  let couponResponse = await PublicCoupon.findOne({ _id: couponId, });
  return couponResponse;
}


async function getCoupons(pageNumber, cb) {
  PublicCoupon.find().sort({ "$natural": -1 }).exec()
    .then((coupons) => {

      if (coupons) {
        cb({ status: 1, coupons: coupons });
      } else {
        cb({ status: 0, message: "no data available" });
      }
    })
    .catch((err) => {
      console.log(err);
      cb({ status: 0, message: err });
    });
}


async function editCouponWithId(cid, dataToUpdate, cb) {
  PublicCoupon.findByIdAndUpdate(
    cid,
    {
      $set: dataToUpdate,
    },
    {
      new: true,
    },
    (err, coupon) => {
      if (err) cb({ status: 0, message: err });
      else if (!coupon) cb({ status: 1, message: "coupon not found" });
      else cb({ status: 1, coupon: coupon });
    }
  );
};


async function deleteCouponWithId(cid, cb) {
  PublicCoupon.findByIdAndRemove(cid, (err, coupon) => {
    if (err) cb({ status: 0, message: err });
    else if (coupon) {
      cb({ status: 1, message: "Coupon has been deleted!" });
    } else {
      cb({ status: 0, message: "coupon not found with this id" });
    }
  });
};

PublicCouponSchema.statics.applyCoupon = function (
  couponCode,
  uid,
  planId,
  cb
) {
  Customer.findOne({
    _id: uid,
  })
    .then((user) => {
      if (!user) {
        cb(false, "user not found");
        return;
      }
      this.findOne({
        couponCode: couponCode,
      })
        .then((coupon) => {
          if (!coupon) {
            cb(false, "coupon not found");
            return;
          }
          // if (!coupon.isPublic) {
          //   cb(false, 'You cannot apply this coupon');
          //   return;
          // }

          if (coupon.plans.indexOf(planId) == -1) {
            console.log(coupon.plans);
            console.log(planId);
            cb(false, "plan Id is not valid for this coupon");
            return;
          }

          if (coupon.validTill < new Date()) {
            cb(false, "coupon is expired");
            return;
          }

          CouponHistory.isCouponApplied(
            user._id,
            coupon._id,
            (status, data) => {
              if (status) {
                if (data && data.length < coupon.validCount) {
                  let chid = "";
                  CouponHistory.createCouponHistory(
                    user._id,
                    coupon._id,
                    (status2, couponHistData) => {
                      if (status2) {
                        chid = couponHistData._id;
                        return cb(true, coupon, chid);
                        console.log("history created");
                      } else {
                        return cb(true, coupon, chid);
                        console.log("could not create coupon history");
                      }
                    }
                  );
                } else {
                  cb(false, "no of times exceeds");
                  return;
                }
              } else {
                cb(false, data);
              }
            }
          );
        })
        .catch((err) => {
          cb(false, err);
        });
    })
    .catch((err) => {
      console.log(err);
      cb(false, err);
    });
};

const PublicCoupon = mongoose.model("PublicCoupon", PublicCouponSchema);

module.exports = {
  PublicCoupon,
  createCoupon,
  getCouponWithId,
  getCoupons,
  editCouponWithId,
  deleteCouponWithId,
  getDetailsWithCouponId
};
