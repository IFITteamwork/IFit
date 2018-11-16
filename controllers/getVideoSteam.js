const fs = require('fs');
const path = require('path');
const PassThrough = require('stream').PassThrough;

var getVideo = async (ctx,next)=>{
    //const filePath = files.find({_id: id});
    const filePath = path.resolve(__dirname,'../public/videos/'+ctx.params.id+'.mp4');

    let stat = fs.statSync(filePath);
    let fileSize = stat.size;
    console.log(fileSize);
    let range = ctx.request.headers.range;
    console.log(range);
    if (range){
        let parts = range.replace(/bytes=/, "").split("-");
        let start = parseInt(parts[0], 10);
        let end = parts[1] ? parseInt(parts[1], 10) : start + 999999;
        console.log(start);
        console.log(end);

        end = end > fileSize - 1 ? fileSize - 1 : end;
        let chunksize = (end - start) + 1;
        let file = fs.createReadStream(filePath, {start, end });
        let head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin':'*'
        }
        ctx.body= file;
        ctx.status = 206;
        ctx.response.set(head);

    }
    else{
        let head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        ctx.response.status=200;
        ctx.response.head = head;
        fs.createReadStream(filePath);
    }

};

module.exports = {
    'GET /stream/videos/:id':getVideo
};