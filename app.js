(function(){

const state = window.PageForgeState;

function init(){

    if(window.initializeAutoSave){
        initializeAutoSave();
    }

    if(window.initializeProject){
        initializeProject();
    }

    if(window.initializeSEO){
        initializeSEO();
    }

    if(window.initializeSection){
        initializeSection();
    }

    if(window.initializeExporter){
        initializeExporter();
    }

    if(window.initializeImageManager){
        initializeImageManager();
    }

    if(window.initializeHistory){
        initializeHistory();
    }

    if(window.initializeSidebar){
        initializeSidebar();
    }

    if(window.initializeTemplate){
        initializeTemplate();
    }

    if(window.initializeDevice){
        initializeDevice();
    }

    if(window.initializeResponsiveEditor){
        initializeResponsiveEditor();
    }

    if(window.initializePreview){
        initializePreview();
    }

    if(window.initializeDrag){
        initializeDrag();
    }

    if(window.initializePatterns){
        initializePatterns();
    }

    bindSectionButtons();

    bindHistoryButtons();

    bindClearAllButton();

    bindKeyboardShortcuts();

    if(window.renderPageForge){
        renderPageForge();
    }

}

function bindSectionButtons(){

    const add = document.getElementById("btnAddSection");

    if(add){
        add.onclick = function(){
            if(window.addSection){
                addSection();
            }
        };
    }

    const duplicate = document.getElementById("btnDuplicateSection");

    if(duplicate){
        duplicate.onclick = function(){
            if(window.duplicateSection){
                duplicateSection(state.selectedSection);
            }
        };
    }

    const up = document.getElementById("btnMoveSectionUp");

    if(up){
        up.onclick = function(){
            if(window.moveSectionUp){
                moveSectionUp(state.selectedSection);
            }
        };
    }

    const down = document.getElementById("btnMoveSectionDown");

    if(down){
        down.onclick = function(){
            if(window.moveSectionDown){
                moveSectionDown(state.selectedSection);
            }
        };
    }

    const del = document.getElementById("btnDeleteSection");

    if(del){
        del.onclick = function(){
            if(window.deleteSection){
                deleteSection(state.selectedSection);
            }
        };
    }

}

function bindClearAllButton(){

    const clearButton = document.getElementById("btnClearAll");

    if(!clearButton){
        return;
    }

    clearButton.onclick = function(){

        const result = confirm("すべてのパーツを削除して初期化します。よろしいですか？");

        if(!result){
            return;
        }

        state.sections = [];

        state.selectedId = null;

        state.selectedSection = null;

        if(window.renderPageForge){
            renderPageForge();
        }

        if(window.showPropertyPanel){
            showPropertyPanel();
        }

        if(window.saveAutoSave){
            saveAutoSave();
        }

        if(window.saveHistory){
            saveHistory();
        }

        if(window.showToast){
            showToast("すべて削除しました");
        }

    };

}

function bindHistoryButtons(){

    const undoButton = document.getElementById("btnUndo");

    if(undoButton){
        undoButton.onclick = function(){
            if(window.undo){
                window.undo();
            }
        };
    }

    const redoButton = document.getElementById("btnRedo");

    if(redoButton){
        redoButton.onclick = function(){
            if(window.redo){
                window.redo();
            }
        };
    }

}

function bindKeyboardShortcuts(){

    document.addEventListener("keydown",function(e){

        const tag = document.activeElement
            ? document.activeElement.tagName
            : "";

        const typing =
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT";

        if(e.key === "Delete" && !typing){

            if(window.deleteSelectedBlock){
                deleteSelectedBlock();
            }

            return;

        }

        if(!(e.ctrlKey || e.metaKey)){
            return;
        }

        const key = e.key.toLowerCase();

        if(key === "s"){

            e.preventDefault();

            if(window.exportProject){
                exportProject();
            }

            return;

        }

        /* 入力中のCtrl+Z/Yは入力欄自体の取り消しに任せる */

        if(typing){
            return;
        }

        if(key === "z"){

            e.preventDefault();

            if(e.shiftKey){

                if(window.redo){
                    window.redo();
                }

            }else{

                if(window.undo){
                    window.undo();
                }

            }

        }

        if(key === "y"){

            e.preventDefault();

            if(window.redo){
                window.redo();
            }

        }

    });

}

document.addEventListener("DOMContentLoaded",init);

})();
