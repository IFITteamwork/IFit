const APIError = require('../rest').APIError;

module.exports = {
    'GET /api/getVideoUrl': async (ctx, next) => {

    },
    'GET /api/getVideoPoses':async (ctx, next) => {
        ctx.rest({
            videoSteam:videos.getVideoPoses()
        });
    }
}