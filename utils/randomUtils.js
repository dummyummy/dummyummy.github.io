/**
 * https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Math/random
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
export function getRandomInt(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // 不包含最大值，包含最小值
}

/**
 * random float number in arbitary interval
 * @param {number} min 
 * @param {number} max 
 */
export function random(min, max) {
    if (min > max) {
        throw Error("degenerated interva for random generation");
    } else {
        return min + Math.random() * (max - min);
    }
}