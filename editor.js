/*
  ベタガキ君 Studio v2 — エディタ層

  - ComponentRegistry   : 定義駆動のコンポーネント台帳。
                          各定義は defaults / fields / html(props, ctx) を持ち、
                          キャンバス描画と CMS 出力で同一の html() を共用する。
                          ctx.mode は "canvas" | "export"（未設定時は export）。
  - CanvasController    : #pageFrame 内に .page-body を作りノードを描画
  - DragDropManager     : ライブラリからの追加・キャンバス内の並べ替え。
                          ドロップ先判定は X + Y の両方で行う（v1 の教訓）
  - InspectorController : 選択ノードの編集フォームを動的生成。
                          input = リアルタイム反映（commit:false）、
                          change = 履歴コミット
*/
(function(){
"use strict";

/* ============================================================
   ComponentRegistry
   ============================================================ */

class ComponentRegistry {

  constructor(util){
    this.util = util;
    this.defs = {};
    this._registerAll();
  }

  get(type){
    return this.defs[type] || null;
  }

  defaults(type){
    const def = this.get(type);
    return def ? this.util.clone(def.defaults) : {};
  }

  /* ノードの幅（%）。width プロパティを持たないコンポーネントは全幅 */
  widthOf(props){
    const w = parseInt(props && props.width, 10);
    return (w > 0 && w < 100) ? w : 100;
  }

  /*
    ノードラッパーの共通インラインスタイル。
    キャンバス（.canvas-node）と出力（.bgk-b）の両方で使う。
    幅指定ノードは flex アイテムとして横に並ぶ。
  */
  wrapperStyle(props){
    const w = this.widthOf(props);
    let s = "box-sizing:border-box;margin:0;";
    if(w >= 100){
      s += "width:100%;";
    }else{
      /*
        分数系(1/3・2/3)は 33/66 の整数だと 3枚並べても 99% で
        右端が余る。実寸を 33.333/66.666 に補正して行をぴったり
        埋める（合計 99.999%<100% なので折り返しは起きない）。
        クラス名/データ属性は整数(bgk-w-33 等)のまま維持する。
      */
      const PCT = { 33:"33.333", 66:"66.666" };
      const basis = PCT[w] || String(w);
      s += "flex:0 1 " + basis + "%;max-width:" + basis + "%;";
    }
    /* レスポンシブ上書き（PC）はインラインで反映。tablet/mobile は
       出力時のメディアクエリで反映される（v1 と同じ方式） */
    const resp = props && props.responsive;
    if(resp && resp.pc && resp.pc.width){
      s += "width:" + this.util.esc(resp.pc.width) + ";";
    }
    return s;
  }

  _registerAll(){
    const esc = this.util.esc;
    const escBr = this.util.escBr;

    const ALIGN_FIELD = { key:"align", label:"配置", type:"select", group:"スタイル",
      options:[
        { value:"left", label:"左寄せ" },
        { value:"center", label:"中央" },
        { value:"right", label:"右寄せ" }
      ]
    };

    const WIDTH_FIELD = { key:"width", label:"幅", type:"select", group:"レイアウト",
      options:[
        { value:"100", label:"全幅" },
        { value:"75", label:"3/4" },
        { value:"66", label:"2/3" },
        { value:"50", label:"1/2" },
        { value:"33", label:"1/3" },
        { value:"25", label:"1/4" }
      ]
    };

    /* 見出しの装飾スタイル（v1 から移植） */
    function headingDesign(design, accent){
      if(design === "bar") return "border-left:6px solid " + accent + ";padding-left:12px;";
      if(design === "underline") return "border-bottom:3px solid " + accent + ";padding-bottom:8px;";
      if(design === "band") return "background-color:" + accent + ";color:#ffffff;padding:10px 16px;";
      if(design === "box") return "border:2px solid " + accent + ";padding:8px 16px;";
      return "";
    }

    function imgTag(src, alt, extra){
      return '<img src="' + esc(src) + '" alt="' + esc(alt || "") + '" style="width:100%;max-width:100%;height:auto;display:block;' + (extra || "") + '">';
    }

    /* 見出し付きテキスト系（notice / shipping / producer）の共通定義 */
    function sectionTextDef(label, defaultTitle, defaultText){
      return {
        label: label,
        defaults: { title: defaultTitle, text: defaultText },
        fields: [
          { key:"title", label:"タイトル", type:"text", group:"内容" },
          { key:"text", label:"本文", type:"textarea", group:"内容" }
        ],
        html(p){
          return '<div style="padding:12px 8px;">'
            + '<h3 style="margin:0 0 8px 0;font-size:16px;border-left:4px solid #333333;padding-left:8px;font-weight:bold;color:inherit;">' + esc(p.title || defaultTitle) + '</h3>'
            + '<p style="margin:0;line-height:1.8;font-size:13px;color:inherit;">' + escBr(p.text || "") + '</p>'
            + '</div>';
        }
      };
    }

    /* 順位バッジの色（v1 から移植: 金・銀・銅） */
    function rankColor(rank){
      if(rank === 1) return "#d4af37";
      if(rank === 2) return "#8d9aa5";
      if(rank === 3) return "#a9662a";
      return "#555555";
    }

    /* バナー画像のアスペクト比固定（v1 から移植） */
    function ratioStyle(ratio){
      if(ratio === "1-1") return "aspect-ratio:1/1;object-fit:cover;";
      if(ratio === "4-3") return "aspect-ratio:4/3;object-fit:cover;";
      if(ratio === "16-9") return "aspect-ratio:16/9;object-fit:cover;";
      return "";
    }

    this.defs = {

      /* ---------- hero ---------- */
      hero: {
        label: "ヒーロー",
        defaults: {
          title: "見出しキャッチコピー",
          text: "サブテキストをここに入力します。",
          bgColor: "#2a3143",
          textColor: "#ffffff",
          align: "center",
          padY: "48"
        },
        fields: [
          { key:"title", label:"タイトル", type:"text", group:"内容" },
          { key:"text", label:"サブテキスト", type:"textarea", group:"内容" },
          { key:"bgColor", label:"背景色", type:"color", group:"スタイル" },
          { key:"textColor", label:"文字色", type:"color", group:"スタイル" },
          ALIGN_FIELD,
          { key:"padY", label:"上下余白 (px)", type:"number", group:"スタイル", min:8, max:160 }
        ],
        html(p){
          const padY = parseInt(p.padY, 10) || 48;
          return '<div style="margin:0 -16px;padding:' + padY + 'px 24px;background-color:' + esc(p.bgColor || "#2a3143") + ';color:' + esc(p.textColor || "#ffffff") + ';text-align:' + (p.align || "center") + ';">'
            + '<h1 style="margin:0;font-size:34px;line-height:1.4;font-weight:bold;color:inherit;">' + esc(p.title || "") + '</h1>'
            + (p.text ? '<p style="margin:12px 0 0 0;line-height:1.8;color:inherit;">' + escBr(p.text) + '</p>' : "")
            + '</div>';
        }
      },

      /* ---------- heading ---------- */
      heading: {
        label: "見出し",
        defaults: {
          text: "セクション見出し",
          design: "bar",
          accent: "#bf0000",
          fontSize: "22",
          align: "left"
        },
        fields: [
          { key:"text", label:"見出しテキスト", type:"text", group:"内容" },
          { key:"design", label:"デザイン", type:"select", group:"スタイル",
            options:[
              { value:"plain", label:"なし" },
              { value:"bar", label:"左バー" },
              { value:"underline", label:"下線" },
              { value:"band", label:"帯" },
              { value:"box", label:"枠" }
            ]
          },
          { key:"accent", label:"アクセント色", type:"color", group:"スタイル" },
          { key:"fontSize", label:"文字サイズ (px)", type:"number", group:"スタイル", min:12, max:48 },
          ALIGN_FIELD
        ],
        html(p){
          const fs = parseInt(p.fontSize, 10) || 22;
          return '<div style="padding:8px 8px;">'
            + '<h2 style="margin:0;line-height:1.5;font-weight:bold;font-size:' + fs + 'px;text-align:' + (p.align || "left") + ';color:inherit;' + headingDesign(p.design, esc(p.accent || "#bf0000")) + '">' + esc(p.text || "") + '</h2>'
            + '</div>';
        }
      },

      /* ---------- text ---------- */
      text: {
        label: "テキスト",
        defaults: {
          text: "本文テキストをここに入力します。",
          fontSize: "14",
          color: "#333333",
          align: "left",
          width: "100"
        },
        fields: [
          { key:"text", label:"本文", type:"textarea", group:"内容" },
          { key:"fontSize", label:"文字サイズ (px)", type:"number", group:"スタイル", min:10, max:32 },
          { key:"color", label:"文字色", type:"color", group:"スタイル" },
          ALIGN_FIELD,
          WIDTH_FIELD
        ],
        html(p){
          const fs = parseInt(p.fontSize, 10) || 14;
          return '<div style="padding:12px 8px;">'
            + '<p style="margin:0;line-height:1.9;font-size:' + fs + 'px;color:' + esc(p.color || "#333333") + ';text-align:' + (p.align || "left") + ';">' + escBr(p.text || "") + '</p>'
            + '</div>';
        }
      },

      /* ---------- image ---------- */
      image: {
        label: "画像",
        defaults: {
          src: "",
          alt: "",
          link: "",
          width: "100"
        },
        fields: [
          { key:"src", label:"画像URL", type:"text", group:"内容" },
          { key:"alt", label:"代替テキスト", type:"text", group:"内容" },
          { key:"link", label:"リンクURL", type:"text", group:"内容" },
          WIDTH_FIELD
        ],
        html(p, ctx){
          const mode = (ctx && ctx.mode) || "export";
          if(!p.src){
            if(mode === "canvas"){
              return '<div style="margin:8px 8px;padding:36px 12px;border:2px dashed #c7cdd6;border-radius:6px;background:#f8f9fb;color:#8b94a2;font-size:12px;text-align:center;">画像URLをインスペクターで設定してください</div>';
            }
            return "";
          }
          const img = imgTag(p.src, p.alt);
          const inner = p.link
            ? '<a href="' + esc(p.link) + '" style="display:block;">' + img + '</a>'
            : img;
          return '<div style="padding:8px 8px;">' + inner + '</div>';
        }
      },

      /* ---------- button ---------- */
      button: {
        label: "ボタン",
        defaults: {
          label: "申し込みはこちら",
          link: "#",
          bgColor: "#bf0000",
          textColor: "#ffffff",
          align: "center",
          width: "100"
        },
        fields: [
          { key:"label", label:"ボタン文言", type:"text", group:"内容" },
          { key:"link", label:"リンクURL", type:"text", group:"内容" },
          { key:"bgColor", label:"ボタン色", type:"color", group:"スタイル" },
          { key:"textColor", label:"文字色", type:"color", group:"スタイル" },
          ALIGN_FIELD,
          WIDTH_FIELD
        ],
        html(p){
          return '<div style="padding:16px 8px;text-align:' + (p.align || "center") + ';">'
            + '<a href="' + esc(p.link || "#") + '" style="display:inline-block;padding:14px 48px;background-color:' + esc(p.bgColor || "#bf0000") + ';color:' + esc(p.textColor || "#ffffff") + ';text-decoration:none;border-radius:4px;font-weight:bold;">' + esc(p.label || "") + '</a>'
            + '</div>';
        }
      },

      /* ---------- media（画像＋テキスト） ---------- */
      media: {
        label: "画像＋テキスト",
        defaults: {
          image: "",
          imagePosition: "left",
          title: "商品名",
          text: "商品の特徴やこだわりをここに入力します。",
          link: ""
        },
        fields: [
          { key:"image", label:"画像URL", type:"text", group:"内容" },
          { key:"imagePosition", label:"画像の位置", type:"select", group:"内容",
            options:[
              { value:"left", label:"画像を左に" },
              { value:"right", label:"画像を右に" }
            ]
          },
          { key:"title", label:"タイトル", type:"text", group:"内容" },
          { key:"text", label:"本文", type:"textarea", group:"内容" },
          { key:"link", label:"リンクURL（任意）", type:"text", group:"内容" }
        ],
        html(p, ctx){
          const mode = (ctx && ctx.mode) || "export";
          if(mode === "export" && !p.image && !p.title && !p.text) return "";
          const direction = p.imagePosition === "right" ? "row-reverse" : "row";
          let imagePart = "";
          if(p.image){
            const img = imgTag(p.image, p.title);
            imagePart = p.link
              ? '<a href="' + esc(p.link) + '" style="display:block;">' + img + '</a>'
              : img;
          }else if(mode === "canvas"){
            imagePart = '<div style="background:#eef0f3;border:1px dashed #c7cdd6;border-radius:4px;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;color:#8b94a2;font-size:11px;">画像未設定</div>';
          }
          /* min-width 指定により狭い画面では自動で縦積みになる */
          return '<div style="padding:16px 8px;">'
            + '<div style="display:flex;flex-wrap:wrap;gap:16px;flex-direction:' + direction + ';align-items:flex-start;">'
            + '<div style="flex:1 1 260px;min-width:200px;">' + imagePart + '</div>'
            + '<div style="flex:1 1 300px;min-width:220px;">'
            + (p.title ? '<h3 style="margin:0 0 8px 0;font-size:18px;font-weight:bold;color:inherit;">' + esc(p.title) + '</h3>' : "")
            + '<p style="margin:0;line-height:1.9;color:inherit;">' + escBr(p.text || "") + '</p>'
            + '</div>'
            + '</div>'
            + '</div>';
        }
      },

      /* ---------- spacer ---------- */
      spacer: {
        label: "スペーサー",
        defaults: {
          height: "32"
        },
        fields: [
          { key:"height", label:"高さ (px)", type:"number", group:"スタイル", min:4, max:200 }
        ],
        html(p){
          const h = Math.max(4, parseInt(p.height, 10) || 32);
          return '<div style="height:' + h + 'px;"></div>';
        }
      },

      /* ---------- productCard ---------- */
      productCard: {
        label: "商品カード",
        defaults: {
          image: "",
          name: "商品名",
          description: "商品の説明文をここに入力します。",
          price: "3,000円",
          note: "",
          link: "",
          width: "33"
        },
        fields: [
          { key:"image", label:"画像URL", type:"text", group:"内容" },
          { key:"name", label:"商品名", type:"text", group:"内容" },
          { key:"description", label:"説明文", type:"textarea", group:"内容" },
          { key:"price", label:"価格表示", type:"text", group:"内容" },
          { key:"note", label:"補足（容量など）", type:"text", group:"内容" },
          { key:"link", label:"リンクURL", type:"text", group:"内容" },
          WIDTH_FIELD
        ],
        html(p){
          const img = p.image ? imgTag(p.image, p.name) : "";
          const desc = p.description
            ? '<p style="margin:0 0 8px 0;font-size:13px;line-height:1.7;color:inherit;">' + escBr(p.description) + '</p>'
            : "";
          const note = p.note
            ? '<div style="font-size:12px;color:#666666;">' + esc(p.note) + '</div>'
            : "";
          const card = '<div style="border:1px solid #dddddd;border-radius:6px;padding:16px;background-color:#ffffff;color:#333333;height:100%;">'
            + img
            + '<h3 style="margin:12px 0 8px 0;font-size:16px;line-height:1.5;font-weight:bold;color:inherit;">' + esc(p.name || "") + '</h3>'
            + desc
            + '<div class="bgk-price" style="font-size:20px;font-weight:bold;color:#bf0000;">' + esc(p.price || "") + '</div>'
            + note
            + '</div>';
          const body = p.link
            ? '<a href="' + esc(p.link) + '" style="display:block;height:100%;text-decoration:none;color:inherit;">' + card + '</a>'
            : card;
          return '<div style="padding:8px;height:100%;">' + body + '</div>';
        }
      },

      /* ---------- bannerGrid ---------- */
      bannerGrid: {
        label: "バナーグリッド",
        defaults: {
          columns: "3",
          gap: "12",
          layout: "grid",
          showRank: "none",
          ratio: "auto",
          items: [
            { image:"", caption:"バナー1", price:"", link:"" },
            { image:"", caption:"バナー2", price:"", link:"" },
            { image:"", caption:"バナー3", price:"", link:"" }
          ]
        },
        fields: [
          { key:"columns", label:"列数", type:"select", group:"スタイル",
            options:[
              { value:"2", label:"2列" },
              { value:"3", label:"3列" },
              { value:"4", label:"4列" }
            ]
          },
          { key:"gap", label:"間隔 (px)", type:"number", group:"スタイル", min:0, max:48 },
          { key:"layout", label:"レイアウト", type:"select", group:"スタイル",
            options:[
              { value:"grid", label:"通常" },
              { value:"feature", label:"1枚目を大きく" }
            ]
          },
          { key:"showRank", label:"順位バッジ", type:"select", group:"スタイル",
            options:[
              { value:"none", label:"なし" },
              { value:"show", label:"表示（1位・2位…）" }
            ]
          },
          { key:"ratio", label:"画像の比率", type:"select", group:"スタイル",
            options:[
              { value:"auto", label:"自動" },
              { value:"1-1", label:"正方形" },
              { value:"4-3", label:"4:3" },
              { value:"16-9", label:"16:9" }
            ]
          },
          { key:"items", type:"items", group:"バナー" }
        ],
        html(p, ctx){
          const mode = (ctx && ctx.mode) || "export";
          const cols = parseInt(p.columns, 10) || 3;
          const gap = parseInt(p.gap, 10) || 12;
          const feature = p.layout === "feature";
          const showRank = p.showRank === "show";
          const ratio = ratioStyle(p.ratio);
          let items = p.items || [];
          /* 出力時は画像未設定のバナーを除外（v1 と同じ挙動） */
          if(mode === "export"){
            items = items.filter(it => it.image);
            if(!items.length) return "";
          }
          /*
            CSS Grid + repeat(N,minmax(0,1fr)):
            コンテナ幅に関係なく必ず N 列に収まる（v1 の教訓）。
            モバイルでは出力同梱のメディアクエリで 2 列に組み替わる。
          */
          let html = '<div style="padding:12px 8px;">'
            + '<div class="bgk-grid" style="display:grid;grid-template-columns:repeat(' + cols + ',minmax(0,1fr));gap:' + gap + 'px;">';
          items.forEach((it, i) => {
            const isFeature = feature && i === 0;
            const cellClass = isFeature ? ' class="bgk-grid-feature"' : "";
            const cellStyle = "position:relative;min-width:0;"
              + (isFeature ? "grid-column:1 / -1;" : "");
            const rank = showRank
              ? '<span style="position:absolute;top:0;left:0;background-color:' + rankColor(i + 1) + ';color:#ffffff;font-size:13px;font-weight:bold;padding:4px 10px;z-index:1;">' + (i + 1) + '位</span>'
              : "";
            const img = it.image
              ? imgTag(it.image, it.caption, ratio)
              : '<div style="background:#eef0f3;border:1px dashed #c7cdd6;border-radius:4px;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;color:#8b94a2;font-size:11px;">画像未設定</div>';
            const caption = it.caption
              ? '<p style="margin:6px 0 0 0;font-size:13px;line-height:1.6;color:inherit;">' + esc(it.caption) + '</p>'
              : "";
            const price = it.price
              ? '<p class="bgk-price" style="margin:4px 0 0 0;font-size:18px;font-weight:bold;color:#bf0000;">' + esc(it.price) + '</p>'
              : "";
            if(it.link){
              html += '<a href="' + esc(it.link) + '"' + cellClass + ' style="' + cellStyle + 'display:block;text-decoration:none;color:inherit;">' + rank + img + caption + price + '</a>';
            }else{
              html += '<div' + cellClass + ' style="' + cellStyle + '">' + rank + img + caption + price + '</div>';
            }
          });
          html += '</div></div>';
          return html;
        }
      },

      /* ---------- review ---------- */
      review: {
        label: "レビュー",
        defaults: {
          rating: "5",
          comment: "とても美味しかったです。リピートします！",
          author: "",
          width: "100"
        },
        fields: [
          { key:"rating", label:"評価", type:"select", group:"内容",
            options:[
              { value:"5", label:"★★★★★" },
              { value:"4", label:"★★★★☆" },
              { value:"3", label:"★★★☆☆" },
              { value:"2", label:"★★☆☆☆" },
              { value:"1", label:"★☆☆☆☆" }
            ]
          },
          { key:"comment", label:"コメント", type:"textarea", group:"内容" },
          { key:"author", label:"投稿者名", type:"text", group:"内容" },
          WIDTH_FIELD
        ],
        html(p){
          let v = parseInt(p.rating, 10);
          if(isNaN(v)) v = 5;
          v = Math.max(1, Math.min(5, v));
          const stars = "★".repeat(v) + "☆".repeat(5 - v);
          return '<div style="padding:12px 8px;">'
            + '<div style="color:#f5a623;font-size:18px;letter-spacing:2px;">' + stars + '</div>'
            + '<p style="margin:6px 0 0 0;line-height:1.8;color:inherit;">' + escBr(p.comment || "") + '</p>'
            + (p.author ? '<div style="margin-top:6px;font-size:12px;color:#888888;">' + esc(p.author) + ' さん</div>' : "")
            + '</div>';
        }
      },

      /* ---------- badge ---------- */
      badge: {
        label: "バッジ",
        defaults: {
          text: "期間限定",
          bgColor: "#bf0000",
          textColor: "#ffffff",
          fontSize: "13",
          align: "center",
          width: "100"
        },
        fields: [
          { key:"text", label:"バッジ文言", type:"text", group:"内容" },
          { key:"bgColor", label:"背景色", type:"color", group:"スタイル" },
          { key:"textColor", label:"文字色", type:"color", group:"スタイル" },
          { key:"fontSize", label:"文字サイズ (px)", type:"number", group:"スタイル", min:10, max:24 },
          ALIGN_FIELD,
          WIDTH_FIELD
        ],
        html(p){
          const fs = parseInt(p.fontSize, 10) || 13;
          return '<div style="padding:8px 8px;">'
            + '<span style="display:block;padding:10px 16px;background-color:' + esc(p.bgColor || "#bf0000") + ';color:' + esc(p.textColor || "#ffffff") + ';font-size:' + fs + 'px;font-weight:bold;letter-spacing:1px;line-height:1.4;border-radius:2px;text-align:' + (p.align || "center") + ';">' + esc(p.text || "期間限定") + '</span>'
            + '</div>';
        }
      },

      /* ---------- price ---------- */
      price: {
        label: "価格",
        defaults: {
          amount: "3,000",
          unit: "円",
          align: "center",
          width: "100"
        },
        fields: [
          { key:"amount", label:"金額", type:"text", group:"内容" },
          { key:"unit", label:"単位", type:"text", group:"内容" },
          ALIGN_FIELD,
          WIDTH_FIELD
        ],
        html(p){
          return '<div style="padding:8px 8px;text-align:' + (p.align || "center") + ';">'
            + '<span style="font-size:1.6em;font-weight:bold;">' + esc(p.amount || "") + '</span>' + esc(p.unit || "円")
            + '</div>';
        }
      },

      /* ---------- notice / shipping / producer ---------- */
      notice: sectionTextDef("注意事項", "注意事項", "※お届けまでにお時間をいただく場合があります。"),
      shipping: sectionTextDef("配送情報", "配送情報", "ヤマト運輸（冷蔵便）でお届けします。"),
      producer: sectionTextDef("生産者紹介", "生産者紹介", "生産者の紹介文をここに入力します。")

    };
  }

}

/* ============================================================
   CanvasController
   ============================================================ */

class CanvasController {

  constructor(ns){
    this.ns = ns;
    this.frame = document.getElementById("pageFrame");
    this.empty = document.getElementById("frameEmpty");

    this.body = document.createElement("div");
    this.body.className = "page-body";
    this.body.style.display = "none";
    this.frame.appendChild(this.body);

    ns.bus.on("doc:changed", detail => this.render(detail));
    ns.bus.on("doc:loaded", () => this.render({}));
    ns.bus.on("selection:changed", () => this.syncSelection());

    this.body.addEventListener("click", e => {
      /* キャンバス内のリンクは編集中は無効化する */
      if(e.target.closest("a")) e.preventDefault();
      const el = e.target.closest(".canvas-node");
      ns.model.select(el ? el.dataset.id : null);
    });
  }

  render(detail){
    const { model } = this.ns;
    const hasNodes = model.nodes.length > 0;

    this.empty.style.display = hasNodes ? "none" : "";
    this.body.style.display = hasNodes ? "" : "none";

    this.body.innerHTML = model.nodes.map(node => this.nodeHtml(node)).join("");

    if(detail && detail.addedId){
      const el = this.body.querySelector('[data-id="' + detail.addedId + '"]');
      if(el){
        el.classList.add("is-entering");
        el.addEventListener("animationend", () => el.classList.remove("is-entering"), { once:true });
      }
    }

    this.syncSelection();
  }

  nodeHtml(node){
    const { registry, util } = this.ns;
    const def = registry.get(node.type);
    const inner = def
      ? (def.html(node.props, { mode:"canvas" }) || this.placeholderHtml("空のコンポーネント"))
      : this.placeholderHtml("未対応コンポーネント: " + util.esc(node.type));
    const w = registry.widthOf(node.props);
    return '<div class="canvas-node" data-id="' + node.id + '" data-w="' + w + '" draggable="true" style="' + registry.wrapperStyle(node.props) + '">' + inner + '</div>';
  }

  placeholderHtml(message){
    return '<div style="margin:8px 8px;padding:24px 12px;border:2px dashed #c7cdd6;border-radius:6px;background:#f8f9fb;color:#8b94a2;font-size:12px;text-align:center;">' + message + '</div>';
  }

  syncSelection(){
    const selectedId = this.ns.model.selectedId;
    this.body.querySelectorAll(".canvas-node").forEach(el => {
      el.classList.toggle("is-selected", el.dataset.id === selectedId);
    });
  }

}

/* ============================================================
   DragDropManager
   ============================================================ */

class DragDropManager {

  constructor(ns){
    this.ns = ns;
    this.frame = document.getElementById("pageFrame");
    this.dropIndex = -1;
    this.dragKind = null;     /* "component" | "node" */
    this.dragPayload = null;  /* コンポーネント種別 or ノードID */

    /* パターンカード（data-pattern）はドラッグ対象外 */
    document.querySelectorAll(".component-card[data-component]").forEach(card => {
      card.addEventListener("dragstart", e => {
        this.dragKind = "component";
        this.dragPayload = card.dataset.component;
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData("text/plain", "betagaki:" + card.dataset.component);
      });
      card.addEventListener("dragend", () => this.clear());
    });

    const body = ns.canvas.body;

    body.addEventListener("dragstart", e => {
      const el = e.target.closest(".canvas-node");
      if(!el) return;
      this.dragKind = "node";
      this.dragPayload = el.dataset.id;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "betagaki-node:" + el.dataset.id);
      requestAnimationFrame(() => { el.style.opacity = ".4"; });
    });

    body.addEventListener("dragend", e => {
      const el = e.target.closest(".canvas-node");
      if(el) el.style.opacity = "";
      this.clear();
    });

    this.frame.addEventListener("dragover", e => {
      if(!this.dragKind) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = this.dragKind === "node" ? "move" : "copy";
      this.updateTarget(e.clientX, e.clientY);
    });

    this.frame.addEventListener("dragleave", e => {
      if(!this.frame.contains(e.relatedTarget)) this.clearHighlight();
    });

    this.frame.addEventListener("drop", e => {
      e.preventDefault();
      if(!this.dragKind) return;
      const index = this.computeIndex(e.clientX, e.clientY);
      const kind = this.dragKind;
      const payload = this.dragPayload;
      this.clear();
      if(kind === "component"){
        ns.model.addNode(payload, ns.registry.defaults(payload), index);
      }else{
        ns.model.moveNode(payload, index);
      }
    });
  }

  nodeEls(){
    return Array.from(this.ns.canvas.body.querySelectorAll(":scope > .canvas-node"));
  }

  /*
    挿入位置の判定は X と Y の両方で行う（v1 の教訓）:
    - ポインタがノードの行より上にあれば、そのノードの前に挿入
    - 同じ行内にあれば、ノード中心より左かどうかで前後を判定
    幅指定ノード（1/2, 1/3 など）が横に並ぶ flex-wrap 行で
    Y だけの判定だと挿入位置を誤るため。
  */
  computeIndex(x, y){
    const els = this.nodeEls();
    for(let i = 0; i < els.length; i++){
      const r = els[i].getBoundingClientRect();
      if(y < r.top) return i;
      if(y <= r.bottom && x < r.left + r.width / 2) return i;
    }
    return els.length;
  }

  updateTarget(x, y){
    const index = this.computeIndex(x, y);
    if(index === this.dropIndex) return;
    this.dropIndex = index;
    const els = this.nodeEls();
    els.forEach(el => el.classList.remove("is-drop-target"));
    if(index < els.length){
      els[index].classList.add("is-drop-target");
      this.frame.style.boxShadow = "";
    }else{
      /* 末尾への挿入・空キャンバスはフレーム全体をハイライト */
      this.frame.style.boxShadow = "inset 0 0 0 2px rgba(43,108,184,.5)";
    }
  }

  clearHighlight(){
    this.dropIndex = -1;
    this.nodeEls().forEach(el => el.classList.remove("is-drop-target"));
    this.frame.style.boxShadow = "";
  }

  clear(){
    this.dragKind = null;
    this.dragPayload = null;
    this.clearHighlight();
  }

}

/* ============================================================
   InspectorController
   ============================================================ */

class InspectorController {

  constructor(ns){
    this.ns = ns;
    this.body = document.getElementById("inspectorBody");

    ns.bus.on("selection:changed", () => this.rebuild());
    ns.bus.on("doc:loaded", () => this.rebuild());

    /*
      input = リアルタイム反映（履歴に積まない）
      change = 確定として履歴コミット
    */
    this.body.addEventListener("input", e => this.onField(e, false));
    this.body.addEventListener("change", e => this.onField(e, true));
    this.body.addEventListener("click", e => this.onClick(e));
  }

  rebuild(){
    const { model, registry, util } = this.ns;
    const node = model.getSelected();

    if(!node){
      this.body.innerHTML = '<div class="inspector-empty">コンポーネントを選択すると、<br>ここに編集項目が表示されます</div>';
      return;
    }

    const def = registry.get(node.type);
    if(!def){
      this.body.innerHTML = '<div class="inspector-empty">未対応コンポーネントです<br>(' + util.esc(node.type) + ')</div>';
      return;
    }

    let html = '<div class="inspector-type">'
      + '<span class="inspector-type-name">' + util.esc(def.label) + '</span>'
      + '<span style="font-size:11px;color:var(--text-3);">' + util.esc(node.type) + '</span>'
      + '</div>';

    let currentGroup = null;

    def.fields.forEach(field => {
      if(field.group !== currentGroup){
        if(currentGroup !== null) html += '</div>';
        html += '<div class="field-group"><div class="field-group-title">' + util.esc(field.group) + '</div>';
        currentGroup = field.group;
      }
      html += (field.type === "items")
        ? this.itemsHtml(node)
        : this.fieldHtml(field, node.props[field.key]);
    });

    if(currentGroup !== null) html += '</div>';

    html += this.responsiveHtml(node);

    html += '<div class="field-actions">'
      + '<button class="btn" data-act="dup">複製</button>'
      + '<button class="btn btn-danger" data-act="del">削除</button>'
      + '</div>';

    this.body.innerHTML = html;
  }

  /*
    パーツ単位のレスポンシブ上書き（v1 responsiveEditor を移植）。
    PC はキャンバスにも反映（インライン width）、タブレット/スマホは
    出力コードのメディアクエリ (.bgk-b-N) にのみ反映される。
  */
  responsiveHtml(node){
    const esc = this.ns.util.esc;
    const resp = (node.props.responsive && node.props.responsive.pc) || {};
    const row = (label, key, placeholder) =>
      '<div class="field-row">'
      + '<label class="field-label">' + label + '</label>'
      + '<input type="text" class="field-input" data-resp-key="' + key + '" value="' + esc(resp[key] || "") + '" placeholder="' + placeholder + '" spellcheck="false">'
      + '</div>';
    return '<div class="field-group">'
      + '<div class="field-group-title">レスポンシブ上書き</div>'
      + '<div class="field-row">'
      + '<label class="field-label">対象デバイス</label>'
      + '<select class="field-select" data-resp-mode>'
      + '<option value="pc">PC</option>'
      + '<option value="tablet">タブレット (1024px以下)</option>'
      + '<option value="mobile">スマホ (768px以下)</option>'
      + '</select>'
      + '</div>'
      + row("幅", "width", "例: 50%")
      + row("文字サイズ", "fontSize", "例: 16px")
      + row("余白", "padding", "例: 16px 24px")
      + '<p style="font-size:11px;color:var(--text-3);line-height:1.7;margin-top:6px;">空欄 = 上書きなし。タブレット/スマホの上書きは出力コードにのみ反映されます</p>'
      + '</div>';
  }

  respMode(){
    const sel = this.body.querySelector("[data-resp-mode]");
    return sel ? sel.value : "pc";
  }

  syncResponsiveInputs(){
    const node = this.ns.model.getSelected();
    if(!node) return;
    const data = (node.props.responsive && node.props.responsive[this.respMode()]) || {};
    this.body.querySelectorAll("[data-resp-key]").forEach(input => {
      input.value = data[input.dataset.respKey] || "";
    });
  }

  onResponsiveField(target, commit){
    const { model, util } = this.ns;
    const node = model.getSelected();
    if(!node) return;
    const responsive = util.clone(node.props.responsive || { pc:{}, tablet:{}, mobile:{} });
    const mode = this.respMode();
    if(!responsive[mode]) responsive[mode] = {};
    responsive[mode][target.dataset.respKey] = target.value;
    model.updateNode(node.id, { responsive }, { commit });
  }

  fieldHtml(field, value, itemIndex){
    const esc = this.ns.util.esc;
    const v = value == null ? "" : String(value);
    const itemAttr = (itemIndex != null) ? ' data-item="' + itemIndex + '"' : "";
    const dataAttr = ' data-key="' + field.key + '"' + itemAttr;

    let input = "";

    if(field.type === "textarea"){
      input = '<textarea class="field-textarea"' + dataAttr + '>' + esc(v) + '</textarea>';
    }else if(field.type === "select"){
      input = '<select class="field-select"' + dataAttr + '>'
        + field.options.map(o =>
            '<option value="' + esc(o.value) + '"' + (o.value === v ? " selected" : "") + '>' + esc(o.label) + '</option>'
          ).join("")
        + '</select>';
    }else if(field.type === "color"){
      input = '<input type="color" class="field-color"' + dataAttr + ' value="' + esc(v || "#333333") + '">';
    }else if(field.type === "number"){
      const min = field.min != null ? ' min="' + field.min + '"' : "";
      const max = field.max != null ? ' max="' + field.max + '"' : "";
      input = '<input type="number" class="field-input"' + dataAttr + min + max + ' value="' + esc(v) + '">';
    }else{
      input = '<input type="text" class="field-input"' + dataAttr + ' value="' + esc(v) + '" spellcheck="false">';
    }

    return '<div class="field-row">'
      + '<label class="field-label">' + esc(field.label) + '</label>'
      + input
      + '</div>';
  }

  /* バナーグリッドのアイテム増減 UI */
  itemsHtml(node){
    const items = node.props.items || [];
    let html = "";

    items.forEach((it, i) => {
      html += '<div class="item-card">'
        + '<div class="item-card-header">'
        + '<span class="item-card-title">バナー ' + (i + 1) + '</span>'
        + '<button class="item-remove" data-item-remove="' + i + '">削除</button>'
        + '</div>'
        + this.fieldHtml({ key:"image", label:"画像URL", type:"text" }, it.image, i)
        + this.fieldHtml({ key:"caption", label:"キャプション", type:"text" }, it.caption, i)
        + this.fieldHtml({ key:"price", label:"価格表示", type:"text" }, it.price, i)
        + this.fieldHtml({ key:"link", label:"リンクURL", type:"text" }, it.link, i)
        + '</div>';
    });

    html += '<button class="btn item-add" data-act="item-add">＋ バナーを追加</button>';

    return html;
  }

  onField(e, commit){
    const target = e.target;

    /* レスポンシブ上書き: デバイス切替は入力欄の再読込のみ */
    if(target.dataset && target.dataset.respMode !== undefined){
      this.syncResponsiveInputs();
      return;
    }

    /* レスポンシブ上書きの値入力 */
    if(target.dataset && target.dataset.respKey){
      this.onResponsiveField(target, commit);
      return;
    }

    const key = target.dataset && target.dataset.key;
    if(!key) return;

    const { model, util } = this.ns;
    const node = model.getSelected();
    if(!node) return;

    if(target.dataset.item != null){
      const items = util.clone(node.props.items || []);
      const i = parseInt(target.dataset.item, 10);
      if(!items[i]) return;
      items[i][key] = target.value;
      model.updateNode(node.id, { items }, { commit });
    }else{
      const patch = {};
      patch[key] = target.value;
      model.updateNode(node.id, patch, { commit });
    }
  }

  onClick(e){
    const btn = e.target.closest("button");
    if(!btn) return;

    const { model, util } = this.ns;
    const node = model.getSelected();
    if(!node) return;

    if(btn.dataset.act === "del"){
      model.removeNode(node.id);
      return;
    }

    if(btn.dataset.act === "dup"){
      model.duplicateNode(node.id);
      return;
    }

    if(btn.dataset.act === "item-add"){
      const items = util.clone(node.props.items || []);
      items.push({ image:"", caption:"", price:"", link:"" });
      model.updateNode(node.id, { items }, { commit:true });
      this.rebuild();
      return;
    }

    if(btn.dataset.itemRemove != null){
      const items = util.clone(node.props.items || []);
      items.splice(parseInt(btn.dataset.itemRemove, 10), 1);
      model.updateNode(node.id, { items }, { commit:true });
      this.rebuild();
    }
  }

}

/* ============================================================
   レイアウトパターン（v1 から移植）
   定番構成のノード群をワンクリックで末尾に挿入する。
   addNodes によって履歴上は 1 コミットになる。
   ============================================================ */

const PATTERNS = {

  ranking: {
    name: "ランキング",
    nodes: [
      { type:"heading", props:{ text:"人気ランキング", design:"band", accent:"#bf0000", fontSize:"24", align:"left" } },
      { type:"bannerGrid", props:{
        columns:"3", gap:"12", layout:"feature", showRank:"show", ratio:"auto",
        items:[
          { image:"", caption:"1位の商品名", price:"12,000円", link:"" },
          { image:"", caption:"2位の商品名", price:"10,000円", link:"" },
          { image:"", caption:"3位の商品名", price:"8,000円", link:"" }
        ]
      } }
    ]
  },

  bannerFeature: {
    name: "バナー特集",
    nodes: [
      { type:"heading", props:{ text:"おすすめ特集", design:"bar", accent:"#bf0000", fontSize:"24", align:"left" } },
      { type:"bannerGrid", props:{
        columns:"3", gap:"12", layout:"grid", showRank:"none", ratio:"auto",
        items:[
          { image:"", caption:"特集バナー1", price:"", link:"" },
          { image:"", caption:"特集バナー2", price:"", link:"" },
          { image:"", caption:"特集バナー3", price:"", link:"" }
        ]
      } }
    ]
  },

  mediaShowcase: {
    name: "商品紹介（左右）",
    nodes: [
      { type:"heading", props:{ text:"商品紹介", design:"underline", accent:"#bf0000", fontSize:"24", align:"left" } },
      { type:"media", props:{ image:"", imagePosition:"left", title:"商品名A", text:"商品の特徴やこだわりをここに入力します。", link:"" } },
      { type:"media", props:{ image:"", imagePosition:"right", title:"商品名B", text:"画像を左右交互に配置すると、リズムのある紙面になります。", link:"" } }
    ]
  }

};

/* ============================================================
   ライブラリパネル（クリック追加・検索）
   ============================================================ */

function wireLibrary(ns){
  const libraryBody = document.getElementById("libraryBody");

  libraryBody.addEventListener("click", e => {
    const card = e.target.closest(".component-card");
    if(!card) return;

    if(card.dataset.pattern){
      const pattern = PATTERNS[card.dataset.pattern];
      if(!pattern) return;
      ns.model.addNodes(pattern.nodes);
      ns.ui.toast("「" + pattern.name + "」レイアウトを追加しました");
      return;
    }

    const type = card.dataset.component;
    if(!type) return;
    ns.model.addNode(type, ns.registry.defaults(type));
  });

  const search = document.getElementById("librarySearch");
  search.addEventListener("input", () => {
    const term = search.value.trim().toLowerCase();
    document.querySelectorAll(".library-group").forEach(group => {
      let visibleCount = 0;
      group.querySelectorAll(".component-card").forEach(card => {
        const label = card.querySelector(".component-label").textContent.toLowerCase();
        const type = (card.dataset.component || "").toLowerCase();
        const visible = !term || label.indexOf(term) >= 0 || type.indexOf(term) >= 0;
        card.style.display = visible ? "" : "none";
        if(visible) visibleCount++;
      });
      group.style.display = visibleCount ? "" : "none";
    });
  });
}

/* ============================================================
   モジュール登録
   ============================================================ */

window.Betagaki.registerModule(function(ns){
  ns.registry = new ComponentRegistry(ns.util);
  ns.canvas = new CanvasController(ns);
  ns.dnd = new DragDropManager(ns);
  ns.inspector = new InspectorController(ns);
  wireLibrary(ns);
});

})();
