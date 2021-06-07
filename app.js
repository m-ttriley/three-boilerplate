import * as THREE from 'three';
import point from './textures/sprites/cogs.png';

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

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

let particleSystem, uniforms, geometry;

let particles = 0;

initVideo();
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
  console.log(imageData);
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
  const r = 0.05;
  const g = 0.05;
  const b = 0.05;
  if (particleSystem) {
    // particleSystem.rotation.z = 0.005 * time;
    // particleSystem.material.uniforms.rotationX.value += 0.001;
    const positions = geometry.attributes.position.array;
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
                  positions[i] = gray * r * 5;

                } else if (gray < threshold / 2) {
                  positions[i] = gray * g * 5;

                } else {
                  positions[i] = gray * b * 5;
                }
            } else {
              positions[i] = 10000;
            }
    }

    geometry.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }
}