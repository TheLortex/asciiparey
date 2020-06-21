export class Coor2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    toIndex() {
        return this.pair().join(",");
    }
    pair() {
        return [this.x, this.y];
    }
    floor() {
        return new Coor2D(Math.floor(this.x), Math.floor(this.y));
    }
    clone() {
        return new Coor2D(this.x, this.y);
    }
    up(n) {
        return new Coor2D(this.x, this.y - n);
    }
    down(n) {
        return new Coor2D(this.x, this.y + n);
    }
    left(n) {
        return new Coor2D(this.x - n, this.y);
    }
    right(n) {
        return new Coor2D(this.x + n, this.y);
    }
    equals(other) {
        return this.x == other.x && this.y == other.y;
    }
}
export const CASE_WIDTH = 12;
export const CASE_HEIGHT = 1.6 * CASE_WIDTH;
// Helpers
export function localToCanvas(offset, coord) {
    let x = (coord.x - offset.x) * CASE_WIDTH;
    let y = (coord.y - offset.y) * CASE_HEIGHT;
    return new Coor2D(x, y);
}
export function canvasToLocal(offset, coord) {
    let x = coord.x / CASE_WIDTH + offset.x;
    let y = coord.y / CASE_HEIGHT + offset.y;
    return new Coor2D(x, y);
}
