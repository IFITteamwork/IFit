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
        videos.setVideoPoses(ctx.params.id,poses);
        ctx.rest(
        );
    },
    'GET /api/getVideoStream/:id':async (ctx, next) => {

    },
    'GET /api/getVideoConfig/:id':async(ctx,next)=>{
        console.log('get video config...');
        ctx.rest(
            videos.getVideoConfig(ctx.params.id)
        )
    }
}