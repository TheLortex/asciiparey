export type LinkNotebook = {
    kind: '#',
    to: string,
    position: Coor2D
};

export type LinkCommand = {
    kind: '$',
    to: "select" | "box" | "move_to" | "reset",
    position: Coor2D
}

export type Link = LinkCommand | LinkNotebook;

export type CoorPair = [number, number];

export class Coor2D {
    toIndex(): string {
        return this.pair().join(",");
    }
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    pair(): CoorPair {
        return [this.x, this.y];
    }

    floor(): Coor2D {
        return new Coor2D(Math.floor(this.x), Math.floor(this.y))
    }

    clone(): Coor2D {
        return new Coor2D(this.x, this.y);
    }

    up(n: number): Coor2D {
        return new Coor2D(this.x, this.y-n);
    }

    down(n: number): Coor2D {
        return new Coor2D(this.x, this.y+n);
    }
    left(n: number): Coor2D {
        return new Coor2D(this.x-n, this.y);
    }
    right(n: number): Coor2D {
        return new Coor2D(this.x+n, this.y);
    }

    equals(other: Coor2D): boolean {
        return this.x == other.x && this.y == other.y;
    }
}

export const CASE_WIDTH = 12;
export const CASE_HEIGHT = 1.6 * CASE_WIDTH;


// Helpers

export function localToCanvas(offset: LocalCoor2D, coord: LocalCoor2D): CanvasCoor2D {
    let x = (coord.x - offset.x) * CASE_WIDTH;
    let y = (coord.y - offset.y) * CASE_HEIGHT;
    return new Coor2D(x,y);
}

export function canvasToLocal(offset: LocalCoor2D, coord: CanvasCoor2D): LocalCoor2D {
    let x = coord.x/CASE_WIDTH + offset.x;
    let y = coord.y/CASE_HEIGHT+ offset.y;
    return new Coor2D(x,y);
}

// Positions on the canvas.
export type CanvasCoor2D = Coor2D;
// Positions on the grid.
export type LocalCoor2D  = Coor2D;