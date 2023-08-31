const mongoose = require("mongoose");
const { Schema } = mongoose;

const CouponHistorySchema = new Schema({
	userId : {
		type : Schema.Types.ObjectId,
		ref : "Customer",
	},
	coupon : {
		type : Schema.Types.ObjectId,
		ref : "Coupon"
	} ,
	amount: {
		type: Number,
	},
	trip: {
		type: Schema.Types.ObjectId,
    	ref: 'Trip',
		required:true
	},
});


async function getAllCouponHistory(pageNumber , cb) {
  	CouponHistory.find({})
	  .populate({path : 'coupon' , select : 'isPublic totalAmount totalTrips unclaimedAmount unclaimedTrips couponDescription couponCode discount'})	
	  .sort({ "$natural": -1 })
	  .skip(15*pageNumber).limit(15)
		.then(history=>{
			if (history) {
				// console.log('history' ,history);
				cb ({status : 1,history : history});
			}else {
				cb ({status : 0, message : 'no history found'})
			}
		})
		.catch(err=>{
			// console.log(err);
			cb ({status : 0 ,message  : err});
		})
};

async function insertCouponHistory(couponId,tripId, userId, amount, cb){
	const couponObj = {
		userId : userId,
		coupon : couponId,
		amount : amount,
		trip : tripId
	};
	await new CouponHistory(couponObj).save().then((res)=>{
		if(res) cb({status : 1 , coupon : res});
		else cb ({status : 0 , message : "Coupon is not saved in history"});
	}).catch(err=>{
		cb ({status : 0 , message : err});
	})
}

async function getCouponHistoryWithUid(uid ,cb) {
  	CouponHistory.find({userId:uid}).populate('Customer').exec()
		.then(history=>{
			if (history) {
				cb(true,history);
			}else {
				cb(false,'no history found')
			}
		})
		.catch(err=>{
			console.log(err);
			cb(false,err);
		})
};


async function saveUserInviteCoupon(userInviteCode,amount,userId, tripId,cb) {
	let newCoupon = {
		userInviteCode : userInviteCode,
		userId : userId,
		tripId : tripId,
		amount : amount,
	}
    await newCoupon.save().then(coupon=>{
		if(coupon) cb(true, coupon);
		else cb(false,"No coupon found");
	}).catch(err=>{
		cb(false, err);
	})
};

async function getCouponHistoryWithCouponCode(coupon ,cb) {
  	CouponHistory.find({userInviteCode:cid})
		.then(history=>{
			if (history) {
				cb(true,history);
			}else {
				cb(false,'no history found')
			}
		})
		.catch(err=>{
			console.log(err);
			cb(false,err);
		})
};


async function isCouponApplied(uid, couponCode ,cb) {
  	CouponHistory.find({userId:uid, userInviteCode:couponCode})
		.then(history=>{
			cb(true,history)
		})
		.catch(err=>{
			cb(false,err);
		})
};


async function deleteCouponHistory(chid, cb) {
  CouponHistory.findByIdAndRemove(chid, (err, couponHistory) => {
    if (err)
      cb(false, err);
    else
      cb(true, couponHistory);
  });
};


const CouponHistory = mongoose.model("CouponHistory", CouponHistorySchema);

module.exports = { 
	CouponHistory,
	getAllCouponHistory,
	insertCouponHistory,
	getCouponHistoryWithCouponCode,
	getCouponHistoryWithUid,
	deleteCouponHistory ,
	saveUserInviteCoupon,
	isCouponApplied
};
