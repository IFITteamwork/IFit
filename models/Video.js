const db = require('../db');

module.exports = db.defineModel('videos',{
    sourceUrl: Sequelize.STRING(50),
    poseUrl: Sequelize.STRING(50)
});
