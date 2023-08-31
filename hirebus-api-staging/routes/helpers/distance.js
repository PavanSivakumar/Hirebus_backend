var request=require('request');

const distanceApi= async(lastOrigin , stopsLocation )=>{
    return new Promise(function (resolve, reject) {
        API_KEY = 'AIzaSyBcMIlCF4yCRP4GJ-PxA_5xxc4lpFEBysc'; 
        request.get(`https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${parseFloat(lastOrigin.lat)},${parseFloat(lastOrigin.lng)}&destinations=${parseFloat(stopsLocation.lat)},${parseFloat(stopsLocation.lng)}&key=${API_KEY}`, (err, response) => {
            if (err) {
                reject ( {status : 0 , distance : 0});
            }
            let resp = JSON.parse(response.body);
            resolve ({status : 1 , distance : resp.rows[0].elements[0].distance.value / 1000}); // in kilometres
        });
    })
}

const getDistance = async( locations , cb )=>{
    let promises = [];
    for (let i = 0; i < locations.length; i++) {
        promises.push(distanceApi(locations[i].a, locations[i].b));
    }
    let distances = await Promise.all(promises);
    let totalDistance = 0 ;
    for(const dist of distances){
        if(dist.status === 0) return cb({status : 0 , totalDistance : 0});
        totalDistance += dist.distance; 
    }
    return cb ({status : 1 , totalDistance : totalDistance });
}

module.exports= {
    getDistance,
}