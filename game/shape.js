import Victor from "../utils/victor.js";
import { Texture }  from "./texture.js";

export const Shape = {
    BaseShape: -1,
    Rectangle: 0,
    Circle: 1
};

/**
 * Shape enum class
 * @typedef {number} ShapeEnum
 */

export class BaseShape {
    constructor() {
        /**
         * @type {ShapeEnum}
         * @readonly
         */
        this.type = Shape.BaseShape;
    }

    /**
     * Test intersection with a rectangle
     * @abstract
     * @param {Rectangle} r rectangle to test
     * @returns {boolean}
     */
    intersectRectangle(r) {
        throw Error("Not implemented method: intersectRectangle");
    }

    /**
     * Test intersection with a circle
     * @abstract
     * @param {Circle} c circle to test
     * @returns {boolean}
     */
    intersectCircle(c) {
        throw Error("Not implemented method: intersectCircle");
    }

    /**
     * Update position of the shape
     * @abstract
     * @param {number} elapsed elapsed time
     * @param {Victor} vel
     * @param {Victor} acc
     */
    update(elapsed, vel, acc) {
        throw Error("Not implemented method: update");
    }

    /**
     * Check if shape stays within boundary
     * @abstract
     * @param {number} l
     * @param {number} r
     * @param {number} b
     * @param {number} t
     * @returns {{l:boolean, r:boolean, b:boolean, t:boolean}} result for all four boundary edges
     */
    inBoundary(l, r, b, t) {
        throw Error("Not implemented method: inBoundary");
    }

    /**
     * translate shape by (tx, ty)
     * @abstract
     * @param {number} tx 
     * @param {number} ty 
     */
    translate(tx, ty) {
        throw Error("Not implemented method: translate");
    }

    /**
     * clamp shape to boundary edges
     * @abstract
     * @param {number} l
     * @param {number} r
     * @param {number} b
     * @param {number} t
     */
    clamp(l, r, b, t) {
        throw Error("Not implemented method: clamp");
    }

    /**
     * draw shape on the canvas
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Texture} texture 
     */
    draw(ctx, texture) {
        throw Error("Not implemented method: draw");
    }

    /**
     * calculate min y value of all the points in the shape
     * @override
     * @returns {number} min y value
     */
    minY() {
        throw Error("Not implemented method: minY");
    }
}

/**
 * @extends BaseShape
 * @inheritdoc
 */
export class Rectangle extends BaseShape {
    /**
     * @param {number} x top-left corner's x coordinate
     * @param {number} y top-left corner's y coordinate
     * @param {number} w 
     * @param {number} h 
     */
    constructor(x, y, w, h) {
        super();
        /**
         * @type {ShapeEnum}
         * @readonly
         */
        this.type = Shape.Rectangle;
        /** @type {number} */
        this.x = x;
        /** @type {number} */
        this.y = y;
        /** @type {number} */
        this.w = w;
        /** @type {number} */
        this.h = h;
    }

    /**
     * @override
     * @param {Rectangle} r rectangle to test
     * @returns {boolean}
     */
    intersectRectangle(r) {
        let [x1, x2] = [this.x, r.x];
        let [y1, y2] = [this.y, r.y];
        let [w1, w2] = [this.w, r.w];
        let [h1, h2] = [this.h, r.h];
        return x1 < x2 + w2
            && x1 + w1 > x2
            && y1 < y2 + h2
            && y1 + h1 > y2;
    }

    /**
     * @override
     * @param {Circle} c circle to test
     * @returns {boolean}
     */
    intersectCircle(c) {
        let h = new Victor(this.w / 2, this.h / w);
        let u = new Victor(Math.abs(c.x - this.x), Math.abs(c.y - this.y));
        let v = u.clone().subtract(h).invert().limit(0, 0);
        return v.lengthSq() < c.radius * c.radius;
    }

    /**
     * Update position of the rectangle
     * @override
     * @param {number} elapsed elapsed time
     * @param {Victor} vel
     * @param {Victor} acc
     */
    update(elapsed, vel, acc) {
        let [vx1, vx2] = [vel.x, vel.x + acc.x * elapsed];
        let avg_vx = (vx1 + vx2) * 0.5;
        this.x += elapsed * avg_vx;
        let [vy1, vy2] = [vel.y, vel.y + acc.y * elapsed];
        let avg_vy = (vy1 + vy2) * 0.5;
        this.y += elapsed * avg_vy;
    }

    /**
     * Check if rectangle stays within boundary
     * @override
     * @param {number} l
     * @param {number} r
     * @param {number} b
     * @param {number} t
     * @returns {{l:boolean, r:boolean, b:boolean, t:boolean}} result for all four boundary edges
     */
    inBoundary(l, r, b, t) {
        return {
            l: this.x >= l,
            r: this.x <= r,
            b: this.y >= b,
            t: this.y <= t,
        }
    }

    /**
     * translate rectangle by (tx, ty)
     * @override
     * @param {number} tx 
     * @param {number} ty 
     */
    translate(tx, ty) {
        this.x += tx;
        this.y += ty;
    }

    /**
     * clamp circle to boundary edges
     * @override
     * @param {number} l
     * @param {number} r
     * @param {number} b
     * @param {number} t
     */
    clamp(l, r, b, t) {
        this.x = Math.min(r, Math.max(this.x, l));
        this.y = Math.min(t, Math.max(this.y, b));
    }

    /**
     * draw rectangle on the canvas
     * @override
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Texture} texture 
     */
    draw(ctx, texture) {
        if (texture.type == 'Image') {
            /** @todo */
        } else {
            ctx.fillStyle = texture.texture;
            ctx.strokeStyle = texture.texture;
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }
    }

    /**
     * calculate min y value of all the points in the rectangle
     * @override
     * @returns {number} min y value
     */
    minY() {
        return this.y;
    }
}

/**
 * @extends BaseShape
 * @inheritdoc
 */
export class Circle extends BaseShape {
    /**
     * @param {number} x center's x coordinate
     * @param {number} y center's y coordinate
     * @param {number} radius 
     */
    constructor(x, y, radius) {
        super();
        /**
         * @type {ShapeEnum}
         * @readonly
         */
        this.type = Shape.Circle;
        /** @type {number} */
        this.x = x;
        /** @type {number} */
        this.y = y;
        /** @type {number} */
        this.radius = radius;
    }

    /**
     * @override
     * @param {Rectangle} r rectangle to test
     * @returns {boolean}
     */
    intersectRectangle(r) {
        return r.intersectCircle(this);
    }

    /**
     * @override
     * @param {Circle} c circle to test
     * @returns {boolean}
     */
    intersectCircle(c) {
        let p1 = new Victor(this.x, this.y);
        let p2 = new Victor(c.x, c.y);
        return p1.subtract(p2).length() < this.radius + c.radius;
    }

    /**
     * Update position of the circle
     * @override
     * @param {number} elapsed elapsed time
     * @param {Victor} vel
     * @param {Victor} acc
     */
    update(elapsed, vel, acc) {
        let [vx1, vx2] = [vel.x, vel.x + acc.x * elapsed];
        let avg_vx = (vx1 + vx2) * 0.5;
        this.x += elapsed * avg_vx;
        let [vy1, vy2] = [vel.y, vel.y + acc.y * elapsed];
        let avg_vy = (vy1 + vy2) * 0.5;
        this.y += elapsed * avg_vy;
    }

    /**
     * Check if circle stays within boundary
     * @override
     * @param {number} l
     * @param {number} r
     * @param {number} b
     * @param {number} t
     * @returns {{l:boolean, r:boolean, b:boolean, t:boolean}} result for all four boundary edges
     */
    inBoundary(l, r, b, t) {
        return {
            l: this.x >= l,
            r: this.x <= r,
            b: this.y >= b,
            t: this.y >= t,
        }
    }

    /**
     * translate circle by (tx, ty)
     * @override
     * @param {number} tx 
     * @param {number} ty 
     */
    translate(tx, ty) {
        this.x += tx;
        this.y += ty;
    }

    /**
     * clamp circle to boundary edges
     * @override
     * @param {number} l
     * @param {number} r
     * @param {number} b
     * @param {number} t
     */
    clamp(l, r, b, t) {
        this.x = Math.min(r, Math.max(this.x, l));
        this.y = Math.min(t, Math.max(this.y, b));
    }

    /**
     * draw circle on the canvas
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Texture} texture 
     */
    draw(ctx, texture) {
        if (texture.type == 'Image') {
            throw Error("Not supported circular image texture");
        } else {
            ctx.fillStyle = texture.texture;
            ctx.strokeStyle = texture.texture;
            ctx.lineWidth = 1;
            ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, true);
            ctx.fill();
            ctx.stroke();
        }
    }

    /**
     * calculate min y value of all the points in the circle
     * @override
     * @returns {number} min y value
     */
    minY() {
        return this.y - this.radius;
    }
}