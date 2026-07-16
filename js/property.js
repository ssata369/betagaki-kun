(function(){

const state = window.PageForgeState;

const TYPE_LABELS = {
    hero:"ヒーロー",
    heading:"見出し",
    text:"テキスト",
    image:"画像",
    button:"ボタン",
    cta:"ボタン",
    product:"商品カード",
    price:"価格",
    review:"レビュー",
    badge:"バッジ",
    notice:"注意事項",
    shipping:"配送情報",
    producer:"生産者紹介",
    bannerGrid:"バナー一覧",
    media:"画像＋テキスト"
};

/*
    フィールド定義:
    [key, ラベル, 入力タイプ, 選択肢(selectのみ)]
    入力タイプ: text / textarea / color / url / number / align / select
*/

const TYPE_FIELDS = {

    hero:[
        ["title","キャッチコピー","text"],
        ["text","サブテキスト","textarea"],
        ["image","背景画像URL（任意）","url"]
    ],

    heading:[
        ["title","見出しテキスト","text"],
        ["design","見出しデザイン","select",[
            ["plain","シンプル"],
            ["bar","左アクセント"],
            ["underline","下線"],
            ["band","背景帯"],
            ["box","囲み枠"]
        ]],
        ["accent","アクセント色","color"]
    ],

    text:[
        ["text","本文","textarea"]
    ],

    image:[
        ["image","画像URL","url"],
        ["link","リンクURL（任意）","url"]
    ],

    media:[
        ["image","画像URL","url"],
        ["imagePosition","画像の位置","select",[
            ["left","画像を左に"],
            ["right","画像を右に"]
        ]],
        ["title","タイトル","text"],
        ["text","説明文","textarea"],
        ["link","リンクURL（任意）","url"]
    ],

    button:[
        ["text","ボタン文言","text"],
        ["link","リンクURL","url"],
        ["buttonBg","ボタン背景色","color"],
        ["buttonColor","ボタン文字色","color"]
    ],

    cta:[
        ["text","ボタン文言","text"],
        ["link","リンクURL","url"],
        ["buttonBg","ボタン背景色","color"],
        ["buttonColor","ボタン文字色","color"]
    ],

    product:[
        ["productName","商品名","text"],
        ["description","商品説明","textarea"],
        ["price","価格表示","text"],
        ["quantity","内容量","text"],
        ["image","画像URL","url"],
        ["link","リンクURL（遷移先）","url"]
    ],

    price:[
        ["amount","金額","text"],
        ["unit","単位","text"]
    ],

    review:[
        ["rating","評価（1〜5）","number"],
        ["comment","コメント","textarea"]
    ],

    badge:[
        ["text","バッジ文言","text"]
    ],

    notice:[
        ["text","注意事項","textarea"]
    ],

    shipping:[
        ["text","配送情報","textarea"]
    ],

    producer:[
        ["text","紹介文","textarea"]
    ],

    bannerGrid:[
        ["layout","レイアウト","select",[
            ["grid","均等グリッド"],
            ["feature","1件目を大きく（ランキング型）"]
        ]],
        ["columns","列数","select",[["2","2列"],["3","3列"],["4","4列"]]],
        ["gap","バナー間隔(px)","text"],
        ["showRank","順位バッジ","select",[
            ["none","表示しない"],
            ["show","表示する（1位〜）"]
        ]],
        ["ratio","画像の縦横比","select",[
            ["auto","そのまま"],
            ["1-1","正方形（1:1）"],
            ["4-3","4:3"],
            ["16-9","16:9"]
        ]]
    ]

};

const STYLE_FIELDS = [
    ["width","幅（横並び配置）","select",[
        ["","全幅（1列）"],
        ["50%","1/2幅（2列並び）"],
        ["33.33%","1/3幅（3列並び）"],
        ["25%","1/4幅（4列並び）"],
        ["66.66%","2/3幅"],
        ["75%","3/4幅"]
    ]],
    ["color","文字色","color"],
    ["background","背景色","color"],
    ["fontSize","文字サイズ","text"],
    ["padding","余白","text"],
    ["align","配置","align"]
];

function showPropertyPanel(){

    const panel = document.getElementById("propertyPanel");

    if(!panel){
        return;
    }

    const block = getSelectedBlock();

    if(!block){

        panel.innerHTML = state.selectedSection
            ? "セクションを選択中です。<br>パーツをクリックすると編集できます。"
            : "パーツを選択してください";

        if(window.refreshResponsiveEditor){
            refreshResponsiveEditor();
        }

        return;

    }

    panel.innerHTML = buildPropertyHtml(block);

    bindPropertyEvents(block);

    if(window.refreshResponsiveEditor){
        refreshResponsiveEditor();
    }

}

function buildPropertyHtml(block){

    const label = TYPE_LABELS[block.type] || block.type;

    let html = `
<div class="prop-header">
<span class="prop-type">${escapeValue(label)}</span>
<span class="prop-actions">
<button id="propDuplicate" title="このパーツを複製">複製</button>
<button id="propDelete" class="danger" title="このパーツを削除 (Deleteキー)">削除</button>
</span>
</div>
`;

    const fields = TYPE_FIELDS[block.type] || [
        ["title","タイトル","text"],
        ["text","本文","textarea"]
    ];

    fields.forEach(field=>{
        html += buildField(block,field);
    });

    if(block.type === "bannerGrid"){
        html += buildBannerItemsHtml(block);
    }

    html += `<hr><h4>スタイル</h4>`;

    STYLE_FIELDS.forEach(field=>{
        html += buildField(block,field);
    });

    return html;

}

function buildField(block,field){

    const key = field[0];

    const label = field[1];

    const type = field[2];

    const value = block[key] === undefined ? "" : block[key];

    if(type === "textarea"){

        return `
<label>${label}</label>
<textarea data-key="${key}">${escapeValue(value)}</textarea>
`;

    }

    if(type === "color"){

        const fallback =
            key === "color" ? "#333333" :
            key === "accent" ? "#bf0000" :
            key === "buttonBg" ? "#bf0000" :
            "#ffffff";

        return `
<label>${label}</label>
<input type="color" data-key="${key}" value="${escapeValue(value || fallback)}">
`;

    }

    if(type === "number"){

        return `
<label>${label}</label>
<input type="number" min="1" max="5" data-key="${key}" value="${escapeValue(value)}">
`;

    }

    if(type === "select"){

        const options = field[3] || [];

        return `
<label>${label}</label>
<select data-key="${key}">
${options.map(option =>
    `<option value="${option[0]}" ${String(value) === option[0] ? "selected" : ""}>${option[1]}</option>`
).join("")}
</select>
`;

    }

    if(type === "align"){

        return `
<label>${label}</label>
<select data-key="${key}">
<option value="" ${value === "" ? "selected" : ""}>指定なし</option>
<option value="left" ${value === "left" ? "selected" : ""}>左寄せ</option>
<option value="center" ${value === "center" ? "selected" : ""}>中央</option>
<option value="right" ${value === "right" ? "selected" : ""}>右寄せ</option>
</select>
`;

    }

    const placeholder =
        key === "fontSize" ? "例:24px" :
        key === "padding" ? "例:20px または 20px 40px" :
        type === "url" ? "https://..." :
        "";

    return `
<label>${label}</label>
<input data-key="${key}" value="${escapeValue(value)}" placeholder="${placeholder}">
`;

}

function buildBannerItemsHtml(block){

    const items = block.items || [];

    let html = `<hr><h4>バナー（${items.length}件）</h4>`;

    items.forEach((item,index)=>{

        html += `
<div class="prop-item">
<div class="prop-item-header">
<span>バナー${index + 1}</span>
<button class="prop-item-remove danger" data-item-index="${index}">削除</button>
</div>
<label>画像URL</label>
<input data-item-index="${index}" data-item-key="image" value="${escapeValue(item.image || "")}" placeholder="https://...">
<label>リンクURL（遷移先）</label>
<input data-item-index="${index}" data-item-key="link" value="${escapeValue(item.link || "")}" placeholder="https://...">
<label>キャプション（任意）</label>
<input data-item-index="${index}" data-item-key="caption" value="${escapeValue(item.caption || "")}" placeholder="商品名など">
<label>価格（任意）</label>
<input data-item-index="${index}" data-item-key="price" value="${escapeValue(item.price || "")}" placeholder="例:12,000円">
</div>
`;

    });

    html += `<button id="propAddItem">＋バナーを追加</button>`;

    return html;

}

function bindPropertyEvents(block){

    const panel = document.getElementById("propertyPanel");

    panel.querySelectorAll("[data-key]").forEach(function(el){

        el.addEventListener("input",function(){
            applyPanelValues(block);
        });

        el.addEventListener("change",function(){

            applyPanelValues(block);

            if(window.saveHistory){
                saveHistory();
            }

        });

    });

    panel.querySelectorAll("[data-item-key]").forEach(function(el){

        el.addEventListener("input",function(){

            const index = parseInt(el.dataset.itemIndex,10);

            if(block.items && block.items[index]){
                block.items[index][el.dataset.itemKey] = el.value;
            }

            if(window.saveAutoSave){
                saveAutoSave();
            }

            if(window.renderPageForge){
                renderPageForge();
            }

        });

        el.addEventListener("change",function(){

            if(window.saveHistory){
                saveHistory();
            }

        });

    });

    const addItemButton = document.getElementById("propAddItem");

    if(addItemButton){

        addItemButton.onclick = function(){

            block.items = block.items || [];

            block.items.push({ image:"", link:"", caption:"", price:"" });

            commit();

            showPropertyPanel();

        };

    }

    panel.querySelectorAll(".prop-item-remove").forEach(function(button){

        button.onclick = function(){

            const index = parseInt(button.dataset.itemIndex,10);

            block.items.splice(index,1);

            commit();

            showPropertyPanel();

        };

    });

    const duplicateButton = document.getElementById("propDuplicate");

    if(duplicateButton){
        duplicateButton.onclick = duplicateSelectedBlock;
    }

    const deleteButton = document.getElementById("propDelete");

    if(deleteButton){
        deleteButton.onclick = deleteSelectedBlock;
    }

}

function applyPanelValues(block){

    const panel = document.getElementById("propertyPanel");

    panel.querySelectorAll("[data-key]").forEach(function(el){
        block[el.dataset.key] = el.value;
    });

    if(window.saveAutoSave){
        saveAutoSave();
    }

    if(window.renderPageForge){
        renderPageForge();
    }

}

function deleteSelectedBlock(){

    const location = findBlockLocation(state.selectedId);

    if(!location){
        return;
    }

    const result = confirm("選択中のパーツを削除しますか？");

    if(!result){
        return;
    }

    location.section.blocks.splice(location.index,1);

    state.selectedId = null;

    commit();

    showPropertyPanel();

}

function duplicateSelectedBlock(){

    const location = findBlockLocation(state.selectedId);

    if(!location){
        return;
    }

    const clone = JSON.parse(
        JSON.stringify(location.section.blocks[location.index])
    );

    clone.id = "block_" + Date.now() + "_" + Math.floor(Math.random()*100000);

    location.section.blocks.splice(location.index + 1,0,clone);

    state.selectedId = clone.id;

    commit();

    showPropertyPanel();

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

function findBlockLocation(id){

    if(!id){
        return null;
    }

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

function getSelectedBlock(){

    const location = findBlockLocation(state.selectedId);

    return location ? location.section.blocks[location.index] : null;

}

function escapeValue(value){

    return String(value)
        .replace(/&/g,"&amp;")
        .replace(/"/g,"&quot;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;");

}

window.showPropertyPanel = showPropertyPanel;

window.deleteSelectedBlock = deleteSelectedBlock;

window.duplicateSelectedBlock = duplicateSelectedBlock;

})();
