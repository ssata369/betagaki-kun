(function(){

const state = window.PageForgeState;

function initializeSection(){

    if(!state.sections){
        state.sections = [];
    }

}

function addSection(){

    const section = {
        id:createId(),
        name:"新規セクション",
        blocks:[]
    };

    state.sections.push(section);

    selectSection(section.id);

    updateSection();

}

function deleteSection(id){

    const target = state.sections.find(
        section => section.id === id
    );

    if(!target){

        if(window.showToast){
            showToast("削除するセクションを選択してください");
        }

        return;

    }

    const result = confirm("このセクションを削除しますか？");

    if(!result){
        return;
    }

    state.sections = state.sections.filter(
        section => section.id !== id
    );

    if(state.selectedSection === id){
        state.selectedSection = null;
        state.selectedId = null;
    }

    updateSection();

}

function duplicateSection(id){

    const target = state.sections.find(
        section => section.id === id
    );

    if(!target){

        if(window.showToast){
            showToast("複製するセクションを選択してください");
        }

        return;

    }

    const clone = {
        id:createId(),
        name:target.name + " コピー",
        blocks:JSON.parse(JSON.stringify(target.blocks)).map(block=>{
            block.id = createBlockId();
            return block;
        })
    };

    const index = state.sections.indexOf(target);

    state.sections.splice(index + 1,0,clone);

    selectSection(clone.id);

    updateSection();

}

function moveSectionUp(id){

    const index = state.sections.findIndex(
        section => section.id === id
    );

    if(index <= 0){
        return;
    }

    const temp = state.sections[index - 1];

    state.sections[index - 1] = state.sections[index];

    state.sections[index] = temp;

    updateSection();

}

function moveSectionDown(id){

    const index = state.sections.findIndex(
        section => section.id === id
    );

    if(index === -1 || index === state.sections.length - 1){
        return;
    }

    const temp = state.sections[index + 1];

    state.sections[index + 1] = state.sections[index];

    state.sections[index] = temp;

    updateSection();

}

function selectSection(id){

    state.selectedSection = id;

}

function updateSection(){

    if(window.renderPageForge){
        renderPageForge();
    }

    if(window.saveAutoSave){
        saveAutoSave();
    }

    if(window.saveHistory){
        saveHistory();
    }

}

function createId(){

    return (
        "section_" +
        Date.now() + "_" +
        Math.floor(Math.random()*1000)
    );

}

function createBlockId(){

    return (
        "block_" +
        Date.now() + "_" +
        Math.floor(Math.random()*100000)
    );

}

window.initializeSection = initializeSection;

window.addSection = addSection;

window.deleteSection = deleteSection;

window.duplicateSection = duplicateSection;

window.moveSectionUp = moveSectionUp;

window.moveSectionDown = moveSectionDown;

})();
