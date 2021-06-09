import * as THREE from 'three';
import point from './textures/sprites/cogs.png';
import songFile from './assets/MB.mp3';

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

/**
 * https://github.com/processing/p5.js-sound/blob/v0.14/lib/p5.sound.js#L1765
 *
 * @param data
 * @param _frequencyRange
 * @returns {number} 0.0 ~ 1.0
 */
 const getFrequencyRangeValue = (data, _frequencyRange) => {
  const nyquist = 48000 / 2;
  const lowIndex = Math.round(_frequencyRange[0] / nyquist * data.length);
  const highIndex = Math.round(_frequencyRange[1] / nyquist * data.length);
  let total = 0;
  let numFrequencies = 0;

  for (let i = lowIndex; i <= highIndex; i++) {
      total += data[i];
      numFrequencies += 1;
  }
  return total / numFrequencies / 255;
};

const fftSize = 2048;
const frequencyRange = {
  bass: [20, 140],
  lowMid: [140, 400],
  mid: [400, 2600],
  highMid: [2600, 5200],
  treble: [5200, 14000],
};

const getImageData = (image, useCache) => {
  if (useCache & imageCache) {
    return imageCache;
  }

  const w = image.videoWidth;
  const h = image.videoHeight;

  canvas.width = w;
  canvas.height = h;

  ctx.translate(w, 0);
  ctx.scale(-1, 1);

  ctx.drawImage(image, 0, 0);
  imageCache = ctx.getImageData(0, 0, w, h);

  return imageCache;
};

let renderer, scene, camera, video;
let videoWidth, videoHeight, imageCache;
let audioListener, audio, audioLoader, analyser;

let particleSystem, uniforms, geometry;

let particles = 0;

initVideo();
initAudio();
animate();

function initVideo() {
  video = document.getElementById("video");
  video.autoplay = true;

  const option = {
    video: true,
    audio: false,
  };

  navigator.mediaDevices.getUserMedia(option)
    .then((stream) => {
      video.srcObject = stream;
      video.addEventListener("loadeddata", () => {
        videoWidth = video.videoWidth;
        videoHeight = video.videoHeight;

        init();
      });
    })
    .catch((error) => {
      console.log(error);
      showAlert();
    });
};

function initAudio() {
  audioListener = new THREE.AudioListener();
  audio = new THREE.Audio(audioListener);
  audioLoader = new THREE.AudioLoader();

  audioLoader.load(songFile, (buffer) => {
    audio.setBuffer(buffer);
    audio.setLoop(true);
    audio.play();
    audio.setVolume(0.2);
  });

  analyser = new THREE.AudioAnalyser(audio, fftSize);

  document.body.addEventListener('click', function () {
    if (audio) {
        if (audio.isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
    }
  });
}

function init() {
  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.z = 100;

  scene = new THREE.Scene();

  uniforms = {
    pointTexture: { value: new THREE.TextureLoader().load(point) },
    rotationX:  { type: "f", value: 0.2 },
  };

  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.getElementById( 'vertexshader' ).textContent,
		fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true,
    vertexColors: true
  });


  const radius = 200;

  geometry = new THREE.BufferGeometry();

  const positions = [];
  const colors = [];
  const sizes = [];

  const color = new THREE.Color();
  const imageData = getImageData(video);

  for ( let y = 0, height = imageData.height; y < height; y += 1) {
    for (let x = 0, width = imageData.width; x < width; x += 1) {
      // const pixel = (x + y) * 3;
      positions.push(x - imageData.width / 2);
      positions.push(-y + imageData.height / 4);
      positions.push(0);

      color.setHSL(0.5, 1.0, 0.75);

      colors.push(color.r, color.g, color.b);
      // colors.push(imageData.data[pixel], imageData.data[pixel + 1], imageData.data[pixel + 2])

      // sizes.push((Math.random() * 25) + 2);
      sizes.push(20);
      particles++;
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));

  particleSystem = new THREE.Points(geometry, shaderMaterial);

  scene.add(particleSystem);

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const container = document.getElementById('container');
  container.appendChild(renderer.domElement);

  //

  window.addEventListener('resize', onWindowResize);

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

  requestAnimationFrame(animate);

  render();

}

function render() {
  const time = Date.now() * 0.005;
  const density = 2;
  const useCache = parseInt(time) % 2 === 0;  // To reduce CPU usage.
  const imageData = getImageData(video, useCache);
  let r, g, b;
  if (analyser) {
    // analyser.getFrequencyData() would be an array with a size of half of fftSize.
    const data = analyser.getFrequencyData();

    const bass = getFrequencyRangeValue(data, frequencyRange.bass);
    const mid = getFrequencyRangeValue(data, frequencyRange.mid);
    const treble = getFrequencyRangeValue(data, frequencyRange.highMid);

    r = bass;
    g = mid;
    b = treble;
  }

  if (particleSystem) {
    // particleSystem.rotation.z = 0.005 * time;
    // particleSystem.material.uniforms.rotationX.value += 0.001;
    const positions = geometry.attributes.position.array;
    const colors = geometry.attributes.color.array;

    for (let i = 2; i < positions.length; i += 3) {
      if (i % density !== 0) {
                positions[i] = 10000;
                continue;
            }
            let index = i * 4;
            let gray = (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
            let threshold = 300;
            if (gray < threshold) {
                if (gray < threshold / 3) {
                  positions[i] = gray * 0.05 * 5 + (r * 2);

                } else if (gray < threshold / 2) {
                  positions[i] = gray * 0.05 * 5 + (g * 2);

                } else {
                  positions[i] = gray * 0.05 * 5 + (b * 2);
                }
            } else {
              positions[i] = 10000;
            }
    }

    for (let j = 0; j < colors.length; j += 3) {
      colors[j] = Math.random() * (b * 2);
      colors[j + 1] = Math.random() * (b * 2);
      colors[j + 2] = Math.random() * (g * 2);
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    renderer.render(scene, camera);
  }
}