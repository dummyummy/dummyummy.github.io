import { removeCollideable } from "./collision.js";
import { GameObject, StaticWall } from "./gameObject.js";
import { Rectangle } from "./shape.js";
import { Texture } from "./texture.js";

class Level {
    /**
     * @param {number} rule rule to generate this level
     * @param {number} w width of the map
     * @param {number} h height of the map
     * @param {number} player_size size of the player
     * @param {number} height height of left wall and right wall
     */
    constructor(rule, w, h, player_size, height) {
        this.rule = rule;
        this.player_size = player_size;
        this.breach_width = player_size * 5.5;
        this.height = height;
        this.w = w;
        this.h = h;
        this.wall_left = null;
        this.wall_right = null;
        /** @type {GameObject[]} */
        this.blocks = [];
        this.wall_texture = new Texture('Color', "#000000");
        this.active = true;
        this.crossed = 0; // 0: not yet crossed 1: just crossed 2: already crossed
        this.addWalls();
        this.last_minY = -1;
    }

    /**
     * @private
     */
    addWalls() {
        const wall_left_width = Math.ceil(Math.random() * (this.w - this.breach_width));
        this.wall_left = new StaticWall(new Rectangle(0, this.height, wall_left_width, this.player_size * 1.2), true);
        this.wall_right = new StaticWall(new Rectangle(wall_left_width + this.breach_width, this.height, 
            this.w - wall_left_width - this.breach_width, this.player_size * 1.2), true);
        switch (this.rule) {
            case 0:
                break;
            case 1: // 1 small block
                let single_block_x = wall_left_width - this.player_size + Math.random() * (this.player_size + this.breach_width);
                while (single_block_x < 0 || single_block_x > this.w - this.player_size) {
                    single_block_x = wall_left_width - this.player_size + Math.random() * (this.player_size + this.breach_width);
                }
                const single_block = new StaticWall(new Rectangle(
                    single_block_x, 
                    Math.random() < 0.5 ? this.height - 3.625 * this.player_size : this.height - 9.625 * this.player_size, 
                    this.player_size, 
                    this.player_size), true);
                this.blocks.push(single_block);
                break;
            case 2:
                let block1_x = wall_left_width - this.player_size + Math.random() * (this.player_size + this.breach_width);
                while (block1_x < 0 || block1_x > this.w - this.player_size) {
                    block1_x = wall_left_width - this.player_size + Math.random() * (this.player_size + this.breach_width);
                }
                const block1 = new StaticWall(new Rectangle(
                    block1_x, 
                    this.height - 3.625 * this.player_size, 
                    this.player_size, 
                    this.player_size), true);
                let block2_x = wall_left_width - this.player_size + Math.random() * (this.player_size + this.breach_width);
                while (block2_x < 0 || block2_x > this.w - this.player_size) {
                    block2_x = wall_left_width - this.player_size + Math.random() * (this.player_size + this.breach_width);
                }
                const block2 = new StaticWall(new Rectangle(
                    block2_x, 
                    this.height - 9.625 * this.player_size, 
                    this.player_size, 
                    this.player_size), true);
                this.blocks.push(block1);
                this.blocks.push(block2);
                break;
            case 3:
                let big_block_x = wall_left_width - 1.5 * this.player_size + Math.random() * (this.breach_width);
                while (big_block_x < 0 || big_block_x > this.w - 3 * this.player_size) {
                    big_block_x = wall_left_width - 1.5 * this.player_size + Math.random() * (this.breach_width);
                }
                const big_block = new StaticWall(new Rectangle(
                    big_block_x, 
                    this.height - 7.625 * this.player_size, 
                    3 * this.player_size, 
                    3 * this.player_size), true);
                this.blocks.push(big_block);
                break;
            default:
                throw Error("Not supported rule for generating the wall");
        }
    }

    /**
     * move none static walls
     * @param {number} elapsed
     */
    update(elapsed) {
        this.active = (this.height - 12.25 * this.player_size) <= this.h;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        if (this.wall_left != null) {
            this.wall_left.shape.draw(ctx, this.wall_texture);
        }
        if (this.wall_right != null) {
            this.wall_right.shape.draw(ctx, this.wall_texture);
        }
        this.blocks.forEach((block) => block.shape.draw(ctx, this.wall_texture));
    }

    /**
     * scroll this level down
     * @param {number} offset 
     */
    scroll(offset) {
        if (this.wall_left != null) {
            let wall_left_minY = this.wall_left.shape.minY();
            if (wall_left_minY <= this.h / 2 && wall_left_minY + offset >= this.h / 2) {
                this.crossed = 1;
            } else if (wall_left_minY >= this.h / 2) {
                this.crossed = 2;
            }
            this.wall_left.shape.translate(0, offset);
        }
        if (this.wall_right != null) {
            this.wall_right.shape.translate(0, offset);
        }
        this.blocks.forEach((block) => block.shape.translate(0, offset));
        this.height += offset;
    }

    /**
     * remove this level from map
     */
    deactivate() {
        if (this.wall_left != null) {
            removeCollideable(this.wall_left.bounding_box);
        }
        if (this.wall_right != null) {
            removeCollideable(this.wall_right.bounding_box);
        }
        this.blocks.forEach((block) => removeCollideable(block.bounding_box));
    }

    /**
     * min y values of all the blocks in this level
     * @returns {number}
     */
    minY() {
        return Math.min(
            this.wall_left == null ? h : this.wall_left.shape.minY(),
            this.wall_right == null ? h : this.wall_right.shape.minY()
        );
    }
}

export default class GameMap {
    /**
     * @param {number} w
     * @param {number} h
     * @param {number} player_size 
     * @param {number} preload 
     */
    constructor(w, h, player_size, preload=3) {
        this.levels = [];
        this.w = w;
        this.h = h;
        this.player_size = player_size;
        for (let i = preload - 1; i >= 0; i--) {
            this.levels.push(new Level(0, w, h, player_size,
                h / 2 - 6.75 * player_size - i * 13.5 * player_size));
        }
        this.loaded = preload;
        this.max_rule_index = 3;
        this.score = 0;
        /** @type {number[]} */
        this.index_count = new Array(this.max_rule_index + 1);
        this.index_count[this.max_rule_index] = 1;
        this.index_add = [0, 1, 2.5, 3];
        for (let i = this.max_rule_index - 1; i >= 0; i--) {
            this.index_count[i] = this.index_count[i + 1] * 6;
        }
    }

    /**
     * @param {number} elapsed
     * @param {number} level
     */
    update(elapsed, level) {
        this.levels.forEach((lev) => lev.update(elapsed));
        while (!this.levels.at(-1).active) {
            this.levels.pop().deactivate();
        }
        let minY0 = this.levels.at(0).last_minY;
        let minY1 = this.levels.at(0).minY();
        if (minY0 !== minY1 && minY0 * minY1 <= 0) {
            this.levels.splice(0, 0, new Level(this.sampleRule(), this.w, this.h, 
                this.player_size, this.levels.at(0).height - 13.5 * this.player_size))
            this.loaded++;
        }
        this.levels.at(0).last_minY = minY1;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        this.levels.forEach((level) => level.render(ctx));
    }

    /**
     * scroll the map down, meanwhile update the score
     * @param {number} offset 
     */
    scroll(offset) {
        this.levels.forEach((level) => level.scroll(offset));
        this.score += this.levels.reduce((acc, cur) => acc + (cur.crossed === 1 ? 1 : 0), 0);
    }

    /**
     * sample a rule index based on index_count
     * and update index_count
     * @return {number} index
     */
    sampleRule() {
        let sum = this.index_count.reduce((acc, cur) => acc + cur);
        let acc = sum * Math.random();
        console.log(sum, this.index_count);
        let ind = 0, sum1 = 0, sum2 = this.index_count[0];
        for (let i = 0; i <= this.max_rule_index; i++) {
            if (acc >= sum1 && acc < sum2) {
                ind = i;
            }
            sum1 = sum2;
            if (i < this.max_rule_index) {
                sum2 += this.index_count[i + 1];
            }
        }
        this.index_count.forEach((_, ind, arr) => arr[ind] += this.index_add[ind]);
        return ind;
    }
}