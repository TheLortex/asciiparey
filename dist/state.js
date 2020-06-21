import { CASE_HEIGHT, CASE_WIDTH } from "./misc";
export class State {
    constructor() {
        this.content = new Map();
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
        ctx.strokeStyle = "#000";
        ctx.fillStyle = "#111";
        ctx.font = CASE_HEIGHT + "px Monospace";
        for (let x = 0; x < n_columns; x++) {
            for (let y = 0; y < n_rows; y++) {
                let pos = [x + center.x, y + center.y];
                let c = this.content.get(pos.join(","));
                if (c) {
                    ctx.fillText(c, x * CASE_WIDTH, (y + 1) * CASE_HEIGHT - 4);
                }
            }
        }
    }
    render(ctx, center) {
        this.renderGrid(ctx, center);
    }
    write(pos_, text) {
        let pos = pos_.clone();
        let pos_init_x = pos.x;
        for (let c of text) {
            this.content.set(pos.pair().join(","), c);
            if (c == '\n') {
                pos.y += 1;
                pos.x = pos_init_x;
            }
            else {
                pos.x += 1;
            }
        }
    }
}
