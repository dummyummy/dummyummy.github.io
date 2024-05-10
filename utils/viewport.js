const resize_viewport = function () {
    const container = document.querySelector("#game_container");
    const [w, h] = [parseInt(window.getComputedStyle(container).width), parseInt(window.getComputedStyle(container).height)];
    const canvas = document.querySelector("canvas");
    canvas.setAttribute("width", w.toString());
    canvas.setAttribute("height", h.toString());
}

window.addEventListener("load", resize_viewport);
window.addEventListener("resize", resize_viewport);