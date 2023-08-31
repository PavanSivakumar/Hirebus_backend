const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let settingsSchema = new Schema({
    perDayCoverageInKms: {
        type: Number,
        default: 350
    },
});

async function updateSettings(coverage, cpObj) {
    try {
        let setting = await Settings.findOneAndReplace({ _id: '64037200244f79175c0db9e8' }, { perDayCoverageInKms: coverage })
        if (!setting) {
            cpObj({ status: 0, message: "Unable to update settings!" });
        }
        cpObj({ status: 1, settings: setting });
    }
    catch (err) {
        cpObj({ status: 0, message: err.message });
    }
}

async function getSettings() {
    try {
        let res = await Settings.findOne({_id: '64037200244f79175c0db9e8'});

        console.log(res)
        if (!res) return ({ status: 0, message: "Unable to get Settings!" });
        return ({ status: 1, settings: res });
    }
    catch (err) {
        return ({ status: 0, message: err.message });
    }
}

const Settings = mongoose.model('Setting', settingsSchema);
module.exports = {
    Settings,
    getSettings,
    updateSettings,
}