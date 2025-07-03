import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

async function main() {
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(1000, 1000);
    document.body.appendChild(renderer.domElement);

    let camera;
    let meshToTexture = null; // Reference to the mesh

    try {
        const gltfLoader = new GLTFLoader();
        const gltf = await gltfLoader.loadAsync('./table-runner-test-02.glb');

        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                meshToTexture = child;
                child.material = new THREE.MeshBasicMaterial({
                    map: child.material.map,
                    transparent: true
                });
            }
        });
        scene.add(gltf.scene);

        if (gltf.cameras && gltf.cameras.length > 0) {
            camera = gltf.cameras[0];
        } else {
            camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
            camera.position.z = 5;
        }
        camera.aspect = 1;
        camera.updateProjectionMatrix();

    } catch (error) {
        console.error("Failed to load assets:", error);
        return;
    }

    // Composite function as before
    function compositeMeshMultiplyOverBackground() {
        const width = renderer.domElement.width;
        const height = renderer.domElement.height;
        const canvas2d = document.createElement('canvas');
        canvas2d.width = width;
        canvas2d.height = height;
        const ctx = canvas2d.getContext('2d');

        const bgImg = new window.Image();
        bgImg.src = './background.jpg';
        bgImg.onload = () => {
            ctx.drawImage(bgImg, 0, 0, width, height);

            const meshImg = new window.Image();
            meshImg.src = renderer.domElement.toDataURL('image/png');
            meshImg.onload = () => {
                const meshCanvas = document.createElement('canvas');
                meshCanvas.width = width;
                meshCanvas.height = height;
                const meshCtx = meshCanvas.getContext('2d');
                meshCtx.drawImage(meshImg, 0, 0, width, height);

                const maskImg = new window.Image();
                maskImg.src = './mask.png';
                maskImg.onload = () => {
                    meshCtx.globalCompositeOperation = 'destination-in';
                    meshCtx.drawImage(maskImg, 0, 0, width, height);
                    meshCtx.globalCompositeOperation = 'source-over';

                    ctx.globalCompositeOperation = 'multiply';
                    ctx.drawImage(meshCanvas, 0, 0, width, height);
                    ctx.globalCompositeOperation = 'source-over';

                    const highlightsImg = new window.Image();
                    highlightsImg.src = './highlights.png';
                    highlightsImg.onload = () => {
                        ctx.globalCompositeOperation = 'screen';
                        ctx.drawImage(highlightsImg, 0, 0, width, height);
                        ctx.globalCompositeOperation = 'source-over';

                        const container = document.getElementById('container');
                        container.insertBefore(canvas2d, document.getElementById('sidebar'));
                        renderer.domElement.style.display = 'none';
                    };
                };
            };
        };
    }

    // Initial render and composite
    renderer.render(scene, camera);
    compositeMeshMultiplyOverBackground();

    const patternInput = document.getElementById('patternInput');
    const filenamePreview = document.getElementById('filenamePreview');
    const patternPreview = document.getElementById('patternPreview');

    patternInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        filenamePreview.textContent = file ? file.name : '';
        if (!file) return;
        const url = URL.createObjectURL(file);
        patternPreview.src = url;

        if (!meshToTexture) return;

        const loader = new THREE.TextureLoader();
        loader.load(url, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.minFilter = THREE.LinearMipMapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            texture.generateMipmaps = true;
            texture.needsUpdate = true;

            meshToTexture.material.map = texture;
            meshToTexture.material.needsUpdate = true;

            // Remove previous composite canvas if present
            document.querySelectorAll('canvas:not([data-threejs])').forEach(c => c.remove());

            // Re-render and re-composite
            renderer.render(scene, camera);
            compositeMeshMultiplyOverBackground();

            URL.revokeObjectURL(url);
        });
    });
}

main();
