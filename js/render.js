(function(){

const state = window.PageForgeState;

function renderPageForge(){

    const canvas = document.getElementById("canvas");

    if(!canvas){
        return;
    }

    canvas.innerHTML = "";

    canvas.onclick = function(e){

        if(e.target !== canvas){
            return;
        }

        state.selectedId = null;
        state.selectedSection = null;

        renderPageForge();

        if(window.showPropertyPanel){
            showPropertyPanel();
        }

    };

    const sections = state.sections || [];

    if(!sections.length){

        canvas.innerHTML = `
<div class="pf-canvas-empty">
左の「パーツ」をクリック、<br>
またはここへドラッグ＆ドロップして<br>
LPの作成を始めましょう
</div>
`;
        return;

    }

    sections.forEach(section=>{

        const sectionElement = document.createElement("section");

        sectionElement.className = "pf-section";

        sectionElement.dataset.id = section.id;

        if(section.id === state.selectedSection){
            sectionElement.classList.add("selected-section");
        }

        sectionElement.onclick = function(e){

            if(e.target !== sectionElement){
                return;
            }

            e.stopPropagation();

            state.selectedSection = section.id;
            state.selectedId = null;

            renderPageForge();

            if(window.showPropertyPanel){
                showPropertyPanel();
            }

        };

        (section.blocks || []).forEach(block=>{

            const blockElement = createBlockElement(block,section);

            sectionElement.appendChild(blockElement);

        });

        canvas.appendChild(sectionElement);

    });

}

function createBlockElement(block,section){

    const element = document.createElement("div");

    element.className = "pf-block";

    element.dataset.id = block.id;

    element.draggable = true;

    if(block.id === state.selectedId){
        element.classList.add("selected");
    }

    applyStyle(element,block);

    element.innerHTML = generateContent(block);

    element.onclick = function(e){

        e.stopPropagation();

        state.selectedId = block.id;

        state.selectedSection = section.id;

        renderPageForge();

        if(window.showPropertyPanel){
            showPropertyPanel();
        }

    };

    if(window.makeBlockDraggable){
        makeBlockDraggable(element);
    }

    return element;

}

function generateContent(block){

    switch(block.type){

        case "hero":

            return `
<div class="hero-block">
<h1>${escapeHtml(block.title || "タイトル")}</h1>
<p>${escapeHtml(block.text || "")}</p>
</div>
`;

        case "heading":
            return generateHeading(block);

        case "text":
            return `
<p class="text-block">
${escapeHtml(block.text || "テキスト")}
</p>
`;

        case "image":

            if(!block.image){
                return `
<div class="pf-image-placeholder">
画像URLをプロパティで設定してください
</div>
`;
            }

            return `
<img src="${escapeHtml(block.image)}">
`;

        case "button":
        case "cta":
            return `
<a class="pf-button" style="background:${escapeHtml(block.buttonBg || "#bf0000")};color:${escapeHtml(block.buttonColor || "#ffffff")};">
${escapeHtml(block.text || block.title || "申し込みはこちら")}
</a>
`;

        case "product":
            return `
<div class="product-card">
${block.image ? `<img src="${escapeHtml(block.image)}">` : ""}
<h3>${escapeHtml(block.productName || block.title || "商品名")}</h3>
<p>${escapeHtml(block.description || "")}</p>
<div class="product-price">${escapeHtml(block.price || "")}</div>
<div class="product-quantity">${escapeHtml(block.quantity || "")}</div>
</div>
`;

        case "price":
            return `
<div class="price-block">
<span>${escapeHtml(block.amount || "")}</span>${escapeHtml(block.unit || "円")}
</div>
`;

        case "review":
            return `
<div class="review-block">
<div class="review-stars">${buildStars(block.rating)}</div>
<p>${escapeHtml(block.comment || "レビュー内容")}</p>
</div>
`;

        case "producer":
            return `
<div class="producer-block">
<h3>生産者紹介</h3>
<p>${escapeHtml(block.text || "")}</p>
</div>
`;

        case "notice":
            return `
<div class="notice-block">
<h3>注意事項</h3>
<p>${escapeHtml(block.text || "")}</p>
</div>
`;

        case "shipping":
            return `
<div class="shipping-block">
<h3>配送情報</h3>
<p>${escapeHtml(block.text || "")}</p>
</div>
`;

        case "badge":
            return `
<span class="badge-block">${escapeHtml(block.text || "期間限定")}</span>
`;

        case "bannerGrid":
            return generateBannerGrid(block);

        case "media":
            return generateMedia(block);

        default:
            return `
${escapeHtml(block.title || "")}
`;

    }

}

function generateHeading(block){

    const design = block.design || "plain";

    const accent = block.accent || "#bf0000";

    let style = "";

    if(design === "bar"){
        style = `border-left:6px solid ${accent};padding-left:12px;`;
    }

    if(design === "underline"){
        style = `border-bottom:3px solid ${accent};padding-bottom:8px;`;
    }

    if(design === "band"){
        style = `background-color:${accent};color:#ffffff;padding:10px 16px;`;
    }

    if(design === "box"){
        style = `border:2px solid ${accent};padding:8px 16px;`;
    }

    return `
<h2 class="heading-block" style="${escapeHtml(style)}">
${escapeHtml(block.title || "見出し")}
</h2>
`;

}

function rankColor(rank){

    if(rank === 1){
        return "#d4af37";
    }

    if(rank === 2){
        return "#8d9aa5";
    }

    if(rank === 3){
        return "#a9662a";
    }

    return "#555555";

}

function generateBannerGrid(block){

    const columns = parseInt(block.columns,10) || 3;

    const gap = parseInt(block.gap,10) || 12;

    const items = block.items || [];

    if(!items.length){
        return `
<div class="pf-image-placeholder">
プロパティで「＋バナーを追加」してください
</div>
`;
    }

    const feature = block.layout === "feature";

    const showRank = block.showRank === "show";

    /*
        CSS Grid を使用:
        repeat(N,1fr) により、コンテナ幅に関係なく必ず N 列に収まる
        （flex の basis 計算誤差による意図しない折り返しが発生しない）。
        モバイルプレビュー時は style.css 側の
        「#canvas.preview-mobile .banner-grid」で 2 列に組み替わる。
    */

    const imgRatio = ratioStyle(block);

    let html = `<div class="banner-grid" style="display:grid;grid-template-columns:repeat(${columns},1fr);gap:${gap}px;">`;

    items.forEach((item,index)=>{

        const isFeature = feature && index === 0;

        const cellClass = isFeature ? "banner-item feature" : "banner-item";

        const cellStyle = "position:relative;min-width:0;" +
            (isFeature ? "grid-column:1 / -1;" : "");

        html += `<div class="${cellClass}" style="${cellStyle}">`;

        if(showRank){
            html += `<span style="position:absolute;top:0;left:0;background-color:${rankColor(index + 1)};color:#ffffff;font-size:13px;font-weight:bold;padding:4px 10px;z-index:1;">${index + 1}位</span>`;
        }

        if(item.image){
            html += `<img src="${escapeHtml(item.image)}"${imgRatio ? ` style="${escapeHtml(imgRatio)}"` : ""}>`;
        }else{
            html += `<div class="pf-image-placeholder">画像URL未設定</div>`;
        }

        if(item.caption){
            html += `<p class="banner-caption">${escapeHtml(item.caption)}</p>`;
        }

        if(item.price){
            html += `<p class="banner-price">${escapeHtml(item.price)}</p>`;
        }

        html += `</div>`;

    });

    html += `</div>`;

    return html;

}

function ratioStyle(block){

    if(block.ratio === "1-1"){
        return "aspect-ratio:1/1;object-fit:cover;";
    }

    if(block.ratio === "4-3"){
        return "aspect-ratio:4/3;object-fit:cover;";
    }

    if(block.ratio === "16-9"){
        return "aspect-ratio:16/9;object-fit:cover;";
    }

    return "";

}

function generateMedia(block){

    const direction = block.imagePosition === "right" ? "row-reverse" : "row";

    const imageHtml = block.image
        ? `<img src="${escapeHtml(block.image)}">`
        : `<div class="pf-image-placeholder">画像URL未設定</div>`;

    return `
<div class="media-block" style="display:flex;flex-wrap:wrap;gap:16px;flex-direction:${direction};align-items:flex-start;">
<div class="media-image" style="flex:1 1 260px;min-width:200px;">${imageHtml}</div>
<div class="media-text" style="flex:1 1 300px;min-width:220px;">
<h3>${escapeHtml(block.title || "")}</h3>
<p>${escapeHtml(block.text || "")}</p>
</div>
</div>
`;

}

function buildStars(rating){

    let value = parseInt(rating,10);

    if(isNaN(value)){
        value = 5;
    }

    value = Math.max(1,Math.min(5,value));

    return "★".repeat(value) + "☆".repeat(5 - value);

}

function applyStyle(element,block){

    if(block.width){
        element.style.flex = "0 1 " + block.width;
        element.style.maxWidth = block.width;
        element.dataset.w = parseInt(block.width,10);
    }

    if(block.color){
        element.style.color = block.color;
    }

    if(block.background){
        element.style.backgroundColor = block.background;
    }

    if(block.type === "hero" && block.image){
        element.style.backgroundImage = "url('" + block.image + "')";
        element.style.backgroundSize = "cover";
        element.style.backgroundPosition = "center";
    }

    if(block.fontSize){
        element.style.fontSize = normalizeSize(block.fontSize);
    }

    if(block.padding){
        element.style.padding = block.padding;
    }

    if(block.align){
        element.style.textAlign = block.align;
    }

    if(block.type === "badge"){
        element.style.display = "flex";
        element.style.alignItems = "center";
        element.style.justifyContent = "center";
    }

}

function normalizeSize(value){

    if(/^\d+$/.test(String(value).trim())){
        return value + "px";
    }

    return value;

}

function escapeHtml(value){

    return String(value)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;");

}

window.renderPageForge = renderPageForge;

})();
