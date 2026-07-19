/*
  ベタガキ君 Studio v2 — アプリ基盤層
  window.Betagaki 名前空間のみを使用（ES Modules 不使用 / file:// 直開き互換）

  - EventBus        : 層間の疎結合な通知
  - DocumentModel   : フラットなノード配列 {id,type,props} と選択状態
  - HistoryManager  : スナップショット式 Undo/Redo（commit:false の変更は積まない）
  - AppCore         : ツールバー・デバイス切替・キーボードショートカットの配線

  読込順は app.js → editor.js → storage.js（すべて defer）。
  後続ファイルは Betagaki.registerModule(fn) で初期化関数を登録し、
  DOMContentLoaded 後に app.js がまとめて起動する。
*/
(function(){
"use strict";

const NS = window.Betagaki = window.Betagaki || {};

/* ============================================================
   ユーティリティ
   ============================================================ */

NS.util = {

  esc(value){
    return String(value == null ? "" : value)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  },

  /* テキスト系コンポーネント用: エスケープした上で改行を <br> に変換 */
  escBr(value){
    return NS.util.esc(value).replace(/\r?\n/g,"<br>");
  },

  clone(value){
    return JSON.parse(JSON.stringify(value));
  },

  uid(){
    return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  }

};

/* ============================================================
   トースト通知
   ============================================================ */

NS.ui = {

  _toastEl: null,
  _toastTimer: 0,

  toast(message){
    if(!this._toastEl){
      const el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
      this._toastEl = el;
    }
    this._toastEl.textContent = message;
    this._toastEl.classList.add("is-visible");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this._toastEl.classList.remove("is-visible");
    }, 2400);
  }

};

/* ============================================================
   EventBus
   ============================================================ */

class EventBus {

  constructor(){
    this._listeners = new Map();
  }

  on(type, handler){
    if(!this._listeners.has(type)){
      this._listeners.set(type, []);
    }
    this._listeners.get(type).push(handler);
    return handler;
  }

  off(type, handler){
    const list = this._listeners.get(type);
    if(!list) return;
    const i = list.indexOf(handler);
    if(i >= 0) list.splice(i, 1);
  }

  emit(type, detail){
    const list = this._listeners.get(type);
    if(!list) return;
    list.slice().forEach(handler => handler(detail || {}));
  }

}

/* ============================================================
   DocumentModel
   ノードは {id, type, props} のフラット配列。
   すべての変更は doc:changed を発火する。
   detail.commit === false の変更（入力中のリアルタイム反映）は
   HistoryManager が履歴に積まない。
   ============================================================ */

class DocumentModel {

  constructor(bus){
    this.bus = bus;
    this.nodes = [];
    this.selectedId = null;
    /* ページ設定（単体HTML出力用 SEO メタ情報）。履歴には積まない */
    this.meta = { title:"", description:"", keywords:"", ogImage:"", favicon:"" };
    /* アップロード画像 {id,name,src(dataURL),url}。履歴には積まない */
    this.images = [];
  }

  indexOf(id){
    return this.nodes.findIndex(n => n.id === id);
  }

  getNode(id){
    return this.nodes.find(n => n.id === id) || null;
  }

  getSelected(){
    return this.getNode(this.selectedId);
  }

  addNode(type, props, index){
    const node = { id: NS.util.uid(), type, props: NS.util.clone(props || {}) };
    const at = (index == null || index < 0 || index > this.nodes.length)
      ? this.nodes.length
      : index;
    this.nodes.splice(at, 0, node);
    this._changed({ structural: true, addedId: node.id });
    this.select(node.id);
    return node;
  }

  /*
    複数ノードの一括追加（レイアウトパターン挿入用）。
    doc:changed を 1 回だけ発火するため、履歴上は 1 コミットになり
    Undo 1 回でパターン全体が取り消せる。
  */
  addNodes(list, index){
    if(!list || !list.length) return [];
    const created = list.map(item => ({
      id: NS.util.uid(),
      type: item.type,
      props: NS.util.clone(item.props || {})
    }));
    const at = (index == null || index < 0 || index > this.nodes.length)
      ? this.nodes.length
      : index;
    this.nodes.splice(at, 0, ...created);
    this._changed({ structural: true, addedId: created[0].id });
    this.select(created[0].id);
    return created;
  }

  duplicateNode(id){
    const src = this.getNode(id);
    if(!src) return null;
    const copy = { id: NS.util.uid(), type: src.type, props: NS.util.clone(src.props) };
    this.nodes.splice(this.indexOf(id) + 1, 0, copy);
    this._changed({ structural: true, addedId: copy.id });
    this.select(copy.id);
    return copy;
  }

  removeNode(id){
    const i = this.indexOf(id);
    if(i < 0) return;
    this.nodes.splice(i, 1);
    if(this.selectedId === id){
      this.selectedId = null;
    }
    this._changed({ structural: true });
    this.bus.emit("selection:changed", { id: this.selectedId });
  }

  updateNode(id, patch, opts){
    const node = this.getNode(id);
    if(!node) return;
    Object.assign(node.props, NS.util.clone(patch));
    this._changed({ commit: !(opts && opts.commit === false) });
  }

  moveNode(id, toIndex){
    const from = this.indexOf(id);
    if(from < 0) return;
    let to = (toIndex == null) ? this.nodes.length : toIndex;
    const node = this.nodes.splice(from, 1)[0];
    if(from < to) to--;
    to = Math.max(0, Math.min(to, this.nodes.length));
    this.nodes.splice(to, 0, node);
    if(to === from) return;
    this._changed({ structural: true });
  }

  /* 全パーツ削除（Undo で戻せるよう履歴コミットする） */
  clear(){
    if(!this.nodes.length) return;
    this.nodes = [];
    this.selectedId = null;
    this._changed({ structural: true });
    this.bus.emit("selection:changed", { id: null });
  }

  /* --- ページ設定 / 画像（履歴対象外: commit:false） --- */

  setMeta(patch){
    Object.assign(this.meta, patch);
    this._changed({ commit: false, meta: true });
  }

  addImage(image){
    this.images.push(NS.util.clone(image));
    this._changed({ commit: false, images: true });
  }

  updateImage(id, patch){
    const img = this.images.find(i => i.id === id);
    if(!img) return;
    Object.assign(img, patch);
    this._changed({ commit: false, images: true });
  }

  removeImage(id){
    this.images = this.images.filter(i => i.id !== id);
    this._changed({ commit: false, images: true });
  }

  select(id){
    const next = id || null;
    if(next === this.selectedId) return;
    if(next && !this.getNode(next)) return;
    this.selectedId = next;
    this.bus.emit("selection:changed", { id: next });
  }

  snapshot(){
    return NS.util.clone(this.nodes);
  }

  /* Undo/Redo からの復元。履歴には積まない（fromHistory:true） */
  restore(snapshot){
    this.nodes = NS.util.clone(snapshot);
    if(this.selectedId && !this.getNode(this.selectedId)){
      this.selectedId = null;
    }
    this._changed({ structural: true, fromHistory: true, commit: false });
    this.bus.emit("selection:changed", { id: this.selectedId });
  }

  toJSON(){
    return {
      app: "betagaki-studio",
      version: 1,
      savedAt: new Date().toISOString(),
      meta: NS.util.clone(this.meta),
      images: NS.util.clone(this.images),
      nodes: NS.util.clone(this.nodes)
    };
  }

  load(data){
    if(!data || !Array.isArray(data.nodes)){
      throw new Error("不正なデータ形式です");
    }
    this.nodes = data.nodes.map(n => ({
      id: n.id || NS.util.uid(),
      type: String(n.type || ""),
      props: NS.util.clone(n.props || {})
    }));
    this.meta = Object.assign(
      { title:"", description:"", keywords:"", ogImage:"", favicon:"" },
      NS.util.clone(data.meta || {})
    );
    this.images = NS.util.clone(data.images || []);
    this.selectedId = null;
    this.bus.emit("doc:loaded", {});
    this.bus.emit("selection:changed", { id: null });
  }

  _changed(detail){
    this.bus.emit("doc:changed", Object.assign({ commit: true, structural: false }, detail));
  }

}

/* ============================================================
   HistoryManager（スナップショット式）
   - commit された doc:changed のたびに全ノードのスナップショットを積む
   - 入力中（commit:false）の変更は積まず、undo 直前に未コミット分を
     自動で取り込む（入力途中の内容が消えないように）
   ============================================================ */

class HistoryManager {

  constructor(bus, model){
    this.bus = bus;
    this.model = model;
    this.limit = 50;
    this.past = [];
    this.future = [];
    this.present = model.snapshot();

    bus.on("doc:changed", detail => {
      if(detail.fromHistory) return;
      if(detail.commit === false) return;
      this.commit();
    });

    /* 読込・復元時は履歴をリセットして新しい基点にする */
    bus.on("doc:loaded", () => this.reset());
  }

  commit(){
    this.past.push(this.present);
    if(this.past.length > this.limit){
      this.past.shift();
    }
    this.present = this.model.snapshot();
    this.future = [];
    this.bus.emit("history:changed");
  }

  /* 入力中（未コミット）の変更があれば履歴に取り込む */
  commitPending(){
    const current = this.model.snapshot();
    if(JSON.stringify(current) !== JSON.stringify(this.present)){
      this.past.push(this.present);
      this.present = current;
      this.future = [];
    }
  }

  undo(){
    this.commitPending();
    if(this.past.length === 0) return;
    this.future.push(this.present);
    this.present = this.past.pop();
    this.model.restore(this.present);
    this.bus.emit("history:changed");
  }

  redo(){
    if(this.future.length === 0) return;
    this.past.push(this.present);
    this.present = this.future.pop();
    this.model.restore(this.present);
    this.bus.emit("history:changed");
  }

  canUndo(){
    return this.past.length > 0;
  }

  canRedo(){
    return this.future.length > 0;
  }

  reset(){
    this.past = [];
    this.future = [];
    this.present = this.model.snapshot();
    this.bus.emit("history:changed");
  }

}

/* ============================================================
   AppCore — UI シェルの配線
   ============================================================ */

class AppCore {

  constructor(ns){
    this.ns = ns;
  }

  init(){
    this._wireActions();
    this._wireDeviceSwitch();
    this._wireKeyboard();
  }

  _wireActions(){
    const { bus, history } = this.ns;

    const { model } = this.ns;

    document.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if(action === "undo") return history.undo();
        if(action === "redo") return history.redo();
        if(action === "clear"){
          if(!model.nodes.length){
            NS.ui.toast("削除するパーツがありません");
            return;
          }
          if(window.confirm("すべてのパーツを削除して初期化します。よろしいですか？")){
            model.clear();
            NS.ui.toast("すべてのパーツを削除しました（Ctrl+Zで戻せます）");
          }
          return;
        }
        bus.emit("action:" + action);
      });
    });

    const btnUndo = document.querySelector('[data-action="undo"]');
    const btnRedo = document.querySelector('[data-action="redo"]');
    const sync = () => {
      btnUndo.disabled = !history.canUndo();
      btnRedo.disabled = !history.canRedo();
    };
    bus.on("history:changed", sync);
    sync();
  }

  _wireDeviceSwitch(){
    const { bus } = this.ns;
    const stage = document.getElementById("canvasStage");
    const statusDevice = document.getElementById("statusDevice");
    const LABELS = {
      desktop: "PC — 1024px",
      tablet: "タブレット — 768px",
      mobile: "スマホ — 390px"
    };
    const buttons = document.querySelectorAll(".device-option");

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.toggle("is-active", b === btn));
        const device = btn.dataset.device;
        stage.dataset.device = device;
        statusDevice.textContent = LABELS[device] || "";
        bus.emit("device:changed", { device });
      });
    });
  }

  _wireKeyboard(){
    const { bus, model, history } = this.ns;

    document.addEventListener("keydown", e => {
      const t = e.target;
      const inField = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
      const mod = e.ctrlKey || e.metaKey;

      if(mod && e.key.toLowerCase() === "s"){
        e.preventDefault();
        bus.emit("action:save");
        return;
      }

      /* 入力欄では OS ネイティブのテキスト編集を優先する */
      if(inField) return;

      if(mod && e.key.toLowerCase() === "z"){
        e.preventDefault();
        if(e.shiftKey){ history.redo(); } else { history.undo(); }
        return;
      }

      if(mod && e.key.toLowerCase() === "y"){
        e.preventDefault();
        history.redo();
        return;
      }

      if(e.key === "Delete"){
        if(model.selectedId){
          e.preventDefault();
          model.removeNode(model.selectedId);
        }
        return;
      }

      if(e.key === "Escape"){
        model.select(null);
      }
    });
  }

}

/* ============================================================
   起動シーケンス
   ============================================================ */

NS._modules = [];

NS.registerModule = function(fn){
  NS._modules.push(fn);
};

function boot(){
  NS.bus = new EventBus();
  NS.model = new DocumentModel(NS.bus);
  NS.history = new HistoryManager(NS.bus, NS.model);
  NS.app = new AppCore(NS);
  NS.app.init();
  NS._modules.forEach(fn => fn(NS));
  NS.bus.emit("app:ready");
}

/*
  defer 読込のため、このスクリプト実行時点では後続の editor.js /
  storage.js は未実行（readyState は 'interactive'）。
  全 defer スクリプト実行後に発火する DOMContentLoaded で起動する。
*/
if(document.readyState === "complete"){
  boot();
}else{
  document.addEventListener("DOMContentLoaded", boot);
}

})();
