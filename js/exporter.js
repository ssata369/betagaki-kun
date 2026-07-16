(function(){

const state = window.PageForgeState;

const FONT_FAMILY = "'Hiragino Kaku Gothic ProN','Hiragino Sans','Noto Sans JP',sans-serif";

/*
    出力方式:
    - "inline"     : 各要素に style 属性でべた書き
    - "stylesheet" : すべてのスタイルを <style> タグ内の class に集約
                     （同一スタイルは 1 クラスに集約して再利用・容量削減）

    ※どちらの方式でも、モバイル対応（メディアクエリ）のための
      小さな <style> ブロックは必ず出力に含まれる。
      インラインの style 属性ではモバイル時のレイアウト変更が
      表現できないため（PC縮小表示の防止に必須）。
*/

let currentMode = "inline";

let mode = "inline";

let innerMap = {};

let innerList = [];

let innerSeq = 0;

let blockRules = [];

function initializeExporter(){

    const htmlButton = document.getElementById("btnExportHtml");

    if(htmlButton){
        htmlButton.onclick = function(){
            exportStandaloneHTML();
        };
    }

    const codeButton = document.getElementById("btnExportCode");

    if(codeButton){
        codeButton.onclick = function(){
            openSnippetDialog();
        };
    }

}

/* ==============================
   スタイルレジストリ
============================== */

function resetStyles(){

    innerMap = {};

    innerList = [];

    innerSeq = 0;

    blockRules = [];

}

/*
    要素のスタイル属性を返す。
    inline モードでは style="..."、
    stylesheet モードでは同一スタイルを集約した class="..." を返す。
*/

function sAttr(styleString){

    return cAttr("",styleString);

}

/*
    固定クラス（レスポンシブ制御用など）とスタイルを合成して
    属性文字列を返す。
*/

function cAttr(fixedClasses,styleString){

    if(!styleString){
        return fixedClasses ? ` class="${fixedClasses}"` : "";
    }

    if(mode === "inline"){

        const cls = fixedClasses ? ` class="${fixedClasses}"` : "";

        return `${cls} style="${styleString}"`;

    }

    let cls = innerMap[styleString];

    if(!cls){
        cls = "pf-c-" + (innerSeq++);
        innerMap[styleString] = cls;
        innerList.push([cls,styleString]);
    }

    const all = fixedClasses ? fixedClasses + " " + cls : cls;

    return ` class="${all}"`;

}

function buildCss(){

    let css = "";

    blockRules.forEach(rule=>{
        css += "." + rule[0] + "{" + rule[1] + "}\n";
    });

    innerList.forEach(rule=>{
        css += "." + rule[0] + "{" + rule[1] + "}\n";
    });

    return css;

}

/* ==============================
   共通: HTML生成
============================== */

function generateBodyHTML(){

    const containerStyle =
        `width:100%;max-width:1080px;box-sizing:border-box;margin:0 auto;font-family:${FONT_FAMILY};color:#333333;line-height:1.7;`;

    const rowStyle =
        "width:100%;display:flex;flex-wrap:wrap;align-items:stretch;";

    let html = `<div${cAttr("pf-page",containerStyle)}>\n`;

    let index = 0;

    (state.sections || []).forEach(section=>{

        html += `<div${sAttr(rowStyle)}>\n`;

        (section.blocks || []).forEach(block=>{

            html += generateBlockHTML(block,"pf-b-" + index);

            index++;

        });

        html += `</div>\n`;

    });

    html += `</div>`;

    return html;

}

function widthClass(block){

    if(!block.width){
        return "";
    }

    return " pf-w-" + parseInt(block.width,10);

}

function generateBlockHTML(block,className){

    const inner = generateInnerHTML(block);

    if(inner === null){
        return "";
    }

    const wrapperStyle = blockWrapperStyle(block);

    const classes = "pf-b " + className + widthClass(block);

    if(mode === "inline"){
        return `<div class="${classes}" style="${wrapperStyle}">\n${inner}\n</div>\n`;
    }

    /* stylesheet モードでは wrapper スタイルを固有クラスに登録 */

    blockRules.push([className,wrapperStyle]);

    return `<div class="${classes}">\n${inner}\n</div>\n`;

}

function blockWrapperStyle(block){

    let style = "box-sizing:border-box;margin:0;";

    if(block.width){
        style += `flex:0 1 ${block.width};max-width:${block.width};`;
    }else{
        style += "width:100%;";
    }

    if(block.color){
        style += `color:${block.color};`;
    }

    if(block.background){
        style += `background-color:${block.background};`;
    }

    if(block.type === "hero" && block.image){
        style += `background-image:url('${block.image}');background-size:cover;background-position:center;`;
    }

    if(block.fontSize){
        style += `font-size:${normalizeSize(block.fontSize)};`;
    }

    if(block.padding){
        style += `padding:${block.padding};`;
    }

    if(block.align){
        style += `text-align:${block.align};`;
    }

    if(block.responsive && block.responsive.pc && block.responsive.pc.width){
        style += `width:${block.responsive.pc.width};`;
    }

    if(block.type === "badge"){
        style += "display:flex;align-items:center;justify-content:center;";
    }

    return style;

}

function generateInnerHTML(block){

    switch(block.type){

        case "hero":
            return `<h1${sAttr("margin:0 0 12px 0;font-size:34px;line-height:1.4;color:inherit;font-weight:bold;")}>${esc(block.title || "")}</h1>` +
                (block.text ? `\n<p${sAttr("margin:0;line-height:1.8;color:inherit;")}>${esc(block.text)}</p>` : "");

        case "heading":
            return `<h2${sAttr("margin:0;line-height:1.5;color:inherit;font-weight:bold;font-size:inherit;" + headingDesignStyle(block))}>${esc(block.title || "")}</h2>`;

        case "text":
            return `<p${sAttr("margin:0;line-height:1.9;color:inherit;")}>${esc(block.text || "")}</p>`;

        case "image":{

            if(!block.image){
                return null;
            }

            const imageTag = `<img src="${esc(resolveImageSrc(block.image))}" alt=""${sAttr("width:100%;max-width:100%;height:auto;display:inline-block;")}>`;

            if(block.link){
                return `<a href="${esc(block.link)}"${sAttr("display:inline-block;width:100%;max-width:100%;")}>${imageTag}</a>`;
            }

            return imageTag;

        }

        case "button":
        case "cta":
            return `<a href="${esc(block.link || "#")}"${sAttr(`display:inline-block;margin:8px 0;padding:14px 48px;background-color:${block.buttonBg || "#bf0000"};color:${block.buttonColor || "#ffffff"};text-decoration:none;border-radius:4px;font-weight:bold;`)}>${esc(block.text || block.title || "申し込みはこちら")}</a>`;

        case "product":{

            const card = `<div${sAttr("border:1px solid #dddddd;border-radius:6px;padding:16px;background-color:#ffffff;color:#333333;height:100%;")}>` +
                (block.image ? `\n<img src="${esc(resolveImageSrc(block.image))}" alt="${esc(block.productName || "")}"${sAttr("width:100%;height:auto;display:block;")}>` : "") +
                `\n<h3${sAttr("margin:12px 0 8px 0;font-size:16px;line-height:1.5;color:inherit;font-weight:bold;")}>${esc(block.productName || block.title || "")}</h3>` +
                (block.description ? `\n<p${sAttr("margin:0 0 8px 0;font-size:13px;line-height:1.7;color:inherit;")}>${esc(block.description)}</p>` : "") +
                `\n<div${cAttr("pf-price","font-size:20px;font-weight:bold;color:#bf0000;")}>${esc(block.price || "")}</div>` +
                (block.quantity ? `\n<div${sAttr("font-size:12px;color:#666666;")}>${esc(block.quantity)}</div>` : "") +
                `\n</div>`;

            if(block.link){
                return `<a href="${esc(block.link)}"${sAttr("display:block;text-decoration:none;color:inherit;")}>${card}</a>`;
            }

            return card;

        }

        case "price":
            return `<span${sAttr("font-size:1.6em;font-weight:bold;")}>${esc(block.amount || "")}</span>${esc(block.unit || "円")}`;

        case "review":
            return `<div${sAttr("color:#f5a623;font-size:18px;letter-spacing:2px;")}>${buildStars(block.rating)}</div>` +
                `\n<p${sAttr("margin:6px 0 0 0;line-height:1.8;color:inherit;")}>${esc(block.comment || "")}</p>`;

        case "producer":
            return sectionHeadingHTML("生産者紹介",block.text);

        case "notice":
            return sectionHeadingHTML("注意事項",block.text);

        case "shipping":
            return sectionHeadingHTML("配送情報",block.text);

        case "badge":
            return `<span${sAttr("font-weight:bold;letter-spacing:1px;line-height:1;")}>${esc(block.text || "期間限定")}</span>`;

        case "bannerGrid":
            return bannerGridHTML(block);

        case "media":
            return mediaHTML(block);

        default:
            return esc(block.title || block.text || "");

    }

}

function headingDesignStyle(block){

    const design = block.design || "plain";

    const accent = block.accent || "#bf0000";

    if(design === "bar"){
        return `border-left:6px solid ${accent};padding-left:12px;`;
    }

    if(design === "underline"){
        return `border-bottom:3px solid ${accent};padding-bottom:8px;`;
    }

    if(design === "band"){
        return `background-color:${accent};color:#ffffff;padding:10px 16px;`;
    }

    if(design === "box"){
        return `border:2px solid ${accent};padding:8px 16px;`;
    }

    return "";

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

function mediaHTML(block){

    const direction = block.imagePosition === "right" ? "row-reverse" : "row";

    if(!block.image && !block.title && !block.text){
        return null;
    }

    let imagePart = "";

    if(block.image){

        const imageTag = `<img src="${esc(resolveImageSrc(block.image))}" alt="${esc(block.title || "")}"${sAttr("width:100%;height:auto;display:block;")}>`;

        imagePart = block.link
            ? `<a href="${esc(block.link)}"${sAttr("display:block;")}>${imageTag}</a>`
            : imageTag;

    }

    return `<div${sAttr(`display:flex;flex-wrap:wrap;gap:16px;flex-direction:${direction};align-items:flex-start;`)}>` +
        `\n<div${sAttr("flex:1 1 260px;min-width:200px;")}>${imagePart}</div>` +
        `\n<div${sAttr("flex:1 1 300px;min-width:220px;")}>` +
        (block.title ? `\n<h3${sAttr("margin:0 0 8px 0;font-size:18px;color:inherit;font-weight:bold;")}>${esc(block.title)}</h3>` : "") +
        `\n<p${sAttr("margin:0;line-height:1.9;color:inherit;")}>${esc(block.text || "")}</p>` +
        `\n</div>` +
        `\n</div>`;

}

function bannerGridHTML(block){

    const columns = parseInt(block.columns,10) || 3;

    const gap = parseInt(block.gap,10) || 12;

    const items = (block.items || []).filter(item => item.image);

    if(!items.length){
        return null;
    }

    const feature = block.layout === "feature";

    const showRank = block.showRank === "show";

    /*
        CSS Grid を使用:
        - repeat(N,1fr) により、コンテナ幅に関係なく必ず N 列に収まる
          （flex の basis 計算誤差による意図しない折り返しが発生しない）
        - モバイルでは同梱の <style> のメディアクエリで 2 列に組み替わる
    */

    let html = `<div${cAttr("pf-grid",`display:grid;grid-template-columns:repeat(${columns},1fr);gap:${gap}px;`)}>`;

    const imgStyle = "width:100%;height:auto;display:block;" + ratioStyle(block);

    items.forEach((item,index)=>{

        const isFeature = feature && index === 0;

        const cellClasses = isFeature ? "pf-cell pf-grid-feature" : "pf-cell";

        const cellStyle = "position:relative;min-width:0;" +
            (isFeature ? "grid-column:1 / -1;" : "");

        const rankBadge = showRank
            ? `<span${sAttr(`position:absolute;top:0;left:0;background-color:${rankColor(index + 1)};color:#ffffff;font-size:13px;font-weight:bold;padding:4px 10px;z-index:1;`)}>${index + 1}位</span>`
            : "";

        const imageTag = `<img src="${esc(resolveImageSrc(item.image))}" alt="${esc(item.caption || "")}"${sAttr(imgStyle)}>`;

        const caption = item.caption
            ? `\n<p${sAttr("margin:6px 0 0 0;font-size:13px;line-height:1.6;color:inherit;")}>${esc(item.caption)}</p>`
            : "";

        const price = item.price
            ? `\n<p${cAttr("pf-price","margin:4px 0 0 0;font-size:18px;font-weight:bold;color:#bf0000;")}>${esc(item.price)}</p>`
            : "";

        if(item.link){
            html += `\n<a href="${esc(item.link)}"${cAttr(cellClasses,cellStyle + "display:block;text-decoration:none;color:inherit;")}>${rankBadge}${imageTag}${caption}${price}</a>`;
        }else{
            html += `\n<div${cAttr(cellClasses,cellStyle)}>${rankBadge}${imageTag}${caption}${price}</div>`;
        }

    });

    html += `\n</div>`;

    return html;

}

function sectionHeadingHTML(title,text){

    return `<h3${sAttr("margin:0 0 8px 0;font-size:16px;border-left:4px solid #333333;padding-left:8px;color:inherit;font-weight:bold;")}>${esc(title)}</h3>` +
        `\n<p${sAttr("margin:0;line-height:1.8;color:inherit;")}>${esc(text || "")}</p>`;

}

function buildStars(rating){

    let value = parseInt(rating,10);

    if(isNaN(value)){
        value = 5;
    }

    value = Math.max(1,Math.min(5,value));

    return "★".repeat(value) + "☆".repeat(5 - value);

}

/*
    アップロード画像（データURL）は、画像管理でURLが
    設定されていればそのURLに置き換えて出力する
*/

function resolveImageSrc(src){

    if(!src){
        return "";
    }

    if(src.indexOf("data:") === 0){

        const image = (state.images || []).find(
            img => img.src === src
        );

        if(image && image.url){
            return image.url;
        }

    }

    return src;

}

/* ==============================
   レスポンシブCSS（常に出力に同梱）
   - モバイル(767px以下)でグリッドを2列化
   - 幅指定パーツを 2列 or 全幅に組み替え
   - 余白・文字サイズをモバイル向けに調整
============================== */

function baseResponsiveCSS(){

    return `.pf-page img{max-width:100%;}
@media(max-width:767px){
.pf-b{padding-left:16px !important;padding-right:16px !important;}
.pf-page h1{font-size:26px !important;}
.pf-grid{grid-template-columns:repeat(2,1fr) !important;}
.pf-grid-feature{grid-column:1 / -1 !important;}
.pf-w-25,.pf-w-33,.pf-w-50{flex-basis:50% !important;max-width:50% !important;}
.pf-w-66,.pf-w-75{flex-basis:100% !important;max-width:100% !important;}
.pf-price{font-size:15px !important;}
}
`;

}

/* ==============================
   スニペット / 単体HTML
============================== */

function generateInlineSnippet(){

    mode = currentMode;

    resetStyles();

    const body = generateBodyHTML();

    let css = "";

    if(mode === "stylesheet"){
        css += buildCss();
    }

    css += baseResponsiveCSS();

    css += generateResponsiveCSS();

    return "<!-- ベタガキ君で作成 -->\n<style>\n" + css + "</style>\n" + body;

}

function generateStandaloneHTML(){

    mode = currentMode;

    resetStyles();

    const seo = window.getSEO ? getSEO() : {};

    const body = generateBodyHTML();

    let css = "";

    if(mode === "stylesheet"){
        css += buildCss();
    }

    css += baseResponsiveCSS();

    css += generateResponsiveCSS();

    return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(seo.title || "ベタガキ君 LP")}</title>
<meta name="description" content="${esc(seo.description || "")}">
${seo.keywords ? `<meta name="keywords" content="${esc(seo.keywords)}">` : ""}
${seo.ogImage ? `<meta property="og:image" content="${esc(seo.ogImage)}">` : ""}
${seo.favicon ? `<link rel="icon" href="${esc(seo.favicon)}">` : ""}
<style>
body{margin:0;background:#ffffff;}
img{max-width:100%;height:auto;}
${css}
</style>
</head>
<body>
${body}
</body>
</html>`;

}

function generateResponsiveCSS(){

    let css = "";

    let index = 0;

    (state.sections || []).forEach(section=>{

        (section.blocks || []).forEach(block=>{

            const className = "pf-b-" + index;

            index++;

            if(!block.responsive){
                return;
            }

            css += mediaRule(className,block.responsive.tablet,"1024px");

            css += mediaRule(className,block.responsive.mobile,"768px");

        });

    });

    return css;

}

function mediaRule(className,styles,breakpoint){

    if(!styles){
        return "";
    }

    let body = "";

    if(styles.width){
        body += `width:${styles.width} !important;`;
    }

    if(styles.fontSize){
        body += `font-size:${normalizeSize(styles.fontSize)} !important;`;
    }

    if(styles.padding){
        body += `padding:${styles.padding} !important;`;
    }

    if(!body){
        return "";
    }

    return `@media(max-width:${breakpoint}){.${className}{${body}}}\n`;

}

/* ==============================
   出力アクション
============================== */

function exportStandaloneHTML(){

    if(!hasContent()){
        return;
    }

    downloadFile("index.html",generateStandaloneHTML());

    if(window.showToast){
        showToast("HTMLファイルを書き出しました");
    }

}

function openSnippetDialog(){

    if(!hasContent()){
        return;
    }

    ensureDialog();

    refreshSnippet();

    document.getElementById("pfExportOverlay").style.display = "flex";

    const textarea = document.getElementById("pfExportCode");

    textarea.focus();

    textarea.select();

}

function refreshSnippet(){

    const code = generateInlineSnippet();

    const textarea = document.getElementById("pfExportCode");

    textarea.value = code;

    const warning = document.getElementById("pfExportWarning");

    warning.style.display =
        code.indexOf("data:image") !== -1 ? "block" : "none";

    const inlineButton = document.getElementById("pfModeInline");

    const sheetButton = document.getElementById("pfModeSheet");

    if(inlineButton && sheetButton){

        inlineButton.classList.toggle("active",currentMode === "inline");

        sheetButton.classList.toggle("active",currentMode === "stylesheet");

    }

}

function ensureDialog(){

    let overlay = document.getElementById("pfExportOverlay");

    if(overlay){
        return overlay;
    }

    overlay = document.createElement("div");

    overlay.id = "pfExportOverlay";

    overlay.innerHTML = `
<div class="pf-dialog">

<h3>コード出力（CMS貼り付け用）</h3>

<div class="pf-mode-toggle">
<button id="pfModeInline" class="active">べた書き（インライン）</button>
<button id="pfModeSheet">styleタグ集約（class）</button>
</div>

<p class="pf-dialog-note">
以下のコードをコピーして、CMSのHTML編集欄にそのまま貼り付けてください。<br>
※スマホ対応（2列表示への組み替え等）のため、どちらの方式でも先頭に小さな&lt;style&gt;タグが含まれます。
</p>

<div id="pfExportWarning">
⚠ アップロード画像（データURL）が含まれています。CMSによっては表示できないため、パーツのプロパティで画像URLの指定をおすすめします。
</div>

<textarea id="pfExportCode" readonly spellcheck="false"></textarea>

<div class="pf-dialog-buttons">
<button id="pfExportCopy" class="primary">コピー</button>
<button id="pfExportClose">閉じる</button>
</div>

</div>
`;

    document.body.appendChild(overlay);

    overlay.onclick = function(e){
        if(e.target === overlay){
            overlay.style.display = "none";
        }
    };

    document.getElementById("pfModeInline").onclick = function(){
        currentMode = "inline";
        refreshSnippet();
    };

    document.getElementById("pfModeSheet").onclick = function(){
        currentMode = "stylesheet";
        refreshSnippet();
    };

    document.getElementById("pfExportClose").onclick = function(){
        overlay.style.display = "none";
    };

    document.getElementById("pfExportCopy").onclick = function(){
        copyExportCode();
    };

    return overlay;

}

function copyExportCode(){

    const textarea = document.getElementById("pfExportCode");

    const done = function(){
        if(window.showToast){
            showToast("コードをコピーしました");
        }
    };

    const fallback = function(){

        textarea.select();

        try{

            document.execCommand("copy");

            done();

        }catch(error){

            if(window.showToast){
                showToast("コピーできませんでした。手動で選択してください");
            }

        }

    };

    if(navigator.clipboard && navigator.clipboard.writeText){

        navigator.clipboard.writeText(textarea.value)
            .then(done)
            .catch(fallback);

    }else{

        fallback();

    }

}

function hasContent(){

    const hasBlocks = (state.sections || []).some(
        section => (section.blocks || []).length > 0
    );

    if(!hasBlocks){

        if(window.showToast){
            showToast("出力するコンテンツがありません");
        }

        return false;

    }

    return true;

}

function normalizeSize(value){

    if(/^\d+$/.test(String(value).trim())){
        return value + "px";
    }

    return value;

}

function esc(value){

    return String(value)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;");

}

function downloadFile(filename,content){

    const blob = new Blob(
        [content],
        { type:"text/html" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = filename;

    a.click();

    URL.revokeObjectURL(url);

}

window.initializeExporter = initializeExporter;

window.generateInlineSnippet = generateInlineSnippet;

window.generateStandaloneHTML = generateStandaloneHTML;

})();
