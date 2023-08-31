const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let citySchema = new Schema({
  cityName: {
    type: String,
    required: true,
    maxlength: 300,
  },
  state: {
    type: String,
    required: true,
    maxlength: 300,
  },
  images: [
    {
      type: String,
      maxlength: 4000,
    },
  ],
  information: {
    type: String,
  },
  thingsToDo: [
    {
      type: String,
    },
  ],
  isEnabled: {
    type: Boolean,
    default: true,
  },
});

async function getCities(state, pageNumber) {
  try {
    let cities = await City.find({ state: state })
      .sort({ $natural: -1 })
      .skip(15 * pageNumber)
      .limit(15);
    if (!cities) {
      throw new Error("No cities found!");
    }
    return { status: 1, cities: cities };
  } catch (err) {
    return { status: 0, cities: NULL, message: err.message };
  }
}

async function addCity(cityObj) {
  try {
    let city = await City(cityObj).save();
    if (!city) {
      throw new Error("City has not been added");
    }
    return { status: 1, city: city };
  } catch (err) {
    return { status: 0, city: NULL, message: err.message };
  }
}

async function updateCity(cityId, cityObj) {
  try {
    let city = await City.findOneAndUpdate({ _id: cityId }, cityObj);
    if (!city) {
      throw new Error("No city found!");
    }
    return { status: 1, city: city };
  } catch (err) {
    return { status: 0, city: NULL, message: err.message };
  }
}

async function deleteCity(cityId) {
  try {
    City.findOneAndRemove({ _id: cityId }).exec((err, res) => {
      if (err) throw new Error("City has not been deleted!");
    });
    return { status: 1, message: "City has been deleted!" };
  } catch (err) {
    return { status: 0, city: NULL, message: err.message };
  }
}

const City = mongoose.model("City", citySchema);
module.exports = {
  City,
  getCities,
  addCity,
  updateCity,
  deleteCity,
};
