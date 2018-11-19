const fs = require('fs');
const path = require('path');
const probe = require('node-ffprobe');



module.exports={
    setVideoPoses:function (id,poses) {
        var dataPath = path.resolve('./public/poses/'+id+'.json');
        console.log(dataPath);
        //  var dataPath = path.resolve('output.json');
        try {
            fs.writeFileSync(dataPath,poses);
        }
        catch (e) {
            console.log(e);
        }
        return {};
    }
    ,
    getVideoPoses:function (id) {
        var dataPath = path.resolve('./public/poses/'+id+'.json');
        // var dataPath = path.resolve('output.json');
        var poseToString = fs.readFileSync(dataPath, 'utf-8');
        var pose = JSON.parse(poseToString);
        return pose;
    },
    getVideoConfig:function (id) {
        const filePath = path.resolve('./public/videos/'+id+'.mp4');
        // var stream = fs.createReadStream(filePath)
        let config;
        probe(filePath,function (err,probeData) {
            console.log(probeData);
        });
        return config;
    }
}