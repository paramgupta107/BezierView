import {
	FileLoader,
	Group,
	Loader
} from 'three';

/**
 * A loader for the Bv format.
 *
 * The [Bv format]{@link https://www.cise.ufl.edu/research/SurfLab/bview/#file-format} is a simple data-format that
 * represents 3D beizer patches.
 *
 * ```js
 * const loader = new BvLoader();
 * const object = await loader.loadAsync( 'models/monster.obj' );
 * scene.add( object );
 * ```
 *
 * @augments Loader
 * @three_import import { BvLoader } from 'three/addons/loaders/BvLoader.js';
 */
class BvLoader extends Loader {

	/**
	 * Constructs a new Bv loader.
	 *
	 * @param {LoadingManager} [manager] - The loading manager.
	 */
	constructor( manager ) {

		super( manager );

		this.materials = null;

	}

	/**
	 * Starts loading from the given URL and passes the loaded OBJ asset
	 * to the `onLoad()` callback.
	 *
	 * @param {string} url - The path/URL of the file to be loaded. This can also be a data URI.
	 * @param {function(Group)} onLoad - Executed when the loading process has been finished.
	 * @param {onProgressCallback} onProgress - Executed while the loading is in progress.
	 * @param {onErrorCallback} onError - Executed when errors occur.
	 */
	load( url, onLoad, onProgress, onError ) {

		const scope = this;

		const loader = new FileLoader( this.manager );
		loader.setPath( this.path );
		loader.setRequestHeader( this.requestHeader );
		loader.setWithCredentials( this.withCredentials );
		loader.load( url, function ( text ) {

			try {

				onLoad( scope.parse( text ) );

			} catch ( e ) {

				if ( onError ) {

					onError( e );

				} else {

					console.error( e );

				}

				scope.manager.itemError( url );

			}

		}, onProgress, onError );

	}

	/**
	 * Sets the material creator for this OBJ. This object is loaded via {@link MTLLoader}.
	 *
	 * @param {MaterialCreator} materials - An object that creates the materials for this OBJ.
	 * @return {BvLoader} A reference to this loader.
	 */
	setMaterials( materials ) {

		this.materials = materials;

		return this;

	}

	/**
	 * Parses the given Bv data and returns the resulting group.
	 *
	 * @param {string} text - The raw Bv data as a string.
	 * @return {Group} The parsed Bv.
	 */
	parse( text ) {

		const container = new Group();

        // Create a Patch. Enable contorl mesh and normals if this.materials is null
        // Assign material based on patch group. Only do that if this.materials is null otherwise use this.materials
		container.add( patch );

		return container;

	}

}

export { BvLoader };