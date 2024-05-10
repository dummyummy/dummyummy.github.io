/** @type {{a:number,s:number,d:number}} */
var key_status = {
    a: 0,
    s: 0,
    d: 0
};

export function setupInput() {
    // key events
    var listener = new window.keypress.Listener();
    listener.register_combo({
        keys: "a",
        on_keydown: () => key_status.a++,
        prevent_repeat: true,
    });
    listener.register_combo({
        keys: "s",
        on_keydown: () => key_status.s++,
        prevent_repeat: true,
    });
    listener.register_combo({
        keys: "d",
        on_keydown: () => key_status.d++,
        prevent_repeat: true,
    });
    listener.listen();
    // click events
    // window.addEventListener("click", (ev) => {
    //     key_status.s++;
    //     if (ev.clientX < window.innerWidth / 2) {
    //         key_status.a++;
    //     } else {
    //         key_status.d++;
    //     }
    // })
    // touch events
    window.addEventListener("touchstart", (ev) => {
        key_status.s++;
        if (ev.targetTouches[0].clientX < window.innerWidth / 2) {
            key_status.a++;
        } else {
            key_status.d++;
        }
    }, false);
}

/**
 * poll inputs from key status buffer
 * @returns {{a:number,s:number,d:number}}
 */
export function pollInput() {
    const polled_status = Object.assign({}, key_status);
    for (const k in key_status) {
        key_status[k] = 0;
    }
    return polled_status;
}