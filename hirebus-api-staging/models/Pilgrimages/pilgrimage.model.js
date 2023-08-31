const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let pilgrimageSchema = new Schema({
    cityName : {
        type : String,
        required : true,
        maxlength : 300,
    },
    state : {
        type : String,
        required :true,
        maxlength : 300,
    },
    images : [{
        type : String ,
        maxlength : 4000,
    }],
    information :{
        type :String,
    },
    pilgrimagesToVisit :[{
        type : String,
    }]
});

async function getPilgrimages(state , pageNumber){
    try{
        let pilgrimages = await Pilgrimage.find({state : state}).sort({ "$natural": -1 }).skip(15*pageNumber).limit(15);
        if(!pilgrimages){
            throw new Error("No pilgrimages found!");
        }
        return ({status : 1 ,  pilgrimages : pilgrimages });
    }
    catch(err){
        return ({status : 0 , pilgrimages : NULL , message : err.message});
    }
}


async function addPilgrimage(pilgrimageObj){
    try{
        let pilgrimage = await Pilgrimage(pilgrimageObj).save();
        if(!pilgrimage){
            throw new Error("pilgrimage has not been added");
        }
        return ({status : 1 ,  pilgrimage : pilgrimage });
    }
    catch(err){
        return ({status : 0 , pilgrimage : NULL , message : err.message});
    }
}

async function updatePilgrimage(pilgrimageId, pilgrimageObj){
    try{
        let pilgrimage = await Pilgrimage.findOneAndUpdate({_id : pilgrimageId} , pilgrimageObj)
        if(!pilgrimage){
            throw new Error("No pilgrimage found!");
        }
        return ({status : 1 ,  pilgrimage : pilgrimage });
    }
    catch(err){
        return ({status : 0 , pilgrimage : NULL , message : err.message});
    }
}

async function deletePilgrimage( pilgrimageId ){
    try{
        await Pilgrimage.findOneAndDelete({_id : pilgrimageId });
        return ({status : 1 ,  message : "Pilgriamge has been deleted!"});
    }
    catch(err){
        return ({status : 0 , pilgrimage : NULL , message : err});
    }
}


const Pilgrimage = mongoose.model('Pilgrimage', pilgrimageSchema);
module.exports = {
    Pilgrimage,
    getPilgrimages,
    addPilgrimage,
    updatePilgrimage,
    deletePilgrimage,
}
