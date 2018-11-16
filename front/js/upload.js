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
import $ from 'jquery'

//define video width
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
 * set up video whose source from back
 */

async function setupVideos() {
    const video = document.getElementById('video');

    video.width=videoWidth;
    video.height=videoHeight;

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
        console.log(totalPoses);
        sendPoseJsonToBack(totalPoses);
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
    videoID:'6',
    videoStreamURL:'http://localhost:3000/stream/videos',
    videoPoseAPI:'http://localhost:1234/api/setVideoPoses',
    videoState:'ended',
}

const netState = {
    algorithm: 'single-pose',
    isPoseOut:'true',
    input: {
        mobileNetArchitecture: '1.00',
        outputStride: 8,
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
function setupGui(cameras, net) {
    netState.net = net;

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
 * send poses file to back
 */
function sendPoseJsonToBack(poses) {
    $.ajax({
        type: 'post',
        dataType: 'json',
        contentType: 'application/json',
        url: videoConfig.videoPoseAPI+'/'+videoConfig.videoID,
        data: JSON.stringify(poses)
    }).done(function (r) {
        console.log('success!');
    }).fail(function (jqXHR, textStatus) {
        // Not 200:
        alert('Error: ' + jqXHR.status);
    });
}

let totalPoses = [];

/**
 * Feeds an image to posenet to estimate poses - this is where the magic
 * happens. This function loops with a requestAnimationFrame method.
 */
function detectPoseInRealTime(video, net) {
    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');
    // since images are being fed from a webcam
    const flipHorizontal = false;

    canvas.width = videoWidth;
    canvas.height = videoHeight;


    async function poseDetectionFrame() {
        if (netState.changeToArchitecture) {
            // Important to purge variables and free up GPU memory
            netState.net.dispose();

            // Load the PoseNet model weights for either the 0.50, 0.75, 1.00, or 1.01
            // version
            netState.net = await posenet.load(+netState.changeToArchitecture);

            netState.changeToArchitecture = null;
        }


        // Scale an image down to a certain factor. Too large of an image will slow
        // down the GPU
            // Begin monitoring code for frames per second
            stats.begin();

            const imageScaleFactor = netState.input.imageScaleFactor;
            const outputStride = +netState.input.outputStride;

            let poses = [];
            let minPoseConfidence;
            let minPartConfidence;

            const poseES = await netState.net.estimateSinglePose(
                video, imageScaleFactor, flipHorizontal, outputStride);

            let pose = {
                'pose':poseES,
                'time':(video.currentTime).toFixed(2)
            }
            poses.push(pose);

            minPoseConfidence = +netState.singlePoseDetection.minPoseConfidence;
            minPartConfidence = +netState.singlePoseDetection.minPartConfidence;

            ctx.clearRect(0, 0, videoWidth, videoHeight);

            if (netState.output.showVideo) {
                ctx.save();
                // ctx.scale(-1, 1);
                // ctx.translate(-videoWidth, 0);
                ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
                ctx.restore();
            }

            // For each pose (i.e. person) detected in an image, loop through the poses
            // and draw the resulting skeleton and keypoints if over certain confidence
            // scores
            poses.forEach(({pose, time}) => {
                if (videoConfig.videoState=='play'){
                    console.log({pose,time});
                    totalPoses.push({pose,time});
                }
                if (pose.score >= minPoseConfidence) {
                    if (netState.output.showPoints) {
                        drawKeypoints(pose.keypoints, minPartConfidence, ctx);
                    }
                    if (netState.output.showSkeleton) {
                        drawSkeleton(pose.keypoints, minPartConfidence, ctx);
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

    document.getElementById('loading').style.display = 'none';
    document.getElementById('main').style.display = 'block';

    let video;

    try {
        video = await setupVideos();
    } catch (e) {
        let info = document.getElementById('info');
        info.textContent = 'cannot catch videos';
        info.style.display = 'block';
        throw e;
    }

    setupGui([], net);
    setupFPS();
    try {
        detectPoseInRealTime(video, net);
    }
    catch (e) {
        throw e;
    }
}

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
// kick off the demo
bindPage();
