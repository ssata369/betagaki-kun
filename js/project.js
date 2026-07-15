(function(){

const state = window.PageForgeState;

function initializeProject(){

    bindProjectButtons();

}

function bindProjectButtons(){

    const saveButton = document.getElementById("btnSave");

    if(saveButton){
        saveButton.onclick = function(){
            exportProject();
        };
    }

    const loadButton = document.getElementById("btnLoad");

    if(loadButton){
        loadButton.onclick = function(){
            importProject();
        };
    }

}

function exportProject(){

    const data = {

        version:"1.0",

        created:new Date().toISOString(),

        sections:state.sections,

        images:state.images || [],

        seo:state.seo || null

    };

    const blob = new Blob(
        [JSON.stringify(data,null,2)],
        { type:"application/json" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = "ベタガキ君_プロジェクト.json";

    a.click();

    URL.revokeObjectURL(url);

    if(window.showToast){
        showToast("プロジェクトを書き出しました");
    }

}

function importProject(){

    const input = document.createElement("input");

    input.type = "file";

    input.accept = ".json";

    input.onchange = function(e){

        const file = e.target.files[0];

        if(!file){
            return;
        }

        const reader = new FileReader();

        reader.onload = function(){

            let data = null;

            try{
                data = JSON.parse(reader.result);
            }catch(error){

                alert("ファイルを読み込めませんでした。ベタガキ君のプロジェクトファイルを選択してください。");

                return;

            }

            if(!data || !Array.isArray(data.sections)){

                alert("ベタガキ君のプロジェクトファイルではありません。");

                return;

            }

            state.sections = data.sections;

            state.images = data.images || [];

            if(data.seo){
                state.seo = data.seo;
            }

            state.selectedId = null;

            state.selectedSection = null;

            try{

                localStorage.setItem(
                    "pageforge_images",
                    JSON.stringify(state.images)
                );

            }catch(error){
                /* 容量超過時も読込自体は続行する */
            }

            if(window.initializeSEO){
                initializeSEO();
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

            if(window.saveHistory){
                saveHistory();
            }

            if(window.showToast){
                showToast("プロジェクトを読み込みました");
            }

        };

        reader.readAsText(file);

    };

    input.click();

}

window.initializeProject = initializeProject;

window.exportProject = exportProject;

window.importProject = importProject;

})();
