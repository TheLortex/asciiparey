import { State } from "./page";
import { Coor2D, canvasToLocal, localToCanvas, CASE_WIDTH, CASE_HEIGHT } from "./misc";
class EditionState {
    constructor(position) {
        this.position = position;
        this.start_x = position.x;
        this.previous_state = null;
    }
    clone() {
        let clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
        clone.position = this.position.clone();
        return clone;
    }
    handleKey(e, state) {
        let valid = ((e.keyCode > 47 && e.keyCode < 112 && e.keyCode != 93) ||
            (e.keyCode > 123 && e.keyCode < 223) ||
            e.keyCode == 32) && !e.ctrlKey;
        if (valid) {
            state.write(this.position, e.key);
            this.previous_state = this.clone();
            this.position.x += 1;
        }
        else if (e.keyCode == 13) { // Enter
            this.previous_state = this.clone();
            this.position.x = this.start_x;
            this.position.y += 1;
        }
        else if (e.keyCode == 8) { // Backspace
            if (this.previous_state) {
                state.write(this.previous_state.position, ' ');
                this.position = this.previous_state.position;
                this.previous_state = this.previous_state.previous_state;
            }
            else {
                this.position.x -= 1;
                state.write(this.position, ' ');
            }
        }
        else if (e.keyCode == 46) { // Delete
            state.write(this.position, ' ');
        }
        else {
            return false;
        }
        return true;
    }
    write(text, state) {
        for (let c of text) {
            if (c == "\n") {
                this.previous_state = this.clone();
                this.position.x = this.start_x;
                this.position.y += 1;
            }
            else {
                state.write(this.position, c);
                this.previous_state = this.clone();
                this.position.x += 1;
            }
        }
    }
}
export class Editor {
    constructor(ctx) {
        var _a;
        this.history = [];
        this.history_index = 0;
        this.mode = "selection";
        this.edition_state = null;
        let page = (_a = decodeURI(document.URL).split("#")[1]) !== null && _a !== void 0 ? _a : "";
        this.load(page);
        this.ctx = ctx;
        ctx.canvas.addEventListener("contextmenu", (e) => this.onContextMenu(e));
        ctx.canvas.addEventListener("keydown", (e) => this.onKeyDown(e));
        ctx.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
        ctx.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
        ctx.canvas.addEventListener("mouseup", (e) => this.onMouseUp(e));
        ctx.canvas.addEventListener("mouseout", (e) => this.onMouseOut(e));
        ctx.canvas.addEventListener("copy", (e) => this.onCopy(e));
        ctx.canvas.addEventListener("cut", (e) => this.onCut(e));
        ctx.canvas.addEventListener("paste", (e) => this.onPaste(e));
        window.addEventListener("popstate", (e) => this.onPopState(e));
    }
    // Load/save
    save() {
        this.state.save(this.page);
    }
    load(page) {
        if (this.edition_state) {
            this.save();
        }
        this.page = page;
        this.offset = new Coor2D(0, 0);
        this.update = true;
        this.edition_state = null;
        this.hover_link = null;
        this.contextmenu_state = null;
        this.selection_state = null;
        this.state = new State("#fff");
        this.state.setup(page).then(() => this.scheduleRender());
        this.history = [
            { state: this.state.clone(), edition_state: null, selection_state: null },
            { state: this.state, edition_state: null, selection_state: null }
        ];
        this.history_index = 1;
        if (page.length == 0) {
            document.title = "n o t e s";
        }
        else {
            document.title = "n o t e s  #" + page;
        }
    }
    // Rendering
    render(force) {
        var _a, _b, _c;
        if (this.update || force) {
            this.update = false;
            this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
            if (this.contextmenu_state) {
                this.executeCommands(this.contextmenu_state);
            }
            this.executeCommands(this.state);
            this.state.render(this.ctx, this.offset);
            this.renderLink();
            this.renderEdition();
            this.renderSelection();
            (_b = (_a = this.selection_state) === null || _a === void 0 ? void 0 : _a.preview) === null || _b === void 0 ? void 0 : _b.render(this.ctx, this.offset);
            (_c = this.contextmenu_state) === null || _c === void 0 ? void 0 : _c.renderText(this.ctx, this.offset);
        }
    }
    executeCommands(from) {
        for (let command of from.commands(this.ctx, this.offset)) {
            if (command.to == "box") {
                let text = "";
                if (this.mode == "box") {
                    text = "✔️";
                }
                else {
                    text = "\t";
                }
                from.write(command.position.right(command.to.length + 3), text);
            }
            else if (command.to == "select") {
                let text = "";
                if (this.mode == "selection") {
                    text = "✔️";
                }
                else {
                    text = "\t";
                }
                from.write(command.position.right(command.to.length + 3), text);
            }
        }
    }
    renderSelection() {
        if (this.selection_state) {
            let from = this.selection_state.from.clone();
            let to = this.selection_state.to.clone();
            if (from.x > to.x) {
                [to.x, from.x] = [from.x, to.x];
            }
            if (from.y > to.y) {
                [to.y, from.y] = [from.y, to.y];
            }
            if (this.mode == "selection") {
                this.ctx.globalCompositeOperation = "multiply";
                this.ctx.fillStyle = "#b0c0f0";
                this.ctx.fillRect(from.x * CASE_WIDTH, from.y * CASE_HEIGHT, (to.x - from.x + 1) * CASE_WIDTH, (to.y - from.y + 1) * CASE_HEIGHT);
                this.ctx.globalCompositeOperation = "source-over";
            }
        }
    }
    renderEdition() {
        if (this.edition_state) {
            let position = this.edition_state.position;
            let canvas_position = localToCanvas(this.offset, position);
            this.ctx.globalCompositeOperation = "multiply";
            this.ctx.fillStyle = "#b0c0f0";
            this.ctx.fillRect(canvas_position.x, canvas_position.y, CASE_WIDTH, CASE_HEIGHT);
            this.ctx.globalCompositeOperation = "source-over";
        }
    }
    renderLink() {
        if (this.hover_link) {
            this.ctx.canvas.style.cursor = "pointer";
            let position = this.hover_link.position;
            let canvas_position = localToCanvas(this.offset, position);
            let link_length = this.hover_link.to.length;
            this.ctx.fillStyle = "#fff";
            this.ctx.fillRect(canvas_position.x, canvas_position.y, (link_length + 1) * CASE_WIDTH, CASE_HEIGHT);
            this.ctx.fillStyle = "#08f";
            this.ctx.strokeStyle = "#08f";
            this.ctx.fillText(this.hover_link.kind, canvas_position.x, canvas_position.y + CASE_HEIGHT - 5);
            for (let i = 0; i < link_length; i++) {
                this.ctx.fillText(this.hover_link.to[i], canvas_position.x + (1 + i) * CASE_WIDTH, canvas_position.y + CASE_HEIGHT - 5);
            }
            this.ctx.moveTo(canvas_position.x, canvas_position.y + CASE_HEIGHT);
            this.ctx.lineTo(canvas_position.x + (1 + link_length) * CASE_WIDTH, canvas_position.y + CASE_HEIGHT);
            this.ctx.stroke();
        }
        else {
            this.ctx.canvas.style.cursor = "default";
        }
    }
    // Mark a step for history.
    stateStep() {
        var _a, _b;
        this.save();
        this.history = this.history.slice(0, this.history_index + 1);
        this.history.push({
            state: this.state,
            edition_state: this.edition_state,
            selection_state: this.selection_state
        });
        this.history_index += 1;
        this.state = this.state.clone();
        this.edition_state = (_b = (_a = this.edition_state) === null || _a === void 0 ? void 0 : _a.clone()) !== null && _b !== void 0 ? _b : null;
        if (this.selection_state) {
            this.selection_state = Object.assign({}, this.selection_state);
        }
    }
    // Event handlers.
    onPopState(e) {
        var _a;
        let page = (_a = decodeURI(document.URL).split("#")[1]) !== null && _a !== void 0 ? _a : "";
        this.load(page);
        this.scheduleRender();
    }
    onKeyDown(e) {
        if (e.keyCode == 27) { // Escape
            this.edition_state = null;
            this.contextmenu_state = null;
            this.selection_state = null;
            e.preventDefault();
            this.scheduleRender();
            return;
        }
        else if ((e.key == 'z' || e.key == 'Z') && e.ctrlKey) {
            if (e.shiftKey) { // Redo
                if (this.history_index < this.history.length - 1) {
                    this.history_index += 1;
                    let st = this.history[this.history_index];
                    this.state = st.state;
                    this.edition_state = st.edition_state;
                    this.selection_state = st.selection_state;
                    this.save();
                    this.scheduleRender();
                }
            }
            else { // Undo
                if (this.history_index > 0) {
                    this.history_index -= 1;
                    let st = this.history[this.history_index];
                    this.state = st.state;
                    this.edition_state = st.edition_state;
                    this.selection_state = st.selection_state;
                    this.save();
                    this.scheduleRender();
                }
            }
            e.preventDefault();
            return;
        }
        if (this.edition_state) {
            let ok = this.edition_state.handleKey(e, this.state);
            if (ok) {
                this.stateStep();
            }
            if (e.keyCode >= 37 && e.keyCode <= 40) { // Left, Up, Right, Down.
                let delta = 1;
                if (e.ctrlKey) {
                    delta = 8;
                }
                if (e.keyCode == 37) {
                    this.edition_state.position.x -= delta;
                }
                else if (e.keyCode == 38) {
                    this.edition_state.position.y -= delta;
                }
                else if (e.keyCode == 39) {
                    this.edition_state.position.x += delta;
                }
                else if (e.keyCode == 40) {
                    this.edition_state.position.y += delta;
                }
                this.edition_state = new EditionState(this.edition_state.position);
                ok = true;
            }
            if (ok) {
                this.scheduleRender();
                e.preventDefault();
            }
        }
        else if (this.selection_state) {
            if (e.keyCode == 8 || e.keyCode == 46) {
                this.state.erase(this.selection_state.from, this.selection_state.to);
                this.stateStep();
                this.scheduleRender();
                e.preventDefault();
            }
        }
    }
    onMouseDown(e) {
        var _a;
        let canvas_position = new Coor2D(e.x, e.y);
        let position = canvasToLocal(this.offset, canvas_position).floor();
        if (e.button == 0) { // Left
            this.edition_state = null;
            this.selection_state = {
                selecting: true,
                from: position,
                to: position,
                preview: (this.mode == "box") ? new State("#b0d0ff") : null,
            };
            (_a = this.selection_state.preview) === null || _a === void 0 ? void 0 : _a.write(position, "+");
        }
    }
    onMouseMove(e) {
        var _a, _b, _c, _d;
        let canvas_position = new Coor2D(e.x, e.y);
        let position = canvasToLocal(this.offset, canvas_position).floor();
        let link = (_b = (_a = this.contextmenu_state) === null || _a === void 0 ? void 0 : _a.readLink(position)) !== null && _b !== void 0 ? _b : null;
        if (!link) {
            link = this.state.readLink(position);
        }
        let render = !((link == null && this.hover_link == null) || ((link === null || link === void 0 ? void 0 : link.to) == ((_c = this.hover_link) === null || _c === void 0 ? void 0 : _c.to)));
        if ((_d = this.selection_state) === null || _d === void 0 ? void 0 : _d.selecting) {
            this.selection_state.to = position;
            if (this.mode == "box") {
                let from = this.selection_state.from.clone();
                let to = this.selection_state.to.clone();
                if (from.x > to.x) {
                    [to.x, from.x] = [from.x, to.x];
                }
                if (from.y > to.y) {
                    [to.y, from.y] = [from.y, to.y];
                }
                this.selection_state.preview = new State("#b0d0ff");
                this.selection_state.preview.write(from, "║\n".repeat(to.y - from.y + 1));
                this.selection_state.preview.write(new Coor2D(to.x, from.y), "║\n".repeat(to.y - from.y + 1));
                if (from.x != to.x) {
                    if (to.y == from.y) {
                        this.selection_state.preview.write(from, "═".repeat(to.x - from.x + 1));
                        this.selection_state.preview.write(new Coor2D(from.x, to.y), "═".repeat(to.x - from.x + 1));
                    }
                    else {
                        this.selection_state.preview.write(from, "╔" + "═".repeat(to.x - from.x - 1) + "╗");
                        this.selection_state.preview.write(new Coor2D(from.x, to.y), "╚" + "═".repeat(to.x - from.x - 1) + "╝");
                    }
                }
            }
            render = true;
        }
        if (render) {
            this.hover_link = link;
            this.scheduleRender();
        }
    }
    onMouseOut(e) {
        this.selection_state = null;
    }
    onMouseUp(e) {
        var _a, _b;
        this.scheduleRender();
        let canvas_position = new Coor2D(e.x, e.y);
        let position = canvasToLocal(this.offset, canvas_position).floor();
        if (e.button == 0) {
            if (this.selection_state) {
                this.selection_state.to = position;
                this.selection_state.selecting = false;
                if (!this.selection_state.to.equals(this.selection_state.from)) {
                    if (this.mode == "box") {
                        for (const [pos, val] of (_b = (_a = this.selection_state.preview) === null || _a === void 0 ? void 0 : _a.content.entries()) !== null && _b !== void 0 ? _b : []) {
                            this.state.content.set(pos, val);
                        }
                        this.selection_state = null;
                        this.stateStep();
                    }
                    return;
                }
                else {
                    this.selection_state = null;
                }
            }
            if (this.hover_link) {
                if (this.hover_link.kind == '#') { // link
                    window.history.pushState({}, "", "#" + this.hover_link.to);
                    this.load(this.hover_link.to);
                }
                else { // command
                    if (this.hover_link.to == "box") {
                        this.mode = "box";
                    }
                    else if (this.hover_link.to == "move_to") {
                        // not implemented.
                        console.log("not implemented.");
                    }
                    else if (this.hover_link.to == "select") {
                        this.mode = "selection";
                    }
                    else if (this.hover_link.to == "reset") {
                        window.localStorage.removeItem("p-" + this.page);
                        this.load(this.page);
                    }
                    this.scheduleRender();
                }
            }
            else {
                let canvas_position = new Coor2D(e.x, e.y);
                let position = canvasToLocal(this.offset, canvas_position).floor();
                this.edition_state = new EditionState(position);
            }
        }
    }
    onContextMenu(e) {
        e.preventDefault();
        let canvas_position = new Coor2D(e.x, e.y);
        let position = canvasToLocal(this.offset, canvas_position).floor();
        let box = "\n" +
            "╔══════════════════════════════╗\n" +
            "║$select:   Selection mode.    ║\n" +
            "║$box:      Box drawing mode.  ║\n";
        if (this.selection_state) {
            box += "╟──────────────────────────────╢\n" +
                "║$move_to:  Teleport selection ║\n";
        }
        box += "╚══════════════════════════════╝\n";
        this.contextmenu_state = new State("#adf"); // blank
        this.contextmenu_state.write(position.right(1), box.replace(/\ /gi, '\t'));
        this.scheduleRender();
    }
    onCopy(e) {
        var _a, _b;
        if (((_a = this.selection_state) === null || _a === void 0 ? void 0 : _a.selecting) == false) {
            (_b = e.clipboardData) === null || _b === void 0 ? void 0 : _b.setData('text/plain', this.state.copy(this.selection_state.from, this.selection_state.to));
            e.preventDefault();
        }
    }
    onCut(e) {
        var _a, _b;
        if (((_a = this.selection_state) === null || _a === void 0 ? void 0 : _a.selecting) == false) {
            (_b = e.clipboardData) === null || _b === void 0 ? void 0 : _b.setData('text/plain', this.state.copy(this.selection_state.from, this.selection_state.to));
            this.state.erase(this.selection_state.from, this.selection_state.to);
            this.stateStep();
            e.preventDefault();
            this.scheduleRender();
        }
    }
    onPaste(e) {
        if (e.clipboardData && this.edition_state) {
            this.edition_state.write(e.clipboardData.getData('text'), this.state);
            this.stateStep();
            this.scheduleRender();
        }
    }
    scheduleRender() {
        window.requestAnimationFrame(() => this.render(true));
    }
}
