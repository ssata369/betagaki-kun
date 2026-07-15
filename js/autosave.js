(function(){

const state = window.PageForgeState;

const STORAGE_KEY = "pageforge_autosave";

let quotaWarned = false;

function initializeAutoSave(){

    loadAutoSave();

    setInterval(function(){
        saveAutoSave();
    },30000);

}

function saveAutoSave(){

    const data = {

        sections:JSON.parse(
            JSON.stringify(state.sections || [])
        ),

        images:JSON.parse(
            JSON.stringify(state.images || [])
        ),

        seo:JSON.parse(
            JSON.stringify(state.seo || null)
        ),

        savedAt:new Date().toISOString()

    };

    try{

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(data)
        );

        quotaWarned = false;

    }catch(error){

        if(!quotaWarned && window.showToast){

            showToast("自動保存の容量を超えました。画像はURL参照をおすすめします");

            quotaWarned = true;

        }

    }

}

function loadAutoSave(){

    const data = localStorage.getItem(STORAGE_KEY);

    if(!data){
        return;
    }

    let saved = null;

    try{
        saved = JSON.parse(data);
    }catch(error){
        return;
    }

    if(!saved || !saved.sections){
        return;
    }

    state.sections = saved.sections;

    state.images = saved.images || [];

    if(saved.seo){
        state.seo = saved.seo;
    }

}

function clearAutoSave(){

    localStorage.removeItem(STORAGE_KEY);

}

window.initializeAutoSave = initializeAutoSave;

window.saveAutoSave = saveAutoSave;

window.clearAutoSave = clearAutoSave;

})();
