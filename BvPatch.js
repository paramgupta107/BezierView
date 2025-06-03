import * as THREE from 'three';
import { vec3, storage, Fn, If, uniform, instanceIndex, objectWorldMatrix, color, screenUV, attribute, mul, add, sub, div, mod, shiftLeft, shiftRight, floor, abs, uint} from 'three/tsl';

const initializeQuadPatchCompute = Fn ( ({geometry, uDeg, vDeg}) => {
    const positionStorageBufferAttribute = new THREE.StorageBufferAttribute( 65*65, 3 ); //This is an example that can have upto 64x64 grids
    geometry.setAttribute( 'position', positionStorageBufferAttribute );
    const positionStorageAttribute = storage( positionStorageBufferAttribute, 'vec3', 65*65 );
    
    const cpAttribute = geometry.attributes.cpAttribute;
    const numCp = geometry.attributes.cpAttribute.count;
    const cpStorageAttribute = storage(cpAttribute, 'vec4', numCp);

    const c00 = 0;
    const c0v = vDeg;
    const cu0 = mul(add(vDeg, 1), uDeg);
    const cuv = add(cu0, vDeg)
    positionStorageAttribute.element(0).assign(cpStorageAttribute.element(c00).xyz);
    positionStorageAttribute.element(64).assign(cpStorageAttribute.element(c0v).xyz);
    positionStorageAttribute.element(65*64).assign(cpStorageAttribute.element(cu0).xyz);
    positionStorageAttribute.element(65*65-1).assign(cpStorageAttribute.element(cuv).xyz);

});


const subDivideQuadPatchCompute = Fn ( ({geometry, currComputedLevel}) => { // currently 2^(currComputedLevel) x 2^(currComputedLevel) quads
    const numQuadPerDim = uint(shiftLeft(1, currComputedLevel));
    const gridX = div(instanceIndex, numQuadPerDim);
    const gridY = mod(instanceIndex, numQuadPerDim);

    const stride = shiftLeft(1, sub(6, currComputedLevel)); // 6 is the max resolution, so stride is 2^(6 - currComputedLevel)

    const flatternInstanceIndex = (i, j) => (add(mul(i, 65), j));

    const x = mul(gridX, stride);
    const y = mul(gridY, stride);

    const c00 = flatternInstanceIndex(x, y);
    const c02 = flatternInstanceIndex(x, add(y, stride));
    const c20 = flatternInstanceIndex(add(x, stride), y);
    const c22 = flatternInstanceIndex(add(x, stride), add(y, stride));

    const halfStride = shiftRight(stride, 1);
    const c01 = flatternInstanceIndex(x, add(y, halfStride));
    const c10 = flatternInstanceIndex(add(x, halfStride), y);
    const c12 = flatternInstanceIndex(add(x, halfStride), add(y, stride));
    const c21 = flatternInstanceIndex(add(x, stride), add(y, halfStride));
    const c11 = flatternInstanceIndex(add(x, halfStride), add(y, halfStride));

    const positionStorageAttribute = storage(geometry.attributes.position, 'vec3', 65*65);
    const cpStorageAttribute = storage(geometry.attributes.cpAttribute, 'vec4', geometry.attributes.cpAttribute.count);

    positionStorageAttribute.element(c01).assign(div(add(positionStorageAttribute.element(c00), positionStorageAttribute.element(c02)), 2));
    positionStorageAttribute.element(c10).assign(div(add(positionStorageAttribute.element(c00), positionStorageAttribute.element(c20)), 2));
    positionStorageAttribute.element(c12).assign(div(add(positionStorageAttribute.element(c02), positionStorageAttribute.element(c22)), 2));
    positionStorageAttribute.element(c21).assign(div(add(positionStorageAttribute.element(c20), positionStorageAttribute.element(c22)), 2));
    positionStorageAttribute.element(c11).assign(div(add(positionStorageAttribute.element(c02), positionStorageAttribute.element(c20)), 2));

});

const indexBuffers = {};
function generateFixedBufferGridIndices(n, uDeg, vDeg) {
    const key = `${n}-${uDeg}-${vDeg}`;
    if (key in indexBuffers) {
        return indexBuffers[key];
    }

    const quadsPerDim = 1 << n; // 2^n
    const stride = 1 << (6 - n); // spacing between points in the 65x65 buffer
    const bufferSize = 65;
    const indices = [];

    for (let i = 0; i < quadsPerDim; i++) {
        for (let j = 0; j < quadsPerDim; j++) {
            const x = i * stride;
            const y = j * stride;

            const topLeft     = x * bufferSize + y;
            const topRight    = topLeft + stride;
            const bottomLeft  = (x + stride) * bufferSize + y;
            const bottomRight = bottomLeft + stride;

            // Triangle 1
            indices.push(topLeft, topRight, bottomLeft);
            // Triangle 2
            indices.push(topRight, bottomRight, bottomLeft);
        }
    }
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
    this.currLevel = initialLevel;;
    this.cpBuffer = new THREE.Float32BufferAttribute(controlPts, 4, false);
    this.geometry.setAttribute( 'cpAttribute', this.cpBuffer );
    this.currVersion = 0;
    this.material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true
    });
    this.#initializeQuadPatch().then(() => {this.setLevel(initialLevel);});


  }

  async #initializeQuadPatch() {
    // Use compute shader to set values of positionBuffer and normal Buffer. Also create buffers for curvatures.

    const compute = initializeQuadPatchCompute({geometry: this.geometry, uDeg: this.uDeg, vDeg: this.vDeg}).compute(1)

    this.geometry.setIndex(generateFixedBufferGridIndices(0, 1, 1));
    return this.renderer.computeAsync( compute );
    
  }

  async #subDivideQuadPatch() {
    if(this.currComputedLevel >= 6) {
        console.warn("Maximum subdivision level reached. Cannot subdivide further.");
        return;
    }
    const compute = subDivideQuadPatchCompute({geometry: this.geometry, currComputedLevel: this.currComputedLevel}).compute((1 << this.currComputedLevel) * (1 << this.currComputedLevel));
    // console.log( this.renderer._pipelines.nodes.getForCompute( compute ).computeShader ); //print compiled shader

    this.currComputedLevel += 1;
    //const indices = generateFixedBufferGridIndices(this.currComputedLevel, 1, 1);
    //this.geometry.setIndex(indices);
    return this.renderer.computeAsync( compute );
  }

  async setLevel(level) {
    console.log(level, this.currComputedLevel, this.geometry.index.version, this.currVersion);
    if(this.currComputedLevel >= level){
        this.currLevel = level;
        
    }else{
        for( let i = this.currComputedLevel; i < level; i++) {
            await this.#subDivideQuadPatch();
        }
        this.currLevel = level;
        this.currComputedLevel = level;        
    }
    const indices = generateFixedBufferGridIndices(level, 1, 1);
    this.geometry.setIndex(indices);
    this.currVersion += 1;
    this.geometry.index.version = this.currVersion;
  }
}