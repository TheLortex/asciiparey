var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Coor2D, CASE_HEIGHT, CASE_WIDTH } from "./misc";
const regex = /\w|\$|\#|\-|\./;
export class State {
    constructor(color) {
        this.content = new Map();
        this.color = color;
        this.dirty = true;
        this._commands = [];
    }
    setup(page) {
        return __awaiter(this, void 0, void 0, function* () {
            let storage = window.localStorage.getItem("p-" + page);
            if (storage) {
                this.content = new Map(JSON.parse(storage));
            }
            else {
                this.content = new Map();
                let result = yield fetch("./default/" + page + ".ascii");
                if (result.ok) {
                    let text = yield result.text();
                    this.write(new Coor2D(0, 0), text);
                }
            }
        });
    }
    clone() {
        let clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
        clone.content = new Map(this.content);
        return clone;
    }
    save(page) {
        window.localStorage.setItem("p-" + page, JSON.stringify(Array.from(this.content.entries())));
    }
    renderGrid(ctx, center) {
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
    renderText(ctx, center) {
        let n_rows = Math.ceil(ctx.canvas.height / CASE_HEIGHT);
        let n_columns = Math.ceil(ctx.canvas.width / CASE_WIDTH);
        ctx.strokeStyle = "#000";
        ctx.font = CASE_HEIGHT + "px Monospace";
        for (let y = 0; y < n_rows; y++) {
            for (let x = 0; x < n_columns; x++) {
                let pos = [x + center.x, y + center.y];
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
    render(ctx, center) {
        this.renderGrid(ctx, center);
        this.renderText(ctx, center);
    }
    write(pos_, text) {
        let pos = pos_.clone();
        let pos_init_x = pos.x;
        for (let c of text) {
            if (c == '\n') {
                pos.y += 1;
                pos.x = pos_init_x;
            }
            else {
                if (c == ' ') {
                    this.content.delete(pos.toIndex());
                }
                else {
                    this.content.set(pos.toIndex(), c);
                }
                pos.x += 1;
            }
        }
        this.dirty = true;
    }
    commands(ctx, center) {
        if (this.dirty) {
            this.dirty = false;
            this._commands = this.commandsMemo(ctx, center);
        }
        return this._commands;
    }
    commandsMemo(ctx, center) {
        var _a, _b, _c, _d;
        let n_rows = Math.ceil(ctx.canvas.height / CASE_HEIGHT);
        let n_columns = Math.ceil(ctx.canvas.width / CASE_WIDTH);
        let result = [];
        for (let y = 0; y < n_rows; y++) {
            let current_word = "";
            let current_position = null;
            for (let x = 0; x < n_columns; x++) {
                let pos = [x + center.x, y + center.y];
                let c = this.content.get(pos.join(","));
                if (c && current_position && regex.test(c) && c != "$") {
                    current_word += c;
                }
                else {
                    if (current_word.length > 0) {
                        if (current_word == "select" || current_word == "box") {
                            result.push({
                                kind: "$",
                                to: current_word,
                                position: new Coor2D((_a = current_position === null || current_position === void 0 ? void 0 : current_position[0]) !== null && _a !== void 0 ? _a : -1, (_b = current_position === null || current_position === void 0 ? void 0 : current_position[1]) !== null && _b !== void 0 ? _b : -1),
                            });
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
                        position: new Coor2D((_c = current_position === null || current_position === void 0 ? void 0 : current_position[0]) !== null && _c !== void 0 ? _c : -1, (_d = current_position === null || current_position === void 0 ? void 0 : current_position[1]) !== null && _d !== void 0 ? _d : -1),
                    });
                }
            }
        }
        return result;
    }
    readLink(pos_) {
        var _a, _b, _c;
        let pos = pos_.clone();
        if (!(regex.test((_a = this.content.get(pos.toIndex())) !== null && _a !== void 0 ? _a : ""))) {
            return null;
        }
        while ((regex.test((_b = this.content.get(pos.toIndex())) !== null && _b !== void 0 ? _b : ""))) {
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
        while ((regex.test((_c = this.content.get(pos.toIndex())) !== null && _c !== void 0 ? _c : " "))) {
            to += this.content.get(pos.toIndex());
            pos.x += 1;
        }
        if (link_kind == "$" && (to == "select" || to == "box" || to == "move_to" || to == "reset")) {
            return {
                position,
                to,
                kind: link_kind
            };
        }
        else if (link_kind == "#") {
            return {
                position,
                to,
                kind: link_kind,
            };
        }
        else {
            return null;
        }
    }
    copy(from, to) {
        var _a;
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
                temporary += (_a = this.content.get([x, y].join(","))) !== null && _a !== void 0 ? _a : " ";
            }
            result.push(temporary.trim().substring(1));
        }
        return result.join('\n');
    }
    erase(from, to) {
        if (from.x > to.x) {
            [to.x, from.x] = [from.x, to.x];
        }
        if (from.y > to.y) {
            [to.y, from.y] = [from.y, to.y];
        }
        for (let y = from.y; y <= to.y; y++) {
            for (let x = from.x; x <= to.x; x++) {
                this.content.delete([x, y].join(","));
            }
        }
        this.dirty = true;
    }
}
