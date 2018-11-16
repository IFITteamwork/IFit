var wholeMinScore=0.4;//全局最低置信度
var partMinScore=0.4;//局部最低置信度
//分析函数（暂时只分析大腿、小腿夹角）
function getAngle(json,wholeMinScore,partMinScore,pos_end1,pos_key,pos_end3){
    var Data=eval(json);//解析json
    var myjson=Data.keypoints;//读取关键点数组
    var trans=180/Math.PI;//弧度变角度
    if(Data.score<wholeMinScore){
        //console.log("全局置信度不足"+wholeMinScore);
        return -1;
    }
    var pos1;
    var pos2;
    var pos3;
    for(var i=0;i<myjson.length;i++){
        if(myjson[i].part==pos_end1)
            pos1=myjson[i];
        else if(myjson[i].part==pos_key)
            pos2=myjson[i];
        else if(myjson[i].part==pos_end3)
            pos3=myjson[i];
    }
    if(pos1.score>=partMinScore&&pos2.score>=partMinScore&&pos3.score>=partMinScore){
        //右边 肩膀手腕距离
        var dist_1=Math.sqrt(Math.pow((pos1.position.x-pos3.position.x),2)+Math.pow((pos1.position.y-pos3.position.y),2));
        //右边 肩膀手肘距离
        var dist_2=Math.sqrt(Math.pow((pos2.position.x-pos3.position.x),2)+Math.pow((pos2.position.y-pos3.position.y),2));
        //右边 手肘手腕距离
        var dist_3=Math.sqrt(Math.pow((pos1.position.x-pos2.position.x),2)+Math.pow((pos1.position.y-pos2.position.y),2));
        //余弦函数求右手大臂小臂的角度
        var Angle=Math.acos((Math.pow(dist_2,2)+Math.pow(dist_3,2)-Math.pow(dist_1,2))/(2*dist_2*dist_3))*trans;
        //alert(Angle);
        //角度为0~180
        return Angle;
    }else{
        //console.log(pos_end1+" "+pos_key+" "+pos_end3+"处局部置信度不足"+partMinScore);
        return -1;
    }

}
export function compareFrame(json1,json2,rate=0.3){
    //定义一个4*2的数组，用于存放两张图片的四肢对比
    //按左臂、右臂、左腿、右腿顺序存放
    var angles=new Array();
    for(var k=0;k<4;k++){
        angles[k]=new Array();
        for(var j=0;j<2;j++)
            angles[k][j]=-1;
    }
    angles[0][0]=getAngle(json1,wholeMinScore,partMinScore,"leftShoulder","leftElbow","leftWrist");
    angles[0][1]=getAngle(json2,wholeMinScore,partMinScore,"leftShoulder","leftElbow","leftWrist");
    angles[1][0]=getAngle(json1,wholeMinScore,partMinScore,"rightShoulder","rightElbow","rightWrist");
    angles[1][1]=getAngle(json2,wholeMinScore,partMinScore,"rightShoulder","rightElbow","rightWrist");
    angles[2][0]=getAngle(json1,wholeMinScore,partMinScore,"leftHip","leftKnee","leftAnkle");
    angles[2][1]=getAngle(json2,wholeMinScore,partMinScore,"leftHip","leftKnee","leftAnkle");
    angles[3][0]=getAngle(json1,wholeMinScore,partMinScore,"rightHip","rightKnee","rightAnkle");
    angles[3][1]=getAngle(json2,wholeMinScore,partMinScore,"rightHip","rightKnee","rightAnkle");

    const list = ['左胳膊','右胳膊','左腿','右腿'];

    var notice={};

    var isPass =true;
    for(var i=0;i<4;i++)
    {
        if(Math.abs(angles[i][0]/angles[i][1]-1)<rate){
            notice[list[i]]=list[i]+' 误差小于 '+rate;
        }
        else{
            isPass=false;
            // console.log("动作相差过大，不认为相同");
            notice[list[i]]=list[i]+'误差过大';
        }
    }

    var result={};

    result.isPass = isPass;
    result.notice = notice;

    return result;
}