

module.exports = {
    getVideoPoses:function () {

        var dataPath = path.resolve('o2.txt');

        var poseToString = fs.readFileSync(dataPath, 'utf-8');
        var pose = JSON.parse(poseToString);
        return pose;
    }
}