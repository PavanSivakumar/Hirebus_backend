const { response } = require('express');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let companySchema = new Schema({
    companyName : {
        type : String,
        required :true,
        maxlength : 300,
    },
    logo : {
        type :String,
        maxlength : 4000,
        defualt : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRABkQTnpr7J7OEQ6owIsrkhosd0BOYxnCebw&usqp=CAU'
    },
    address : {
        type : String,
        maxlength : 4000,
    },
    videoURL: {
        type : String,
        default: ''
    },
    companyImages: [String],
    pinCode : {
        type : String ,
        maxlength : 10,
    },
    maxPerson : {
        type :Number,
        required : true
    },
    costPerPerson : {
        type : Number,
        required : true,
    },
    allowedDates : [{
        type : String
    }],
    preferredBranches :[{
        type :String ,
    }],
    cityName : {
        type : String,
    },
    contactPersonName  : {
        type : String
    }, 
    designation : {
        type : String
    }, 
    desc: String,
    contactPersonPhonenumber : {
        type : String
    }, 
    officePhone : { 
        type : String
    }
});

async function getCompanies( city, dept, pageNumber ){
    try{
        let companies = await Company.find({cityName : city , preferredBranches : dept}).sort({"$natural" : -1}).skip(15*pageNumber).limit(15).exec();
        if(!companies){
            throw new Error("No companies found!");
        }
        return ({status : 1 ,  companies : companies });
    }
    catch(err){
        return ({status : 0 , companies : NULL , message : err.message});
    }
}

async function addCompany(companyObj ,cb){
    try{
        await new Company(companyObj).save().then((company)=>{
            if(!company){
                throw new Error("Company has not been added");
            }
            cb ({status : 1 ,  company : company });
        }).catch(err=>{
            throw new Error(err);
        });
    }
    catch(err){
        cb ({status : 0 , company : NULL , message : err});
    }
}

async function updateCompany(companyId, companyObj){
    try{
        let company = await Company.findOneAndUpdate({_id : companyId} , companyObj)
        if(!company){
            throw new Error("No company found!");
        }
        return ({status : 1 ,  company : company });
    }
    catch(err){
        return ({status : 0 , company : NULL , message : err.message});
    }
}

async function deleteCompany(companyId){
    try{
        await Company.findOneAndDelete({_id : companyId});
        return ({status : 1 ,  message : "Company has been deleted!"});
    }
    catch(err){
        return ({status : 0 , message : err});
    }
}

async function setAllowedDates(companyId, dates  ,cb){
    try{
        Company.findOneAndUpdate({_id : companyId }, {$set : {allowedDates : dates}} ,  (err, resp )=>{
            if(err) throw new Error(err);
            if(!resp) {
                return cb({status:1, message : "Dates have been set"});
            }
            else return cb ({status : 1 ,  message : "Dates have been set"});
        });
    }
    catch(err){
        return cb ({status : 0 , message : err});
    }
}

async function getAllowedDates(companyId ,cb){
    try{
        Company.findOne({_id : companyId }, 'allowedDates' , (err, resp)=>{
            if(err) throw new Error(err);
            if(!resp) cb({status : 1 , dates : []});
            else cb({status : 1 , dates : resp.allowedDates});
        }); 
    }catch(err){
        cb({status : 0 , message : err });
    }
}

const Company = mongoose.model('Company', companySchema);
module.exports = {
    Company,
    getCompanies,
    addCompany,
    updateCompany,
    deleteCompany,
    setAllowedDates,
    getAllowedDates
}
