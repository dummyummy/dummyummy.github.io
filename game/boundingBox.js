import { GameObject } from "./gameObject.js";
import { BaseShape, Shape } from "./shape.js";

export default class BoundingBox {
    /**
     * @param {BaseShape} shape 
     * @param {boolean} collideable
     * @param {GameObject} This game object that owns this bounding box
     */
    constructor(shape, collideable=false, This) {
        /** @type {BaseShape} */
        this.shape = shape;
        this.collideable = collideable;
        this.This = This;
    }

    /**
     * @param {BoundingBox} bb
     * @returns {boolean}
     */
    intersect(bb) {
        /** @type {boolean} */
        let result = false;
        switch (bb.shape.type) {
            case Shape.BaseShape:
                throw Error("Invalid BaseShape instance");
            case Shape.Rectangle:
                result = this.shape.intersectRectangle(bb.shape);
                break;
            case Shape.Circle:
                result = this.shape.intersectCircle(bb.shape);
                break;
            default:
                throw Error("Unknown shape " + bb.shape.type);
        }
        return result;
    }
}
