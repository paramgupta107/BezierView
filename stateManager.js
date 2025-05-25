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
            boundingBox: false,
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
    const boundingBox = displayFolder.add(globalState.groupSettings["All Groups"], 'boundingBox').name('Show Bounding Box').onChange(propogateState('boundingBox'));
    const showPatches = displayFolder.add(globalState.groupSettings["All Groups"], 'showPatches').name('Show Patches').onChange(propogateState('showPatches'));

    controllers.push(controlMesh);
    controllers.push(boundingBox);
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

    groupsFolder.add({func() {addGroup();}}, 'func').name('Add Group');
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

// add a new group with the settings currently in 'All Groups'
function addGroup() {
    const numGroups = Object.keys(globalState.groupSettings).length;
    const groupName = `Group ${numGroups}`;

    globalState.groupSettings[groupName] = structuredClone(globalState.groupSettings["All Groups"]);

    // make this new group the active one
    globalState.activeGroup = groupName;
    groupHandle.setValue(groupName);
    changeGroup(groupName); // necessary as setValue() doesn't trigger onChange()

    // update the group options to include the new group
    groupHandle.options(Object.keys(globalState.groupSettings));
}


function loadFile(file) {
    // Load the file, parse the file, update the global state, update the GUI
    if(file){
        const reader = new FileReader();
        reader.onload = function(event) {
            const fileContent = event.target.result;
            // Parse the file content here
            // Update globalState with the parsed data
            // Call updateGui() to refresh the GUI with new data
            // Only override state if the entire file is successfully parsed
            alert(fileContent);
        }
        reader.readAsText(file);
        
    }
}

export { setupGui, globalState, loadFile };
