import { Editor } from "./editor";
console.log("yo");
let canvas = document.getElementById('cvs');
let ctx = canvas.getContext("2d");
canvas.width = document.documentElement.clientWidth;
canvas.height = document.documentElement.clientHeight;
if (ctx) {
    let ed = new Editor(ctx);
    window.requestAnimationFrame(() => ed.render(true));
    let timeout;
    window.addEventListener("resize", () => {
        console.log("hey");
        if (timeout) {
            window.cancelAnimationFrame(timeout);
        }
        timeout = window.requestAnimationFrame(() => {
            canvas.width = document.documentElement.clientWidth;
            canvas.height = document.documentElement.clientHeight;
            ed.render(true);
        });
    });
}
else {
    console.log("Failed to get canvas.");
}
