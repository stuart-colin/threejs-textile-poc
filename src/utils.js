function loadTexture(url) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(url, resolve, undefined, reject);
    });
}

function loadModel(url) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.OBJLoader();
        loader.load(url, resolve, undefined, reject);
    });
}

function createMaterial(texture) {
    return new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
    });
}

function applyMask(mesh, maskTexture) {
    const maskMaterial = new THREE.MeshBasicMaterial({
        map: maskTexture,
        side: THREE.DoubleSide,
        transparent: true,
    });
    mesh.material = maskMaterial;
}

export { loadTexture, loadModel, createMaterial, applyMask };