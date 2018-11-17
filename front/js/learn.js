/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import * as posenet from '@tensorflow-models/posenet';
import Stats from 'stats.js';
import {drawKeypoints, drawSkeleton} from './util';
import $ from 'jquery';
import {compareFrame} from "./compare";

const videoWidth = 600;
const videoHeight = 500;
const stats = new Stats();

function isAndroid() {
    return /Android/i.test(navigator.userAgent);
}

function isiOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
    return isAndroid() || isiOS();
}

/**
 * Loads a the camera
 */
async function setupCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
            'Browser API navigator.mediaDevices.getUserMedia not available');
    }

    const camera = document.getElementById('camera');
    camera.width = videoWidth;
    camera.height = videoHeight;

    const mobile = isMobile();

    const stream = await navigator.mediaDevices.getUserMedia({
        'audio': false,
        'video': {
            facingMode: 'user',
            width: mobile ? undefined : videoWidth,
            height: mobile ? undefined : videoHeight,
        },
    });
    camera.srcObject = stream;

    return new Promise((resolve) => {
        camera.onloadedmetadata = () => {
            resolve(camera);
        };
    });
}

async function loadCamera() {
    const camera = await setupCamera();
    camera.play();

    return camera;
}

/**
 * set up video whose source from back
 */

async function setupVideos() {
    const video = document.getElementById('video');

    video.crossOrigin= "Anonymous";
    video.src = videoConfig.videoStreamURL+'/'+videoConfig.videoID;

    video.addEventListener('play',function () {
        videoConfig.videoState='play';
    });

    video.addEventListener('pause',function () {
        videoConfig.videoState='pause';
    });

    video.addEventListener('ended',function () {
        videoConfig.videoState='ended';
        video.pause();
    });



    return video;
}

/**
 * Loads a video
 */

async function loadVideo() {
    const video = await setupVideos();

    return video;
}

const videoConfig ={
    videoID:'1 ',
    videoStreamURL:'http://localhost:3000/stream/videos',
    videoPoseAPI:'http://localhost:1234/api/getVideoPoses',
    videoState:'ended',
}

const netState = {
    algorithm: 'single-pose',
    isPoseOut:'false',
    input: {
        mobileNetArchitecture: isMobile() ? '0.50' : '0.75',
        outputStride: 16,
        imageScaleFactor: 0.5,
    },
    singlePoseDetection: {
        minPoseConfidence: 0.1,
        minPartConfidence: 0.5,
    },
    multiPoseDetection: {
        maxPoseDetections: 5,
        minPoseConfidence: 0.15,
        minPartConfidence: 0.1,
        nmsRadius: 30.0,
    },
    output: {
        showVideo: true,
        showSkeleton: true,
        showPoints: true,
        showBoundingBox: false,
    },
    net: null,
};

/**
 * Sets up dat.gui controller on the top-right of the window
 */
function setupGui(video,cameras, net) {
    netState.net = net;

    let button = document.getElementById('play');
    button.onclick = function () {
        if(videoConfig.videoState=='pause'||videoConfig.videoState=='ended'){
            video.play();
        }
        else{
            video.pause();
        }
    };

    if (cameras.length > 0) {
        netState.camera = cameras[0].deviceId;
    }
}

/**
 * Sets up a frames per second panel on the top-left of the window
 */
function setupFPS() {
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom);
}

/**
 * get poses saved at back
 *
 */
async function getPosesFromBack() {
    let poses = null;

    var jqxhr = await $.ajax(videoConfig.videoPoseAPI+'/'+videoConfig.videoID,{
        dataType:'json',
        type:'GET'
    }).done((data)=>{
        poses=data;
    }).fail((xhr,status)=>{
        console.log('fail: ' + xhr.status + ', by reason: ' + status);
    });

    console.log(poses);

    return poses;
}

async function preprocessPoses(poses) {
    let timeList =[];

    await poses.forEach(({pose,time})=>{
       timeList.push(time);
    });

    return timeList;
}

var lastPos =0;

function comparePoseByVideoCurrentTime(video,cameraPose,videoPoses,timeList) {
    //output div
    let output = document.getElementById('output-txt');
    let videoPose = null;
    output.textContent='';

    //if video is no ended
    if (videoConfig.videoState!='ended'){
        let index;
        for(var i=lastPos;i<timeList.length;i++) {
            if (timeList[i] > video.currentTime) {
                lastPos = index = i-1;
                break;
            }
        }

        if (index!=-1){
            videoPose = videoPoses[index].pose;
            let result = compareFrame(cameraPose,videoPose,0.5);

            console.log('currentTime: '+video.currentTime+'choose: '+timeList[index]);

            let notice=result.notice;
            let isPass=result.isPass;

            // if (isPass){
            //     video.play();
            // }
            // else{
            //     video.pause();
            // }

            for (var key in notice){
                output.textContent += key+': '+notice[key]+'\t' ;
            }
        }
    }

    return videoPose;
}


/**
 * Feeds an image to posenet to estimate poses - this is where the magic
 * happens. This function loops with a requestAnimationFrame method.
 */
function detectPoseInRealTime(video,camera,net,inputPoses,timeList) {
    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');
    // since images are being fed from a webcam
    const flipHorizontal = true;

    const vCanvas = document.getElementById('vo');
    const vctx = vCanvas.getContext('2d');

    vCanvas.width = canvas.width =  videoWidth;
    vCanvas.height = canvas.height = videoHeight;

    // let video = document.getElementById('video');

    async function poseDetectionFrame() {
        if (netState.changeToArchitecture) {
            // Important to purge variables and free up GPU memory
            netState.net.dispose();

            // Load the PoseNet model weights for either the 0.50, 0.75, 1.00, or 1.01
            // version
            netState.net = await posenet.load(+netState.changeToArchitecture);

            netState.changeToArchitecture = null;
        }

        // Begin monitoring code for frames per second
        stats.begin();

        // Scale an image down to a certain factor. Too large of an image will slow
        // down the GPU
        const imageScaleFactor = netState.input.imageScaleFactor;
        const outputStride = +netState.input.outputStride;

        let poses = [];
        let minPoseConfidence;
        let minPartConfidence;

        const pose= await netState.net.estimateSinglePose(
            camera, imageScaleFactor, flipHorizontal, outputStride);
        poses.push(pose);

        minPoseConfidence = +netState.singlePoseDetection.minPoseConfidence;
        minPartConfidence = +netState.singlePoseDetection.minPartConfidence;

        ctx.clearRect(0, 0, videoWidth, videoHeight);
        //vctx.clearRect(0,0,videoWidth,videoHeight);

        if (netState.output.showVideo) {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-videoWidth, 0);
            ctx.drawImage(camera, 0, 0, videoWidth, videoHeight);
            ctx.restore();

            vctx.save();
            vctx.drawImage(video, 0 , 0, videoWidth, videoHeight);
            vctx.restore();
        }



        // For each pose (i.e. person) detected in an image, loop through the poses
        // and draw the resulting skeleton and keypoints if over certain confidence
        // score

        let videoPose;

        poses.forEach((pose) => {
            if (pose.score >= minPoseConfidence) {
                // if (netState.isPoseOut=='true') {
                //     console.log(pose.keypoints);
                // }
                videoPose = comparePoseByVideoCurrentTime(video,pose,inputPoses,timeList);
                if (netState.output.showPoints) {
                    drawKeypoints(pose.keypoints, minPartConfidence, ctx);
                }
                if (netState.output.showSkeleton) {
                    drawSkeleton(pose.keypoints, minPartConfidence, ctx);
                }
                
                if (videoPose) {
                    drawKeypoints(videoPose.keypoints,minPartConfidence,vctx);
                    drawSkeleton(videoPose.keypoints, minPartConfidence,vctx);
                }
            }
        });

        // End monitoring code for frames per second
        stats.end();

        requestAnimationFrame(poseDetectionFrame);
    }

    poseDetectionFrame();
}

/**
 * Kicks off the demo by loading the posenet model, finding and loading
 * available camera devices, and setting off the detectPoseInRealTime function.
 */
export async function bindPage() {
    // Load the PoseNet model weights with architecture 0.75
    const net = await posenet.load(0.75);

    document.getElementById('video').style.display = 'none';
    // document.getElementById('main').style.display = 'block';

    let video;

    try {
        video = await loadVideo()
    }catch (e) {
        let info = document.getElementById('info');
        info.textContent = 'cannot find video file from back';
        info.style.display = 'block';
        throw  e;
    }

    let poses;
    let timeList;

    try {
        poses = await getPosesFromBack();
        timeList = await preprocessPoses(poses);
        console.log(timeList);
    }
    catch (e) {
        let info = document.getElementById('info');
        info.textContent = 'cannot find poses file of video';
        info.style.display = 'block';
        throw  e;
    }

    let camera;

    try {
        camera = await loadCamera();
    } catch (e) {
        let info = document.getElementById('info');
        info.textContent = 'this browser does not support video capture,' +
            'or this device does not have a camera';
        info.style.display = 'block';
        throw e;
    }


    setupGui(video ,[], net);
    setupFPS();
    try {
        detectPoseInRealTime(video,camera , net , poses,timeList);
    }
    catch (e) {
        throw e;
    }
}

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
// kick off the demo
bindPage();
