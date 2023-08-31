const mongoose = require("mongoose");
const {Schema} = mongoose;

const {CouponHistory} = require('./couponHistory.model');

const CouponSchema = new Schema({
  couponCode : {
    type: String,
    required: true
  },
  isPublic : {
    type: Boolean,
    default: false
  },
  discount : {
    type : Number ,
    deafult : 0,
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  totalTrips :{
    type : Number,
    default : 0,
  },
  unclaimedAmount : {
    type: Number,
    default : 0,
  },
  unclaimedTrips : {
    type : Number,
    default : 0,
  },
  phoneNumber : {
    type : String,
  },
  pastClaims : [{
    claimedAt : Date , 
    claimedAmount : Number,
  }],
  couponDescription:{
    type: String,
    default: "Get Exciting Coupons!",
    required: false
  },
  history : [{
    type : Schema.Types.ObjectId,
    ref : "CouponHistory",
  }]
});



async function createCoupon (newData, cb) {
  Coupon.findOne({
      couponCode: newData.couponCode
    })
    .then(coupon => {
      if (coupon) {
        cb({status : 2 ,message : 'coupon with this code already exists'});
      } else {
        let newCoupon =  new Coupon(newData);
        newCoupon
          .save()
          .then(coupon => {
            cb({status : 1, coupon : coupon});
          })
          .catch(err => {
            cb({status : 0,message : err});
          });
      }
    })
    .catch(err => {
      // console.log(err);
      cb({status : 0 , message : err});
    });
};

CouponSchema.statics.getCouponWithCode = function(couponCode, cb) {
  this.findOne({
      couponCode: couponCode
    })
    .then(coupon => {
      if (coupon) {
        cb(true, coupon);
      } else {
        cb(false, 'coupon not found');
      }
    })
    .catch(err => {
      // console.log(err);
      cb(false, err);
    });
};

async function getCoupon(cid, cb) {
  Coupon.findOne({
      _id: cid
    }).populate({path : 'history' ,   populate : { 
      path : 'userId' , select : '_id firstName lastName' ,
    }}).populate({path : 'history' ,   populate : { 
      path : 'trip' , select : '_id title' ,
    }}).populate({path : 'history' ,   populate : { 
      path : 'coupon' , select : '_id couponCode' ,
    }})
    .then(coupon => {
      // console.log(coupon);
      if (coupon) {
        cb({status :1 , coupon: coupon});
      } else {
        cb({status : 0,message: 'coupon not found'});
      }
    })
    .catch(err => {
      // console.log(err);
      cb({status : 0, message : err});
    });
};

CouponSchema.statics.getCoupons = function(type, cb) {
  let findQuery = {}
  if (type == 'public') {
    findQuery = {
      isPublic: true
    }
  } else if (type == 'private') {
    findQuery = {
      isPublic: false
    }
  }


  this.find(findQuery)
    .then(coupons => {
      if (coupons) {
        cb(true, coupons);
      } else {
        cb(false, 'no data available');
      }
    })
    .catch(err => {
      // console.log(err);
      cb(false, err);
    });
};

CouponSchema.statics.editCouponWithCode = function(couponCode, dataToUpdate, cb) {
  this.findOneAndUpdate({
    couponCode: couponCode
  }, {
    $set: dataToUpdate
  }, {
    new: true
  }, (err, coupon) => {
    if (err)
      cb(false, err);
    else if (!coupon)
      cb(false, 'coupon not found');
    else
      cb(true, coupon);
  });
};

CouponSchema.statics.editCouponWithId = function(cid, dataToUpdate, cb) {
  this.findByIdAndUpdate(cid, {
    $set: dataToUpdate
  }, {
    new: true
  }, (err, coupon) => {
    // console.log(err);
    // console.log(coupon);
    if (err)
      cb(false, err);
    else if (!coupon)
      cb(false, 'coupon not found');
    else
      cb(true, coupon);
  });
};


CouponSchema.statics.deleteCouponWithCode = function(couponCode, cb) {
  this.findOneAndRemove({
    couponCode: couponCode
  }, (err, coupon) => {
    if (err)
      cb(false, err);
    else
      cb(true, coupon);
  });
};

CouponSchema.statics.deleteCouponWithId = function(cid, cb) {
  this.findByIdAndRemove(cid, (err, coupon) => {
    if (err)
      cb(false, err);
    else
      if (coupon) {
        cb(true, coupon);
      }else {
        cb(false, 'coupon not found with this id');
      }
  });
};


CouponSchema.statics.applyCoupon = function(couponCode, uid, planId, cb) {
  User.findOne({
      _id: uid
    })
    .then(user => {
      if (!user) {
        cb(false, 'user not found');
        return;
      }
      this.findOne({
          couponCode: couponCode
        })
        .then(coupon => {
          if (!coupon) {
            cb(false, 'coupon not found');
            return;
          }
          // if (!coupon.isPublic) {
          //   cb(false, 'You cannot apply this coupon');
          //   return;
          // }

         

          if (coupon.validTill < new Date()) {
            cb(false, 'coupon is expired');
            return;
          }

          CouponHistory.isCouponApplied(user._id, coupon._id, (status, data) => {
						if (status) {
							if (data && data.length<coupon.validCount) {
                let chid = '';
								CouponHistory.createCouponHistory(user._id, coupon._id, (status2, couponHistData) => {
	                if (status2) {
                    chid = couponHistData._id;
                    return cb(true, coupon, chid);
	                  // console.log('history created');
	                } else {
                    return cb(true, coupon, chid);
	                  // console.log('could not create coupon history');
	                }
	              });
							}else {
								cb(false, 'no of times exceeds')
								return;
							}
						}else {
							cb(false, data);
						}
          });
        }).catch(err => {
          cb(false, err);
        })
    })
    .catch(err => {
      // console.log(err);
      cb(false, err);
    })
};

const Coupon = mongoose.model("Coupon", CouponSchema);

module.exports = {
  Coupon,
  createCoupon,
  getCoupon
};
