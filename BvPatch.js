import * as THREE from 'three';
import { vec3, storage, Fn, If, Loop, equal, notEqual, uniform, instanceIndex, objectWorldMatrix, color, screenUV, attribute, mul, add, sub, div, mod, shiftLeft, shiftRight, floor, abs, uint} from 'three/tsl';

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

    // run decasteljau's across the v-direction, uDeg+1 times
    Loop( { start: 0, end: uDeg, type: 'int', name: 'iteration', condition: '<=' }, ( { iteration } ) => {

        Loop( { start: 0, end: vDeg, type: 'int', name: 'i', condition: '<' }, ( { i } ) => {

            Loop( { start: i, end: vDeg, type: 'int', name: 'j', condition: '<' }, ( { j } ) => {

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

    console.log(indices);

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
    console.log(this.geometry.getAttribute('cpAttribute').count);

    const positionStorageBufferAttribute = new THREE.StorageBufferAttribute( (((this.uDeg * 64) + 1) * ((this.vDeg * 64) + 1)), 3 );
    this.geometry.setAttribute( 'position', positionStorageBufferAttribute );
    console.log(this.geometry.attributes.position.count, "vertices");

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

    this.geometry.setIndex(generateFixedBufferGridIndices(0, this.uDeg, this.vDeg));
    return this.renderer.computeAsync( compute );

  }

  async #subDivideQuadPatch() {
    if(this.currComputedLevel >= 6) {
        console.warn("Maximum subdivision level reached. Cannot subdivide further.");
        return;
    }
    const compute = subDivideQuadPatchCompute({geometry: this.geometry, uDeg: this.uDeg, vDeg: this.vDeg, currComputedLevel: this.currComputedLevel}).compute((1 << this.currComputedLevel) * (1 << this.currComputedLevel));
    //console.log( this.renderer._pipelines.nodes.getForCompute( compute ).computeShader ); //print compiled shader

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
    const indices = generateFixedBufferGridIndices(level, this.uDeg, this.vDeg);
    this.geometry.setIndex(indices);
    this.currVersion += 1;
    this.geometry.index.version = this.currVersion;
  }
}
