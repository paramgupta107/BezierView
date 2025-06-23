import * as THREE from 'three';
import { vec3, storage, Fn, If, notEqual, lessThanEqual, uniform, instanceIndex, objectWorldMatrix, color, screenUV, attribute, mul, add, sub, div, mod, shiftLeft, shiftRight, floor, abs, uint} from 'three/tsl';

// nearly 1:1 from the original code as to not risk messing with calculations,
// only change was to multiply calculated dst/src indices by 4 because each 'point' we're storing
//  is really just four floats in a row; the original kept a vec4 at each position instead.
function subdivide_quad(step, sizeu, sizev, uDeg, vDeg, bb) {
    let halfstep = step / 2;
    let bigstepu = step * uDeg;
    let bigstepv = step * vDeg;
    let C = sizeu + 1;

    // patch level
    for (let row = 0; row < sizev; row += bigstepv) {
        for (let col = 0; col <= sizeu; col += step) {
            // subdivide a curve-COLumn of degree degv
            for (let l = 0; l < vDeg; ++l) {
                let h = row + l * halfstep;
                for (let k = l; k < vDeg; ++k) {
                    let h1 = h + step;
                    let h2 = h + halfstep;
                    let dst = h2 * C + col;
                    let src0 = h * C + col;
                    let src1 = h1 * C + col;
                    // taking an average, ie:
                    // bb[dst] = (bb[src0] + bb[src1]) / 2
                    // i think we can still use these numbers if we just multiply them
                    // all by 4.

                    // TESTING
                    dst  *= 4;
                    src0 *= 4;
                    src1 *= 4;

                    bb[dst]   = (bb[src0] + bb[src1]) / 2.0;
                    bb[dst+1] = (bb[src0+1] + bb[src1+1]) / 2.0;
                    bb[dst+2] = (bb[src0+2] + bb[src1+2]) / 2.0;
                    bb[dst+3] = (bb[src0+3] + bb[src1+3]) / 2.0;

                    //bb[dst].copy(bb[src0]).add4(bb[src1]).scale4(0.5);

                    /*

                    // so like maybe
                    let zero = structuredClone(bb[src0]);
                    let one = structuredClone(bb[src1]);

                    let temp = [];
                    temp[0] = (zero[0] + one[0]) / 2;
                    temp[1] = (zero[1] + one[1]) / 2;
                    temp[2] = (zero[2] + one[2]) / 2;
                    temp[3] = (zero[3] + one[3]) / 2;

                    //
                    //let temp = [];
                    //temp[0] = (bb[src0][0] + bb[src1][0]) / 2;
                    //temp[1] = (bb[src0][1] + bb[src1][1]) / 2;
                    //temp[2] = (bb[src0][2] + bb[src1][2]) / 2;
                    //temp[3] = (bb[src0][3] + bb[src1][3]) / 2;
                    //

                    bb[dst] = structuredClone(temp);
                    */

                    h = h1;
                }
            }
        }
    }
    // 2x patch level
    for (let col = 0; col < sizeu; col += bigstepu) {
        for (let row = 0; row <= sizev; row += halfstep) {
            // subdivide a curve-ROW of degree degu
            for (let l = 0; l < uDeg; ++l) {
                let h = col + l * halfstep;
                for (let k = l; k < uDeg; ++k) {
                    let h1 = h + step;
                    let h2 = h + halfstep;
                    let dst = row * C + h2;
                    let src0 = row * C + h;
                    let src1 = row * C + h1;
                    // taking an average, ie:
                    // bb[dst] = (bb[src0] + bb[src1]) / 2
                    // bb[dst].copy(bb[src0]).add4(bb[src1]).scale4(0.5);

                    // TESTING
                    dst  *= 4;
                    src0 *= 4;
                    src1 *= 4;

                    bb[dst]   = (bb[src0] + bb[src1]) / 2.0;
                    bb[dst+1] = (bb[src0+1] + bb[src1+1]) / 2.0;
                    bb[dst+2] = (bb[src0+2] + bb[src1+2]) / 2.0;
                    bb[dst+3] = (bb[src0+3] + bb[src1+3]) / 2.0;

                    /*
                    // so like maybe
                    let temp = [];
                    temp[0] = (bb[src0][0] + bb[src1][0]) / 2.0;
                    temp[1] = (bb[src0][1] + bb[src1][1]) / 2.0;
                    temp[2] = (bb[src0][2] + bb[src1][2]) / 2.0;
                    temp[3] = (bb[src0][3] + bb[src1][3]) / 2.0;

                    bb[dst] = structuredClone(temp);
                    */

                    h = h1;
                }
            }
        }
    }
}

const initializeQuadPatchCompute = Fn ( ({geometry, uDeg, vDeg}) => {
    const positionStorageBufferAttribute = new THREE.StorageBufferAttribute( 65*65, 3 ); //This is an example that can have upto 64x64 grids
    geometry.setAttribute( 'position', positionStorageBufferAttribute );
    const positionStorageAttribute = storage( positionStorageBufferAttribute, 'vec3', 65*65 );

    const cpAttribute = geometry.attributes.cpAttribute;
    const numCp = geometry.attributes.cpAttribute.count;
    const cpStorageAttribute = storage(cpAttribute, 'vec4', numCp);

    // assign the corner positions to the positions of the corner control points
    const c00 = 0;
    const c0v = vDeg;
    const cu0 = mul(add(vDeg, 1), uDeg);
    const cuv = add(cu0, vDeg)
    positionStorageAttribute.element(0).assign(cpStorageAttribute.element(c00).xyz);
    positionStorageAttribute.element(64).assign(cpStorageAttribute.element(c0v).xyz);
    positionStorageAttribute.element(65*64).assign(cpStorageAttribute.element(cu0).xyz);
    positionStorageAttribute.element(65*65-1).assign(cpStorageAttribute.element(cuv).xyz);
});

const subDivideQuadPatchCompute = Fn ( ({geometry, uDeg, vDeg, currComputedLevel}) => {
    // calculate x,y for each index rather than each quad
    // ex: when calculating for level 2, treat the grid as 5x5 points rather than 4x4 quads
    const numQuadPerDim = uint(shiftLeft(1, add(currComputedLevel, 1)));
    const gridX = mod(instanceIndex, add(numQuadPerDim, 1));
    const gridY = div(instanceIndex, add(numQuadPerDim, 1));

    // 2 ^ (6 - level)
    const stride = shiftLeft(1, sub(6, add(currComputedLevel, 1)));

    const flatternInstanceIndex = (i, j) => (add(mul(i, 65), j));

    const x = mul(gridX, stride);
    const y = mul(gridY, stride);

    const c00 = flatternInstanceIndex(x, y);

    const positionStorageAttribute = storage(geometry.attributes.position, 'vec3', 65*65);
    const bbStorageAttribute = storage(geometry.attributes.bbAttribute, 'vec4', geometry.attributes.bbAttribute.count);

    // scale the coordinates we have by the degree in the respective x/y direction
    const localXtoBBX = (x) => (mul(x, uDeg));
    const localYtoBBY = (y) => (mul(y, vDeg));

    // the 'height' is (2 ^ (level)) * uDeg) + 1
    const height = add(mul(shiftLeft(1, add(currComputedLevel, 1)), uDeg), 1);

    const flattenBB = (x, y) => (add(mul(height, y), x));

    const bbIndex = flattenBB(localXtoBBX(gridX), localYtoBBY(gridY));
    const bbPoint = bbStorageAttribute.element(bbIndex);

    // normalize x,y,z if the rational value isn't one
    If (notEqual(bbPoint.w, 1), () => {
        const normalized = (bbStorageAttribute.element(bbIndex).xyz).toVar();
        normalized.x = div(normalized.x, bbPoint.w);
        normalized.y = div(normalized.y, bbPoint.w);
        normalized.z = div(normalized.z, bbPoint.w);

        positionStorageAttribute.element(c00).assign(normalized.xyz);
    }).Else(() => {
        // rational point = 1, don't need to do anything
        positionStorageAttribute.element(c00).assign(bbPoint.xyz);
    })

});

const indexBuffers = {};
function generateFixedBufferGridIndices(n, uDeg, vDeg) {
    const key = `${n}-${uDeg}-${vDeg}`;
    if (key in indexBuffers) {
        return indexBuffers[key];
    }

    const quadsPerDim = 1 << n; // 2^n
    const stride = 1 << (6 - n); // spacing between points in the 65x65 buffer; 2 ^ (6 - level)
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
    this.currComputedLevel = 0; // The number of subdivision in each dimension; the highest level of subdivision yet calculated
    this.currLevel = initialLevel; // the subdivision level currently being displayed
    this.cpBuffer = new THREE.Float32BufferAttribute(controlPts, 4, false);
    this.geometry.setAttribute( 'cpAttribute', this.cpBuffer );

    // initialize the buffer for the bb coefficients to the size it would need to be at
    // the max level of subdivision; level 6 => 2 ^ 6 => 64
    const maxBBPoints = ((uDeg * 64)+1) * ((vDeg * 64)+1);
    const bbStorageBufferAttribute = new THREE.StorageBufferAttribute( maxBBPoints, 4 );
    this.geometry.setAttribute( 'bbAttribute', bbStorageBufferAttribute );

    this.currVersion = 0;
    this.material = new THREE.MeshBasicMaterial({
        //color: 0xff0000,
        color: 0xffaf0f,
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

    // if we're subdividing, we want to work on the next level up from the current
    let level = this.currComputedLevel + 1;

    // how far away the BB coefficients should be; the higher the subdiv level,
    // the more points get filled in between the control points
    let cpStride = 1 << level;

    // use the bb array held in the buffer
    let bb = this.geometry.attributes.bbAttribute.array;

    const flattenBBIndex = (i, j) => (j * cpStride * (cpStride * this.uDeg + 1) + i * cpStride) * 4;

    // loop for the number of input control points, (uDeg+1) * (vDeg+1),
    // and put these control points at the appropriate places around the bb coeff array
    // (so, the corners of the BB array are the corner control points,
    //  and a control point halfway between two others in the CP array would
    //  fall between the same two points in the BB array)
    for (let i = 0; i <= this.uDeg; i++) {
        for (let j = 0; j <= this.vDeg; j++) {
            // multiply by an additional 4 since our control points are each just 4 elements
            let src = ((i * (this.vDeg + 1)) + j) * 4;
            let dst = flattenBBIndex(i, j);

            bb[dst]   = this.controlPts[src];
            bb[dst+1] = this.controlPts[src+1];
            bb[dst+2] = this.controlPts[src+2];
            bb[dst+3] = this.controlPts[src+3];
        }
    }

    // taken from original code
    let step = 1 << level;
    let sizeu = step * this.uDeg;
    let sizev = step * this.vDeg;
    for (let i = 0; i < level; i++) {
        subdivide_quad(step, sizeu, sizev, this.uDeg, this.vDeg, bb);
        step /= 2;
    }

    // update the bb attribute since its values just changed
    this.geometry.attributes.bbAttribute.needsUpdate = true;

    // ((2 ^ (currLevel + 1)) + 1) * ((2 ^ (currLevel + 1)) + 1) runs, once for every vertex
    // ex: at currLevel of 1, we want to calculate for the next level up, level 2
    //     so we get ((4) + 1) * ((4) + 1) = 25 runs, for the 25 vertices at level 2
    const compute = subDivideQuadPatchCompute({geometry:this.geometry, uDeg:this.uDeg, vDeg:this.vDeg, currComputedLevel: this.currComputedLevel}).compute(((1 << (1+this.currComputedLevel)) + 1) * ((1 << (1+this.currComputedLevel))) + 1);
    this.currComputedLevel += 1;

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