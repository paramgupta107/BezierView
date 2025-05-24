import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const gui = new GUI();

const guiState = {
	myBoolean: true,
	myString: 'lil-gui',
	myNumber: 1
};

const globalState = {
    file: 'Logo',

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
    light1: true,
    light2: false,
    light3: false,
    patchDetail: '4 x 4',

    // Groups
    group: "All Groups",
    groupColor: "Yellow",

    // Other
    mouseMode: "Rotate",
    position: "Position 1",
}

function setupGui()
{
    /*
    // Create a folder for the GUI
    const folder = gui.addFolder('My Folder');

    // Add a boolean controller
    folder.add(guiState, 'myBoolean').name('My Boolean');

    // Add a string controller
    folder.add(guiState, 'myString').name('My String');

    // Add a number controller
    folder.add(guiState, 'myNumber', 0, 10).name('My Number');

    // Open the folder
    folder.open();
    */

    // 'Load File' Section
    const loadFileFolder = gui.addFolder('Load File').close();
    let fileOptions = ['Logo', 'Teapot', 'Hexoid', 'Cube, G2', 'Male Head'];
    loadFileFolder.add(globalState, 'file', fileOptions,).name('Choose Model');
    loadFileFolder.add( {func() {loadFile();}}, 'func' ).name('Load File');


    // 'Shader Settings' Section
    const shaderSettingsFolder = gui.addFolder('Shader Settings').close();
    shaderSettingsFolder.add(globalState, 'flipNormals').name('Flip Normals');
    shaderSettingsFolder.add(globalState, 'flatShading').name('Flat Shading');
    shaderSettingsFolder.add(globalState, 'highlightLines').name('Highlight Lines');
    shaderSettingsFolder.add(globalState, 'highlightReflection').name('Highlight Reflection');
    shaderSettingsFolder.add(globalState, 'wireframe').name('Wireframe');
    shaderSettingsFolder.add(globalState, 'visualizeNormals').name('Visualize Normals');

    shaderSettingsFolder.add(globalState, 'highlightDensity', 0, 1, 0.05).name('Highlight Density');
    shaderSettingsFolder.add(globalState, 'highlightResolution', 0, 30, 0.1).name('Highlight Resolution');
    shaderSettingsFolder.add(globalState, 'visualizeNormalSize', 0.01, 10, 0.01).name('Visualize Normals Size');


    // 'Curvature' Section
    const curvatureFolder = gui.addFolder('Curvature').close();
    curvatureFolder.add(globalState, 'showCurvature').name('Show Curvature');

    let curvatureOptions = ['Gaussian', 'Mean', 'Max', 'Min'];
    curvatureFolder.add(globalState, 'curvatureType', curvatureOptions).name('Curvature Types');

    // next two disabled since they're information readouts, and thus not editable
    curvatureFolder.add(globalState, 'curvatureMin').name('Curvature Min').disable();
    curvatureFolder.add(globalState, 'curvatureMax').name('Curvature Max').disable();
    curvatureFolder.add(globalState, 'clampMin').name('Clamp Min');
    curvatureFolder.add(globalState, 'clampMax').name('Clamp Max');
    curvatureFolder.add({func() {}}, 'func').name('Reset Clamp');


    // 'Display' Section
    const displayFolder = gui.addFolder('Display').close();
    displayFolder.add(globalState, 'controlMesh').name('Show Control Mesh');
    displayFolder.add(globalState, 'boundingBox').name('Show Bounding Box');
    displayFolder.add(globalState, 'showPatches').name('Show Patches');

    displayFolder.add(globalState, 'light1').name('Light 1');
    displayFolder.add(globalState, 'light2').name('Light 2');
    displayFolder.add(globalState, 'light3').name('Light 3');

    let detailOptions = ['4 × 4', '8 × 8', '16 × 16', '32 × 32', '64 × 64'];
    displayFolder.add(globalState, 'patchDetail', detailOptions).name('Patch Detail');


    // 'Groups' Section
    const groupsFolder = gui.addFolder('Groups').close();

    let groupOptions = ['All Groups', '(unnamed group)'];
    groupsFolder.add(globalState, 'group', groupOptions).name('Group');

    let groupColorOptions = ['Yellow', 'Green', 'Silver', 'Red', 'Cyan', 'Magenta', 'Orange', 'Purple', 'Blue'];
    groupsFolder.add(globalState, 'groupColor', groupColorOptions).name('Group Color');
    groupsFolder.add({func() {}}, 'func').name('Delete Folder');


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
    // not really a good way to display help text within the lilgui panel,
    // maybe have a 'help' button that, when clicked, unhides a div with
    // the information in the current help section?
    helpFolder.add({func() {}}, 'func').name('Show Help');
}

function loadFile(file) {
    // Load the file, parse the file, update the global state, update the GUI
    alert("hello");
}

export { setupGui, globalState };
