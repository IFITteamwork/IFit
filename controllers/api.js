const videos = require('../video')

const APIError = require('../rest').APIError;

module.exports = {
    'GET /api/getVideoPoses/:id':async (ctx, next) => {
        console.log('get video poses ...')
        ctx.rest(
            videos.getVideoPoses(ctx.params.id)
        );
    },
    'POST /api/setVideoPoses/:id':async (ctx, next) => {
        console.log('set video poses from ${ctx.params.id}...');
        const poses = JSON.stringify(ctx.request.body,null,'  ');
        // console.log(typeof poses);
        // let poseJson = JSON.parse(poses);
        videos.setVideoPoses(ctx.params.id,poses);
        ctx.rest(
        );
    }
}