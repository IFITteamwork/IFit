const APIError = require('../rest').APIError;

module.exports = {
    'GET /api/getVideoList': async (ctx, next) => {
        ctx.rest(
            video.getVideoPoses()
        );
    },
    'GET /api/getVideoPoses':async (ctx, next) => {
        ctx.rest({
            videoSteam:videos.getVideoPoses()
        });
    }
}