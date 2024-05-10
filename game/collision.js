import BoundingBox from "./boundingBox.js";
import { GameObject } from "./gameObject.js";

/** @type {BoundingBox[]} */
var collision_queue = [];

/**
 * add bounding box to collision queue
 * @param {BoundingBox} bb 
 */
function addCollideable(bb) {
    if (bb.collideable) {
        collision_queue.push(bb);
    }
}

/**
 * remove bounding box from collision queue
 * @param {BoundingBox} bb 
 */
function removeCollideable(bb) {
    if (bb.collideable) {
        collision_queue.splice(collision_queue.indexOf(bb), 1);
    }
}

/**
 * clear collision queue
 */
function clearCollideable() {
    collision_queue.splice(0, collision_queue.length);
}

class Collision {
    /**
     * @param {GameObject} object1 
     * @param {GameObject} object2 
     */
    constructor(object1, object2) {
        /** @type {GameObject} */
        this.object1 = object1;
        /** @type {GameObject} */
        this.object2 = object2;
    }
}

/**
 * find all collisions in the collision queue
 * 
 * time complexity O(n^2)
 * @returns {Collision[]}
 */
function testCollision() {
    /** @type {Collision[]} */
    let collisions = [];
    for (let i = 0; i < collision_queue.length; i++) {
        for (let j = i + 1; j < collision_queue.length; j++) {
            let bb1 = collision_queue[i];
            let bb2 = collision_queue[j];
            if (bb1.intersect(bb2)) {
                collisions.push(new Collision(bb1.This, bb2.This));
            }
        }
    }
    return collisions;
}

export {addCollideable, removeCollideable, clearCollideable, Collision, testCollision};