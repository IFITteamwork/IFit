
const Sequelize = require('sequelize');
const config = require('config');

var sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: 'mysql',
    pool: {
        max: 5,
        min: 0,
        idle: 30000
    }
});

var Video = sequelize.define('videos',{
    id: Sequelize.STRING(10),
    sourceUrl: Sequelize.STRING(50),
    poseUrl: Sequelize.STRING(50)
},{
    timestamps: false
});

Video.create({
    id:'1',
    sourceUrl:'/public/videos/1.mp4',
    poseUrl:'/public/poses/1.txt'
}).then(function (p) {
    console.log('created.' + JSON.stringify(p));
}).catch(function (err) {
    console.log('failed: ' + err);
});

module.exports = {
    getVideoPoses:function () {

        var dataPath = path.resolve('o2.txt');

        var poseToString = fs.readFileSync(dataPath, 'utf-8');
        var pose = JSON.parse(poseToString);
        return pose;
    }
}