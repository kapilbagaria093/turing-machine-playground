const componentsPane = document.querySelector(".components-pane");
const canvas = document.querySelector(".canvas");

// global stuff
let stateNumber = 1; // start by creating q1 and so on... [ q0 is initial state by default ]
globalThis.arrowStep = 0;
globalThis.edge = {};
globalThis.allEdges = [];
let mode = "grab";

componentsPane.querySelectorAll(".button").forEach((button) => {
    button.addEventListener("click", (e) => {
        mode = button.attributes.mode.value;
        button.classList.add("active-button");
        componentsPane.querySelectorAll(".button").forEach((otherButton) => {
            if (otherButton !== button) {
                otherButton.classList.remove("active-button");
            }
        });
    });
});

componentsPane.addEventListener("click", (e) => {
    const inst = document.createElement("div");
    const oldInst = canvas
        .querySelectorAll(".instruction")
        .forEach((inst) => inst.remove());
    inst.classList.add("instruction");
    let message;
    if (mode === "grab") {
        message = "selection tool";
    } else if (mode === "state") {
        message = "click to add a new state";
    } else if (mode === "accept-state") {
        message = "click to add accept state";
    } else if (mode === "reject-state") {
        message = "click to add reject state";
    } else if (mode === "initial-state") {
        message = "click to add initial state";
    } else if (mode === "arrow" && arrowStep == 0) {
        message = "select source state";
    } else if (mode === "arrow" && arrowStep == 1) {
        message = "select destination state";
    } else if (mode === "arrow" && arrowStep == 2) {
        message = "enter transition values";
    } else {
        message = "welcome to turing machine playground";
    }
    inst.innerHTML = `{  ${message}<span class="dots"><span>.</span><span>.</span><span>.</span></span>  }`;

    canvas.appendChild(inst);
});

// building the state diagram

var initialState = false;

canvas.addEventListener("click", (e) => {
    console.log(mode);

    if (mode === "grab") {
        console.log("grabbing");
        const clickedState = e.target.closest(".state");

        if (clickedState) {
            document.querySelectorAll(".state").forEach((s) => {
                s.classList.remove("selected");
            });

            clickedState.classList.add("selected");
            selectedState = clickedState;

            return;
        }
    } else if (mode === "state") {
        console.log("creating state");
        const state = document.createElement("div");

        // element has to be in dom first for below function to work
        state.classList.add("state");
        state.classList.add("draggable");
        state.innerText = "q" + stateNumber;
        stateNumber++;

        canvas.appendChild(state);

        const rect = state.getBoundingClientRect();
        // returns:
        // {
        //   width: 50,
        //   height: 50,
        //   top: 120,
        //   left: 300,
        //   right: 350,
        //   bottom: 170
        // }

        state.style.left = e.clientX - rect.width / 2 + "px";
        state.style.top = e.clientY - rect.height / 2 + "px";
        resolveCollision(state, e);
    } else if (mode === "accept-state") {
        console.log("creating accept state");
        const state = document.createElement("div");

        // element has to be in dom first for below function to work
        state.classList.add("state");
        state.classList.add("draggable");
        state.classList.add("accept-state");
        state.innerText = "ACCEPT";

        canvas.appendChild(state);

        const rect = state.getBoundingClientRect();

        state.style.left = e.clientX - rect.width / 2 + "px";
        state.style.top = e.clientY - rect.height / 2 + "px";
    } else if (mode === "reject-state") {
        console.log("creating reject state");
        const state = document.createElement("div");

        // element has to be in dom first for below function to work
        state.classList.add("state");
        state.classList.add("draggable");
        state.classList.add("reject-state");
        state.innerText = "REJECT";

        canvas.appendChild(state);

        const rect = state.getBoundingClientRect();

        state.style.left = e.clientX - rect.width / 2 + "px";
        state.style.top = e.clientY - rect.height / 2 + "px";
    } else if (mode === "arrow") {
        console.log("creating transition arrow");
        // for every arrow, this object will have to be defines:
        // { from: q1, to: q2, read: a, write: b, direction: R }

        // SELECT SOURCE STATE
        if (arrowStep == 0) {
            let sourceState = e.target.closest(".state");
            edge.sourceState = sourceState;
            console.log("source");
            console.log(sourceState);
            arrowStep = 1;

            inst = document.querySelector(".instruction");
            inst.innerHTML = `{  select destination state<span class="dots"><span>.</span><span>.</span><span>.</span></span>  }`;
        }

        // SELECT DESTINATION STATE
        else if (arrowStep == 1) {
            let destState = e.target.closest(".state");

            inst = document.querySelector(".instruction");
            inst.innerHTML = `{  enter transition info<span class="dots"><span>.</span><span>.</span><span>.</span></span>  }`;

            console.log("dest");
            console.log(destState);
            edge.destState = destState;
            arrowStep = 2;
            transitionInfoPopup = document.querySelector("#transitionModal");
            transitionInfoPopup.classList.remove("hidden");
        }

        // FILL-IN VALUES OF TRANSITION FUNCTION
        else if (arrowStep == 2) {
            // okBtn = document.querySelector(".ok-btn")
            // // okBtn.addEventListener('click', (e)=>{
            // //     const {read, write, move} = submitTransition()
            // //     edge.read = read
            // //     edge.write = write
            // //     edge.move = move
            // //     closeTransitionPopup();
            // //     arrowStep = 0;
            // // })
            // okBtn.onclick = () => {
            //     const {read, write, move} = submitTransition()
            //     edge.read = read
            //     edge.write = write
            //     edge.move = move
            //     closeTransitionPopup();
            //     arrowStep = 0;
            // }
            // cancelBtn = document.querySelector(".cancel-btn")
            // // cancelBtn.addEventListener('click', (e)=>{
            // //     closeTransitionPopup()
            // //     arrowStep = 0;
            // // })
            // cancelBtn.onclick = () => {
            //     closeTransitionPopup()
            //     arrowStep = 0;
            // }
        }
        console.log(edge);
    } else if (mode === "initial-state") {
        if (initialState) alert("initial state already exists");
        if (!initialState) {
            console.log("creating initial-state");
            initialState = true;
        }
    }
});

// popup buttons working

const okBtn = document.querySelector(".ok-btn");
const cancelBtn = document.querySelector(".cancel-btn");

okBtn.onclick = () => {
    const { read, write, move } = submitTransition();

    edge.read = read;
    edge.write = write;
    edge.move = move;

    console.log("FINAL EDGE:", edge);

    closeTransitionPopup();
    arrowStep = 0;

    inst = document.querySelector(".instruction");
    inst.innerHTML = `{  select source state<span class="dots"><span>.</span><span>.</span><span>.</span></span>  }`;

    allEdgesUpsert(edge)
    console.log(allEdges)
    edge = {};
};

cancelBtn.onclick = () => {
    closeTransitionPopup();
    arrowStep = 0;

    inst = document.querySelector(".instruction");
    inst.innerHTML = `{  select source state<span class="dots"><span>.</span><span>.</span><span>.</span></span>  }`;

    edge = {};
};

// logic to auto-adjust so they dont overlap
function isOverlapping(a, b) {
    const r1 = a.getBoundingClientRect();
    const r2 = b.getBoundingClientRect();

    return !(
        r1.right < r2.left ||
        r1.left > r2.right ||
        r1.bottom < r2.top ||
        r1.top > r2.bottom
    );
}

function resolveCollision(newEl, e) {
    const states = document.querySelectorAll(".state");

    let hasCollision = true;
    let attempts = 0;

    while (hasCollision && attempts < 100) {
        hasCollision = false;

        for (let el of states) {
            if (el === newEl) continue;

            if (isOverlapping(newEl, el)) {
                hasCollision = true;

                // move new element slightly
                const left = parseFloat(newEl.style.left);
                const top = parseFloat(newEl.style.top);

                const rect = newEl.getBoundingClientRect();

                // direction from element → cursor
                const r1 = newEl.getBoundingClientRect();
                const r2 = el.getBoundingClientRect();

                // direction from other element → new element
                const dx = r1.left + r1.width / 2 - (r2.left + r2.width / 2);
                const dy = r1.top + r1.height / 2 - (r2.top + r2.height / 2);
                // normalize (optional but better)
                const length = Math.sqrt(dx * dx + dy * dy) || 1;

                const step = 20;

                newEl.style.left =
                    parseFloat(newEl.style.left) + (dx / length) * step + "px";
                newEl.style.top =
                    parseFloat(newEl.style.top) + (dy / length) * step + "px";

                break;
            }
        }

        attempts++;
    }
}

// transition-dialog functions
function submitTransition() {
    const iread = document.querySelector("#read-input").value;
    const iwrite = document.querySelector("#write-input").value;
    const imove = document.querySelector("#move-input").value;

    const read = iread.replace(/[\[\]]/g, "").split(",");
    const write = iwrite.replace(/[\[\]]/g, "").split(",");
    const move = imove.split(",");

    return { read, write, move };

    // let edges = [];
    // const iread = document.querySelector("#read-input").value;
    // const iwrite = document.querySelector("#write-input").value;
    // const imove = document.querySelector("#move-input").value;

    // let read = [], write = [], move = []

    // let inputsRead = 0
    // for (let index = 0; inputsRead < numberOfTapes && index < 50; index++) {
    //     // inputs can be one character only
    //     const char = iread[index];
    //     if (char == '[' || char == ']' || char == ',') continue;
    //     else {
    //         console.log(iread[index])
    //         read[inputsRead] = iread[index]

    //         console.log(iwrite[index])
    //         write[inputsRead] = iwrite[index]

    //         console.log(imove[index])
    //         move[inputsRead] = imove[index]

    //         inputsRead++;
    //     }
    // }
    // // now i have an array that contains inputs, an array that contains what to write and an array that tells where to move

    // let edge = {
    //     read: read,
    //     write: write,
    //     move: move
    // }

    // return edge;
}

function closeTransitionPopup() {
    popup = document.querySelector("#transitionModal");
    popup.classList.add("hidden");
}

// functions to draw and manage arrows
let numberOfTapes = 3; // change this dynamically later


// random functions
document.querySelectorAll(".input-transition").forEach((inputf) => {
    inputf.addEventListener("focus", (e) => {
        if (inputf.value === "") {
            inputf.value = "[]";
        }
    });
});

function allEdgesUpsert(edge){
    for (let index = 0; index < allEdges.length; index++) {
        if (allEdges[index].sourceState == edge.sourceState && allEdges[index].destState == edge.destState) {
            allEdges[index] = edge;
            return
        }
        continue;
    }
    allEdges.push(edge)
    return;
}