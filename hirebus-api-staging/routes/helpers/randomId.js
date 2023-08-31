let { Customer } = require("../../models/Users/customer.model");
let { Trip } = require("../../models/Trips/trip.model");

async function getId(name){
    const text = name.toUpperCase();
    const  len = Math.min(text.length , 10);
    let s = Math.random().toString(len).substr(3, 4);
    let ID = "";
    for(let i = 0 ;i < 4 ;i++){
        ID +=text[s[i]];
    }
    ID += Math.random().toString(10).substr(2, 4);
    return ID;
}

async function getNumberId(user  , cb){
    if(user){
        await Customer.countDocuments({}).then((num)=>{
            num = num + 1;
            let s = num.toString();
            while(s.length !== 4) s = "0" + s;
            s = "U"+s;
            return cb({status : 1 , s : s});
        }).catch((err)=>{
            return cb({ status : 0 , message : err });
        }) 
    }
    else {
        await Trip.countDocuments({}).then((num)=>{
            num  = num +1;
            let s = num.toString();
            while(s.length !== 4) s = "0" + s;
            console.log(s);
            s = "TR" +s;
            return cb({status : 1 , s : s});
        }).catch((err)=>{
            return cb({ status : 0 , message : err });
        })     
    }
}

module.exports = {
    getId,
    getNumberId
}