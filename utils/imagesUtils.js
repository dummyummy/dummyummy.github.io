/**
 * block until image is loaded
 * @param {string} src 
 * @returns promise for loading the image
 */
export async function loadImage(src) {
    return await new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = (err) => rej(err);
        img.src = src;
    });
};