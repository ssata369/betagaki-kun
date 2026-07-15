(function(){

const state = window.PageForgeState;

function initializeResponsiveEditor(){

    createResponsivePanel();

}

function createResponsivePanel(){

    const panel = document.getElementById("responsiveSetting");

    if(!panel){
        return;
    }

    panel.innerHTML = `
<h3>レスポンシブ設定</h3>

<p class="panel-hint">選択中のパーツにデバイス別のスタイルを設定します</p>

<label>対象デバイス</label>
<select id="responsiveMode">
<option value="pc">PC</option>
<option value="tablet">Tablet</option>
<option value="mobile">Mobile</option>
</select>

<label>幅</label>
<input id="responsiveWidth" placeholder="例:100%">

<label>文字サイズ</label>
<input id="responsiveFontSize" placeholder="例:16px">

<label>余白</label>
<input id="responsivePadding" placeholder="例:20px">
`;

    bindResponsiveEvents();

}

function bindResponsiveEvents(){

    const mode = document.getElementById("responsiveMode");

    const width = document.getElementById("responsiveWidth");

    const font = document.getElementById("responsiveFontSize");

    const padding = document.getElementById("responsivePadding");

    if(!mode || !width || !font || !padding){
        return;
    }

    mode.onchange = function(){
        loadResponsiveValues();
    };

    [width,font,padding].forEach(input=>{

        input.onchange = function(){
            saveResponsiveValues();
        };

    });

    loadResponsiveValues();

}

function getSelectedBlock(){

    for(const section of state.sections){

        const block = section.blocks.find(
            b => b.id === state.selectedId
        );

        if(block){
            return block;
        }

    }

    return null;

}

function createResponsiveData(block){

    if(!block.responsive){

        block.responsive = {
            pc:{},
            tablet:{},
            mobile:{}
        };

    }

}

function loadResponsiveValues(){

    const modeSelect = document.getElementById("responsiveMode");

    const widthInput = document.getElementById("responsiveWidth");

    const fontInput = document.getElementById("responsiveFontSize");

    const paddingInput = document.getElementById("responsivePadding");

    if(!modeSelect || !widthInput || !fontInput || !paddingInput){
        return;
    }

    const block = getSelectedBlock();

    if(!block){

        widthInput.value = "";
        fontInput.value = "";
        paddingInput.value = "";

        return;

    }

    createResponsiveData(block);

    const data = block.responsive[modeSelect.value] || {};

    widthInput.value = data.width || "";

    fontInput.value = data.fontSize || "";

    paddingInput.value = data.padding || "";

}

function saveResponsiveValues(){

    const block = getSelectedBlock();

    if(!block){

        if(window.showToast){
            showToast("先にパーツを選択してください");
        }

        return;

    }

    createResponsiveData(block);

    const mode = document.getElementById("responsiveMode").value;

    block.responsive[mode] = {

        width:document.getElementById("responsiveWidth").value,

        fontSize:document.getElementById("responsiveFontSize").value,

        padding:document.getElementById("responsivePadding").value

    };

    if(window.saveAutoSave){
        saveAutoSave();
    }

    if(window.renderPageForge){
        renderPageForge();
    }

    if(window.saveHistory){
        saveHistory();
    }

}

window.initializeResponsiveEditor = initializeResponsiveEditor;

window.refreshResponsiveEditor = loadResponsiveValues;

})();
