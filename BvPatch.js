import * as THREE from 'three/webgpu';
import { vec3, storage, Fn, If, Loop, greaterThan, equal, notEqual, uniform, instanceIndex, objectWorldMatrix, color, screenUV, attribute, mul, add, sub, div, mod, shiftLeft, shiftRight, floor, abs, uint, int, float} from 'three/tsl';

const initializeQuadPatchCompute = Fn ( ({geometry, uDeg, vDeg}) => {
    const psAttribute = geometry.attributes.position;
    const numPos = geometry.attributes.position.count;
    const positionStorageAttribute = storage( psAttribute, 'vec3', numPos );

    const cpAttribute = geometry.attributes.cpAttribute;
    const numCp = geometry.attributes.cpAttribute.count;
    const cpStorageAttribute = storage(cpAttribute, 'vec4', numCp);

    // equivalent to:
    // for (int i = 0; i <= uDeg; i++)
    //     for (int j = 0; j <= vDeg; j++)
    Loop( add(uDeg, 1), add(vDeg, 1), ( { i, j } ) => {
        // (i * (vDeg + 1)) + j
        const src = add(mul(i, add(vDeg, 1)), j);

        const dst = add(mul(mul(i, 64), add(1, mul(vDeg, 64))), mul(j, 64));

        // adjust values if rational point != 1
        // 2, 4, 0, 2 => 1, 2, 0, 1
        If (notEqual(cpStorageAttribute.element(src).w, 1), () => {
            positionStorageAttribute.element(dst).assign(div(cpStorageAttribute.element(src).xyz, cpStorageAttribute.element(src).w));
        }).Else(() => {
            positionStorageAttribute.element(dst).assign(cpStorageAttribute.element(src).xyz);
        });
    });
});

const vPassCompute = Fn ( ({geometry, uDeg, vDeg, currComputedLevel}) => {
    const maxLevel = int(6);
    const numQuadPerDim = int(shiftLeft(1, currComputedLevel));

    // ranges from 1 to ((numQuadPerDim * uDeg)+1) (so really, 0 to (numQuadPerDim * uDeg))
    const gridX = int(div(instanceIndex, numQuadPerDim));
    // ranges from 1 to numQuadPerDim (so really, 0 to numQuadPerDim-1)
    const gridY = mod(int(instanceIndex), numQuadPerDim);


    const stride = shiftLeft(1, sub(maxLevel, int(currComputedLevel)));
    const halfstride = shiftRight(stride, int(1));

    // how many indices you have to move over before moving "right" 1 in the U direction
    const bufferSize = add(mul(int(vDeg), shiftLeft(1, maxLevel)), 1);
    const flattenInstanceIndex = (i, j) => (add(mul(i, bufferSize), j));

    const x = int(mul(gridX, stride));
    const y = int(mul(gridY, mul(stride, vDeg)));

    const positionStorageAttribute = geometry;

    Loop( { start: 0, end: int(vDeg), type: 'int', name: 'i', condition: '<' }, ( { i } ) => {

        Loop( { start: i, end: int(vDeg), type: 'int', name: 'j', condition: '<' }, ( { j } ) => {

            const ytemp = add(y, add(mul(halfstride, i), mul(sub(j, i), stride)));

            const p1  = flattenInstanceIndex(x, ytemp);
            const mid = flattenInstanceIndex(x, add(ytemp, halfstride));
            const p2  = flattenInstanceIndex(x, add(ytemp, stride));

            positionStorageAttribute.element(mid).assign(div(add(positionStorageAttribute.element(p1), positionStorageAttribute.element(p2)), 2));

        } );

    } );

});

const uPassCompute = Fn ( ({positionStorage, uDeg, vDeg, currComputedLevel}) => {
    const maxLevel = int(6);
    const numQuadPerDim = int(shiftLeft(int(1), currComputedLevel));

    // ranges from 0 to (numQuadPerDim-1)
    const gridX = mod(int(instanceIndex), numQuadPerDim);
    // ranges from 0 to (numQuadPerDim * vDeg * 2)
    const gridY = int(div(instanceIndex, numQuadPerDim));

    const stride = shiftLeft(1, sub(maxLevel, currComputedLevel));
    const halfstride = shiftRight(stride, int(1));

    const bufferSize = add(mul(int(vDeg), shiftLeft(1, maxLevel)), 1);
    const flattenInstanceIndex = (i, j) => (add(mul(i, bufferSize), j));

    const x = mul(gridX, mul(stride, uDeg));
    const y = mul(gridY, halfstride);

    Loop( { start: 0, end: int(uDeg), type: 'int', name: 'i', condition: '<' }, ( { i } ) => {

        Loop( { start: i, end: int(uDeg), type: 'int', name: 'j', condition: '<' }, ( { j } ) => {

            const xtemp = add(x, add(mul(halfstride, i), mul(stride, sub(j, i))));

            const p1  = flattenInstanceIndex(xtemp, y);
            const mid = flattenInstanceIndex(add(xtemp, halfstride), y);
            const p2  = flattenInstanceIndex(add(xtemp, stride), y);

            positionStorage.element(mid).assign(div(add(positionStorage.element(p1), positionStorage.element(p2)), 2));

        } );

    } );
});

const indexBuffers = {};
function generateFixedBufferGridIndices(n, uDeg, vDeg) {
    const key = `${n}-${uDeg}-${vDeg}`;
    if (key in indexBuffers) {
        return indexBuffers[key];
    }
    console.log(`cache miss: ${key}`)

    const quadsPerDim = 1 << n; // 2^n
    const stride = 1 << (6 - n);
    const xstride = uDeg * stride; // spacing in the u direction
    const ystride = vDeg * stride; // spacing in the v direction


    const bufferSize = ((vDeg * 64) + 1);
    const flattenIndex = (i, j) => ((i * bufferSize) + j);

    const indices = [];

    for (let i = 0; i < quadsPerDim; i++) {
        for (let j = 0; j < quadsPerDim; j++) {
            const x = i * xstride;
            const y = j * ystride;

            const topLeft     = flattenIndex(x, y);
            const topRight    = flattenIndex(x, y + ystride);
            const bottomLeft  = flattenIndex(x + xstride, y);
            const bottomRight = flattenIndex(x + xstride, y + ystride);

            // Triangle 1
            indices.push(topLeft, topRight, bottomLeft);
            // Triangle 2
            indices.push(topRight, bottomRight, bottomLeft);
        }
    }

    //console.log(indices);

    const index_buffer = new THREE.Uint32BufferAttribute(indices, 1);
    indexBuffers[key] = index_buffer;
    return index_buffer;
}


export class BvPatch extends THREE.Mesh {
    constructor(renderer, controlPts, patchType, uDeg, vDeg, initialLevel = 0) {
        super();
        this.renderer = renderer;
        this.patchType = patchType;
        this.uDeg = uDeg;
        this.vDeg = vDeg;
        this.controlPts = controlPts;
        this.currComputedLevel = 0; // The number of subdivision in each dimension
        this.currLevel = initialLevel;

        this.cpBuffer = new THREE.Float32BufferAttribute(controlPts, 4, false);
        this.geometry.setAttribute( 'cpAttribute', this.cpBuffer );

        const positionStorageBufferAttribute = new THREE.StorageBufferAttribute( (((this.uDeg * 64) + 1) * ((this.vDeg * 64) + 1)), 3 );
        this.geometry.setAttribute( 'position', positionStorageBufferAttribute );
        this.positionStorage = storage(
            this.geometry.getAttribute('position'), 'vec3', this.geometry.getAttribute('position').count
        );

        this.currVersion = 0;
        this.material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true
        });
        // this.#initializeQuadPatch().then(() => {this.setLevel(initialLevel);});
        this.#initializeQuadPatch();
    }

    async #initializeQuadPatch() {
        // Use compute shader to set values of positionBuffer and normal Buffer. Also create buffers for curvatures.

        const compute = initializeQuadPatchCompute({geometry: this.geometry, uDeg: this.uDeg, vDeg: this.vDeg}).compute(1);

        this.geometry.setIndex(generateFixedBufferGridIndices(0, this.uDeg, this.vDeg));
        return this.renderer.computeAsync( compute );

    }

    // these can't be shared across BvPatch instances (like indices can) because there's no way to uniform()
    // storage access, but this still means each mesh only creates 2 shader modules
    #passesFor(level) {
        const nqpd = (1 << level); // "number of quads per dimension"
        return {
            v: vPassCompute({
                geometry: this.positionStorage, uDeg: uniform(this.uDeg), vDeg: uniform(this.vDeg),
                currComputedLevel: uniform(level)
            }).compute(((nqpd * this.uDeg)+1)*nqpd),
            u: uPassCompute({
                positionStorage: this.positionStorage, uDeg: uniform(this.uDeg), vDeg: uniform(this.vDeg),
                currComputedLevel: uniform(level)
            }).compute(((nqpd*this.vDeg*2)+1)*nqpd)
        }
    }

    setLevel(level) {
        //console.log(level, this.currComputedLevel, this.geometry.index.version, this.currVersion);
        if (this.currComputedLevel >= level){
            this.currLevel = level;
        } else {
            const passes = [];
            for (let i = this.currComputedLevel; i < level; i++) {
                // 1. pass across the v direction
                // 2. pass across the u direction
                // (needs to happen in this order, uPass dependent on values calculated in the vPass)
                let p = this.#passesFor(i);
                passes.push(p.v);
                passes.push(p.u);
                this.currComputedLevel+=1;
            }
            this.renderer.compute(passes)
            this.currLevel = level;
            this.currComputedLevel = level;
        }
        const indices = generateFixedBufferGridIndices(level, this.uDeg, this.vDeg);
        this.geometry.setIndex(indices);
        this.currVersion += 1;
        this.geometry.index.version = this.currVersion;
    }


    // returns an array of compute nodes that, when computed, will subdivide this mesh.
    // useful because these arrays can be aggregated from many meshes, and then all be
    // computed at once, with a single `compute` call.
    getLevelPasses(level) {
        const passes = [];

        if (this.currComputedLevel >= level) {
            this.currLevel = level;
        } else {
            for (let i = this.currComputedLevel; i < level; i++) {
                // 1. pass across the v direction
                // 2. pass across the u direction
                // (needs to happen in this order, uPass dependent on values calculated in the vPass)
                let p = this.#passesFor(i);
                passes.push(p.v);
                passes.push(p.u);
                this.currComputedLevel+=1;
            }
            this.currLevel = level;
            this.currComputedLevel = level;
        }
        const indices = generateFixedBufferGridIndices(level, this.uDeg, this.vDeg);
        this.geometry.setIndex(indices);
        this.currVersion += 1;
        this.geometry.index.version = this.currVersion;
        return passes
    }
}