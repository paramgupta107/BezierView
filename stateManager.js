import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const gui = new GUI();

const guiState = {
	myBoolean: true,
	myString: 'lil-gui',
	myNumber: 1
};

const globalState = {}

function setupGui(){
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
}

function loadFile(file) {
    // Load the file, parse the file, update the global state, update the GUI
}

export { setupGui, globalState };