import Victor from "../utils/victor.js";
import { clearCollideable, testCollision } from "./collision.js";
import GameMap from "./gameMap.js";
import { Player } from "./gameObject.js";
import { Rectangle } from "./shape.js";
import { Texture, createTexture } from "./texture.js";

const GameState = {
    MENU: 0,
    PLAYING: 1,
    RESTART: 2
};
/** @typedef {number} GameStateEnum */
export default class Game {
    /**
     * Create a new game with its map size (w, h)
     * @param {number} w
     * @param {number} h
     */
    constructor(w, h) {
        /** @type {number} */
        this.w = w;
        /** @type {number} */
        this.h = h;
        /** @type {GameStateEnum} */
        this.state = GameState.MENU;
        /** @type {Player} */
        this.player = null;
        /** @type {number} */
        this.player_size = this.w / 13.5;
        /** @type {Texture} */
        this.player_texture = null;
        /** @type {GameMap} */
        this.map = null;
        /** @type {number} */
        this.level = 0;
    }

    async reset() {
        clearCollideable();
        this.player = new Player(new Rectangle((this.w - this.player_size) / 2, this.h * 0.75, this.player_size, this.player_size), true);
        this.map = new GameMap(this.w, this.h, this.player_size, 3);
        this.player.restrict(-this.player_size / 2, this.w - 1 - this.player_size / 2, this.h / 2, this.h - 1);
        this.player_texture = await createTexture("Color", "#FF0000");
        this.level = 0;
        this.state = GameState.MENU;
    }

    /**
     * @param {{a:number,s:number,d:number}} key_status
     * @param {number} elapsed
     */
    async update(key_status, elapsed) {
        await this.processInput(key_status);
        let collisions = testCollision();
        collisions.forEach((value) => {
            let gameObj1 = value.object1;
            let gameObj2 = value.object2;
            if (gameObj1 === this.player || gameObj2 === this.player) {
                this.player.alive = false;
            }
        });
        if (!this.player.alive) {
            // todo: resume and redirect player to the reset menu
            this.state = GameState.RESTART;
            clearCollideable(); // no need to check collideable
            this.player.vel = new Victor(0, 0);
            this.player.acc = new Victor(0, 0);
        }
        else { // update player and map
            this.player.update(elapsed);
            if (this.player.beyondBottom()) {
                const offset = this.player.boundary.b - this.player.shape.minY();
                this.map.scroll(offset);
                this.player.shape.translate(0, offset);
            }
            this.map.update(elapsed, this.level);
        }
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        ctx.fillStyle = "#E4E4E4";
        ctx.fillRect(0, 0, this.w, this.h);
        switch (this.state) {
            case GameState.MENU:
                this.map.render(ctx);
                this.player.shape.draw(ctx, this.player_texture);
                this.drawStart(ctx);
                break;
            case GameState.PLAYING:
                this.map.render(ctx);
                this.player.shape.draw(ctx, this.player_texture);
                this.drawScore(ctx);
                break;
            case GameState.RESTART:
                this.map.render(ctx);
                this.player.shape.draw(ctx, this.player_texture);
                this.drawFinalScore(ctx);
                break;
            default:
                throw Error("Not supported game state " + this.state.toString());
        }
    }

    /**
     * @private
     * @param {{a:number,s:number,d:number}} key_status
     */
    async processInput(key_status) {
        if (key_status.a + key_status.d > 0 && (this.state === GameState.MENU || this.state === GameState.PLAYING)) {
            this.state = GameState.PLAYING;
            const dir = key_status.a > 0 ? -1 : 1;
            this.player.vel = new Victor(dir * this.w * 0.38, -this.player_size * 25);
            this.player.acc = new Victor(0, this.player_size * 55);
        } else if (key_status.s > 0 && this.state === GameState.RESTART) {
            await this.reset();
        }
    }

    /**
     * @private
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawScore(ctx) {
        ctx.font = "bolder 50px Courier New";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        let score = this.map.score.toString();
        ctx.fillStyle = "#FF5733";
        ctx.fillText(score, this.w / 2, this.h * 0.10);
    }

    /**
     * @private
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawStart(ctx) {
        ctx.font = "bolder 30px Consolas";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillStyle = "#FF5733";
        let prompt = "Start by Pressing";
        ctx.fillText(prompt, this.w / 2, this.h * 0.50);
        prompt = "A or D";
        ctx.fillText(prompt, this.w / 2, this.h * 0.50 + 30);
    }

    /**
     * @private
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawFinalScore(ctx) {
        ctx.font = "bolder 30px Consolas";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillStyle = "#FF5733";
        let prompt = "Your Score is:";
        ctx.fillText(prompt, this.w / 2, this.h * 0.30);
        prompt = this.map.score.toString();
        ctx.fillText(prompt, this.w / 2, this.h * 0.30 + 30);
        prompt = " ";
        ctx.fillText(prompt, this.w / 2, this.h * 0.30 + 60);
        prompt = "Press S to restart";
        ctx.fillText(prompt, this.w / 2, this.h * 0.30 + 90);
    }
}