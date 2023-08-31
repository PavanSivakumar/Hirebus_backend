const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let masterCity = new Schema({ 
        name: String, 
        state: String, 
        id: String
    }, 
    { collection : 'masterCities' }    
);
const MasterCity = mongoose.model('MasterCity', masterCity);
module.exports = {
    MasterCity,
}