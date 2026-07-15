(function(){

const state = window.PageForgeState;

/*
    レイアウトパターン:
    楽天コンテンツページのように、定番構成のセクションを
    ワンクリックで挿入するためのプリセット定義
*/

const PATTERNS = {

    ranking:{

        name:"ランキング",

        blocks:[

            {
                type:"heading",
                title:"人気ランキング",
                design:"band",
                accent:"#bf0000",
                fontSize:"24px",
                padding:"24px 24px 8px 24px"
            },

            {
                type:"bannerGrid",
                columns:"3",
                gap:"12",
                layout:"feature",
                showRank:"show",
                padding:"8px 24px 24px 24px",
                items:[
                    { image:"", link:"", caption:"1位の商品名", price:"12,000円" },
                    { image:"", link:"", caption:"2位の商品名", price:"10,000円" },
                    { image:"", link:"", caption:"3位の商品名", price:"8,000円" }
                ]
            }

        ]

    },

    bannerFeature:{

        name:"バナー特集",

        blocks:[

            {
                type:"heading",
                title:"おすすめ特集",
                design:"bar",
                accent:"#bf0000",
                fontSize:"24px",
                padding:"24px 24px 8px 24px"
            },

            {
                type:"bannerGrid",
                columns:"3",
                gap:"12",
                layout:"grid",
                showRank:"none",
                padding:"8px 24px 24px 24px",
                items:[
                    { image:"", link:"", caption:"特集バナー1", price:"" },
                    { image:"", link:"", caption:"特集バナー2", price:"" },
                    { image:"", link:"", caption:"特集バナー3", price:"" }
                ]
            }

        ]

    },

    mediaShowcase:{

        name:"商品紹介（左右）",

        blocks:[

            {
                type:"heading",
                title:"商品紹介",
                design:"underline",
                accent:"#bf0000",
                fontSize:"24px",
                padding:"24px 24px 8px 24px"
            },

            {
                type:"media",
                image:"",
                imagePosition:"left",
                title:"商品名A",
                text:"商品の特徴やこだわりをここに入力します。",
                link:"",
                padding:"16px 24px"
            },

            {
                type:"media",
                image:"",
                imagePosition:"right",
                title:"商品名B",
                text:"画像を左右交互に配置すると、リズムのある紙面になります。",
                link:"",
                padding:"16px 24px"
            }

        ]

    }

};

function initializePatterns(){

    document.querySelectorAll(".pattern").forEach(button=>{

        button.onclick = function(){
            insertPattern(button.dataset.pattern);
        };

    });

}

function insertPattern(key){

    const pattern = PATTERNS[key];

    if(!pattern){
        return;
    }

    const section = {

        id:"section_" + Date.now() + "_" + Math.floor(Math.random()*1000),

        name:pattern.name,

        blocks:JSON.parse(JSON.stringify(pattern.blocks)).map(block=>{

            block.id = "block_" + Date.now() + "_" + Math.floor(Math.random()*100000);

            return block;

        })

    };

    state.sections.push(section);

    state.selectedSection = section.id;

    state.selectedId = section.blocks[0] ? section.blocks[0].id : null;

    if(window.renderPageForge){
        renderPageForge();
    }

    if(window.saveAutoSave){
        saveAutoSave();
    }

    if(window.saveHistory){
        saveHistory();
    }

    if(window.showPropertyPanel){
        showPropertyPanel();
    }

    if(window.showToast){
        showToast("「" + pattern.name + "」レイアウトを追加しました");
    }

}

window.initializePatterns = initializePatterns;

window.insertPattern = insertPattern;

})();
