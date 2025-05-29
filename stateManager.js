//import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { GUI } from 'lil-gui';

const gui = new GUI();
const controllers = [];

let groupHandle;

const globalState = {

    // common/global settings
    activeGroup: "All Groups",

    // File
    file: 'Logo',

    // Other
    mouseMode: "Rotate",
    position: "Position 1",

    // Display
    light1: true,
    light2: false,
    light3: false,
    boundingBox: false,
    patchDetail: '4 x 4',

    // Help
    helpDummy: 0,

    // group-specific settings
    groupSettings: {
        "All Groups": {
            // Shader Settings
            flipNormals: false,
            flatShading: false,
            // can only have one of the following three active at a time
            highlightLines: false,
            highlightReflection: false,
            wireframe: false,
            visualizeNormals: false,
            highlightDensity: 0.50,
            highlightResolution: 10.0,
            visualizeNormalSize: 1.0,

            // Curvature
            showCurvature: false,
            curvatureType: "Gaussian",
            // the following two shouldn't be editable, just display numbers
            curvatureMin: 0,
            curvatureMax: 0,
            clampMin: 0,
            clampMax: 0,

            // Display
            controlMesh: false,
            showPatches: true,

            // Groups
            groupColor: "Yellow",
        }
    },
}

function setupGui()
{
    // 'Load File' Section
    const loadFileFolder = gui.addFolder('Load File').close();
    let fileOptions = ['Logo', 'Teapot', 'Hexoid', 'Cube, G2', 'Male Head'];
    loadFileFolder.add(globalState, 'file', fileOptions,).name('Choose Model');
    loadFileFolder.add( {func() {const fileElem = document.getElementById('fileInput');fileElem.click()}}, 'func' ).name('Load File');


    // 'Shader Settings' Section
    const shaderSettingsFolder = gui.addFolder('Shader Settings').close();
    const flipNormals = shaderSettingsFolder.add(globalState.groupSettings["All Groups"], 'flipNormals').name('Flip Normals').onChange(propogateState('flipNormals'));
    const flatShading = shaderSettingsFolder.add(globalState.groupSettings["All Groups"], 'flatShading').name('Flat Shading').onChange(propogateState('flatShading'));
    const highlightLines = shaderSettingsFolder.add(globalState.groupSettings["All Groups"], 'highlightLines').name('Highlight Lines').onChange(propogateState('highlightLines'));
    const highlightReflection = shaderSettingsFolder.add(globalState.groupSettings["All Groups"], 'highlightReflection').name('Highlight Reflection').onChange(propogateState('highlightReflection'));
    const wireframe = shaderSettingsFolder.add(globalState.groupSettings["All Groups"], 'wireframe').name('Wireframe').onChange(propogateState('wireframe'));
    const visualizeNormals = shaderSettingsFolder.add(globalState.groupSettings["All Groups"], 'visualizeNormals').name('Visualize Normals').onChange(propogateState('visualizeNormals'));


    const highlightDensity = shaderSettingsFolder.add(globalState.groupSettings["All Groups"], 'highlightDensity', 0, 1, 0.05).name('Highlight Density').onChange(propogateState('highlightDensity'));
    const highlightResolution = shaderSettingsFolder.add(globalState.groupSettings["All Groups"], 'highlightResolution', 0, 30, 0.1).name('Highlight Resolution').onChange(propogateState('highlightResolution'));
    const visualizeNormalSize = shaderSettingsFolder.add(globalState.groupSettings["All Groups"], 'visualizeNormalSize', 0.01, 10, 0.01).name('Visualize Normals Size').onChange(propogateState('visualizeNormalSize'));

    controllers.push(flipNormals);
    controllers.push(flatShading);
    controllers.push(highlightLines);
    controllers.push(highlightReflection);
    controllers.push(wireframe);
    controllers.push(visualizeNormals);
    controllers.push(highlightDensity);
    controllers.push(highlightResolution);
    controllers.push(visualizeNormalSize);



    // 'Curvature' Section
    const curvatureFolder = gui.addFolder('Curvature').close();
    const showCurvature = curvatureFolder.add(globalState.groupSettings["All Groups"], 'showCurvature').name('Show Curvature').onChange(propogateState('showCurvature'));
    controllers.push(showCurvature);

    let curvatureOptions = ['Gaussian', 'Mean', 'Max', 'Min'];
    const curvatureType = curvatureFolder.add(globalState.groupSettings["All Groups"], 'curvatureType', curvatureOptions).name('Curvature Types').onChange(propogateState('curvatureType'));
    controllers.push(curvatureType);

    // next two disabled since they're information readouts, and thus not editable
    const curvatureMin = curvatureFolder.add(globalState.groupSettings["All Groups"], 'curvatureMin').name('Curvature Min').disable().onChange(propogateState('curvatureMin'));
    const curvatureMax = curvatureFolder.add(globalState.groupSettings["All Groups"], 'curvatureMax').name('Curvature Max').disable().onChange(propogateState('curvatureMax'));
    const clampMin = curvatureFolder.add(globalState.groupSettings["All Groups"], 'clampMin').name('Clamp Min').onChange(propogateState('clampMin'));
    const clampMax = curvatureFolder.add(globalState.groupSettings["All Groups"], 'clampMax').name('Clamp Max').onChange(propogateState('clampMax'));

    controllers.push(curvatureMin);
    controllers.push(curvatureMax);
    controllers.push(clampMin);
    controllers.push(clampMax);

    curvatureFolder.add({func() {}}, 'func').name('Reset Clamp');



    // 'Display' Section
    const displayFolder = gui.addFolder('Display').close();
    const controlMesh = displayFolder.add(globalState.groupSettings["All Groups"], 'controlMesh').name('Show Control Mesh').onChange(propogateState('controlMesh'));
    displayFolder.add(globalState, 'boundingBox').name('Show Bounding Box');
    const showPatches = displayFolder.add(globalState.groupSettings["All Groups"], 'showPatches').name('Show Patches').onChange(propogateState('showPatches'));

    controllers.push(controlMesh);
    controllers.push(showPatches);

    displayFolder.add(globalState, 'light1').name('Light 1');
    displayFolder.add(globalState, 'light2').name('Light 2');
    displayFolder.add(globalState, 'light3').name('Light 3');

    let detailOptions = ['4 × 4', '8 × 8', '16 × 16', '32 × 32', '64 × 64'];
    displayFolder.add(globalState, 'patchDetail', detailOptions).name('Patch Detail');



    // 'Groups' Section
    const groupsFolder = gui.addFolder('Groups').close();

    groupHandle = groupsFolder.add(globalState, 'activeGroup', Object.keys(globalState.groupSettings)).onChange(changeGroup).name('Group');

    let groupColorOptions = ['Yellow', 'Green', 'Silver', 'Red', 'Cyan', 'Magenta', 'Orange', 'Purple', 'Blue'];
    const groupColor = groupsFolder.add(globalState.groupSettings["All Groups"], 'groupColor', groupColorOptions).name('Group Color').onChange(propogateState('groupColor'));
    controllers.push(groupColor);

    //groupsFolder.add({func() {addGroup();}}, 'func').name('Add Group');
    groupsFolder.add({func() {}}, 'func').name('Delete Group');


    // 'Other' Section
    const otherFolder = gui.addFolder('Other').close();
    otherFolder.add(globalState, 'mouseMode', ['Rotate', 'Clip']).name('Mouse Mode');
    otherFolder.add({func() {}}, 'func').name('Save Position');
    otherFolder.add({func() {}}, 'func').name('Remove Position');

    let positionOptions = ['Position 1', 'Position 2', 'Position 3'];
    otherFolder.add(globalState, 'position', positionOptions).name('Load Position');

    otherFolder.add({func() {}}, 'func').name('Reload Current');
    otherFolder.add({func() {}}, 'func').name('Reset Projection');


    // 'Help' Section
    const helpFolder = gui.addFolder('Help').close();
    const helpText =
            "Controls\n" +
            "Left Mouse: Rotate or Clip\n" +
            "Right Mouse: Pan\n" +
            "Scroll Wheel: Zoom\n" +
            "Scroll Wheel + Alt: Scale\n" +
            "Q and E: Z-axis rotation\n" +
            "ESC: Reset Projection\n";
    helpFolder.add(globalState, 'helpDummy').name(helpText).$widget.remove();
}


function changeGroup(groupName) {
    for (const controller of controllers) {
        controller.object = globalState.groupSettings[groupName]
        controller.updateDisplay()
    }
}

function propogateState(settingsKey){
    function callback(value) {
        if (globalState.activeGroup == "All Groups") {
            for(const groupName in globalState.groupSettings) {
                if (groupName !== "All Groups") {
                    globalState.groupSettings[groupName][settingsKey] = value;
                }
            }
        }
    }
    return callback;
}

// Load the file, parse the file, update the global state, update the GUI
function loadFile(file) {

    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {

            // local copy of group settings, so that global state isn't changed prematurely
            let groupSettingsLocal = {};

            // only copy in 'All Groups' since we if we're loading a new model, we don't
            // want to keep around groups from another file
            groupSettingsLocal["All Groups"] = structuredClone(globalState.groupSettings["All Groups"]);

            // split the input into whitespace-delimited tokens
            const input = (event.target.result).split(/\s+/);

            // index in the 'input' array
            let idx = 0;

            // utility to read groups of data from the file
            // returns an array of [x, y, z, w] points, where w is the 'rational'
            // value that acts as a weight for a control point
            function readPoints(numPoints, isRational) {
                let points = [];
                // if the patch is rational, we need to read a 4th value
                if (isRational) {
                    for (let i = 0; i < numPoints; i++) {
                        let p = [];
                        p.push(Number(input[idx++]));
                        p.push(Number(input[idx++]));
                        p.push(Number(input[idx++]));
                        p.push(Number(input[idx++]));
                        points.push(p);
                    }
                // if the patch isn't rational, make every 4th value 1
                } else {
                    for (let i = 0; i < numPoints; i++) {
                        let p = [];
                        p.push(Number(input[idx++]));
                        p.push(Number(input[idx++]));
                        p.push(Number(input[idx++]));
                        p.push(1);
                        points.push(p);
                    }
                }
                return points;
            }


            // create a default group in case none are specified in the file
            groupSettingsLocal['(unnamed group)'] = structuredClone(groupSettingsLocal["All Groups"]);
            groupSettingsLocal['(unnamed group)'].patches = [];

            let currentGroup = groupSettingsLocal['(unnamed group)'];

            // loop for every token in the input file until we reach EOF
            while (idx < input.length && input[idx] != '') {
                // this 'if' statement runs when we run into the start of a group.
                // it first parses the group information (what ID the group is,
                // and what name it has), then it checks to see if another group
                // already exists with this information. if one does exist,
                // then we're just adding more data to that group. if one doesn't
                // exist, we need to create a new group.
                if (input[idx].toUpperCase() == "GROUP") {
                    let groupID = Number(input[++idx]);
                    let groupName = input[++idx];
                    console.log("group with ID", groupID, "and name", groupName);

                    // if this group doesn't exist, create it
                    if (!Object.hasOwn(groupSettingsLocal, groupName)) {
                        groupSettingsLocal[groupName] = structuredClone(groupSettingsLocal["All Groups"]);
                        groupSettingsLocal[groupName].patches = [];
                    }

                    // set this group as the current one
                    currentGroup = groupSettingsLocal[groupName];
                    idx++;
                }

                // whether we just read a group label or didn't, we should now
                // be coming up on the start of a patch, the first part of which
                // will be a number describing the patch type
                let patchType = Number(input[idx++]);

                switch (patchType) {
                    // polyhedron
                    case 1: {
                        let patch = {};
                        patch.patchType = patchType;
                        patch.deg_u = 0;
                        patch.deg_v = 0;

                        let numVertices = Number(input[idx++]);
                        let numFaces = Number(input[idx++]);

                        // load vertices
                        patch.mesh = readPoints(numVertices, false);
                        // load faces/edges
                        let faces = [];
                        let edges = [];
                        for (let i = 0; i < numFaces; i++) {
                            var faceSize = Number(input[idx++]);
                            var verts = [];
                            for (var j = 0; j < faceSize; j++) {
                                verts.push(Number(input[idx++]));
                            }
                            for (var j = 0; j < faceSize-2; j++) {
                                faces.push(verts[0]);
                                faces.push(verts[j+1]);
                                faces.push(verts[j+2]);
                            }
                            for (var j = 0; j < faceSize; j++) {
                                edges.push(verts[j]);
                                edges.push(verts[(j+1)%faceSize]);
                            }
                        }
                        patch.polyhedral_indices = faces;
                        patch.polyhedral_edges = edges;

                        console.log(patch.polyhedral_indices);
                        currentGroup.patches.push(patch);

                        break;
                    }
                    // triangular patch
                    case 3: // not rational
                    case 11: { // rational
                        let patch = {};
                        patch.patchType = patchType;

                        let deg = Number(input[idx++]);
                        patch.deg_u = deg;
                        patch.deg_v = deg;

                        let numPoints = (deg+2)*(deg+1)/2;
                        patch.mesh = readPoints(numPoints, patchType === 11);
                        currentGroup.patches.push(patch);

                        break;
                    }
                    // tensor products
                    case 4: // square (deg_u == deg_v)
                    case 5: // quad (deg_u independent of deg_v)
                    case 8: { // rational, 4th value to read
                        let patch = {};
                        patch.patchType = patchType;

                        let deg_u, deg_v;
                        if (patchType == 4) {
                            patch.deg_u = deg_u = Number(input[idx]);
                            patch.deg_v = deg_v = Number(input[idx++]);
                        } else {
                            patch.deg_u = deg_u = Number(input[idx++]);
                            patch.deg_v = deg_v = Number(input[idx++]);
                        }
                        let numPoints = (deg_u + 1) * (deg_v + 1);
                        patch.mesh = readPoints(numPoints, patchType === 8);
                        currentGroup.patches.push(patch);

                        break;
                    }
                    // PN triangles
                    case 9: {
                        let patch = {};
                        patch.patchType = patchType;

                        let deg = Number(input[idx++]);
                        patch.deg_u = deg;
                        patch.deg_v = deg;

                        let normal_deg = Number(input[idx++]);

                        let numPoints = ((deg + 2) * (deg + 1)) / 2;
                        let numNormals = ((normal_deg + 2) * (normal_deg + 1)) / 2;

                        patch.mesh = readPoints(numPoints, false);
                        patch.artificial_normals = {
                            deg_u: normal_deg,
                            deg_v: normal_deg,
                            normals: readPoints(numNormals, false)
                        }
                        currentGroup.patches.push(patch);

                        break;
                    }
                    // PN quads
                    case 10: {
                        let patch = {};
                        patch.patchType = patchType;

                        let deg_u, deg_v;
                        let n_deg_u, n_deg_v;
                        patch.deg_u = deg_u = Number(input[idx++]);
                        patch.deg_v = deg_v = Number(input[idx++]);
                        n_deg_u = Number(input[idx++]);
                        n_deg_v = Number(input[idx++]);

                        let numPoints = (deg_u + 1) * (deg_v + 1);
                        let numNormals = (normal_degu + 1) * (normal_degv + 1);

                        patch.mesh = readPoints(numPoints, false);
                        patch.artificial_normals = {
                            deg_u: n_deg_u,
                            deg_v: n_deg_v,
                            normals: readPoints(numNormals, false)
                        }
                        currentGroup.patches.push(patch);

                        break;
                    }
                    default: {
                        throw 'invalid patch type: ' + patchType.toString();
                    }
                }
            }

            // if no data got stored in the default, unnamed group, remove it
            if (groupSettingsLocal['(unnamed group)'].patches.length === 0) {
                delete groupSettingsLocal['(unnamed group)'];
            }

            // only get to this point if we don't throw an error somewhere else;
            // thus, it should now be safe to change the global state

            // make 'All Groups' the currently set group (since the user might
            // have a group selected that doesn't exist in this new model)
            globalState.activeGroup = 'All Groups';
            groupHandle.setValue('All Groups');
            changeGroup('All Groups'); // necessary as setValue() doesn't trigger onChange()

            // copy in the groups and update the group options
            globalState.groupSettings = structuredClone(groupSettingsLocal);
            groupHandle.options(Object.keys(globalState.groupSettings));
        }
        reader.readAsText(file);
    }
}

export { setupGui, globalState, loadFile };
