import Game from "./game.js";
import { pollInput, setupInput } from "./inputEvent.js";

const container = document.querySelector("#game_container");
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
/** @type {Game} */
var game;
var last_timestamp;

async function loop(timestamp) {
    // poll input events
    let key_status = pollInput();
    // update
    await game.update(key_status, (timestamp - last_timestamp) / 1000);
    // render
    game.render(ctx);
    last_timestamp = timestamp;
    window.requestAnimationFrame(loop);
}

// init game
setupInput();
game = new Game(parseInt(window.getComputedStyle(container).width), parseInt(window.getComputedStyle(container).height));
await game.reset();
last_timestamp = new Date().getTime();
window.requestAnimationFrame(loop);