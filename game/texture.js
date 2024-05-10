import { loadImage } from "../utils/imagesUtils.js";

/** @typedef {'Color' | 'Image'} TextureType */

export class Texture {
    /**
     * @param {TextureType} type 
     * @param {string | HTMLImageElement} texture hexadecimal color or Image
     */
    constructor(type, texture) {
        if (!['Color', 'Image'].includes(type)) {
            throw Error("Not supported texture type");
        }
        /** @type {TextureType} */
        this.type = type;
        /** @type {string | HTMLImageElement} */
        this.texture = texture;
    }
}

/**
 * Factory method for creating a texture
 * @param {TextureType} type 
 * @param {string} texture hexadecimal color or image path
 */
export async function createTexture(type, texture) {
    const data = (type === 'Color' ? texture : await loadImage(texture));
    return new Texture(type, data);
}