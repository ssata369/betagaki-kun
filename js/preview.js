(function(){

const state = window.PageForgeState;

function initializePreview(){

    if(!state.previewMode){
        state.previewMode = "pc";
    }

    bindPreviewButtons();

    applyPreview();

}

function bindPreviewButtons(){

    const pcButton = document.getElementById("devicePC");

    const tabletButton = document.getElementById("deviceTablet");

    const mobileButton = document.getElementById("deviceMobile");

    if(pcButton){
        pcButton.onclick = function(){
            setPreviewMode("pc");
        };
    }

    if(tabletButton){
        tabletButton.onclick = function(){
            setPreviewMode("tablet");
        };
    }

    if(mobileButton){
        mobileButton.onclick = function(){
            setPreviewMode("mobile");
        };
    }

}

function setPreviewMode(mode){

    state.previewMode = mode;

    applyPreview();

    if(window.changeDevice){
        changeDevice(mode);
    }

    if(window.saveAutoSave){
        saveAutoSave();
    }

}

function applyPreview(){

    const canvas = document.getElementById("canvas");

    if(!canvas){
        return;
    }

    canvas.classList.remove(
        "preview-pc",
        "preview-tablet",
        "preview-mobile"
    );

    canvas.classList.add("preview-" + state.previewMode);

    updateButtonState();

}

function updateButtonState(){

    const buttons = [
        "devicePC",
        "deviceTablet",
        "deviceMobile"
    ];

    buttons.forEach(id=>{

        const button = document.getElementById(id);

        if(button){
            button.classList.remove("active");
        }

    });

    let target = "";

    if(state.previewMode === "pc"){
        target = "devicePC";
    }

    if(state.previewMode === "tablet"){
        target = "deviceTablet";
    }

    if(state.previewMode === "mobile"){
        target = "deviceMobile";
    }

    const activeButton = document.getElementById(target);

    if(activeButton){
        activeButton.classList.add("active");
    }

}

window.initializePreview = initializePreview;

})();
