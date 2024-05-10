import Game from "./game.js";
import { pollInput, setupInput } from "./inputEvent.js";

const container = document.querySelector("#game_container");
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
/** @type {Game} */
var game;
var last_timestamp;
const update_interval = 5;

// async function loop(timestamp) {
//     // poll input events
//     let key_status = pollInput();
//     // update
//     await game.update(key_status, (timestamp - last_timestamp) / 1000);
//     // render
//     game.render(ctx);
//     last_timestamp = timestamp;
//     window.requestAnimationFrame(loop);
// }

async function updateInterval() {
    // poll input events
    let key_status = pollInput();
    await game.processInput(key_status);
    // update
    await game.update(update_interval / 1000);
}

function render(timestamp) {
    game.render(ctx);
    window.requestAnimationFrame(render);
}

// init game
setupInput();
game = new Game(parseInt(window.getComputedStyle(container).width), parseInt(window.getComputedStyle(container).height));
await game.reset();
last_timestamp = new Date().getTime();
setInterval(updateInterval, update_interval);
window.requestAnimationFrame(render);