/*
  ベタガキ君 Studio v2 — 保存/出力層

  - AutoSaveService : localStorage への自動保存（debounce）と手動保存
  - ImportEngine    : 保存 JSON の読み込み（編集の完全復元）
  - ExportEngine    : JSON ダウンロード + CMS 用 HTML 出力モーダル

  ★ CMS 耐性（v1「おくふる」事故からの知見。必ず維持すること）:
  - 出力コードは改行を一切含まない 1 行
    （CMS の「改行→<br>自動変換」がグリッドに <br> を注入して
      レイアウトと <style> 内 CSS を破壊するため）
  - クラスは bgk- 接頭辞でスコープし、リセット CSS を同梱
  - グリッドは repeat(N,minmax(0,1fr))、画像は max-width:100%
  - モバイル(767px以下)は同梱メディアクエリで 2 列 / 全幅に組み替え
*/
(function(){
"use strict";

window.Betagaki.registerModule(function(ns){

  const KEY = "betagaki-studio:doc:v1";
  const { bus, model, util } = ns;
  const statusEl = document.getElementById("statusAutosave");

  /* ==========================================================
     AutoSaveService
     ========================================================== */

  let saveTimer = 0;

  function timeStamp(){
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }

  function saveNow(withToast){
    try{
      localStorage.setItem(KEY, JSON.stringify(model.toJSON()));
      statusEl.textContent = "自動保存: " + timeStamp() + " 保存済み";
      if(withToast) ns.ui.toast("ブラウザ内に保存しました");
    }catch(err){
      statusEl.textContent = "自動保存: 失敗";
      if(withToast) ns.ui.toast("保存に失敗しました: " + err.message);
    }
  }

  function scheduleSave(){
    statusEl.textContent = "自動保存: 変更を検知…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveNow(false), 800);
  }

  bus.on("doc:changed", scheduleSave);
  bus.on("action:save", () => {
    clearTimeout(saveTimer);
    saveNow(true);
  });

  /*
    インポート直後も保存対象にする（doc:loaded は doc:changed を発火しない
    ため、これがないとインポート後に閉じると復元内容が古いままになる）。
    ただし起動時の localStorage 復元では二重保存になるだけで無害。
  */
  bus.on("doc:loaded", scheduleSave);

  /* 起動時: 前回の編集内容を復元 */
  try{
    const raw = localStorage.getItem(KEY);
    if(raw){
      const data = JSON.parse(raw);
      if(data && Array.isArray(data.nodes) && data.nodes.length){
        model.load(data);
        ns.ui.toast("前回の編集内容を復元しました");
      }
    }
  }catch(err){
    /* 壊れた保存データは無視して新規開始 */
  }

  /* ==========================================================
     ImportEngine（JSON ファイル読み込み）
     ========================================================== */

  let fileInput = null;

  bus.on("action:import", () => {
    if(!fileInput){
      fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".json,application/json";
      fileInput.style.display = "none";
      document.body.appendChild(fileInput);

      fileInput.addEventListener("change", () => {
        const file = fileInput.files && fileInput.files[0];
        fileInput.value = "";
        if(!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          try{
            const data = JSON.parse(reader.result);
            model.load(data);
            ns.ui.toast("読み込みました（" + model.nodes.length + "件のコンポーネント）");
          }catch(err){
            ns.ui.toast("読み込みに失敗しました（JSON形式を確認してください）");
          }
        };
        reader.onerror = () => ns.ui.toast("ファイルを読み込めませんでした");
        reader.readAsText(file);
      });
    }
    fileInput.click();
  });

  /* ==========================================================
     ExportEngine — CMS 用スニペット生成
     ========================================================== */

  function containerStyle(){
    return "width:100%;max-width:1080px;box-sizing:border-box;margin:0 auto;"
      + "display:flex;flex-wrap:wrap;align-items:stretch;"
      + "font-family:'Hiragino Kaku Gothic ProN','Hiragino Sans','Noto Sans JP',sans-serif;"
      + "color:#333333;line-height:1.7;";
  }

  /*
    前半: CMS テーマの CSS 汚染からの防御（.bgk-page スコープのリセット）
    - インライン style は常にこのリセットより優先されるため自前の装飾は無傷
    - 疑似要素（テーマの見出し装飾）はインラインで消せないため !important
    - CMS が直下に <br> を注入しても崩れないよう display:none で無害化
    後半: モバイル(767px以下)のレイアウト組み替え
  */
  function baseResponsiveCSS(){
    return ".bgk-page,.bgk-page *{box-sizing:border-box;}\n"
      + ".bgk-page h1,.bgk-page h2,.bgk-page h3,.bgk-page p{margin:0;padding:0;background:none;border:none;}\n"
      + ".bgk-page h1::before,.bgk-page h1::after,.bgk-page h2::before,.bgk-page h2::after,.bgk-page h3::before,.bgk-page h3::after{content:none !important;}\n"
      + ".bgk-page img{max-width:100%;margin:0;border:none;}\n"
      + ".bgk-page a{text-decoration:none;}\n"
      + ".bgk-page>br,.bgk-grid>br{display:none;}\n"
      + "@media(max-width:767px){\n"
      + ".bgk-page h1{font-size:26px !important;}\n"
      + ".bgk-grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important;}\n"
      + ".bgk-grid-feature{grid-column:1 / -1 !important;}\n"
      + ".bgk-w-25,.bgk-w-33,.bgk-w-50{flex-basis:50% !important;max-width:50% !important;}\n"
      + ".bgk-w-66,.bgk-w-75{flex-basis:100% !important;max-width:100% !important;}\n"
      + ".bgk-price{font-size:15px !important;}\n"
      + "}\n";
  }

  /* CMS の改行→<br>自動変換対策: 改行ゼロの 1 行に圧縮する */
  function compactCss(css){
    return css.replace(/\n+/g, "");
  }

  function compactHtml(html){
    return html.replace(/\n+/g, " ");
  }

  /*
    出力方式（v1 から移植）:
    - inline     : 各要素に style 属性でべた書き
    - stylesheet : 同一スタイルを <style> 内の 1 クラスに集約（容量削減）
  */
  let exportMode = "inline";

  /* アップロード画像（データURL）は、URL が設定されていれば出力時に置換 */
  function resolveImage(src){
    if(src && src.indexOf("data:") === 0){
      const img = model.images.find(i => i.src === src);
      if(img && img.url) return img.url;
    }
    return src;
  }

  function resolveProps(props){
    const p = util.clone(props);
    ["src", "image"].forEach(k => {
      if(p[k]) p[k] = resolveImage(p[k]);
    });
    if(Array.isArray(p.items)){
      p.items.forEach(it => {
        if(it.image) it.image = resolveImage(it.image);
      });
    }
    return p;
  }

  /*
    各ノードにモデル順の固有クラス bgk-b-N を付与する。
    （レスポンシブ上書きのメディアクエリ対象。出力スキップされた
      ノードがあっても generateResponsiveCSS と番号が一致するよう、
      出力順ではなくモデルの index を使う）
  */
  function buildBodyHTML(){
    let html = '<div class="bgk-page" style="' + containerStyle() + '">';
    model.nodes.forEach((node, i) => {
      const def = ns.registry.get(node.type);
      if(!def) return;
      const props = resolveProps(node.props);
      const inner = def.html(props, { mode:"export" });
      if(!inner) return;
      const w = ns.registry.widthOf(props);
      html += '<div class="bgk-b bgk-w-' + w + ' bgk-b-' + i + '" style="' + ns.registry.wrapperStyle(props) + '">' + inner + '</div>';
    });
    html += '</div>';
    return html;
  }

  /* --- パーツ単位のレスポンシブ上書き → メディアクエリ（v1 移植） --- */

  function normalizeSize(value){
    return /^\d+$/.test(String(value).trim()) ? value + "px" : value;
  }

  function mediaRule(cls, styles, breakpoint){
    if(!styles) return "";
    let body = "";
    if(styles.width) body += "width:" + styles.width + " !important;";
    if(styles.fontSize) body += "font-size:" + normalizeSize(styles.fontSize) + " !important;";
    if(styles.padding) body += "padding:" + styles.padding + " !important;";
    if(!body) return "";
    return "@media(max-width:" + breakpoint + "){." + cls + "{" + body + "}}\n";
  }

  function generateResponsiveCSS(){
    let css = "";
    model.nodes.forEach((node, i) => {
      const r = node.props && node.props.responsive;
      if(!r) return;
      css += mediaRule("bgk-b-" + i, r.tablet, "1024px");
      css += mediaRule("bgk-b-" + i, r.mobile, "768px");
    });
    return css;
  }

  /*
    styleタグ集約モード: インラインの style 属性を同一スタイル 1 クラスに
    集約する。生成ルールは .bgk-page 接頭辞付き（詳細度 0,2,0）で出力し、
    スコープリセット（.bgk-page h1 = 0,1,1）に order 非依存で勝たせる。
    ※ 生成 HTML では class が style の直前に来る前提の変換
  */
  function toStylesheet(bodyHtml){
    const rules = [];
    const map = Object.create(null);
    let seq = 0;
    const html = bodyHtml.replace(/(?: class="([^"]*)")? style="([^"]*)"/g, function(_, cls, style){
      let c = map[style];
      if(!c){
        c = "bgk-c-" + (seq++);
        map[style] = c;
        rules.push(".bgk-page." + c + ",.bgk-page ." + c + "{" + style + "}");
      }
      return ' class="' + (cls ? cls + " " : "") + c + '"';
    });
    return { html: html, css: rules.join("\n") + "\n" };
  }

  function buildExport(){
    let body = buildBodyHTML();
    let css = "";
    if(exportMode === "stylesheet"){
      const t = toStylesheet(body);
      body = t.html;
      css += t.css;
    }
    css += baseResponsiveCSS();
    css += generateResponsiveCSS();
    return { body: body, css: css };
  }

  function generateSnippet(){
    const out = buildExport();
    return "<!-- ベタガキ君 Studio で作成 -->"
      + "<style>" + compactCss(out.css) + "</style>"
      + compactHtml(out.body);
  }

  /* 単体で動く HTML ファイル（プレビュー・納品確認用）。ページ設定を反映 */
  function generateStandaloneHTML(){
    const out = buildExport();
    const meta = model.meta || {};
    return "<!DOCTYPE html>\n"
      + '<html lang="ja">\n'
      + "<head>\n"
      + '<meta charset="UTF-8">\n'
      + '<meta name="viewport" content="width=device-width,initial-scale=1.0">\n'
      + "<title>" + util.esc(meta.title || "ベタガキ君 Studio LP") + "</title>\n"
      + '<meta name="description" content="' + util.esc(meta.description || "") + '">\n'
      + (meta.keywords ? '<meta name="keywords" content="' + util.esc(meta.keywords) + '">\n' : "")
      + (meta.ogImage ? '<meta property="og:image" content="' + util.esc(meta.ogImage) + '">\n' : "")
      + (meta.favicon ? '<link rel="icon" href="' + util.esc(meta.favicon) + '">\n' : "")
      + "<style>\n"
      + "body{margin:0;background:#ffffff;}\n"
      + "img{max-width:100%;height:auto;}\n"
      + out.css
      + "</style>\n"
      + "</head>\n"
      + "<body>\n"
      + out.body + "\n"
      + "</body>\n"
      + "</html>";
  }

  /* ==========================================================
     ExportEngine — モーダル UI
     ========================================================== */

  let overlay = null;

  function ensureModal(){
    if(overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML =
      '<div class="modal">'
      + '<h3 class="modal-title">コード出力（CMS貼り付け用）</h3>'
      + '<p class="modal-note">以下のコードをコピーして、CMSのHTML編集欄にそのまま貼り付けてください。<br>'
      + '※スマホ対応のため先頭に小さな&lt;style&gt;タグが含まれます。<br>'
      + '※CMSの「改行の自動変換」でレイアウトが崩れないよう、コードは改行なしの1行で出力されます（そのまま貼り付ければOKです）。</p>'
      + '<div style="display:flex;gap:6px;">'
      + '<button class="btn btn-primary" data-modal="mode-inline">べた書き（インライン）</button>'
      + '<button class="btn" data-modal="mode-sheet">styleタグ集約（class）</button>'
      + '</div>'
      + '<div class="modal-warning" style="display:none;padding:8px 12px;border:1px solid rgba(196,69,62,.4);border-radius:6px;background:rgba(196,69,62,.06);color:var(--danger);font-size:11px;line-height:1.6;">'
      + '⚠ アップロード画像（データURL）がそのまま含まれています。CMSによっては表示できないため、「画像」ボタンから本番URLを設定することをおすすめします（設定すると自動で置き換わります）。'
      + '</div>'
      + '<textarea class="modal-code" readonly spellcheck="false"></textarea>'
      + '<details>'
      + '<summary style="cursor:pointer;font-size:12px;font-weight:600;color:var(--text-2);">ページ設定（単体HTML出力用）</summary>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;padding-top:10px;">'
      + '<div class="field-row"><label class="field-label">title</label><input type="text" class="field-input" data-meta="title" spellcheck="false"></div>'
      + '<div class="field-row"><label class="field-label">keywords</label><input type="text" class="field-input" data-meta="keywords" spellcheck="false"></div>'
      + '<div class="field-row"><label class="field-label">OGP画像URL</label><input type="text" class="field-input" data-meta="ogImage" spellcheck="false"></div>'
      + '<div class="field-row"><label class="field-label">favicon URL</label><input type="text" class="field-input" data-meta="favicon" spellcheck="false"></div>'
      + '<div class="field-row" style="grid-column:1 / -1;"><label class="field-label">description</label><textarea class="field-textarea" data-meta="description" style="min-height:48px;"></textarea></div>'
      + '</div>'
      + '</details>'
      + '<div class="modal-actions">'
      + '<button class="btn" data-modal="json">JSONダウンロード</button>'
      + '<button class="btn" data-modal="html">HTMLダウンロード</button>'
      + '<span style="flex:1;"></span>'
      + '<button class="btn btn-primary" data-modal="copy">コピー</button>'
      + '<button class="btn" data-modal="close">閉じる</button>'
      + '</div>'
      + '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener("click", e => {
      if(e.target === overlay){
        closeModal();
        return;
      }
      const btn = e.target.closest("[data-modal]");
      if(!btn) return;
      if(btn.dataset.modal === "close") closeModal();
      if(btn.dataset.modal === "copy") copySnippet();
      if(btn.dataset.modal === "json") downloadJSON();
      if(btn.dataset.modal === "html") downloadHTML();
      if(btn.dataset.modal === "mode-inline"){ exportMode = "inline"; refreshSnippet(); }
      if(btn.dataset.modal === "mode-sheet"){ exportMode = "stylesheet"; refreshSnippet(); }
    });

    /* ページ設定の編集を model.meta に反映（自動保存対象） */
    overlay.addEventListener("change", e => {
      const key = e.target.dataset && e.target.dataset.meta;
      if(!key) return;
      const patch = {};
      patch[key] = e.target.value;
      model.setMeta(patch);
    });

    document.addEventListener("keydown", e => {
      if(e.key === "Escape" && overlay.classList.contains("is-open")){
        closeModal();
      }
    });

    return overlay;
  }

  function refreshSnippet(){
    const textarea = overlay.querySelector(".modal-code");
    const code = generateSnippet();
    textarea.value = code;
    overlay.querySelector(".modal-warning").style.display =
      code.indexOf("data:image") !== -1 ? "" : "none";
    const inlineBtn = overlay.querySelector('[data-modal="mode-inline"]');
    const sheetBtn = overlay.querySelector('[data-modal="mode-sheet"]');
    inlineBtn.classList.toggle("btn-primary", exportMode === "inline");
    sheetBtn.classList.toggle("btn-primary", exportMode === "stylesheet");
  }

  function openModal(){
    if(model.nodes.length === 0){
      ns.ui.toast("出力するコンテンツがありません");
      return;
    }
    ensureModal();
    overlay.querySelectorAll("[data-meta]").forEach(input => {
      input.value = model.meta[input.dataset.meta] || "";
    });
    refreshSnippet();
    const textarea = overlay.querySelector(".modal-code");
    overlay.classList.add("is-open");
    textarea.focus();
    textarea.select();
  }

  function closeModal(){
    overlay.classList.remove("is-open");
  }

  function copySnippet(){
    const textarea = overlay.querySelector(".modal-code");
    const done = () => ns.ui.toast("コードをコピーしました");
    const fallback = () => {
      textarea.select();
      try{
        document.execCommand("copy");
        done();
      }catch(err){
        ns.ui.toast("コピーできませんでした。手動で選択してください");
      }
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(textarea.value).then(done).catch(fallback);
    }else{
      fallback();
    }
  }

  function dateSuffix(){
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    return "" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  }

  function downloadJSON(){
    downloadFile("betagaki-page-" + dateSuffix() + ".json", JSON.stringify(model.toJSON(), null, 2), "application/json");
    ns.ui.toast("JSONを書き出しました");
  }

  function downloadHTML(){
    downloadFile("betagaki-lp-" + dateSuffix() + ".html", generateStandaloneHTML(), "text/html");
    ns.ui.toast("HTMLファイルを書き出しました");
  }

  function downloadFile(filename, content, mime){
    const blob = new Blob([content], { type: mime || "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  bus.on("action:export", openModal);

  /* ==========================================================
     画像管理（v1 imageManager を移植）
     アップロード画像はデータURLとしてドキュメントに保存。
     URL を設定すると出力時に自動で置き換わる（resolveImage）。
     ========================================================== */

  let imgOverlay = null;
  let imgFileInput = null;

  function ensureImageModal(){
    if(imgOverlay) return imgOverlay;

    imgOverlay = document.createElement("div");
    imgOverlay.className = "modal-overlay";
    imgOverlay.innerHTML =
      '<div class="modal">'
      + '<h3 class="modal-title">画像管理</h3>'
      + '<p class="modal-note">アップロードした画像はブラウザ内に保存され、キャンバスで使用できます。<br>'
      + 'CMSに画像を登録したら「画像URL」欄に本番URLを入力してください。コード出力時に自動で置き換わります。</p>'
      + '<div><button class="btn" data-img-act="upload">＋ 画像をアップロード</button></div>'
      + '<div class="image-list" style="overflow-y:auto;max-height:44vh;display:grid;grid-template-columns:1fr 1fr;gap:10px;"></div>'
      + '<div class="modal-actions"><button class="btn" data-img-act="close">閉じる</button></div>'
      + '</div>';
    document.body.appendChild(imgOverlay);

    imgFileInput = document.createElement("input");
    imgFileInput.type = "file";
    imgFileInput.accept = "image/*";
    imgFileInput.multiple = true;
    imgFileInput.style.display = "none";
    document.body.appendChild(imgFileInput);

    imgFileInput.addEventListener("change", () => {
      const files = Array.from(imgFileInput.files || []);
      imgFileInput.value = "";
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          model.addImage({
            id: "img" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name: file.name,
            src: reader.result,
            url: ""
          });
          renderImageList();
        };
        reader.readAsDataURL(file);
      });
    });

    imgOverlay.addEventListener("click", e => {
      if(e.target === imgOverlay){
        imgOverlay.classList.remove("is-open");
        return;
      }
      const btn = e.target.closest("[data-img-act]");
      if(!btn) return;
      if(btn.dataset.imgAct === "close") imgOverlay.classList.remove("is-open");
      if(btn.dataset.imgAct === "upload") imgFileInput.click();
      if(btn.dataset.imgAct === "use") applyImage(btn.dataset.imgId);
      if(btn.dataset.imgAct === "delete") deleteImage(btn.dataset.imgId);
    });

    imgOverlay.addEventListener("change", e => {
      const id = e.target.dataset && e.target.dataset.imgUrl;
      if(!id) return;
      model.updateImage(id, { url: e.target.value.trim() });
      renderImageList();
    });

    document.addEventListener("keydown", e => {
      if(e.key === "Escape" && imgOverlay.classList.contains("is-open")){
        imgOverlay.classList.remove("is-open");
      }
    });

    return imgOverlay;
  }

  function imageUseCount(src){
    let count = 0;
    model.nodes.forEach(node => {
      if(node.props.src === src || node.props.image === src) count++;
      if(Array.isArray(node.props.items)){
        node.props.items.forEach(it => {
          if(it.image === src) count++;
        });
      }
    });
    return count;
  }

  function renderImageList(){
    const list = imgOverlay.querySelector(".image-list");
    if(!model.images.length){
      list.innerHTML = '<p style="grid-column:1 / -1;padding:20px 0;text-align:center;font-size:12px;color:var(--text-3);">まだ画像がありません</p>';
      return;
    }
    list.innerHTML = model.images.map(img => {
      return '<div class="item-card">'
        + '<img src="' + img.src + '" alt="" style="width:100%;height:90px;object-fit:cover;border-radius:4px;display:block;">'
        + '<div style="font-size:11px;margin:6px 0 2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + util.esc(img.name) + '</div>'
        + '<div style="font-size:11px;color:var(--text-3);margin-bottom:6px;">使用数: ' + imageUseCount(img.src) + '</div>'
        + '<input type="text" class="field-input" data-img-url="' + img.id + '" value="' + util.esc(img.url || "") + '" placeholder="画像URL（CMS登録後に入力）" spellcheck="false">'
        + '<div style="display:flex;gap:6px;margin-top:8px;">'
        + '<button class="btn" style="flex:1;" data-img-act="use" data-img-id="' + img.id + '">使用</button>'
        + '<button class="btn btn-danger" data-img-act="delete" data-img-id="' + img.id + '">削除</button>'
        + '</div>'
        + '</div>';
    }).join("");
  }

  /* 選択中パーツの画像プロパティ（src / image）に適用 */
  function applyImage(id){
    const img = model.images.find(i => i.id === id);
    if(!img) return;
    const node = model.getSelected();
    if(!node){
      ns.ui.toast("先にキャンバスでパーツを選択してください");
      return;
    }
    const def = ns.registry.get(node.type);
    const keys = (def ? def.fields : []).map(f => f.key);
    const key = keys.indexOf("src") >= 0 ? "src" : (keys.indexOf("image") >= 0 ? "image" : null);
    if(!key){
      ns.ui.toast("このパーツには画像を設定できません（バナーはインスペクターのURL欄へ）");
      return;
    }
    const patch = {};
    patch[key] = img.src;
    model.updateNode(node.id, patch, { commit: true });
    ns.ui.toast("「" + (def.label || node.type) + "」に画像を設定しました");
    renderImageList();
  }

  function deleteImage(id){
    const img = model.images.find(i => i.id === id);
    if(!img) return;
    if(imageUseCount(img.src) > 0 && !window.confirm("この画像は使用中です。削除しますか？")){
      return;
    }
    model.removeImage(id);
    renderImageList();
  }

  bus.on("action:images", () => {
    ensureImageModal();
    renderImageList();
    imgOverlay.classList.add("is-open");
  });

  /* E2E 検証用に内部関数を公開（UI からは使用しない） */
  ns.exporter = { generateSnippet, generateStandaloneHTML };

});

})();
