import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// We wrap everything in an async function to use 'await'.
// This makes handling loaded files much cleaner and safer.
async function main() {
  // 1. Basic Scene Setup
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(1000, 1000);
  document.body.appendChild(renderer.domElement);

  let camera;
  let backgroundTexture; // We'll store the texture here to access it on resize

  /**
   * This function calculates the correct offset and repeat values for the texture
   * to make it fit the screen without stretching, just like `background-size: contain`.
   * The image will be centered with letterboxing if the aspect ratios don't match.
   */
  function updateBackgroundContain(texture, renderer) {
    const canvas = renderer.domElement;
    const canvasAspect = canvas.clientWidth / canvas.clientHeight;
    const imageAspect = texture.image.width / texture.image.height;

    if (canvasAspect > imageAspect) {
      // Viewport is wider than the image. Fit to height, letterbox on sides.
      texture.repeat.x = imageAspect / canvasAspect;
      texture.repeat.y = 1;
      texture.offset.x = (1 - texture.repeat.x) / 2;
      texture.offset.y = 0;
    } else {
      // Viewport is taller than or same aspect as the image. Fit to width, letterbox on top/bottom.
      texture.repeat.x = 1;
      texture.repeat.y = canvasAspect / imageAspect;
      texture.offset.x = 0;
      texture.offset.y = (1 - texture.repeat.y) / 2;
    }
  }

  // 2. Load All Assets Concurrently
  try {
    const textureLoader = new THREE.TextureLoader();
    const gltfLoader = new GLTFLoader();

    // Use Promise.all to load everything at once for better performance.
    const [loadedTexture, gltf] = await Promise.all([
      textureLoader.loadAsync('/background.jpg'),
      gltfLoader.loadAsync('/table-runner-test.glb')
    ]);

    // 3. Set Up Background
    backgroundTexture = loadedTexture;
    scene.background = backgroundTexture;
    updateBackgroundContain(backgroundTexture, renderer); // Set initial state

    // 4. Set Up Model and Camera
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshBasicMaterial({
          map: child.material.map
        });
      }
    });
    scene.add(gltf.scene);

    if (gltf.cameras && gltf.cameras.length > 0) {
      camera = gltf.cameras[0];
    } else {
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 5;
    }
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

  } catch (error) {
    console.error("Failed to load assets:", error);
    return; // Stop if loading fails
  }

  const BG_WIDTH = 1000;   // Set to your background image width
  const BG_HEIGHT = 1000;  // Set to your background image height
  const BG_ASPECT = BG_WIDTH / BG_HEIGHT;

  // function resizeRendererToDisplaySize(renderer) {
  //     const windowAspect = window.innerWidth / window.innerHeight;
  //     let width, height;

  //     if (windowAspect > BG_ASPECT) {
  //         // Window is wider than image: fit height
  //         height = window.innerHeight;
  //         width = height * BG_ASPECT;
  //     } else {
  //         // Window is taller than image: fit width
  //         width = window.innerWidth;
  //         height = width / BG_ASPECT;
  //     }

  //     renderer.setSize(width, height, false);

  //     // Center the canvas
  //     const canvas = renderer.domElement;
  //     canvas.style.position = 'absolute';
  //     canvas.style.left = `${(window.innerWidth - width) / 2}px`;
  //     canvas.style.top = `${(window.innerHeight - height) / 2}px`;
  // }

  // // 5. Set up Event Listeners and Animation
  // window.addEventListener('resize', () => {
  //     resizeRendererToDisplaySize(renderer);
  //     camera.aspect = BG_ASPECT;
  //     camera.updateProjectionMatrix();
  //     // Also update the background on resize
  //     if (backgroundTexture) {
  //         updateBackgroundContain(backgroundTexture, renderer);
  //     }
  // });

  // // Initial call
  // resizeRendererToDisplaySize(renderer);
  camera.aspect = BG_ASPECT;
  camera.updateProjectionMatrix();

  // After your scene is set up and the first render is complete:
  function animate() {
    renderer.render(scene, camera);

    // Composite only once, after the first render
    if (!window._composited) {
      window._composited = true;
      compositeMeshWithBackgroundAndMask();
    }

    requestAnimationFrame(animate);
  }
  animate();
}

function compositeMeshWithBackgroundAndMask() {
  const width = renderer.domElement.width;
  const height = renderer.domElement.height;
  const canvas2d = document.createElement('canvas');
  canvas2d.width = width;
  canvas2d.height = height;
  const ctx = canvas2d.getContext('2d');

  // 1. Draw the background
  const bgImg = new window.Image();
  bgImg.src = '/background.jpg';
  bgImg.onload = () => {
    ctx.drawImage(bgImg, 0, 0, width, height);

    // 2. Draw the mesh render
    const meshImg = new window.Image();
    meshImg.src = renderer.domElement.toDataURL('image/png');
    meshImg.onload = () => {
      ctx.drawImage(meshImg, 0, 0, width, height);

      // 3. Apply the mask
      const maskImg = new window.Image();
      maskImg.src = '/mask.png';
      maskImg.onload = () => {
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskImg, 0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';

        // 4. Show or use the result
        document.body.appendChild(canvas2d);
      };
    };
  };
}

// Run the main function to start the application.
main();
