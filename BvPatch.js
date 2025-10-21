import * as THREE from 'three';
import { vec3, storage, Fn, If, Loop, equal, notEqual, uniform, instanceIndex, objectWorldMatrix, color, screenUV, attribute, mul, add, sub, div, mod, shiftLeft, shiftRight, floor, abs, uint, int, float, equals} from 'three/tsl';

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

    const numQuadPerDim = int(shiftLeft(int(1), int(currComputedLevel)));
    const gridX = int(div(instanceIndex, numQuadPerDim));
    const gridY = mod(int(instanceIndex), numQuadPerDim);

    const stride = shiftLeft(1, sub(maxLevel, int(currComputedLevel)));
    const halfstride = shiftRight(stride, int(1));

    const bufferSize = add(mul(int(vDeg), shiftLeft(1, maxLevel)), 1);
    const flatternInstanceIndex = (i, j) => (add(mul(i, bufferSize), j));

    const x = int(mul(gridX, mul(stride, uDeg)));
    const y = int(mul(gridY, mul(stride, vDeg)));

    const positionStorageAttribute = storage(geometry.attributes.position, 'vec3', geometry.attributes.position.count);

    //let xtemp, ytemp;

    // part 1: edges
    const limit = int(0);

    If( gridX.equal(sub(numQuadPerDim, 1)), () => {
        limit.assign(int(uDeg));
    });

    //Loop( { start: 0, end: int(limit), type: 'int', name: 'iteration', condition: '<=', update: int(uDeg) }, ( { iteration } ) => {
    Loop( { start: 0, end: int(limit), type: 'int', name: 'iteration', condition: '<=', update: int(uDeg) }, ( { iteration } ) => {

        Loop( { start: 0, end: int(vDeg), type: 'int', name: 'i', condition: '<' }, ( { i } ) => {

            Loop( { start: i, end: int(vDeg), type: 'int', name: 'j', condition: '<' }, ( { j } ) => {

                const xtemp = add(x, mul(stride, iteration));
                const ytemp = add(y, add(mul(halfstride, i), mul(sub(j, i), stride)));

                const p1  = int(flatternInstanceIndex(xtemp, ytemp));
                const mid = int(flatternInstanceIndex(xtemp, add(ytemp, halfstride)));
                const p2  = int(flatternInstanceIndex(xtemp, add(ytemp, stride)));

                positionStorageAttribute.element(mid).assign(div(add(positionStorageAttribute.element(p1), positionStorageAttribute.element(p2)), float(2)));
                //positionStorageAttribute.element(0).assign(div(add(positionStorageAttribute.element(p1), positionStorageAttribute.element(p2)), float(2)));

            } );

        } );
    } );



    // part 2: midsection
    Loop( { start: 1, end: int(uDeg), type: 'int', name: 'iteration', condition: '<' }, ( { iteration } ) => {

        Loop( { start: 0, end: int(vDeg), type: 'int', name: 'i', condition: '<' }, ( { i } ) => {

            Loop( { start: i, end: int(vDeg), type: 'int', name: 'j', condition: '<' }, ( { j } ) => {

                const xtemp = add(x, mul(stride, iteration));
                const ytemp = add(y, add(mul(halfstride, i), mul(sub(j, i), stride)));

                const p1  = flatternInstanceIndex(xtemp, ytemp);
                const mid = flatternInstanceIndex(xtemp, add(ytemp, halfstride));
                const p2  = flatternInstanceIndex(xtemp, add(ytemp, stride));

                positionStorageAttribute.element(mid).assign(div(add(positionStorageAttribute.element(p1), positionStorageAttribute.element(p2)), 2));

            } );

        } );

    } );
    /*
    */

});

const uPassCompute = Fn ( ({geometry, uDeg, vDeg, currComputedLevel}) => {
    const maxLevel = int(6);

    const numQuadPerDim = int(shiftLeft(int(1), currComputedLevel));
    const gridX = int(div(instanceIndex, numQuadPerDim));
    const gridY = mod(int(instanceIndex), numQuadPerDim);


    const stride = shiftLeft(1, sub(maxLevel, currComputedLevel));
    const halfstride = shiftRight(stride, int(1));

    const bufferSize = add(mul(vDeg, shiftLeft(1, maxLevel)), 1);
    const flatternInstanceIndex = (i, j) => (add(mul(i, bufferSize), j));

    const x = mul(gridX, mul(stride, uDeg));
    const y = mul(gridY, mul(stride, vDeg));

    const positionStorageAttribute = storage(geometry.attributes.position, 'vec3', geometry.attributes.position.count);

    let xtemp, ytemp;

    const limit = int(0);

    // part 1: edges
    If( gridY.equal(sub(numQuadPerDim, 1)), () => {
        limit.assign(int(mul(vDeg, 2)));
    });

    Loop( { start: 0, end: int(limit), type: 'int', name: 'iteration', condition: '<=', update: int(mul(2, vDeg)) }, ( { iteration } ) => {

        Loop( { start: 0, end: int(uDeg), type: 'int', name: 'i', condition: '<' }, ( { i } ) => {

            Loop( { start: i, end: int(uDeg), type: 'int', name: 'j', condition: '<' }, ( { j } ) => {

                ytemp = add(y, mul(halfstride, iteration));
                xtemp = add(x, add(mul(halfstride, i), mul(stride, sub(j, i))));

                const p1  = flatternInstanceIndex(xtemp, ytemp);
                const mid = flatternInstanceIndex(add(xtemp, halfstride), ytemp);
                const p2  = flatternInstanceIndex(add(xtemp, stride), ytemp);

                positionStorageAttribute.element(mid).assign(div(add(positionStorageAttribute.element(p1), positionStorageAttribute.element(p2)), 2));

            } );

        } );

    } );

    // part 2: midsection

    Loop( { start: 1, end: mul(vDeg, 2), type: 'int', name: 'iteration', condition: '<' }, ( { iteration } ) => {

        Loop( { start: 0, end: uDeg, type: 'int', name: 'i', condition: '<' }, ( { i } ) => {

            Loop( { start: i, end: uDeg, type: 'int', name: 'j', condition: '<' }, ( { j } ) => {

                ytemp = add(y, mul(halfstride, iteration));
                xtemp = add(x, add(mul(halfstride, i), mul(stride, sub(j, i))));

                const p1  = flatternInstanceIndex(xtemp, ytemp);
                const mid = flatternInstanceIndex(add(xtemp, halfstride), ytemp);
                const p2  = flatternInstanceIndex(add(xtemp, stride), ytemp);

                positionStorageAttribute.element(mid).assign(div(add(positionStorageAttribute.element(p1), positionStorageAttribute.element(p2)), 2));

            } );

        } );

    } );
});

const subDivideQuadPatchCompute = Fn ( ({geometry, uDeg, vDeg, currComputedLevel}) => { // currently 2^(currComputedLevel) x 2^(currComputedLevel) quads
    const numQuadPerDim = uint(shiftLeft(1, currComputedLevel));
    const gridX = div(instanceIndex, numQuadPerDim);
    const gridY = mod(instanceIndex, numQuadPerDim);

    const stride = shiftLeft(1, sub(6, currComputedLevel)); // 6 is the max resolution, so stride is 2^(6 - currComputedLevel)
    const halfStride = shiftRight(stride, 1);

    const bufferSize = add(mul(vDeg, 64), 1);
    const flatternInstanceIndex = (i, j) => (add(mul(i, bufferSize), j));

    const x = mul(gridX, mul(stride, uDeg));
    const y = mul(gridY, mul(stride, vDeg));

    const positionStorageAttribute = storage(geometry.attributes.position, 'vec3', geometry.attributes.position.count);

    let xtemp, ytemp;

    //const limit = uDeg;

    let limit;

    // part 1: edges
    //If( equals(gridX, sub(numQuadPerDim, 1)), () => {
    If( gridX.equal(sub(numQuadPerDim, 1)), () => {
        limit = add(uDeg, 0);
    }).Else( () => {
        limit = add(0, 0);
    });

    // run decasteljau's across the v-direction, uDeg+1 times
    Loop( { start: 0, end: uDeg, type: 'int', name: 'iteration', condition: '<=' }, ( { iteration } ) => {
    //Loop( { start: 0, end: limit, type: 'int', name: 'iteration', condition: '<=' }, ( { iteration } ) => {

        Loop( { start: 0, end: vDeg, type: 'int', name: 'i', condition: '<' }, ( { i } ) => {

            Loop( { start: i, end: vDeg, type: 'int', name: 'j', condition: '<' }, ( { j } ) => {

                // TEMP TEMP TEMP HORRIBLE
                //xtemp = add(add(x, mul(stride, iteration)), mul(limit, 0));
                xtemp = add(x, mul(iteration, stride));
                ytemp = add(y, add(mul(i, halfStride), mul(sub(j, i), stride)));

                const p1 = flatternInstanceIndex(xtemp, ytemp);
                const mid = flatternInstanceIndex(xtemp, add(ytemp, halfStride));
                const p2 = flatternInstanceIndex(xtemp, add(ytemp, stride));

                positionStorageAttribute.element(mid).assign(div(add(positionStorageAttribute.element(p1), positionStorageAttribute.element(p2)), 2));

            } );

        } );

    } );

    // run decasteljau's across the u-direction, (vDeg*2)+1 times
    Loop( { start: 0, end: mul(vDeg, 2), type: 'int', name: 'iteration', condition: '<=' }, ( { iteration } ) => {

        Loop( { start: 0, end: uDeg, type: 'int', name: 'i', condition: '<' }, ( { i } ) => {

            Loop( { start: i, end: uDeg, type: 'int', name: 'j', condition: '<' }, ( { j } ) => {

                ytemp = add(y, mul(halfStride, iteration));
                xtemp = add(x, add(mul(halfStride, i), mul(stride, sub(j, i))));

                const p1  = flatternInstanceIndex(xtemp, ytemp);
                const mid = flatternInstanceIndex(add(xtemp, halfStride), ytemp);
                const p2 = flatternInstanceIndex(add(xtemp, stride), ytemp);

                positionStorageAttribute.element(mid).assign(div(add(positionStorageAttribute.element(p1), positionStorageAttribute.element(p2)), 2));

            } );

        } );

    } );

});

const indexBuffers = {};
function generateFixedBufferGridIndices(n, uDeg, vDeg) {
    const key = `${n}-${uDeg}-${vDeg}`;
    if (key in indexBuffers) {
        return indexBuffers[key];
    }

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
  constructor(renderer, controlPts, patchType, uDeg, vDeg, inColor, initialLevel = 0) {
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
    //console.log(this.geometry.getAttribute('cpAttribute').count);

    const positionStorageBufferAttribute = new THREE.StorageBufferAttribute( (((this.uDeg * 64) + 1) * ((this.vDeg * 64) + 1)), 4 );
    this.geometry.setAttribute( 'position', positionStorageBufferAttribute );

    //console.log(this.geometry.attributes.position.count, "vertices");

    this.currVersion = 0;
    // TODO: change the material type from MeshBasicMaterial, which only has flat shading
    this.material = new THREE.MeshBasicMaterial({
        color: inColor,
        wireframe: true
    });
    //this.#initializeQuadPatch().then(() => {this.setLevel(initialLevel);});
    this.initializeQuadPatchJS();
    this.geometry.setIndex(generateFixedBufferGridIndices(0, this.uDeg, this.vDeg));
    this.setLevel(initialLevel);
  }

    initializeQuadPatchJS() {
        const controlPts = this.geometry.getAttribute('cpAttribute').array;
        const positions = this.geometry.getAttribute('position').array;

        for (let i = 0; i <= this.uDeg; i++) {
            for (let j = 0; j <= this.uDeg; j++) {
                const src = 4 * ((i * (this.vDeg+1)) + j);
                const dst = 4 * (((i * 64) * (1 + (this.vDeg*64))) + (j * 64));


                positions[dst] = controlPts[src];
                positions[dst + 1] = controlPts[src + 1];
                positions[dst + 2] = controlPts[src + 2];
                positions[dst + 3] = controlPts[src + 3];

                /*
                console.log("src idx: ", src);
                console.log("dst idx: ", dst);
                console.log(`(${positions[dst]}, ${positions[dst+1]}, ${positions[dst+2]}, ${positions[dst+3]})`);
                */
            }
        }
    }

    vPassJS(instanceIndex) {
        const maxLevel = 6;

        const numQuadPerDim = (1 << this.currComputedLevel);
        const gridX = Math.floor(instanceIndex / numQuadPerDim);
        const gridY = instanceIndex % numQuadPerDim;

        const stride = 1 << (maxLevel - this.currComputedLevel);
        const halfstride = stride >> 1;

        const bufferSize = (this.vDeg * (2 ** maxLevel)) + 1;
        const flatternInstanceIndex = (i, j) => (i * bufferSize) + j;

        const x = (gridX * (stride * this.uDeg));
        const y = (gridY * (stride * this.vDeg));

        const bigArray = this.geometry.getAttribute('position').array;

        // skip one of the edges unless this quad is itself on the edge of the patch
        let limit = this.uDeg - 1;
        if (gridX === (numQuadPerDim - 1))
            limit = this.uDeg;

        for (let iteration = 0; iteration <= limit; iteration++) {

            for (let i = 0; i < this.vDeg; i++) {

                for (let j = i; j < this.vDeg; j++) {

                    const xtemp = x + (stride * iteration);
                    const ytemp = y + ((halfstride * i) + ((j-i) * stride));

                    // multiplied by 4 because each xyzw point we're accessing
                    // is just 4 values in memory next to each other
                    const p1  = 4 * flatternInstanceIndex(xtemp, ytemp);
                    const mid = 4 * flatternInstanceIndex(xtemp, ytemp + halfstride);
                    const p2  = 4 * flatternInstanceIndex(xtemp, ytemp + stride);

                    bigArray[mid]     = (bigArray[p1] + bigArray[p2]) / 2.0;
                    bigArray[mid + 1] = (bigArray[p1 + 1] + bigArray[p2 + 1]) / 2.0;
                    bigArray[mid + 2] = (bigArray[p1 + 2] + bigArray[p2 + 2]) / 2.0;
                    bigArray[mid + 3] = (bigArray[p1 + 3] + bigArray[p2 + 3]) / 2.0;
                }
            }
        }

        this.geometry.getAttribute('position').needsUpdate = true;

    }

    uPassJS(instanceIndex) {
        const maxLevel = 6;

        const numQuadPerDim = (1 << this.currComputedLevel);
        const gridX = Math.floor(instanceIndex / numQuadPerDim);
        const gridY = instanceIndex % numQuadPerDim;

        const stride = 1 << (maxLevel - this.currComputedLevel);
        const halfstride = stride >> 1;

        const bufferSize = (this.vDeg * (1 << maxLevel)) + 1;
        const flatternInstanceIndex = (i, j) => (i * bufferSize) + j;

        const x = (gridX * (stride * this.uDeg));
        const y = (gridY * (stride * this.vDeg));

        const bigArray = this.geometry.getAttribute('position').array;

        // skip one of the edges unless this quad is itself on the edge of the patch
        let limit = (this.uDeg*2) - 1;
        if (gridY === (numQuadPerDim - 1)) {
            limit = this.uDeg*2;
        }

        for (let iteration = 0; iteration <= limit; iteration++) {

            for (let i = 0; i < this.uDeg; i++) {

                for (let j = i; j < this.uDeg; j++) {

                    const ytemp = y + (halfstride * iteration);
                    const xtemp = x + ((halfstride * i) + ((j-i) * stride));

                    // multiplied by 4 because we're accessing each xyzw point
                    // as just 4 values in memory next to each other
                    const p1  = 4 * flatternInstanceIndex(xtemp, ytemp);
                    const mid = 4 * flatternInstanceIndex(xtemp + halfstride, ytemp);
                    const p2  = 4 * flatternInstanceIndex(xtemp + stride, ytemp);

                    bigArray[mid]     = (bigArray[p1] + bigArray[p2]) / 2.0;
                    bigArray[mid + 1] = (bigArray[p1 + 1] + bigArray[p2 + 1]) / 2.0;
                    bigArray[mid + 2] = (bigArray[p1 + 2] + bigArray[p2 + 2]) / 2.0;
                    bigArray[mid + 3] = (bigArray[p1 + 3] + bigArray[p2 + 3]) / 2.0;
                }
            }
        }

        this.geometry.getAttribute('position').needsUpdate = true;
    }

  async #initializeQuadPatch() {
    // Use compute shader to set values of positionBuffer and normal Buffer. Also create buffers for curvatures.

    const compute = initializeQuadPatchCompute({geometry: this.geometry, uDeg: this.uDeg, vDeg: this.vDeg}).compute(1);

    this.geometry.setIndex(generateFixedBufferGridIndices(0, this.uDeg, this.vDeg));
    return this.renderer.computeAsync( compute );

  }

  async #vPass() {
    const numCompute = (1 << this.currComputedLevel) * (1 << this.currComputedLevel);
    const compute = vPassCompute({geometry: this.geometry, uDeg: this.uDeg, vDeg: this.vDeg, currComputedLevel: this.currComputedLevel}).compute(numCompute);

    console.log( this.renderer._pipelines.nodes.getForCompute( compute ).computeShader ); //print compiled shader

    return this.renderer.computeAsync( compute );
  }

  async #uPass() {
    const numCompute = (1 << this.currComputedLevel) * (1 << this.currComputedLevel);
    const compute = uPassCompute({geometry: this.geometry, uDeg: this.uDeg, vDeg: this.vDeg, currComputedLevel: this.currComputedLevel}).compute(numCompute);

    return this.renderer.computeAsync( compute );
  }

  async #subDivideQuadPatch() {
    if(this.currComputedLevel >= 6) {
        console.warn("Maximum subdivision level reached. Cannot subdivide further.");
        return;
    }
    const compute = subDivideQuadPatchCompute({geometry: this.geometry, uDeg: this.uDeg, vDeg: this.vDeg, currComputedLevel: this.currComputedLevel}).compute((1 << this.currComputedLevel) * (1 << this.currComputedLevel));
    console.log( this.renderer._pipelines.nodes.getForCompute( compute ).computeShader ); //print compiled shader

    this.currComputedLevel += 1;
    //const indices = generateFixedBufferGridIndices(this.currComputedLevel, 1, 1);
    //this.geometry.setIndex(indices);
    return this.renderer.computeAsync( compute );
  }

  async setLevel(level) {
    //console.log(level, this.currComputedLevel, this.geometry.index.version, this.currVersion);
    if(this.currComputedLevel >= level){
        this.currLevel = level;

    }else{
        for( let i = this.currComputedLevel; i < level; i++) {
            // 1. pass across the v direction
            //await this.#vPass();

            //// 2. pass across the u direction
            //await this.#uPass();

            //await this.#exampleShader();

            // temp JS version
            // one loop goes 0 -> max instance index,
            // the other goes max instance index -> 0 to check that behavior
            // isn't dependent on running in a certain order
            for ( let instanceIndex = 0; instanceIndex < ((1 << this.currComputedLevel) * (1 << this.currComputedLevel)); instanceIndex++) {
            //for ( let instanceIndex = ((1 << this.currComputedLevel) * (1 << this.currComputedLevel))-1; instanceIndex >= 0; instanceIndex--) {
                this.vPassJS(instanceIndex);
            }

            //for ( let instanceIndex = 0; instanceIndex < ((1 << this.currComputedLevel) * (1 << this.currComputedLevel)); instanceIndex++) {
            for ( let instanceIndex = ((1 << this.currComputedLevel) * (1 << this.currComputedLevel))-1; instanceIndex >= 0; instanceIndex--) {
                this.uPassJS(instanceIndex);
            }
                this.currComputedLevel += 1;
        }
        this.currLevel = level;
        this.currComputedLevel = level;
    }
    const indices = generateFixedBufferGridIndices(level, this.uDeg, this.vDeg);
    this.geometry.setIndex(indices);
    this.currVersion += 1;
    this.geometry.index.version = this.currVersion;
  }
}
