import Victor from "../utils/victor.js";
import BoundingBox from "./boundingBox.js";
import { addCollideable } from "./collision.js";
import { BaseShape } from "./shape.js";

class GameObject {
    /**
     * @param {BaseShape} shape 
     * @param {boolean} collideable 
     * @param {Victor} vel
     * @param {Victor} acc
     */
    constructor(shape, collideable, vel=new Victor(0,0), acc=new Victor(0,0)) {
        /** @type {BaseShape} */
        this.shape = shape;
        /** @type {BoundingBox} */
        this.bounding_box = new BoundingBox(this.shape, collideable, this);
        /** @type {Victor} */
        this.vel = vel;
        /** @type {Victor} */
        this.acc = acc;
        addCollideable(this.bounding_box);
    }

    /**
     * update the game object
     * @abstract
     * @param {number} elapsed time elapsed
     */
    update(elapsed) {
        this.shape.update(elapsed, this.vel, this.acc);
        this.vel.x += this.acc.x * elapsed;
        this.vel.y += this.acc.y * elapsed;
    }
}

/**
 * @extends {GameObject}
 * @inheritdoc
 */
class Player extends GameObject {
    /**
     * @param {BaseShape} shape 
     * @param {boolean} collideable 
     * @param {Victor} vel
     * @param {Victor} acc
     */
    constructor(shape, collideable, vel=new Victor(0, 0), acc=new Victor(0,0)) {
        super(shape, collideable, vel, acc);
        /** @type {boolean} */
        this.alive = true;
        /** @type {{l:number, r:number, b:number, c:number}|null} */
        this.boundary = null;
    }

    /**
     * update the player
     * @override
     * @param {number} elapsed time elapsed
     */
    update(elapsed) {
        super.update(elapsed);
        if (this.boundary !== null) {
            let result = this.shape.inBoundary(
                this.boundary.l, this.boundary.r,
                this.boundary.b, this.boundary.t
            );
            if (!result.t) { // wasted!
                this.alive = false;
            } else if (!result.l || !result.r) {
                this.shape.clamp(
                    this.boundary.l, this.boundary.r,
                    0, this.boundary.t
                );
            }
        }
    }

    /**
     * set restriction to keep player boundary
     * @param {number} l
     * @param {number} r
     * @param {number} b
     * @param {number} t
     */
    restrict(l, r, b, t) {
        this.boundary = {
            l: l,
            r: r,
            b: b,
            t: t
        };
    }
    
    /**
     * test if player goes cross the bottom boundary edge
     * @returns {boolean}
     */
    beyondBottom() {
        return this.shape.minY() < this.boundary.b;
    }
}

/**
 * @extends {GameObject}
 * @inheritdoc
 */
class StaticWall extends GameObject {
    /**
     * @param {BaseShape} shape 
     * @param {boolean} collideable 
     */
    constructor(shape, collideable) {
        super(shape, collideable, new Victor(0, 0), new Victor(0, 0));
    }
}

export { GameObject, Player, StaticWall }