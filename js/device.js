(function(){

const state = window.PageForgeState;

let currentDevice = "pc";

function initializeDevice(){

    changeDevice("pc");

}

function changeDevice(device){

    currentDevice = device;

    window.currentDevice = device;

    const canvas = document.getElementById("canvas");

    if(!canvas){
        return;
    }

    canvas.classList.remove(
        "device-pc",
        "device-tablet",
        "device-mobile"
    );

    canvas.classList.add("device-" + device);

    updateResponsiveStyles();

}

function updateResponsiveStyles(){

    const sections = state.sections || [];

    const blocks = sections.flatMap(
        section => section.blocks || []
    );

    blocks.forEach(block=>{

        const responsive = block.responsive;

        if(!responsive){
            return;
        }

        const style = responsive[currentDevice];

        if(!style){
            return;
        }

        const element = document.querySelector(
            `.pf-block[data-id="${block.id}"]`
        );

        if(!element){
            return;
        }

        if(style.width){
            element.style.width = style.width;
        }

        if(style.fontSize){
            element.style.fontSize = style.fontSize;
        }

        if(style.padding){
            element.style.padding = style.padding;
        }

    });

}

window.initializeDevice = initializeDevice;

window.changeDevice = changeDevice;

})();
