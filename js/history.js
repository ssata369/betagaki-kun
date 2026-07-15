(function(){

const state = window.PageForgeState;

let historyStack = [];

let historyIndex = -1;

function initializeHistory(){

    saveHistory();

}

function saveHistory(){

    const data = {

        sections:JSON.parse(
            JSON.stringify(state.sections || [])
        ),

        images:JSON.parse(
            JSON.stringify(state.images || [])
        ),

        seo:JSON.parse(
            JSON.stringify(state.seo || null)
        )

    };

    historyStack = historyStack.slice(0,historyIndex + 1);

    historyStack.push(data);

    if(historyStack.length > 50){
        historyStack.shift();
    }

    historyIndex = historyStack.length - 1;

    updateHistoryButtons();

}

function undo(){

    if(historyIndex <= 0){
        return;
    }

    historyIndex--;

    restoreHistory();

}

function redo(){

    if(historyIndex >= historyStack.length - 1){
        return;
    }

    historyIndex++;

    restoreHistory();

}

function restoreHistory(){

    const data = historyStack[historyIndex];

    state.sections = JSON.parse(
        JSON.stringify(data.sections)
    );

    state.images = JSON.parse(
        JSON.stringify(data.images)
    );

    if(data.seo){
        state.seo = JSON.parse(
            JSON.stringify(data.seo)
        );
    }

    try{

        localStorage.setItem(
            "pageforge_images",
            JSON.stringify(state.images)
        );

    }catch(error){
        /* 容量超過時も履歴復元自体は続行する */
    }

    if(window.renderPageForge){
        renderPageForge();
    }

    if(window.showPropertyPanel){
        showPropertyPanel();
    }

    if(window.saveAutoSave){
        saveAutoSave();
    }

    updateHistoryButtons();

}

function updateHistoryButtons(){

    const undoButton = document.getElementById("btnUndo");

    const redoButton = document.getElementById("btnRedo");

    if(undoButton){
        undoButton.disabled = historyIndex <= 0;
    }

    if(redoButton){
        redoButton.disabled = historyIndex >= historyStack.length - 1;
    }

}

/*
    操作完了時に呼ぶ共通関数
*/

function historySave(){

    saveHistory();

}

window.initializeHistory = initializeHistory;

window.saveHistory = saveHistory;

window.historySave = historySave;

window.undo = undo;

window.redo = redo;

})();
