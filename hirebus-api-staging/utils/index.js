const moment = require('moment')

const getDriverAllowance = (startDate, startTime, returnDate, returnTime) => {
    let start = moment(`${startDate} ${startTime}`, 'DD-MM-YYYY HH:mm');
    let end = moment(`${returnDate} ${returnTime}`, 'DD-MM-YYYY HH:mm');
    return 700 * Math.ceil(moment.duration(end.diff(start)).asHours() / 24);
}

const getDaysDifference = (startDate, startTime, returnDate, returnTime) => {
    let start = moment(`${startDate} ${startTime}`, 'DD-MM-YYYY HH:mm');
    let end = moment(`${returnDate} ${returnTime}`, 'DD-MM-YYYY HH:mm');
    console.log('start...', `${startDate} ${startTime}`);
    console.log('end...', `${returnDate} ${returnTime}`);
    return Math.ceil(moment.duration(end.diff(start)).asHours() / 24);
}

const getBaseURL = () => {
    return `${req.protocol}://${req.get('host')}/v1/`
}

module.exports = {
    getDriverAllowance,
    getDaysDifference,
    getBaseURL
};