import { Coor2D, CoorPair, CASE_HEIGHT, CASE_WIDTH, Link, LocalCoor2D, LinkCommand } from "./misc";


const regex = /\w|\$|\#|\-|\./;

export class State {
    content: Map<string, string>; // (x,y) -> letter

    color: string;

    dirty: boolean; // command string computation status
    _commands: LinkCommand[];

    constructor(color: string) {
        this.content = new Map();
        this.color = color;
        this.dirty = true;
        this._commands = [];
    }

    async setup(page: string) {
        let storage = window.localStorage.getItem("p-" + page);

        if (storage) {
            this.content = new Map(JSON.parse(storage));
        } else {
            this.content = new Map();

            let result = await fetch("./default/"+page+".ascii");
            if (result.ok) {
                let text = await result.text();
                this.write(new Coor2D(0, 0), text);
            }
        }
    }

    clone(): State { // thank you https://stackoverflow.com/questions/41474986/how-to-clone-a-javascript-es6-class-instance
        let clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
        clone.content = new Map(this.content);
        return clone;
    }

    save(page: string) {
        window.localStorage.setItem("p-" + page, JSON.stringify(Array.from(this.content.entries())))
    }

    private renderGrid(ctx: CanvasRenderingContext2D, center: Coor2D) {

        let n_rows = Math.ceil(ctx.canvas.height / CASE_HEIGHT);
        let n_columns = Math.ceil(ctx.canvas.width / CASE_WIDTH);


        ctx.strokeStyle = "#f0f0f0";

        for (let x = 0; x < n_columns; x++) {
            ctx.beginPath();
            ctx.moveTo(x * CASE_WIDTH, 0);
            ctx.lineTo(x * CASE_WIDTH, ctx.canvas.height);
            ctx.stroke();
        }

        for (let y = 0; y < n_rows; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * CASE_HEIGHT);
            ctx.lineTo(ctx.canvas.width, y * CASE_HEIGHT);
            ctx.stroke();
        }
    }

    renderText(ctx: CanvasRenderingContext2D, center: Coor2D) {

        let n_rows = Math.ceil(ctx.canvas.height / CASE_HEIGHT);
        let n_columns = Math.ceil(ctx.canvas.width / CASE_WIDTH);

        ctx.strokeStyle = "#000";
        ctx.font = CASE_HEIGHT + "px Monospace"

        for (let y = 0; y < n_rows; y++) {
            for (let x = 0; x < n_columns; x++) {
                let pos: CoorPair = [x + center.x, y + center.y];
                let c = this.content.get(pos.join(","));
                if (c) {

                    ctx.fillStyle = this.color;
                    ctx.fillRect(x * CASE_WIDTH, y * CASE_HEIGHT, CASE_WIDTH, CASE_HEIGHT);
                    ctx.fillStyle = "#111";
                    ctx.fillText(c, x * CASE_WIDTH, (y + 1) * CASE_HEIGHT - 5);
                }
            }
        }
    }



    render(ctx: CanvasRenderingContext2D, center: Coor2D) {
        this.renderGrid(ctx, center);
        this.renderText(ctx, center);
    }

    write(pos_: Coor2D, text: string) {
        let pos = pos_.clone();
        let pos_init_x = pos.x;

        for (let c of text) {
            if (c == '\n') {
                pos.y += 1;
                pos.x = pos_init_x;
            } else {
                if (c == ' ') {
                    this.content.delete(pos.toIndex());
                } else {
                    this.content.set(pos.toIndex(), c);
                }
                pos.x += 1;
            }
        }
        this.dirty = true;
    }


    commands(ctx: CanvasRenderingContext2D, center: Coor2D): LinkCommand[] {
        if (this.dirty) {
            this.dirty = false;
            this._commands = this.commandsMemo(ctx, center);
        }

        return this._commands;
    }

    private commandsMemo(ctx: CanvasRenderingContext2D, center: Coor2D): LinkCommand[] {
        let n_rows = Math.ceil(ctx.canvas.height / CASE_HEIGHT);
        let n_columns = Math.ceil(ctx.canvas.width / CASE_WIDTH);

        let result: LinkCommand[] = [];

        for (let y = 0; y < n_rows; y++) {
            let current_word = "";
            let current_position = null;

            for (let x = 0; x < n_columns; x++) {
                let pos: CoorPair = [x + center.x, y + center.y];
                let c = this.content.get(pos.join(","));
                if (c && current_position && regex.test(c) && c != "$") {
                    current_word += c;
                } else {
                    if (current_word.length > 0) {
                        if (current_word == "select" || current_word == "box") {
                            result.push({
                                kind: "$",
                                to: current_word,
                                position: new Coor2D(current_position?.[0] ?? -1, current_position?.[1] ?? -1),
                            })
                        }    
                    }

                    if (c == "$") {
                        current_position = pos;
                        current_word = "";
                    }
                }
            }

            if (current_word.length > 0) {
                if (current_word == "select" || current_word == "box") {
                    result.push({
                        kind: "$",
                        to: current_word,
                        position: new Coor2D(current_position?.[0] ?? -1, current_position?.[1] ?? -1),
                    })
                }
            }
        }

        return result;
    }

    readLink(pos_: Coor2D): Link | null {
        let pos: Coor2D = pos_.clone();


        if (!(regex.test(this.content.get(pos.toIndex()) ?? ""))) {
            return null;
        }

        while ((regex.test(this.content.get(pos.toIndex()) ?? ""))) {
            pos.x -= 1;
        }
        pos.x += 1;

        let link_kind = this.content.get(pos.toIndex());

        if (link_kind != "#" && link_kind != "$") {
            return null;
        }

        let to = "";
        let position = pos.clone();

        pos.x += 1;

        while ((regex.test(this.content.get(pos.toIndex()) ?? " "))) {
            to += this.content.get(pos.toIndex());
            pos.x += 1;
        }

        if (link_kind == "$" && (to == "select" || to == "box" || to == "move_to" || to == "reset")) {
            return {
                position,
                to,
                kind: link_kind
            };
        } else if (link_kind == "#") {
            return {
                position,
                to,
                kind: link_kind,
            };
        } else {
            return null;
        }
    }

    copy(from: LocalCoor2D, to: LocalCoor2D): string {
        if (from.x > to.x) {
            [to.x, from.x] = [from.x, to.x];
        }

        if (from.y > to.y) {
            [to.y, from.y] = [from.y, to.y];
        }

        let result = [];
        for (let y = from.y; y <= to.y; y++) {
            let temporary = "|";
            for (let x = from.x; x <= to.x; x++) {
                temporary += this.content.get([x, y].join(",")) ?? " ";
            }
            result.push(temporary.trim().substring(1))
        }
        return result.join('\n');
    }

    erase(from: Coor2D, to: Coor2D) {
        if (from.x > to.x) {
            [to.x, from.x] = [from.x, to.x];
        }

        if (from.y > to.y) {
            [to.y, from.y] = [from.y, to.y];
        }


        for (let y = from.y; y <= to.y; y++) {
            for (let x = from.x; x <= to.x; x++) {
                this.content.delete([x, y].join(","))
            }
        }

        this.dirty = true;
    }
}
