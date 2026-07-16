(function(){

const state = window.PageForgeState;

let dragData = null;

const BLOCK_DEFAULTS = {

    hero:{
        title:"キャッチコピーをここに入力",
        text:"商品やサービスの魅力を一言で伝えるサブテキスト",
        image:"",
        background:"#f7f4ef",
        color:"#333333",
        padding:"48px 24px",
        align:"center"
    },

    heading:{
        title:"見出しテキスト",
        design:"bar",
        accent:"#bf0000",
        fontSize:"24px",
        padding:"24px 24px 8px 24px",
        color:"#333333"
    },

    text:{
        text:"本文テキストをここに入力します。商品の特徴やお客様へのメッセージを書きましょう。",
        padding:"8px 24px",
        color:"#333333"
    },

    image:{
        link:"",
        padding:"16px 24px",
        align:"center"
    },

    media:{
        image:"",
        imagePosition:"left",
        title:"商品・サービス名",
        text:"説明文をここに入力します。画像と文章を左右に並べる定番レイアウトです。",
        link:"",
        padding:"16px 24px"
    },

    button:{
        text:"ご購入はこちら",
        link:"",
        buttonBg:"#bf0000",
        buttonColor:"#ffffff",
        padding:"24px",
        align:"center"
    },

    product:{
        productName:"商品名",
        description:"商品説明をここに入力します。",
        price:"9,800円(税込)",
        quantity:"内容量：1個",
        image:"",
        link:"",
        padding:"24px"
    },

    price:{
        amount:"9,800",
        unit:"円(税込)",
        fontSize:"28px",
        padding:"24px",
        align:"center"
    },

    review:{
        rating:"5",
        comment:"お客様の声をここに入力します。",
        padding:"16px 24px"
    },

    badge:{
        text:"期間限定",
        background:"#c0392b",
        color:"#ffffff",
        padding:"8px 16px",
        align:"center"
    },

    notice:{
        text:"注意事項をここに入力します。",
        fontSize:"13px",
        padding:"16px 24px"
    },

    shipping:{
        text:"配送に関する情報をここに入力します。",
        fontSize:"13px",
        padding:"16px 24px"
    },

    producer:{
        text:"生産者の紹介文をここに入力します。",
        padding:"16px 24px"
    },

    bannerGrid:{
        columns:"3",
        gap:"12",
        layout:"grid",
        showRank:"none",
        ratio:"auto",
        items:[
            { image:"", link:"", caption:"", price:"" },
            { image:"", link:"", caption:"", price:"" },
            { image:"", link:"", caption:"", price:"" }
        ],
        padding:"16px 24px"
    }

};

function initializeDrag(){

    initializeCanvasDrag();

}

function initializeCanvasDrag(){

    const canvas = document.getElementById("canvas");

    if(!canvas){
        return;
    }

    canvas.addEventListener("dragover",function(e){

        e.preventDefault();

        clearDragStyle();

        const target = getTargetBlock(e.clientX,e.clientY);

        if(target){
            target.classList.add("drag-over");
            return;
        }

        const sectionElement = getTargetSectionElement(e.clientY);

        if(sectionElement){
            sectionElement.classList.add("drag-over-section");
        }

    });

    canvas.addEventListener("dragleave",function(){

        clearDragStyle();

    });

    canvas.addEventListener("drop",function(e){

        e.preventDefault();

        clearDragStyle();

        if(!dragData){
            return;
        }

        if(dragData.mode === "new"){
            dropNewBlock(dragData.type,e.clientX,e.clientY);
        }

        if(dragData.mode === "move"){
            moveExistingBlock(dragData.id,e.clientX,e.clientY);
        }

        dragData = null;

        commit();

        if(window.showPropertyPanel){
            showPropertyPanel();
        }

    });

}

function setNewPartDrag(type){

    dragData = {
        mode:"new",
        type:type
    };

}

function setBlockDrag(id){

    dragData = {
        mode:"move",
        id:id
    };

}

function makeBlockDraggable(element){

    element.addEventListener("dragstart",function(e){

        e.stopPropagation();

        setBlockDrag(element.dataset.id);

        element.classList.add("dragging");

        e.dataTransfer.effectAllowed = "move";

        e.dataTransfer.setData("text/plain",element.dataset.id);

    });

    element.addEventListener("dragend",function(){

        element.classList.remove("dragging");

        clearDragStyle();

    });

}

function addPart(type){

    ensureSection();

    const section = getSelectedOrLastSection();

    const block = createBlockOfType(type);

    section.blocks.push(block);

    state.selectedId = block.id;

    state.selectedSection = section.id;

    commit();

    if(window.showPropertyPanel){
        showPropertyPanel();
    }

}

function dropNewBlock(type,x,y){

    ensureSection();

    const block = createBlockOfType(type);

    const target = getTargetBlock(x,y);

    if(target && insertBefore(block,target.dataset.id)){

        state.selectedId = block.id;

        return;

    }

    const section = getTargetSection(y) || getSelectedOrLastSection();

    section.blocks.push(block);

    state.selectedId = block.id;

    state.selectedSection = section.id;

}

function moveExistingBlock(id,x,y){

    const location = findBlockLocation(id);

    if(!location){
        return;
    }

    const target = getTargetBlock(x,y);

    if(target && target.dataset.id === id){
        return;
    }

    const moving = location.section.blocks[location.index];

    location.section.blocks.splice(location.index,1);

    if(target && insertBefore(moving,target.dataset.id)){
        return;
    }

    const section = getTargetSection(y) || location.section;

    section.blocks.push(moving);

}

function createBlockOfType(type){

    const defaults = BLOCK_DEFAULTS[type] || {};

    return Object.assign(
        {
            id:createId("block"),
            type:type,
            title:"",
            text:""
        },
        JSON.parse(JSON.stringify(defaults))
    );

}

function ensureSection(){

    if(!state.sections.length){

        state.sections.push({
            id:createId("section"),
            name:"新規セクション",
            blocks:[]
        });

    }

}

function getSelectedOrLastSection(){

    const selected = state.sections.find(
        section => section.id === state.selectedSection
    );

    return selected || state.sections[state.sections.length - 1];

}

function findBlockLocation(id){

    for(const section of state.sections){

        const index = section.blocks.findIndex(
            block => block.id === id
        );

        if(index !== -1){
            return { section:section, index:index };
        }

    }

    return null;

}

function insertBefore(block,targetId){

    for(const section of state.sections){

        const index = section.blocks.findIndex(
            item => item.id === targetId
        );

        if(index !== -1){

            section.blocks.splice(index,0,block);

            return true;

        }

    }

    return false;

}

function getTargetBlock(x,y){

    const blocks = document.querySelectorAll(".pf-block");

    /* 横並びに対応するため、まずX/Y両方が一致するブロックを探す */

    for(const block of blocks){

        const rect = block.getBoundingClientRect();

        if(
            y >= rect.top && y <= rect.bottom &&
            x >= rect.left && x <= rect.right
        ){
            return block;
        }

    }

    /* 行の余白にドロップされた場合は、同じ行のブロックへフォールバック */

    for(const block of blocks){

        const rect = block.getBoundingClientRect();

        if(y >= rect.top && y <= rect.bottom){
            return block;
        }

    }

    return null;

}

function getTargetSectionElement(y){

    const sections = document.querySelectorAll(".pf-section");

    for(const section of sections){

        const rect = section.getBoundingClientRect();

        if(y >= rect.top && y <= rect.bottom){
            return section;
        }

    }

    return null;

}

function getTargetSection(y){

    const element = getTargetSectionElement(y);

    if(!element){
        return null;
    }

    return state.sections.find(
        section => section.id === element.dataset.id
    ) || null;

}

function clearDragStyle(){

    document.querySelectorAll(".drag-over").forEach(element=>{
        element.classList.remove("drag-over");
    });

    document.querySelectorAll(".drag-over-section").forEach(element=>{
        element.classList.remove("drag-over-section");
    });

}

function commit(){

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

function createId(prefix){

    return (
        prefix + "_" +
        Date.now() + "_" +
        Math.floor(Math.random()*1000)
    );

}

window.initializeDrag = initializeDrag;

window.setNewPartDrag = setNewPartDrag;

window.setBlockDrag = setBlockDrag;

window.makeBlockDraggable = makeBlockDraggable;

window.addPart = addPart;

})();
