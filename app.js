// ============================================================
// 東西青果 FAX注文処理システム — Phase 1 prototype (v2)
// All data is mock. No real OCR. No inventory. No purchasing.
// ============================================================

// ---------- Date helpers ----------
function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${y}年${parseInt(m, 10)}月${parseInt(d, 10)}日`;
}
const TODAY = isoDate(0);
const TOMORROW = isoDate(1);

const UNITS = ["kg","箱","袋","個","本","束","玉","房","パック"];

// ---------- Status definitions ----------
const STATUS = {
  unchecked:        { label: "未確認",     cls: "badge-amber" },
  needs_correction: { label: "要修正",     cls: "badge-red"   },
  checked:          { label: "確認済み",   cls: "badge-green" },
  ready:            { label: "印刷待ち",   cls: "badge-blue"  }
};
function statusBadge(status, large = false) {
  const s = STATUS[status] || STATUS.unchecked;
  return `<span class="badge ${s.cls}${large ? " badge-lg" : ""}">${s.label}</span>`;
}

// ---------- Sample / mock orders (30件 — bulk data test, not real OCR) ----------
const DEL_A      = "2026-06-01";   // "6月1日配達分" — 24件
const DEL_B      = "2026-06-02";   // "6月2日配達分" — 6件
const ORDER_A    = "2026-05-31";
const ORDER_B    = "2026-06-01";

// Compact builder for sample orders so the bulk data stays readable.
function _ord(id, time, customer, contact, deliv, status, note, items, ocrNotice) {
  const o = {
    id, receivedAt: time, customer, contact,
    orderDate: deliv === DEL_A ? ORDER_A : ORDER_B,
    deliveryDate: deliv,
    status,
    items,
    note: note || ""
  };
  if (ocrNotice) o._ocrNotice = ocrNotice;
  return o;
}

const sampleOrders = [
  // ====== 6月1日配達分（24件）======
  _ord("FX-0001","08:14","山田青果店","山田 太郎 / 03-1234-5678",DEL_A,"needs_correction","朝便でお願いします",[
    {name:"キャベツ",qty:5,unit:"箱",notes:"Mサイズ"},
    {name:"大根",qty:20,unit:"本",notes:""},
    {name:"にんじん",qty:1,unit:"kg",notes:"L (数量要確認)"},
    {name:"玉ねぎ",qty:3,unit:"袋",notes:""},
    {name:"トマト",qty:2,unit:"箱",notes:"完熟"},
    {name:"じゃがいも",qty:8,unit:"kg",notes:""}
  ],"数量を1件、自動補正候補として表示しています。"),

  _ord("FX-0002","08:42","鈴木食堂","鈴木 花子 / 03-2345-6789",DEL_A,"unchecked","",[
    {name:"じゃがいも",qty:10,unit:"kg",notes:"男爵"},
    {name:"玉ねぎ",qty:5,unit:"kg",notes:""},
    {name:"きゅうり",qty:30,unit:"本",notes:""},
    {name:"ピーマン",qty:2,unit:"kg",notes:""},
    {name:"レタス",qty:8,unit:"玉",notes:""}
  ]),

  _ord("FX-0003","09:05","田中レストラン","田中 健 / 03-3456-7890",DEL_A,"needs_correction","ディナー仕込み用",[
    {name:"アスパラ",qty:5,unit:"束",notes:"国産"},
    {name:"レタス",qty:20,unit:"玉",notes:""},
    {name:"ミニトマト",qty:1,unit:"箱",notes:""},
    {name:"レモン",qty:2,unit:"kg",notes:"国産希望"},
    {name:"パプリカ",qty:3,unit:"kg",notes:"赤・黄ミックス"},
    {name:"ズッキーニ",qty:2,unit:"kg",notes:""},
    {name:"なす",qty:4,unit:"kg",notes:""}
  ],"1品目（バジル）が読み取れませんでした。手入力をお願いします。"),

  _ord("FX-0004","09:31","佐藤スーパー","佐藤 一郎 / 03-4567-8901",DEL_A,"unchecked","週末セール用",[
    {name:"りんご",qty:3,unit:"箱",notes:"ふじ"},
    {name:"みかん",qty:5,unit:"箱",notes:""},
    {name:"バナナ",qty:10,unit:"房",notes:""},
    {name:"いちご",qty:20,unit:"パック",notes:""},
    {name:"ぶどう",qty:2,unit:"箱",notes:"巨峰"}
  ]),

  _ord("FX-0005","10:08","高橋ホテル","高橋 雅子 / 03-5678-9012",DEL_A,"needs_correction","朝食ビュッフェ用",[
    {name:"アボカド",qty:30,unit:"個",notes:""},
    {name:"ほうれん草",qty:10,unit:"束",notes:""},
    {name:"ブロッコリー",qty:8,unit:"玉",notes:""},
    {name:"パセリ",qty:5,unit:"束",notes:""},
    {name:"生姜",qty:3,unit:"kg",notes:""},
    {name:"にんにく",qty:2,unit:"個",notes:"青森産 (単位要確認)"},
    {name:"セロリ",qty:4,unit:"束",notes:""}
  ],"単位の自動判定に自信がありません。"),

  _ord("FX-0006","10:47","伊藤居酒屋","伊藤 浩 / 03-6789-0123",DEL_A,"unchecked","",[
    {name:"枝豆",qty:5,unit:"袋",notes:""},
    {name:"おくら",qty:3,unit:"kg",notes:""},
    {name:"大葉",qty:10,unit:"束",notes:""},
    {name:"茗荷",qty:2,unit:"袋",notes:""},
    {name:"きゅうり",qty:15,unit:"本",notes:""}
  ]),

  _ord("FX-0007","11:15","渡辺給食センター","渡辺 正 / 03-7890-1234",DEL_A,"checked","学校給食",[
    {name:"にんじん",qty:50,unit:"kg",notes:""},
    {name:"じゃがいも",qty:80,unit:"kg",notes:""},
    {name:"玉ねぎ",qty:60,unit:"kg",notes:""},
    {name:"キャベツ",qty:30,unit:"箱",notes:""},
    {name:"きゅうり",qty:100,unit:"本",notes:""},
    {name:"トマト",qty:5,unit:"箱",notes:""},
    {name:"ピーマン",qty:8,unit:"kg",notes:""},
    {name:"ねぎ",qty:30,unit:"束",notes:""}
  ]),

  _ord("FX-0008","11:42","中村洋食堂","中村 久美 / 03-8901-2345",DEL_A,"unchecked","",[
    {name:"玉ねぎ",qty:8,unit:"kg",notes:""},
    {name:"にんじん",qty:5,unit:"kg",notes:""},
    {name:"じゃがいも",qty:12,unit:"kg",notes:"メークイン"},
    {name:"トマト",qty:3,unit:"箱",notes:""},
    {name:"きゅうり",qty:20,unit:"本",notes:""},
    {name:"レタス",qty:6,unit:"玉",notes:""},
    {name:"パセリ",qty:3,unit:"束",notes:"飾り用"}
  ]),

  _ord("FX-0009","12:03","小林ベーカリー","小林 健太 / 03-9012-3456",DEL_A,"unchecked","ジャム用",[
    {name:"いちご",qty:15,unit:"パック",notes:"完熟"},
    {name:"りんご",qty:2,unit:"箱",notes:"紅玉"},
    {name:"レモン",qty:1,unit:"kg",notes:""},
    {name:"ブルーベリー",qty:10,unit:"パック",notes:""},
    {name:"バナナ",qty:5,unit:"房",notes:"完熟"}
  ]),

  _ord("FX-0010","12:18","加藤焼肉店","加藤 大輔 / 03-0123-4567",DEL_A,"unchecked","BBQ用",[
    {name:"レタス",qty:15,unit:"玉",notes:""},
    {name:"玉ねぎ",qty:5,unit:"kg",notes:""},
    {name:"パプリカ",qty:3,unit:"kg",notes:""},
    {name:"ピーマン",qty:2,unit:"kg",notes:""},
    {name:"なす",qty:4,unit:"kg",notes:""},
    {name:"にんにく",qty:1,unit:"kg",notes:""}
  ]),

  _ord("FX-0011","12:45","吉田中華料理","吉田 翔 / 03-1234-7890",DEL_A,"needs_correction","春巻き仕込み用",[
    {name:"白菜",qty:6,unit:"玉",notes:""},
    {name:"もやし",qty:20,unit:"袋",notes:""},
    {name:"にら",qty:0,unit:"束",notes:"(数量不明)"},
    {name:"しいたけ",qty:5,unit:"パック",notes:""},
    {name:"たけのこ",qty:3,unit:"kg",notes:"水煮"},
    {name:"ねぎ",qty:8,unit:"束",notes:""},
    {name:"生姜",qty:2,unit:"kg",notes:""},
    {name:"にんにく",qty:1,unit:"kg",notes:""},
    {name:"きくらげ",qty:1,unit:"袋",notes:""}
  ],"1件の数量が読み取れませんでした。要確認。"),

  _ord("FX-0012","13:08","山本天ぷら処","山本 義男 / 03-2345-8901",DEL_A,"unchecked","",[
    {name:"なす",qty:5,unit:"kg",notes:""},
    {name:"かぼちゃ",qty:3,unit:"個",notes:""},
    {name:"さつまいも",qty:5,unit:"kg",notes:""},
    {name:"アスパラ",qty:8,unit:"束",notes:""},
    {name:"ししとう",qty:3,unit:"パック",notes:""}
  ]),

  _ord("FX-0013","13:34","松本和食店","松本 純子 / 03-3456-9012",DEL_A,"unchecked","旬の野菜中心",[
    {name:"大根",qty:10,unit:"本",notes:""},
    {name:"かぶ",qty:5,unit:"袋",notes:""},
    {name:"春菊",qty:6,unit:"束",notes:""},
    {name:"三つ葉",qty:4,unit:"束",notes:""},
    {name:"白菜",qty:3,unit:"玉",notes:""},
    {name:"ごぼう",qty:5,unit:"本",notes:""},
    {name:"レンコン",qty:2,unit:"kg",notes:""},
    {name:"里芋",qty:3,unit:"kg",notes:""}
  ]),

  _ord("FX-0014","13:55","井上カフェ","井上 美咲 / 03-4567-0123",DEL_A,"unchecked","パフェ用",[
    {name:"いちご",qty:10,unit:"パック",notes:""},
    {name:"バナナ",qty:5,unit:"房",notes:""},
    {name:"キウイ",qty:20,unit:"個",notes:""},
    {name:"ブルーベリー",qty:8,unit:"パック",notes:""},
    {name:"ミント",qty:3,unit:"束",notes:"飾り用"}
  ]),

  _ord("FX-0015","14:12","木村食堂","木村 健次 / 03-5678-1234",DEL_A,"needs_correction","",[
    {name:"キャベツ",qty:4,unit:"箱",notes:""},
    {name:"玉ねぎ",qty:6,unit:"kg",notes:""},
    {name:"にんじん",qty:5,unit:"kg",notes:""},
    {name:"（品名不明）",qty:5,unit:"kg",notes:"(品名要確認)"},
    {name:"じゃがいも",qty:10,unit:"kg",notes:""},
    {name:"きゅうり",qty:15,unit:"本",notes:""}
  ],"1品目の品名が読み取れませんでした。"),

  _ord("FX-0016","14:30","林寿司","林 正一 / 03-6789-2345",DEL_A,"unchecked","",[
    {name:"大葉",qty:15,unit:"束",notes:""},
    {name:"茗荷",qty:5,unit:"袋",notes:""},
    {name:"生姜",qty:2,unit:"kg",notes:"新生姜"},
    {name:"きゅうり",qty:20,unit:"本",notes:""},
    {name:"アボカド",qty:15,unit:"個",notes:""}
  ]),

  _ord("FX-0017","14:48","清水弁当","清水 涼子 / 03-7890-3456",DEL_A,"unchecked","お弁当大量仕込み",[
    {name:"キャベツ",qty:6,unit:"箱",notes:""},
    {name:"にんじん",qty:8,unit:"kg",notes:""},
    {name:"玉ねぎ",qty:10,unit:"kg",notes:""},
    {name:"じゃがいも",qty:15,unit:"kg",notes:""},
    {name:"ピーマン",qty:3,unit:"kg",notes:""},
    {name:"ブロッコリー",qty:6,unit:"玉",notes:""},
    {name:"トマト",qty:4,unit:"箱",notes:""},
    {name:"きゅうり",qty:30,unit:"本",notes:""},
    {name:"ほうれん草",qty:8,unit:"束",notes:""},
    {name:"レタス",qty:10,unit:"玉",notes:""}
  ]),

  _ord("FX-0018","15:02","山口居酒屋","山口 茂 / 03-8901-4567",DEL_A,"unchecked","",[
    {name:"枝豆",qty:8,unit:"袋",notes:""},
    {name:"おくら",qty:2,unit:"kg",notes:""},
    {name:"なす",qty:3,unit:"kg",notes:""},
    {name:"きゅうり",qty:20,unit:"本",notes:""},
    {name:"トマト",qty:2,unit:"箱",notes:""},
    {name:"ねぎ",qty:5,unit:"束",notes:""},
    {name:"大葉",qty:8,unit:"束",notes:""}
  ]),

  _ord("FX-0019","15:25","池田ホテル","池田 由香 / 03-9012-5678",DEL_A,"unchecked","朝食ビュッフェ + ランチコース",[
    {name:"ほうれん草",qty:8,unit:"束",notes:""},
    {name:"アボカド",qty:25,unit:"個",notes:""},
    {name:"ブロッコリー",qty:10,unit:"玉",notes:""},
    {name:"カリフラワー",qty:5,unit:"玉",notes:""},
    {name:"パセリ",qty:6,unit:"束",notes:""},
    {name:"バジル",qty:8,unit:"束",notes:""},
    {name:"ミニトマト",qty:5,unit:"パック",notes:""},
    {name:"ベビーリーフ",qty:10,unit:"パック",notes:""},
    {name:"トマト",qty:3,unit:"箱",notes:""},
    {name:"レモン",qty:2,unit:"kg",notes:""},
    {name:"ライム",qty:1,unit:"kg",notes:"カクテル用"}
  ]),

  _ord("FX-0020","15:48","前田レストラン","前田 隆 / 03-0123-6789",DEL_A,"unchecked","ディナー用",[
    {name:"アスパラ",qty:10,unit:"束",notes:"太め"},
    {name:"パプリカ",qty:4,unit:"kg",notes:""},
    {name:"ズッキーニ",qty:3,unit:"kg",notes:""},
    {name:"なす",qty:5,unit:"kg",notes:""},
    {name:"トマト",qty:3,unit:"箱",notes:""},
    {name:"レモン",qty:2,unit:"kg",notes:""},
    {name:"ハーブミックス",qty:5,unit:"パック",notes:""},
    {name:"きのこミックス",qty:8,unit:"パック",notes:""}
  ]),

  _ord("FX-0021","16:05","藤田スーパー","藤田 直樹 / 03-1234-9012",DEL_A,"unchecked","週末特売",[
    {name:"キャベツ",qty:8,unit:"箱",notes:"特売"},
    {name:"白菜",qty:10,unit:"玉",notes:""},
    {name:"大根",qty:30,unit:"本",notes:""},
    {name:"にんじん",qty:10,unit:"kg",notes:""},
    {name:"玉ねぎ",qty:15,unit:"kg",notes:""},
    {name:"バナナ",qty:20,unit:"房",notes:"目玉商品"},
    {name:"みかん",qty:8,unit:"箱",notes:""}
  ]),

  _ord("FX-0022","16:24","岡田旅館","岡田 良子 / 03-2345-0123",DEL_A,"checked","",[
    {name:"大根",qty:5,unit:"本",notes:""},
    {name:"白菜",qty:2,unit:"玉",notes:""},
    {name:"春菊",qty:3,unit:"束",notes:""},
    {name:"きのこ",qty:5,unit:"パック",notes:"鍋用"},
    {name:"豆腐用大豆",qty:1,unit:"kg",notes:""},
    {name:"ねぎ",qty:4,unit:"束",notes:""}
  ]),

  _ord("FX-0023","16:42","後藤洋食","後藤 三郎 / 03-3456-1234",DEL_A,"needs_correction","",[
    {name:"アスパラ",qty:5,unit:"kg",notes:"(単位要確認)"},
    {name:"ブロッコリー",qty:6,unit:"玉",notes:""},
    {name:"パプリカ",qty:3,unit:"kg",notes:""},
    {name:"トマト",qty:4,unit:"箱",notes:""},
    {name:"玉ねぎ",qty:8,unit:"kg",notes:""},
    {name:"にんじん",qty:5,unit:"kg",notes:""},
    {name:"レタス",qty:8,unit:"玉",notes:""}
  ],"アスパラの単位、kg/束の判定に自信がありません。"),

  _ord("FX-0024","17:01","長谷川幼稚園","長谷川 優子 / 03-4567-2345",DEL_A,"unchecked","アレルギー対応 / 卵不可",[
    {name:"にんじん",qty:5,unit:"kg",notes:""},
    {name:"玉ねぎ",qty:6,unit:"kg",notes:""},
    {name:"じゃがいも",qty:10,unit:"kg",notes:""},
    {name:"キャベツ",qty:3,unit:"箱",notes:""},
    {name:"トマト",qty:2,unit:"箱",notes:""},
    {name:"ブロッコリー",qty:4,unit:"玉",notes:""},
    {name:"バナナ",qty:6,unit:"房",notes:"おやつ用"},
    {name:"りんご",qty:2,unit:"箱",notes:"おやつ用"}
  ]),

  // ====== 6月2日配達分（6件）======
  _ord("FX-0025","09:10","石川小学校","石川 直人 / 03-5678-3456",DEL_B,"unchecked","給食用大量",[
    {name:"にんじん",qty:80,unit:"kg",notes:""},
    {name:"じゃがいも",qty:120,unit:"kg",notes:""},
    {name:"玉ねぎ",qty:90,unit:"kg",notes:""},
    {name:"キャベツ",qty:40,unit:"箱",notes:""},
    {name:"白菜",qty:20,unit:"玉",notes:""},
    {name:"きゅうり",qty:150,unit:"本",notes:""},
    {name:"トマト",qty:8,unit:"箱",notes:""},
    {name:"ピーマン",qty:12,unit:"kg",notes:""},
    {name:"ほうれん草",qty:30,unit:"束",notes:""},
    {name:"ねぎ",qty:50,unit:"束",notes:""},
    {name:"大根",qty:80,unit:"本",notes:""},
    {name:"バナナ",qty:30,unit:"房",notes:"デザート"}
  ]),

  _ord("FX-0026","09:35","西村病院","西村 みどり / 03-6789-4567",DEL_B,"needs_correction","アレルギー注意 / 加工指示は別紙",[
    {name:"にんじん",qty:30,unit:"kg",notes:""},
    {name:"じゃがいも",qty:40,unit:"kg",notes:""},
    {name:"玉ねぎ",qty:25,unit:"kg",notes:""},
    {name:"かぼちゃ",qty:10,unit:"kg",notes:""},
    {name:"ほうれん草",qty:15,unit:"束",notes:""},
    {name:"小松菜",qty:0,unit:"束",notes:"(数量不明)"},
    {name:"白菜",qty:5,unit:"玉",notes:""},
    {name:"トマト",qty:3,unit:"箱",notes:""},
    {name:"バナナ",qty:10,unit:"房",notes:""},
    {name:"りんご",qty:3,unit:"箱",notes:"すりおろし用"}
  ],"小松菜の数量が読み取れませんでした。"),

  _ord("FX-0027","10:00","阿部介護施設","阿部 政子 / 03-7890-5678",DEL_B,"unchecked","柔らか食材希望 / 大根・かぶ多め",[
    {name:"大根",qty:25,unit:"本",notes:""},
    {name:"かぶ",qty:8,unit:"袋",notes:""},
    {name:"にんじん",qty:8,unit:"kg",notes:""},
    {name:"じゃがいも",qty:12,unit:"kg",notes:""},
    {name:"かぼちゃ",qty:5,unit:"kg",notes:""},
    {name:"ほうれん草",qty:6,unit:"束",notes:""},
    {name:"豆腐用大豆",qty:1,unit:"kg",notes:""},
    {name:"バナナ",qty:6,unit:"房",notes:"完熟"}
  ]),

  _ord("FX-0028","10:30","河野定食屋","河野 昌弘 / 03-8901-6789",DEL_B,"unchecked","日替わり仕込み",[
    {name:"キャベツ",qty:3,unit:"箱",notes:""},
    {name:"玉ねぎ",qty:6,unit:"kg",notes:""},
    {name:"じゃがいも",qty:10,unit:"kg",notes:""},
    {name:"にんじん",qty:5,unit:"kg",notes:""},
    {name:"きゅうり",qty:20,unit:"本",notes:""},
    {name:"レタス",qty:6,unit:"玉",notes:""}
  ]),

  _ord("FX-0029","11:05","福田給食センター","福田 和也 / 03-9012-7890",DEL_B,"unchecked","企業給食 / 早朝便",[
    {name:"にんじん",qty:60,unit:"kg",notes:""},
    {name:"じゃがいも",qty:100,unit:"kg",notes:""},
    {name:"玉ねぎ",qty:80,unit:"kg",notes:""},
    {name:"キャベツ",qty:35,unit:"箱",notes:""},
    {name:"ピーマン",qty:10,unit:"kg",notes:""},
    {name:"ブロッコリー",qty:15,unit:"玉",notes:""},
    {name:"トマト",qty:6,unit:"箱",notes:""},
    {name:"きゅうり",qty:120,unit:"本",notes:""},
    {name:"レタス",qty:20,unit:"玉",notes:""},
    {name:"ほうれん草",qty:25,unit:"束",notes:""},
    {name:"白菜",qty:15,unit:"玉",notes:""},
    {name:"大根",qty:60,unit:"本",notes:""}
  ]),

  _ord("FX-0030","11:38","太田寿司","太田 健司 / 03-0123-8901",DEL_B,"checked","",[
    {name:"大葉",qty:20,unit:"束",notes:""},
    {name:"茗荷",qty:5,unit:"袋",notes:""},
    {name:"生姜",qty:3,unit:"kg",notes:"新生姜"},
    {name:"きゅうり",qty:15,unit:"本",notes:""},
    {name:"アボカド",qty:20,unit:"個",notes:"加州ロール用"}
  ])
];

// faxItems = original truthful fax content (frozen). For mock data this is
// a clone of items at construction time.
sampleOrders.forEach(o => {
  o.faxItems = JSON.parse(JSON.stringify(o.items));
});

let orders = JSON.parse(JSON.stringify(sampleOrders));

// ============================================================
// Bulk test data generator (for layout / print / PDF stress testing).
// Not real orders — used only to verify how the A3 sheet behaves at high
// volume. Switched in via the test-data buttons on the dashboard.
// ============================================================
const TEST_PRODUCTS = [
  ["キャベツ","箱"],["大根","本"],["にんじん","kg"],["玉ねぎ","kg"],
  ["じゃがいも","kg"],["トマト","箱"],["きゅうり","本"],["なす","kg"],
  ["ピーマン","kg"],["レタス","玉"],["ほうれん草","束"],["ねぎ","束"],
  ["白菜","玉"],["ブロッコリー","玉"],["カリフラワー","玉"],["ごぼう","本"],
  ["れんこん","kg"],["かぼちゃ","個"],["さつまいも","kg"],["とうもろこし","本"],
  ["枝豆","袋"],["おくら","kg"],["大葉","束"],["みょうが","袋"],
  ["生姜","kg"],["にんにく","kg"],["アスパラ","束"],["パプリカ","kg"],
  ["ズッキーニ","kg"],["バジル","束"],["パセリ","束"],["セロリ","束"],
  ["三つ葉","束"],["春菊","束"],["小松菜","束"],["かぶ","袋"],
  ["りんご","箱"],["みかん","箱"],["バナナ","房"],["いちご","パック"],
  ["ぶどう","箱"],["メロン","個"],["アボカド","個"],["レモン","kg"],
  ["キウイ","個"],["パイナップル","個"],["もやし","袋"]
];
const TEST_ITEM_NOTES = ["", "", "", "", "Mサイズ", "Lサイズ", "完熟", "国産", "業務用", "厳選"];
const TEST_SHORT_NOTES = ["朝便希望", "午後便", "週末分", "セール用", "急ぎ", "通常便", "特売予定", "夕方便"];
const TEST_LONG_NOTES = [
  "翌日午前中までの納品でお願いします。荷姿は段ボールでまとめてください。",
  "品質厳守 / サイズと色をできるだけ揃えてご納品お願いします。",
  "アレルギー対応のため別便で配送をお願いします。検品の上で出荷してください。"
];
const TEST_OCR_NOTICES = [
  "数量を1件、自動補正候補として表示しています。",
  "1品目が読み取れませんでした。手入力をお願いします。",
  "単位の自動判定に自信がありません。",
  "品名の判定に自信がありません。"
];

// Deterministic pseudo-random so the same count yields the same test data.
function _seededRng(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 9301 + 49297) & 0x7fffffff;
    return (s % 233280) / 233280;
  };
}

function generateTestOrders(count, deliveryDate = DEL_A) {
  const rnd = _seededRng(count * 7919);
  const orderDate = deliveryDate === DEL_A ? ORDER_A : ORDER_B;
  const out = [];

  for (let i = 1; i <= count; i++) {
    const idStr = String(i).padStart(3, "0");
    const minute  = (i * 7) % 60;
    const hour    = 8 + Math.min(8, Math.floor((i - 1) / 25));   // 08:xx 〜 16:xx
    const time    = `${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`;

    // Item count distribution: weighted to mimic real-world variation
    const r = rnd();
    let n;
    if (r < 0.10)      n = 1;
    else if (r < 0.25) n = 2;
    else if (r < 0.55) n = 3 + Math.floor(rnd() * 2);   // 3-4
    else if (r < 0.85) n = 5 + Math.floor(rnd() * 3);   // 5-7
    else               n = 8 + Math.floor(rnd() * 4);   // 8-11

    const items = [];
    const used = new Set();
    while (items.length < n) {
      const idx = Math.floor(rnd() * TEST_PRODUCTS.length);
      const [name, unit] = TEST_PRODUCTS[idx];
      if (used.has(name)) continue;
      used.add(name);
      items.push({
        name,
        qty: 1 + Math.floor(rnd() * 50),
        unit,
        notes: rnd() < 0.18 ? TEST_ITEM_NOTES[Math.floor(rnd() * TEST_ITEM_NOTES.length)] : ""
      });
    }

    // Block-level note: 30% short, 10% long, 60% empty
    let note = "";
    const nr = rnd();
    if (nr < 0.30)      note = TEST_SHORT_NOTES[Math.floor(rnd() * TEST_SHORT_NOTES.length)];
    else if (nr < 0.40) note = TEST_LONG_NOTES[Math.floor(rnd() * TEST_LONG_NOTES.length)];

    // Status: ~13% needs_correction (with item-level OCR issues), ~5% checked
    let status = "unchecked";
    let _ocrNotice;
    const sr = rnd();
    if (sr < 0.05) {
      status = "checked";
    } else if (sr < 0.18) {
      status = "needs_correction";
      _ocrNotice = TEST_OCR_NOTICES[Math.floor(rnd() * TEST_OCR_NOTICES.length)];
      const k = Math.floor(rnd() * items.length);
      const issue = Math.floor(rnd() * 3);
      if (issue === 0)      items[k] = { ...items[k], qty: 0, notes: "(数量不明)" };
      else if (issue === 1) items[k] = { ...items[k], name: "（品名不明）", notes: "(品名要確認)" };
      else                  items[k] = { ...items[k], notes: "(単位要確認)" };
    }

    const order = {
      id: `TEST-${idStr}`,
      receivedAt: time,
      customer: `テスト顧客${idStr}`,
      contact: `担当 / 03-0000-${idStr}`,
      orderDate, deliveryDate, status, items, note
    };
    if (_ocrNotice) order._ocrNotice = _ocrNotice;
    order.faxItems = JSON.parse(JSON.stringify(items));
    out.push(order);
  }
  return out;
}

let currentTestSize = 30;   // tracks which dataset the user has loaded

function setTestDataset(count) {
  if (count === 6) {
    orders = JSON.parse(JSON.stringify(sampleOrders.slice(0, 6)));
  } else if (count === 30) {
    orders = JSON.parse(JSON.stringify(sampleOrders));
  } else {
    orders = generateTestOrders(count, DEL_A);
  }
  currentTestSize = count;
  currentDeliveryFilter = "all";
  currentSplitId = orders[0] ? orders[0].id : null;
  currentOcrId   = orders[0] ? orders[0].id : null;
  faxView = { zoom: 1.0, rotation: 0, page: 1 };

  if (currentScreen === "dashboard") renderDashboard();
  else if (currentScreen === "split") renderSplit();
  else if (currentScreen === "print") renderPrint();
  else if (currentScreen === "ocr")   renderOcr();

  toast(`${count}件のデータに切り替えました`);
}

function renderColumnLayoutBar(container) {
  if (!container) return;
  const opts = [
    { val: 5, label: "5列版（読みやすさ優先）" },
    { val: 6, label: "6列版（より詰めて表示）" }
  ];
  container.innerHTML = opts.map(o =>
    `<button class="filter-btn ${currentColumnLayout === o.val ? "active" : ""}" data-col-layout="${o.val}">${escapeHtml(o.label)}</button>`
  ).join("");
  container.querySelectorAll("[data-col-layout]").forEach(b => {
    b.addEventListener("click", () => {
      const v = parseInt(b.dataset.colLayout, 10);
      if (v === currentColumnLayout) return;
      currentColumnLayout = v;
      if (currentScreen === "print") renderPrint();
      else if (currentScreen === "split") renderSplit();
      toast(`${v}列版に切り替えました`);
    });
  });
}

function renderTestDataBar(container) {
  if (!container) return;
  const sizes = [
    { count: 6,   label: "サンプル6件" },
    { count: 30,  label: "サンプル30件" },
    { count: 100, label: "100件テスト" },
    { count: 150, label: "150件テスト" },
    { count: 180, label: "180件テスト" }
  ];
  container.innerHTML = sizes.map(s =>
    `<button class="filter-btn ${currentTestSize === s.count ? "active" : ""}" data-test-count="${s.count}">${escapeHtml(s.label)}</button>`
  ).join("");
  container.querySelectorAll("[data-test-count]").forEach(b => {
    b.addEventListener("click", () => setTestDataset(parseInt(b.dataset.testCount, 10)));
  });
}

// ---------- App state ----------
let currentScreen = "dashboard";
let currentOcrId = orders[0].id;
let currentSplitId = orders[0].id;
let faxView = { zoom: 1.0, rotation: 0, page: 1 };
// OCR review screen has its own independent fax view state.
let ocrFaxView = { zoom: 1.0, rotation: 0, page: 1 };

// Delivery-date filter shared across screens. "all" = show every order;
// otherwise an ISO date string like "2026-06-01" filters to that delivery day.
let currentDeliveryFilter = "all";

// A3 column layout: 5 (default — readable) or 6 (denser). Switched via the
// toggle on the A3 print-preview screen.
let currentColumnLayout = 5;

// Cached A3 page count from the most recent paginateAndRender on the split
// screen. Used by updateSelectedFax so partial updates can refresh the
// "選択中：xxx ／ N件の顧客 / M ページ" header without re-running pagination.
let lastA3PageCount = 0;

function deliveryFilterValues() {
  // Unique sorted delivery dates present in current orders.
  const seen = new Set();
  for (const o of orders) if (o.deliveryDate) seen.add(o.deliveryDate);
  return [...seen].sort();
}

function filteredOrders() {
  if (currentDeliveryFilter === "all") return orders.slice();
  return orders.filter(o => o.deliveryDate === currentDeliveryFilter);
}

function setDeliveryFilter(value) {
  if (currentDeliveryFilter === value) return;
  currentDeliveryFilter = value;
  // Make sure the currently-selected fax in the split view is still visible
  // under the new filter; otherwise jump to the first matching one.
  const list = filteredOrders();
  if (list.length > 0 && !list.some(o => o.id === currentSplitId)) {
    currentSplitId = list[0].id;
  }
  if (list.length > 0 && !list.some(o => o.id === currentOcrId)) {
    currentOcrId = list[0].id;
  }
  // Re-render whichever screen the user is on.
  if (currentScreen === "dashboard") renderDashboard();
  else if (currentScreen === "ocr") renderOcr();
  else if (currentScreen === "split") renderSplit();
  else if (currentScreen === "print") renderPrint();
}

function renderDeliveryFilterBar(container) {
  if (!container) return;
  const values = deliveryFilterValues();
  const total = orders.length;
  const counts = { all: total };
  for (const v of values) counts[v] = orders.filter(o => o.deliveryDate === v).length;

  const chips = [
    { value: "all", label: `すべて (${counts.all})` },
    ...values.map(v => ({ value: v, label: `${deliveryTitle(v)} (${counts[v]})` }))
  ];

  container.innerHTML = chips.map(c =>
    `<button class="filter-btn ${currentDeliveryFilter === c.value ? "active" : ""}" data-delivery-filter="${escapeAttr(c.value)}">${escapeHtml(c.label)}</button>`
  ).join("");
  container.querySelectorAll("[data-delivery-filter]").forEach(b => {
    b.addEventListener("click", () => setDeliveryFilter(b.dataset.deliveryFilter));
  });
}
// null → auto "fit to pane height" (so A3 never scrolls vertically; only horizontal scroll
// is possible). A number means the user set a manual zoom via the +/- buttons.
let a3SplitZoom = null;

const ITEMS_PER_FAX_PAGE = 6;
function getFaxPageCount(order) {
  return Math.max(1, Math.ceil(order.faxItems.length / ITEMS_PER_FAX_PAGE));
}

// ---------- Toast ----------
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 1800);
}

// ---------- Navigation ----------
function showScreen(name) {
  currentScreen = name;
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === `screen-${name}`));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.screen === name));
  if (name === "dashboard") renderDashboard();
  if (name === "ocr") renderOcr();
  if (name === "split") renderSplit();
  if (name === "print") renderPrint();
  window.scrollTo(0, 0);
}
document.querySelectorAll(".nav-btn").forEach(btn =>
  btn.addEventListener("click", () => showScreen(btn.dataset.screen)));
document.body.addEventListener("click", (e) => {
  const t = e.target.closest("[data-goto]");
  if (t) showScreen(t.dataset.goto);
});

// ---------- Helpers ----------
function escapeAttr(s) { return String(s == null ? "" : s).replace(/"/g, "&quot;"); }
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ============================================================
// Dashboard
// ============================================================
function renderDashboard() {
  renderTestDataBar(document.getElementById("testDataBar"));
  renderDeliveryFilterBar(document.getElementById("dashboardFilterBar"));

  const list = filteredOrders();
  const total      = list.length;
  const needs      = list.filter(o => o.status === "needs_correction").length;
  const unchecked  = list.filter(o => o.status === "unchecked").length;
  const checked    = list.filter(o => o.status === "checked" || o.status === "ready").length;
  const itemsTotal = list.reduce((s, o) => s + o.items.length, 0);

  document.getElementById("statTotal").textContent   = total;
  document.getElementById("statNeeds").textContent   = needs;
  document.getElementById("statPending").textContent = unchecked;
  document.getElementById("statChecked").textContent = checked;
  document.getElementById("statItems").textContent   = itemsTotal;

  // 要確認カード — only render if there are needs-correction orders
  const needsCard = document.getElementById("needsReviewCard");
  const needsBody = document.getElementById("needsReviewList");
  const needsList = list.filter(o => o.status === "needs_correction");
  if (needsList.length > 0) {
    needsCard.style.display = "";
    needsBody.innerHTML = needsList.map(o => `
      <tr>
        <td>${o.receivedAt}</td>
        <td><strong>${escapeHtml(o.customer)}</strong></td>
        <td>${o.items.length} 品目</td>
        <td>${fmtDate(o.deliveryDate)}</td>
        <td style="color:#b22424;font-weight:600">${escapeHtml(o._ocrNotice || "要確認")}</td>
        <td>
          <button class="btn btn-warning" data-open-ocr="${o.id}">編集</button>
          <button class="btn btn-secondary" data-open-split="${o.id}">突合せ</button>
        </td>`).join("");
  } else {
    needsCard.style.display = "none";
  }

  const tbody = document.getElementById("dashboardList");
  tbody.innerHTML = "";
  list.forEach(o => {
    const tr = document.createElement("tr");
    if (o.status === "needs_correction") tr.classList.add("row-needs");
    tr.innerHTML = `
      <td>${o.receivedAt}</td>
      <td><strong>${escapeHtml(o.customer)}</strong></td>
      <td>${o.items.length} 品目</td>
      <td>${fmtDate(o.deliveryDate)}</td>
      <td>${statusBadge(o.status)}</td>
      <td>
        <button class="btn btn-secondary" data-open-ocr="${o.id}">編集</button>
        <button class="btn btn-secondary" data-open-split="${o.id}">突合せ</button>
      </td>`;
    tbody.appendChild(tr);
  });

  // Wire the per-row buttons across both tables (needsReview + main list)
  document.querySelectorAll("#dashboardList [data-open-ocr], #needsReviewList [data-open-ocr]").forEach(b =>
    b.addEventListener("click", () => { currentOcrId = b.dataset.openOcr; showScreen("ocr"); }));
  document.querySelectorAll("#dashboardList [data-open-split], #needsReviewList [data-open-split]").forEach(b =>
    b.addEventListener("click", () => { currentSplitId = b.dataset.openSplit; showScreen("split"); }));
}

// ============================================================
// Upload
// ============================================================
const uploadZone = document.getElementById("uploadZone");
const fileInput = document.getElementById("fileInput");
const uploadedListCard = document.getElementById("uploadedListCard");
const uploadedList = document.getElementById("uploadedList");
let uploadedFiles = [];

document.getElementById("selectFileBtn").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
["dragenter", "dragover"].forEach(ev =>
  uploadZone.addEventListener(ev, (e) => { e.preventDefault(); uploadZone.classList.add("drag"); }));
["dragleave", "drop"].forEach(ev =>
  uploadZone.addEventListener(ev, (e) => { e.preventDefault(); uploadZone.classList.remove("drag"); }));
uploadZone.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));

function handleFiles(fileList) {
  for (const f of fileList) uploadedFiles.push({ name: f.name, size: f.size });
  renderUploadedList();
}
function renderUploadedList() {
  if (uploadedFiles.length === 0) { uploadedListCard.style.display = "none"; return; }
  uploadedListCard.style.display = "";
  uploadedList.innerHTML = "";
  uploadedFiles.forEach((f, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="file-name"><span class="file-icon">📄</span><strong>${escapeHtml(f.name)}</strong>
        <span class="muted">（${(f.size/1024).toFixed(1)} KB）</span></span>
      <button class="btn btn-secondary" data-rm="${i}">削除</button>`;
    uploadedList.appendChild(li);
  });
  uploadedList.querySelectorAll("[data-rm]").forEach(b =>
    b.addEventListener("click", () => { uploadedFiles.splice(+b.dataset.rm, 1); renderUploadedList(); }));
}
document.getElementById("runOcrBtn").addEventListener("click", () => {
  if (uploadedFiles.length === 0) { toast("ファイルが選択されていません"); return; }
  toast(`模擬OCRを実行しました（${uploadedFiles.length}件）`);
  uploadedFiles = [];
  renderUploadedList();
  setTimeout(() => showScreen("ocr"), 600);
});

// ============================================================
// OCR review
// ============================================================
function renderOcr() {
  const sel = document.getElementById("ocrOrderSelect");
  sel.innerHTML = "";
  orders.forEach(o => {
    const opt = document.createElement("option");
    const flag = o.status === "needs_correction" ? "⚠ " : "";
    opt.value = o.id;
    opt.textContent = `${flag}${o.id} ／ ${o.customer} （${o.items.length}品目 / ${STATUS[o.status].label}）`;
    sel.appendChild(opt);
  });
  sel.value = currentOcrId;
  sel.onchange = () => {
    currentOcrId = sel.value;
    ocrFaxView = { zoom: 1.0, rotation: 0, page: 1 };
    renderOcr();
  };

  const order = orders.find(o => o.id === currentOcrId);
  if (!order) return;

  // Form fields
  document.getElementById("editCustomer").value = order.customer;
  document.getElementById("editOrderDate").value = order.orderDate;
  document.getElementById("editDeliveryDate").value = order.deliveryDate;

  // Status badge
  const badge = document.getElementById("ocrStatusBadge");
  const s = STATUS[order.status] || STATUS.unchecked;
  badge.className = `badge badge-lg ${s.cls}`;
  badge.textContent = s.label;
  if (order._ocrNotice) badge.title = order._ocrNotice;
  else badge.removeAttribute("title");

  // 要確認理由 banner — derives reasons from _ocrNotice + item-level flags
  const banner = document.getElementById("ocrNoticeBanner");
  const reasons = collectReviewReasons(order);
  if (reasons.length > 0) {
    banner.style.display = "";
    document.getElementById("ocrNoticeText").innerHTML = reasons.map(escapeHtml).join("　/　");
  } else {
    banner.style.display = "none";
  }

  // Left FAX preview
  document.getElementById("ocrFaxHeadInfo").textContent =
    `${order.id} ／ ${order.customer} ／ 受信 ${order.receivedAt}`;
  renderOcrFaxCanvas(order);

  // Item table
  const tbody = document.querySelector("#ocrItemTable tbody");
  tbody.innerHTML = "";
  order.items.forEach((it, idx) => tbody.appendChild(makeOcrRow(order, it, idx)));

  // Revision history list
  renderRevisionHistory(order);
}

// Derive a list of human-readable "要確認理由" strings from the order's
// OCR notice + per-item issue flags. Used by the banner at the top.
function collectReviewReasons(order) {
  const reasons = [];
  if (order._ocrNotice) reasons.push(order._ocrNotice);
  if (!order.customer || !order.customer.trim()) reasons.push("顧客名不明");
  if (!order.deliveryDate) reasons.push("配達日不明");
  for (const it of (order.items || [])) {
    if (it.qty === 0 || it.qty == null || isNaN(it.qty)) {
      if (!reasons.some(r => r.includes("数量"))) reasons.push("数量不明の品目あり");
    }
    if (!it.name || !it.name.trim() || it.name.includes("品名不明") || it.name.includes("読取不可")) {
      if (!reasons.some(r => r.includes("品名") || r.includes("商品名"))) reasons.push("品名不明の品目あり");
    }
    if (it.notes && (it.notes.includes("単位要確認") || it.notes.includes("単位不明"))) {
      if (!reasons.some(r => r.includes("単位"))) reasons.push("単位要確認の品目あり");
    }
  }
  return reasons;
}

function renderOcrFaxCanvas(order) {
  const canvas = document.getElementById("ocrFaxCanvas");
  if (!canvas) return;
  const totalPages = getFaxPageCount(order);
  if (ocrFaxView.page > totalPages) ocrFaxView.page = totalPages;
  canvas.innerHTML = makeFaxSvg(order, ocrFaxView.page);
  canvas.style.transform = `rotate(${ocrFaxView.rotation}deg) scale(${ocrFaxView.zoom})`;
  document.getElementById("ocrFaxZoomLabel").textContent = `${Math.round(ocrFaxView.zoom * 100)}%`;
  document.getElementById("ocrFaxPageLabel").textContent = `P.${ocrFaxView.page} / ${totalPages}`;
  document.getElementById("ocrFaxPrev").disabled = ocrFaxView.page <= 1;
  document.getElementById("ocrFaxNext").disabled = ocrFaxView.page >= totalPages;
}

// OCR FAX toolbar — wired once at load time
document.getElementById("ocrFaxZoomIn").addEventListener("click", () => {
  ocrFaxView.zoom = Math.min(3.0, +(ocrFaxView.zoom + 0.25).toFixed(2));
  const o = orders.find(o => o.id === currentOcrId);
  if (o) renderOcrFaxCanvas(o);
});
document.getElementById("ocrFaxZoomOut").addEventListener("click", () => {
  ocrFaxView.zoom = Math.max(0.5, +(ocrFaxView.zoom - 0.25).toFixed(2));
  const o = orders.find(o => o.id === currentOcrId);
  if (o) renderOcrFaxCanvas(o);
});
document.getElementById("ocrFaxRotate").addEventListener("click", () => {
  ocrFaxView.rotation = (ocrFaxView.rotation + 90) % 360;
  const o = orders.find(o => o.id === currentOcrId);
  if (o) renderOcrFaxCanvas(o);
});
document.getElementById("ocrFaxFit").addEventListener("click", () => {
  ocrFaxView = { zoom: 1.0, rotation: 0, page: ocrFaxView.page };
  const o = orders.find(o => o.id === currentOcrId);
  if (o) renderOcrFaxCanvas(o);
});
document.getElementById("ocrFaxPrev").addEventListener("click", () => {
  if (ocrFaxView.page > 1) {
    ocrFaxView.page--;
    const o = orders.find(o => o.id === currentOcrId);
    if (o) renderOcrFaxCanvas(o);
  }
});
document.getElementById("ocrFaxNext").addEventListener("click", () => {
  const o = orders.find(o => o.id === currentOcrId);
  if (!o) return;
  if (ocrFaxView.page < getFaxPageCount(o)) {
    ocrFaxView.page++;
    renderOcrFaxCanvas(o);
  }
});

// Revision history — one entry per save.
// Phase 1: in-memory only. Designed to be Phase-2 ready (timestamp / user / reason).
function pushRevision(order, reason) {
  if (!order.revisions) order.revisions = [];
  order.revisions.push({
    at: new Date().toISOString(),
    by: "staff",                       // Phase 2: real user identity
    reason: reason || (order._ocrNotice || "ユーザー編集"),
    snapshot: {
      customer: order.customer,
      orderDate: order.orderDate,
      deliveryDate: order.deliveryDate,
      status: order.status,
      items: JSON.parse(JSON.stringify(order.items || []))
    }
  });
}

function renderRevisionHistory(order) {
  const card = document.getElementById("ocrHistoryCard");
  const list = document.getElementById("ocrHistoryList");
  const revs = order.revisions || [];
  if (revs.length === 0) {
    card.style.display = "none";
    return;
  }
  card.style.display = "";
  list.innerHTML = revs.slice().reverse().map(r => {
    const d = new Date(r.at);
    const time = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    return `<li>
      <span class="hist-time">${escapeHtml(time)}</span>
      <span class="hist-by">${escapeHtml(r.by || "")}</span>
      <span class="hist-reason">${escapeHtml(r.reason || "")}</span>
    </li>`;
  }).join("");
}
function makeOcrRow(order, it, idx) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" data-f="name"  value="${escapeAttr(it.name)}"></td>
    <td><input type="number" data-f="qty" value="${it.qty}" min="0" step="0.1"></td>
    <td>
      <select data-f="unit">
        ${UNITS.map(u => `<option value="${u}" ${u===it.unit?"selected":""}>${u}</option>`).join("")}
      </select>
    </td>
    <td><input type="text" data-f="notes" value="${escapeAttr(it.notes)}"></td>
    <td><button class="row-delete-btn" data-del="${idx}">削除</button></td>`;
  tr.querySelectorAll("[data-f]").forEach(inp =>
    inp.addEventListener("input", () => collectOcrFromForm()));
  tr.querySelector("[data-del]").addEventListener("click", () => {
    order.items.splice(idx, 1);
    renderOcr();
  });
  return tr;
}
function collectOcrFromForm() {
  const order = orders.find(o => o.id === currentOcrId);
  order.customer     = document.getElementById("editCustomer").value;
  order.orderDate    = document.getElementById("editOrderDate").value;
  order.deliveryDate = document.getElementById("editDeliveryDate").value;
  const rows = document.querySelectorAll("#ocrItemTable tbody tr");
  order.items = Array.from(rows).map(r => ({
    name:  r.querySelector('[data-f="name"]').value,
    qty:   parseFloat(r.querySelector('[data-f="qty"]').value) || 0,
    unit:  r.querySelector('[data-f="unit"]').value,
    notes: r.querySelector('[data-f="notes"]').value
  }));
}
document.getElementById("addItemBtn").addEventListener("click", () => {
  const order = orders.find(o => o.id === currentOcrId);
  order.items.push({ name: "", qty: 0, unit: "kg", notes: "" });
  renderOcr();
});
document.getElementById("saveOcrBtn").addEventListener("click", () => {
  collectOcrFromForm();
  const order = orders.find(o => o.id === currentOcrId);
  pushRevision(order, "修正保存");
  toast("修正を保存しました");
  renderOcr();
});
document.getElementById("markCheckedBtn").addEventListener("click", () => {
  collectOcrFromForm();
  const order = orders.find(o => o.id === currentOcrId);
  order.status = "checked";
  pushRevision(order, "確認済みに変更");
  toast("確認済みにしました");
  renderOcr();
});

// ============================================================
// Split-screen confirmation
// ============================================================
function renderSplit() {
  renderDeliveryFilterBar(document.getElementById("splitFilterBar"));

  const visibleOrders = filteredOrders();
  if (visibleOrders.length === 0) {
    // Filter excludes everything — guard
    document.getElementById("splitOrderSelect").innerHTML = "";
    document.getElementById("splitA3Pages").innerHTML =
      `<div style="padding:20px;color:#5a6a80">該当する納品日のFAXがありません。</div>`;
    return;
  }
  if (!visibleOrders.some(o => o.id === currentSplitId)) {
    currentSplitId = visibleOrders[0].id;
  }

  // Build select options (filtered)
  const sel = document.getElementById("splitOrderSelect");
  sel.innerHTML = "";
  visibleOrders.forEach(o => {
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = `${o.id} ／ ${o.customer} （${STATUS[o.status].label}）`;
    sel.appendChild(opt);
  });
  sel.value = currentSplitId;
  sel.onchange = () => {
    currentSplitId = sel.value;
    faxView = { zoom: 1.0, rotation: 0, page: 1 };
    renderSplit();
  };

  const order = visibleOrders.find(o => o.id === currentSplitId);

  // Pane head info — position within the FILTERED list so the count matches the dropdown.
  const faxIndex = visibleOrders.findIndex(o => o.id === currentSplitId);
  document.getElementById("faxHeadInfo").textContent =
    `表示中FAX：${order.id} ／ ${order.customer} ／ 受信 ${order.receivedAt}　（${faxIndex + 1}/${visibleOrders.length}）`;
  const a3HeadInfo = document.getElementById("a3HeadInfo");

  // Toolbar status badge
  const sb = document.getElementById("splitStatusBadge");
  const s = STATUS[order.status] || STATUS.unchecked;
  sb.className = `badge badge-lg ${s.cls}`;
  sb.textContent = s.label;
  if (order._ocrNotice) sb.title = order._ocrNotice;

  // Render fax (left)
  renderFaxCanvas(order);

  // Render A3 pages (right) — pack ALL orders, editable
  const container = document.getElementById("splitA3Pages");
  const pageCount = paginateAndRender(visibleOrders, container, {
    clickable: true,
    selectedId: currentSplitId,
    primaryDate: order && order.deliveryDate    // title follows the currently selected fax
  });
  a3HeadInfo.textContent =
    `選択中：${order.customer}　・　${visibleOrders.length} 件の顧客 / ${pageCount} ページ`;
  // Cache for partial updates (updateSelectedFax) so we don't lose the page count
  lastA3PageCount = pageCount;

  applyA3Zoom();

  // Scroll selected customer block into view
  setTimeout(() => {
    const target = container.querySelector(`.customer-block[data-order-id="${currentSplitId}"]`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 50);
}

// ---------- Fax canvas (zoom / rotate / page) ----------
function renderFaxCanvas(order) {
  const canvas = document.getElementById("faxCanvas");
  const totalPages = getFaxPageCount(order);
  if (faxView.page > totalPages) faxView.page = totalPages;
  canvas.innerHTML = makeFaxSvg(order, faxView.page);
  canvas.style.transform = `rotate(${faxView.rotation}deg) scale(${faxView.zoom})`;
  document.getElementById("faxZoomLabel").textContent = `${Math.round(faxView.zoom * 100)}%`;
  document.getElementById("faxPageLabel").textContent = `P.${faxView.page} / ${totalPages}`;
  // Disable only at the very first/last page of the very first/last fax in
  // the currently filtered list — so prev/next walks through the filter set.
  const list = filteredOrders();
  const isFirstFax = list.length > 0 && currentSplitId === list[0].id;
  const isLastFax  = list.length > 0 && currentSplitId === list[list.length - 1].id;
  document.getElementById("faxPrev").disabled = (faxView.page <= 1) && isFirstFax;
  document.getElementById("faxNext").disabled = (faxView.page >= totalPages) && isLastFax;
}

document.getElementById("faxZoomIn").addEventListener("click", () => {
  faxView.zoom = Math.min(3.0, +(faxView.zoom + 0.25).toFixed(2));
  renderFaxCanvas(currentOrder());
});
document.getElementById("faxZoomOut").addEventListener("click", () => {
  faxView.zoom = Math.max(0.5, +(faxView.zoom - 0.25).toFixed(2));
  renderFaxCanvas(currentOrder());
});
document.getElementById("faxRotate").addEventListener("click", () => {
  faxView.rotation = (faxView.rotation + 90) % 360;
  renderFaxCanvas(currentOrder());
});
document.getElementById("faxFit").addEventListener("click", () => {
  faxView = { zoom: 1.0, rotation: 0, page: faxView.page };
  renderFaxCanvas(currentOrder());
});
// Prev/Next walk through every page of every fax: when you reach the last page
// of the current fax, the next click jumps to page 1 of the next fax (and vice versa).
// This treats the day's uploaded faxes as one continuous multi-page document.
function navFaxPage(direction) {
  const list = filteredOrders();
  const order = currentOrder();
  if (!order) return;
  const total = getFaxPageCount(order);
  const idx = list.findIndex(o => o.id === currentSplitId);
  if (direction === 1) {
    if (faxView.page < total) {
      faxView.page++;
      renderFaxCanvas(currentOrder());
    } else if (idx < list.length - 1) {
      currentSplitId = list[idx + 1].id;
      faxView = { zoom: 1.0, rotation: 0, page: 1 };
      renderSplit();
    }
  } else {
    if (faxView.page > 1) {
      faxView.page--;
      renderFaxCanvas(currentOrder());
    } else if (idx > 0) {
      const prev = list[idx - 1];
      currentSplitId = prev.id;
      faxView = { zoom: 1.0, rotation: 0, page: getFaxPageCount(prev) };
      renderSplit();
    }
  }
}
document.getElementById("faxPrev").addEventListener("click", () => navFaxPage(-1));
document.getElementById("faxNext").addEventListener("click", () => navFaxPage(1));
function currentOrder() { return orders.find(o => o.id === currentSplitId); }

// ---------- A3 right-pane zoom ----------
// Compute the zoom factor that makes the A3 page exactly fit the
// available height of the .a3-pane (so the user never gets a vertical scrollbar).
function computeFitZoom() {
  const pane = document.querySelector("#screen-split .a3-pane");
  if (!pane) return 0.85;
  const cs = getComputedStyle(pane);
  const padT = parseFloat(cs.paddingTop) || 0;
  const padB = parseFloat(cs.paddingBottom) || 0;
  const paneH = pane.clientHeight - padT - padB;
  if (paneH <= 0) return 0.85;
  // Measure 297mm in physical pixels (browser-dependent)
  const ruler = document.createElement("div");
  ruler.style.cssText = "position:absolute;left:-9999px;width:1mm;height:297mm;";
  document.body.appendChild(ruler);
  const a3H = ruler.getBoundingClientRect().height;
  document.body.removeChild(ruler);
  return Math.max(0.35, Math.min(1.5, paneH / a3H));
}

function applyA3Zoom() {
  const wrap = document.getElementById("splitA3Pages");
  if (!wrap) return;
  const zoom = (a3SplitZoom == null) ? computeFitZoom() : a3SplitZoom;
  wrap.style.zoom = zoom;
  document.getElementById("a3ZoomLabel").textContent = `${Math.round(zoom * 100)}%`;
}

document.getElementById("a3ZoomIn").addEventListener("click", () => {
  const cur = (a3SplitZoom == null) ? computeFitZoom() : a3SplitZoom;
  a3SplitZoom = Math.min(1.5, +(cur + 0.05).toFixed(2));
  applyA3Zoom();
});
document.getElementById("a3ZoomOut").addEventListener("click", () => {
  const cur = (a3SplitZoom == null) ? computeFitZoom() : a3SplitZoom;
  a3SplitZoom = Math.max(0.35, +(cur - 0.05).toFixed(2));
  applyA3Zoom();
});

// Re-fit when the window resizes, but only while in auto mode so we don't
// override a manual zoom the user has dialed in.
window.addEventListener("resize", () => {
  if (currentScreen === "split" && a3SplitZoom == null) applyA3Zoom();
});

// ---------- Status / save buttons on split toolbar ----------
function setStatus(orderId, status, msg) {
  const o = orders.find(x => x.id === orderId);
  o.status = status;
  toast(msg);
  renderSplit();
}
// Explicit edit button — opens the modal for the currently selected customer,
// no matter how many times it's clicked. Useful when staff have already chosen
// a customer via A3 selection and just want to start editing.
document.getElementById("splitEditBtn").addEventListener("click", () => {
  if (currentSplitId) openEditModal(currentSplitId);
  else toast("先にA3で顧客ブロックを選択してください");
});

document.getElementById("splitSaveBtn").addEventListener("click", () => toast("修正を保存しました"));
document.getElementById("splitNeedsCorrBtn").addEventListener("click", () =>
  setStatus(currentSplitId, "needs_correction", "「要修正」に設定しました"));
document.getElementById("splitCheckedBtn").addEventListener("click", () =>
  setStatus(currentSplitId, "checked", "「確認済み」にしました"));
document.getElementById("splitReadyBtn").addEventListener("click", () =>
  setStatus(currentSplitId, "ready", "「印刷待ち」にしました"));
document.getElementById("splitPrintBtn").addEventListener("click", () => {
  showScreen("print");
  setTimeout(() => window.print(), 400);
});
document.getElementById("splitExportBtn").addEventListener("click", () => {
  showScreen("print");
  toast("ブラウザの「PDFとして保存」を選択してください");
  setTimeout(() => window.print(), 600);
});

// ============================================================
// Mock fax SVG (handwritten-feel, multi-page support)
// ============================================================
function makeFaxSvg(order, page) {
  const start = (page - 1) * ITEMS_PER_FAX_PAGE;
  const items = order.faxItems.slice(start, start + ITEMS_PER_FAX_PAGE);
  const totalPages = getFaxPageCount(order);
  const headerY = page === 1 ? 240 : 160;
  const tableTop = headerY + 20;

  const rows = items.map((it, i) => {
    const y = tableTop + 10 + i * 38;
    return `
      <line x1="40" y1="${y+22}" x2="560" y2="${y+22}" stroke="#222" stroke-width="0.5" stroke-dasharray="2,2"/>
      <text x="50"  y="${y+18}" class="hand">${escapeHtml(it.name)}</text>
      <text x="330" y="${y+18}" class="hand" text-anchor="end">${it.qty}</text>
      <text x="345" y="${y+18}" class="hand">${escapeHtml(it.unit)}</text>
      <text x="400" y="${y+18}" class="hand small">${escapeHtml(it.notes||"")}</text>`;
  }).join("");

  const tableHeight = items.length * 38;
  const bottomY = tableTop + 10 + tableHeight;

  const headerBlock = page === 1 ? `
      <text x="300" y="60" class="header" text-anchor="middle">御 注 文 書</text>
      <line x1="60" y1="80" x2="540" y2="80" stroke="#222" stroke-width="2"/>
      <text x="50"  y="120" class="label">FAX No.</text>
      <text x="130" y="120" class="hand">${order.id}</text>
      <text x="380" y="120" class="label">受信:</text>
      <text x="430" y="120" class="hand">${order.receivedAt}</text>

      <text x="50"  y="160" class="label">御得意様名</text>
      <text x="160" y="162" class="hand cust">${escapeHtml(order.customer)}</text>
      <line x1="160" y1="170" x2="540" y2="170" stroke="#222" stroke-width="0.7"/>

      <text x="50"  y="200" class="label">ご担当</text>
      <text x="130" y="202" class="hand">${escapeHtml(order.contact||"")}</text>
      <line x1="130" y1="210" x2="540" y2="210" stroke="#222" stroke-width="0.5"/>

      <text x="50"  y="240" class="label">納品日</text>
      <text x="130" y="242" class="hand">${fmtDate(order.deliveryDate)}</text>` : `
      <text x="300" y="60" class="header" text-anchor="middle">御 注 文 書（続き）</text>
      <line x1="60" y1="80" x2="540" y2="80" stroke="#222" stroke-width="2"/>
      <text x="50"  y="120" class="label">FAX No.</text>
      <text x="130" y="120" class="hand">${order.id} (P.${page})</text>
      <text x="380" y="120" class="label">御得意様:</text>
      <text x="450" y="120" class="hand">${escapeHtml(order.customer)}</text>`;

  const note = (page === totalPages && order.note)
    ? `<text x="40" y="${bottomY + 50}" class="hand small">特記：${escapeHtml(order.note)}</text>`
    : "";

  const stamp = page === 1 ? `
      <g transform="translate(490,720) rotate(-8)">
        <circle cx="0" cy="0" r="36" fill="none" stroke="#a02020" stroke-width="2"/>
        <text x="0" y="-6"  text-anchor="middle" font-family="serif" font-size="14" fill="#a02020">受 信</text>
        <text x="0" y="14" text-anchor="middle" font-family="serif" font-size="12" fill="#a02020">${order.receivedAt}</text>
      </g>` : "";

  return `
    <svg viewBox="0 0 600 850" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .hand { font-family: "Yu Mincho","Hiragino Mincho ProN", serif; font-size: 22px; fill:#222; }
          .hand.small { font-size: 16px; fill:#444; }
          .hand.cust { font-size: 26px; }
          .label { font-family: sans-serif; font-size: 14px; fill:#222; }
          .header { font-family: serif; font-size: 28px; fill:#222; font-weight: 700; letter-spacing: 4px; }
          .stamp  { font-family: serif; font-size: 14px; fill:#a02020; }
          .pagenum { font-family: sans-serif; font-size: 12px; fill:#5a6a80; }
          .box { fill: none; stroke: #222; stroke-width: 1; }
        </style>
      </defs>
      <rect x="0" y="0" width="600" height="850" fill="#fbfaf3"/>
      ${headerBlock}
      <rect x="40" y="${tableTop}" width="520" height="30" class="box"/>
      <text x="50"  y="${tableTop+22}" class="label">品 名</text>
      <text x="320" y="${tableTop+22}" class="label" text-anchor="end">数量</text>
      <text x="345" y="${tableTop+22}" class="label">単位</text>
      <text x="400" y="${tableTop+22}" class="label">備　考</text>
      <line x1="305" y1="${tableTop}" x2="305" y2="${bottomY}" stroke="#222" stroke-width="0.7"/>
      <line x1="340" y1="${tableTop}" x2="340" y2="${bottomY}" stroke="#222" stroke-width="0.7"/>
      <line x1="390" y1="${tableTop}" x2="390" y2="${bottomY}" stroke="#222" stroke-width="0.7"/>
      <rect x="40" y="${tableTop+30}" width="520" height="${tableHeight}" class="box"/>
      ${rows}
      ${note}
      ${stamp}
      <text x="560" y="830" class="pagenum" text-anchor="end">P. ${page} / ${totalPages}</text>
    </svg>`;
}

// ============================================================
// A3 print preview screen
// ============================================================
function renderPrint() {
  renderDeliveryFilterBar(document.getElementById("printFilterBar"));
  renderColumnLayoutBar(document.getElementById("printColumnLayoutBar"));

  const scope = document.getElementById("printScopeSelect").value;
  let list = filteredOrders();
  if (scope === "checked") {
    list = list.filter(o => o.status === "checked" || o.status === "ready");
  }
  const container = document.getElementById("a3Pages");
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = `<div class="card" style="padding:20px">対象のFAXがありません。</div>`;
    return;
  }
  paginateAndRender(list, container, { clickable: false });
}
document.getElementById("printScopeSelect").addEventListener("change", renderPrint);
document.getElementById("printBtn").addEventListener("click", () => window.print());
document.getElementById("exportPdfBtn").addEventListener("click", () => {
  toast("ブラウザの「PDFとして保存」を選択してください");
  setTimeout(() => window.print(), 400);
});

// ============================================================
// A3 layout / pagination — measures each block, packs into 3 columns × N pages.
// Returns the number of pages rendered.
// ============================================================
function paginateAndRender(orderList, container, opts = {}) {
  const clickable = !!opts.clickable;
  const selectedId = opts.selectedId;
  container.innerHTML = "";

  // Measure 1mm in px
  const ref = document.createElement("div");
  ref.style.cssText = "position:absolute;left:-9999px;top:0;width:100mm;height:1mm;";
  document.body.appendChild(ref);
  const pxPerMm = ref.getBoundingClientRect().width / 100;
  document.body.removeChild(ref);

  // Page geometry (mm) — must match the .a3-page / .a3-grid / .a3-col CSS.
  // Two layout modes: 5-column (default, readable) and 6-column (dense).
  const layout = (opts.columnLayout || currentColumnLayout) === 6 ? 6 : 5;
  const PAGE_H_MM = 297;
  const PAD_Y_MM  = 6;
  const HEADER_MM = 12;
  const FOOTER_MM = 6;
  const COLS         = layout;                     // 5 or 6
  const COL_TOTAL_MM = layout === 6 ? 65 : 80;     // matches grid-template-columns
  const COL_PAD_MM   = layout === 6 ? 1  : 2;      // matches .a3-col padding
  const COL_BORDER_MM = 2;
  const colW_MM = COL_TOTAL_MM - 2 * COL_PAD_MM - COL_BORDER_MM;   // 74mm or 61mm
  const innerH_MM = PAGE_H_MM - PAD_Y_MM * 2 - HEADER_MM - FOOTER_MM;  // 273mm
  const colH_PX = innerH_MM * pxPerMm;

  // Measure each customer's component heights once. We don't need to render
  // every possible split — header / per-item / note / footer heights are enough
  // to compute the height of any fragment of any customer.
  const measurer = document.createElement("div");
  measurer.className = "a3-page" + (layout === 6 ? " cols-6" : "");
  measurer.style.cssText =
    `position:absolute;left:-9999px;top:0;width:${colW_MM}mm;` +
    `height:auto;padding:0;display:block;visibility:hidden;box-shadow:none;`;
  const measureCol = document.createElement("div");
  measureCol.className = "a3-col";
  measureCol.style.cssText = "border:none;padding:0;display:block;";
  measurer.appendChild(measureCol);
  document.body.appendChild(measurer);

  const measurements = {};
  for (const order of orderList) {
    if (!measurements[order.id]) {
      measurements[order.id] = measureCustomerComponents(order, measureCol);
    }
  }
  document.body.removeChild(measurer);

  // Row-level packing:
  //   for each customer, place as many items as fit into the current column;
  //   when items remain, push them to the next column with a continuation header.
  //   The next customer can resume in the SAME column if there is leftover space.
  const queue = orderList.map(order => ({
    order,
    startIdx: 0,
    remaining: order.items.length,
    noteRemaining: !!order.note,
    isContinuation: false
  }));

  const allCols = [];          // each entry is an array of segments
  let curCol = [];
  let curHeight = 0;

  function pushColumn() {
    allCols.push(curCol);
    curCol = [];
    curHeight = 0;
  }

  // Reserve a small slot for the "→ 続きあり" hint at the bottom of every
  // split-first segment so the hint never overflows into the next column's space.
  const HINT_MM = 3;
  const hintPx = HINT_MM * pxPerMm;

  let safety = 5000;
  while (queue.length > 0 && safety-- > 0) {
    const cur = queue[0];
    const m   = measurements[cur.order.id];
    const overhead = m.headerH + m.footerH;
    const available = colH_PX - curHeight;

    // Minimum useful placement = header + (one item, or note if no items left) + footer.
    const minUnit = cur.remaining > 0 ? m.perItemH : (cur.noteRemaining ? m.noteH : 0);
    if (minUnit === 0) { queue.shift(); continue; }    // nothing left to place

    if (available < overhead + minUnit) {
      if (curCol.length === 0) {
        // Empty column still can't fit minimum — force-place to avoid infinite loop.
        const place = cur.remaining > 0 ? 1 : 0;
        const includesNoteForce = place === 0 && cur.noteRemaining;
        const stillRemaining = (cur.remaining - place > 0) ||
          (cur.noteRemaining && !includesNoteForce);
        curCol.push({
          order: cur.order,
          startIdx: cur.startIdx,
          itemCount: place,
          isContinuation: cur.isContinuation,
          includesNote: includesNoteForce,
          hasContinuation: stillRemaining
        });
        cur.startIdx += place;
        cur.remaining -= place;
        if (includesNoteForce) cur.noteRemaining = false;
        cur.isContinuation = true;
        if (cur.remaining === 0 && !cur.noteRemaining) queue.shift();
        pushColumn();
        continue;
      }
      pushColumn();
      continue;
    }

    // How many items fit?
    let canFit = Math.floor((available - overhead) / m.perItemH);
    canFit = Math.max(0, Math.min(cur.remaining, canFit));

    // If all remaining items fit, see if the note fits too.
    let includesNote = false;
    if (cur.noteRemaining && canFit === cur.remaining) {
      const needed = overhead + canFit * m.perItemH + m.noteH;
      if (needed <= available) includesNote = true;
    }

    // Will this segment leave anything (items or note) for the next column?
    let willSplit = !includesNote && (canFit < cur.remaining || cur.noteRemaining);

    // If splitting, also reserve the "→ 続きあり" hint slot. Don't reduce items
    // to zero — accept a tiny visual overflow over zeroing out.
    if (willSplit) {
      const reduced = Math.floor((available - overhead - hintPx) / m.perItemH);
      if (reduced > 0) {
        canFit = Math.max(0, Math.min(cur.remaining, reduced));
        willSplit = !includesNote && (canFit < cur.remaining || cur.noteRemaining);
      }
    }

    if (canFit === 0 && !includesNote) {
      pushColumn();
      continue;
    }

    curCol.push({
      order: cur.order,
      startIdx: cur.startIdx,
      itemCount: canFit,
      isContinuation: cur.isContinuation,
      includesNote,
      hasContinuation: willSplit
    });
    curHeight += overhead + canFit * m.perItemH +
      (includesNote ? m.noteH : 0) +
      (willSplit ? hintPx : 0);

    cur.startIdx     += canFit;
    cur.remaining    -= canFit;
    if (includesNote) cur.noteRemaining = false;

    if (cur.remaining === 0 && !cur.noteRemaining) {
      queue.shift();                            // customer fully placed; next one can flow into same column
    } else {
      cur.isContinuation = true;                // remaining items / note carry over
      pushColumn();
    }
  }
  if (curCol.length > 0) pushColumn();

  // Distribute columns into pages (3 cols per page).
  const pages = [];
  for (let i = 0; i < allCols.length; i += COLS) {
    const slice = allCols.slice(i, i + COLS);
    while (slice.length < COLS) slice.push([]);
    pages.push(slice);
  }
  if (pages.length === 0) pages.push(Array.from({ length: COLS }, () => []));

  // Title is keyed off the delivery date — caller can pin it (split view) or
  // we infer the most-common delivery date from the order list (print preview).
  const primaryDate = opts.primaryDate || pickPrimaryDeliveryDate(orderList);
  const titleText = deliveryTitle(primaryDate);

  // Render
  pages.forEach((pageCols, idx) => {
    const pageEl = document.createElement("div");
    pageEl.className = "a3-page" + (layout === 6 ? " cols-6" : "");
    pageEl.innerHTML = `
      <div class="a3-header">
        <div>
          <div class="a3-title">${escapeHtml(titleText)}</div>
          <div class="a3-subtitle">東西青果株式会社</div>
        </div>
      </div>
      <div class="a3-grid"></div>
      <div class="a3-footer">${idx + 1} / ${pages.length}</div>`;
    const grid = pageEl.querySelector(".a3-grid");
    pageCols.forEach(colSegs => {
      const colEl = document.createElement("div");
      colEl.className = "a3-col";
      colSegs.forEach(seg => {
        const block = makeSegmentEl(seg, { clickable });
        if (selectedId && seg.order.id === selectedId) block.classList.add("selected");
        colEl.appendChild(block);
      });
      grid.appendChild(colEl);
    });
    container.appendChild(pageEl);
  });

  if (clickable) bindClickToEdit(container);
  return pages.length;
}

// ============================================================
// Customer block — clean internal-summary layout (display only).
// Edits happen in a modal opened via click on the split screen.
// ============================================================
function shortDate(iso) {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

// "M月D日配達分" — A3 sheet title is keyed off the delivery (配達) date, not the order date
function deliveryTitle(iso) {
  if (!iso) return "配達分";
  const parts = iso.split("-");
  return `${parseInt(parts[1], 10)}月${parseInt(parts[2], 10)}日配達分`;
}

// Pick the most-common delivery date from a list of orders. Falls back to TOMORROW (demo data).
function pickPrimaryDeliveryDate(orderList) {
  const counts = {};
  for (const o of orderList) {
    if (o && o.deliveryDate) counts[o.deliveryDate] = (counts[o.deliveryDate] || 0) + 1;
  }
  let best = null, bestN = 0;
  for (const [d, n] of Object.entries(counts)) {
    if (n > bestN) { best = d; bestN = n; }
  }
  return best || TOMORROW;
}

// Render one customer-block "segment". A segment is either a full customer or
// a slice of items belonging to the same customer that fits in one column;
// when a customer's items span more than one column, the second/third/... columns
// receive a segment with isContinuation=true and a "（続き）" suffix on the name.
//
// seg = { order, startIdx, itemCount, isContinuation, includesNote }
function makeSegmentEl(seg, opts = {}) {
  const order = seg.order;
  const slice = order.items.slice(seg.startIdx, seg.startIdx + seg.itemCount);
  const el = document.createElement("div");
  el.className = "customer-block";
  el.dataset.orderId = order.id;
  if (opts.clickable) el.classList.add("clickable");

  const productRows = slice.map(it => {
    const qtyText = `${it.qty}${escapeHtml(it.unit || "")}`;
    const noteText = (it.notes && String(it.notes).trim())
      ? escapeHtml(it.notes) : "";
    return `
      <div class="product-row">
        <div class="name">${escapeHtml(it.name)}</div>
        <div class="note">${noteText}</div>
        <div class="qty">${qtyText}</div>
      </div>`;
  }).join("");

  const dateLine = (order.orderDate || order.deliveryDate)
    ? `受注 ${shortDate(order.orderDate)}　／　納品 ${shortDate(order.deliveryDate)}`
    : "";

  const nameHtml = escapeHtml(order.customer)
    + (seg.isContinuation ? `<span class="continued-label">（続き）</span>` : "");

  el.innerHTML = `
    <h4>${nameHtml}</h4>
    ${dateLine ? `<div class="meta">${dateLine}</div>` : ""}
    <div class="product-list">${productRows}</div>
    ${seg.includesNote && order.note ? `<div class="note-line"><span class="note-label">特記：</span>${escapeHtml(order.note)}</div>` : ""}
    ${seg.hasContinuation ? `<div class="continuation-hint">→ 続きあり</div>` : ""}
  `;
  return el;
}

// Convenience for full-customer rendering — used by the off-screen measurer
// so we can read header/item/note/footer heights from one render.
function makeCustomerBlockEl(order, opts = {}) {
  return makeSegmentEl({
    order,
    startIdx: 0,
    itemCount: order.items.length,
    isContinuation: false,
    includesNote: !!order.note
  }, opts);
}

// Pull apart one rendered customer block into its component heights so we can
// compute fragment heights without re-measuring for every possible split point.
function measureCustomerComponents(order, measureCol) {
  const el = makeCustomerBlockEl(order);
  measureCol.appendChild(el);
  const blockRect = el.getBoundingClientRect();
  const productList = el.querySelector(".product-list");
  const productListRect = productList.getBoundingClientRect();

  const headerH    = productListRect.top - blockRect.top;          // padding-top + h4 + meta
  const productListH = productListRect.height;                       // all items + row-gaps
  const itemCount  = order.items.length;
  const perItemH   = itemCount > 0 ? productListH / itemCount : 0;

  let noteH = 0;
  let endY  = productListRect.bottom;
  const noteLine = el.querySelector(".note-line");
  if (noteLine) {
    const r = noteLine.getBoundingClientRect();
    noteH = r.bottom - productListRect.bottom;                      // margin + padding + content
    endY  = r.bottom;
  }
  const footerH = blockRect.bottom - endY;                          // padding-bottom + border-bottom

  measureCol.removeChild(el);
  return { headerH, perItemH, noteH, footerH, itemCount, hasNote: !!order.note };
}

// Switch the split-screen's "currently-selected fax" without re-rendering
// the entire right A3 pane. The right pane keeps its scroll position; only
// the left FAX preview, header info and the .selected highlight move.
//
// This is the customer ↔ fax sync point — currently 1 customer = 1 fax,
// keyed off order.id. If the data model later supports N faxes per
// customer, only this function needs to change.
function updateSelectedFax(orderId) {
  const list = filteredOrders();
  const order = list.find(o => o.id === orderId) || orders.find(o => o.id === orderId);
  if (!order) return;
  if (currentSplitId === orderId) return;   // no change

  currentSplitId = orderId;
  faxView = { zoom: 1.0, rotation: 0, page: 1 };

  // Left pane: redraw the FAX SVG + reset its zoom/rotation/page
  renderFaxCanvas(order);

  // Pane head info — clearly labelled "表示中FAX：..." so staff can see
  // at a glance which customer's FAX is currently in the left pane.
  const idx = list.findIndex(o => o.id === orderId);
  const faxHead = document.getElementById("faxHeadInfo");
  if (faxHead) {
    faxHead.textContent =
      `表示中FAX：${order.id} ／ ${order.customer} ／ 受信 ${order.receivedAt}　（${idx + 1}/${list.length}）`;
  }
  // Right-pane head: "選択中：xxx" stays in sync with the selected block
  const a3Head = document.getElementById("a3HeadInfo");
  if (a3Head) {
    a3Head.textContent =
      `選択中：${order.customer}　・　${list.length} 件の顧客 / ${lastA3PageCount || "?"} ページ`;
  }

  // Toolbar status badge follows the selected customer
  const sb = document.getElementById("splitStatusBadge");
  if (sb) {
    const s = STATUS[order.status] || STATUS.unchecked;
    sb.className = `badge badge-lg ${s.cls}`;
    sb.textContent = s.label;
    if (order._ocrNotice) sb.title = order._ocrNotice;
    else sb.removeAttribute("title");
  }

  // Dropdown stays in sync with the click
  const sel = document.getElementById("splitOrderSelect");
  if (sel && sel.value !== orderId) sel.value = orderId;

  // Move the .selected highlight on the right A3 — DON'T scroll, so the
  // user keeps their reading position on the same A3 page.
  const container = document.getElementById("splitA3Pages");
  if (container) {
    container.querySelectorAll(".customer-block.selected")
      .forEach(el => el.classList.remove("selected"));
    container.querySelectorAll(`.customer-block[data-order-id="${orderId}"]`)
      .forEach(el => el.classList.add("selected"));
  }
}

// Click delegation for A3 customer blocks.
//
// Bound EXACTLY ONCE per container element so that re-renders do not stack up
// duplicate listeners. (Old bug: paginateAndRender ran bindClickToEdit on every
// render, so after switching datasets / saving / re-navigating, multiple
// listeners fired per click — the first one updated `currentSplitId`, then a
// later listener saw `orderId === currentSplitId` and opened the edit modal
// immediately. This made the 2-step click silently break for 100/150/180-item
// test datasets and any 6/30 dataset entered after them.)
//
// Now: a single listener uses event delegation against `e.target.closest(...)`.
// New customer blocks injected via innerHTML replacement are caught by the
// same listener — no rebinding needed.
const _clickBoundContainers = new WeakSet();
function bindClickToEdit(rootEl) {
  if (!rootEl || _clickBoundContainers.has(rootEl)) return;
  _clickBoundContainers.add(rootEl);
  rootEl.addEventListener("click", (e) => {
    const block = e.target.closest(".customer-block.clickable");
    if (!block) return;
    const orderId = block.dataset.orderId;
    if (orderId === currentSplitId) {
      // 2nd click on the already-selected block → open edit modal
      openEditModal(orderId);
    } else {
      // 1st click on a different customer → just switch selection + left FAX.
      // Modal is NOT opened — staff compares A3 vs FAX first, then clicks
      // the same block again (or the explicit edit button) to start editing.
      updateSelectedFax(orderId);
    }
  });
}

// ============================================================
// Edit modal (opens on customer-block click in split view)
// ============================================================
let editBuffer = null; // working copy of the order being edited

function openEditModal(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  editBuffer = JSON.parse(JSON.stringify(order));

  document.getElementById("editModalTitle").textContent =
    `${order.id} ／ ${order.customer} の注文を編集`;
  const body = document.getElementById("editModalBody");
  body.innerHTML = renderModalForm(editBuffer);
  bindModalForm(body);
  document.getElementById("editModalBackdrop").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeEditModal() {
  document.getElementById("editModalBackdrop").hidden = true;
  document.body.style.overflow = "";
  editBuffer = null;
}

function saveEditModal() {
  if (!editBuffer) return;
  const target = orders.find(o => o.id === editBuffer.id);
  if (!target) return;
  target.customer     = editBuffer.customer;
  target.orderDate    = editBuffer.orderDate;
  target.deliveryDate = editBuffer.deliveryDate;
  target.items        = editBuffer.items;
  target.note         = editBuffer.note;
  closeEditModal();
  toast("修正を保存しました");
  if (currentScreen === "split") renderSplit();
  else if (currentScreen === "print") renderPrint();
  else if (currentScreen === "ocr")   renderOcr();
  else if (currentScreen === "dashboard") renderDashboard();
}

function renderModalForm(buf) {
  return `
    <div class="form-grid">
      <label class="field"><span>顧客名</span>
        <input type="text" data-bf="customer" value="${escapeAttr(buf.customer)}"></label>
      <label class="field"><span>受注日</span>
        <input type="date" data-bf="orderDate" value="${buf.orderDate || ""}"></label>
      <label class="field"><span>納品日</span>
        <input type="date" data-bf="deliveryDate" value="${buf.deliveryDate || ""}"></label>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin:18px 0 10px;">
      <h4 style="margin:0;color:#1f3a5f;font-size:17px">注文品目</h4>
      <button class="btn btn-secondary" id="modalAddItemBtn">＋ 品目を追加</button>
    </div>
    <table class="data-table editable">
      <thead><tr>
        <th style="width:34%">品名</th>
        <th style="width:14%">数量</th>
        <th style="width:14%">単位</th>
        <th>備考</th>
        <th style="width:8%">削除</th>
      </tr></thead>
      <tbody id="modalItemsBody">${buf.items.map((it,i) => modalRowHtml(it,i)).join("")}</tbody>
    </table>
    <label class="field" style="margin-top:18px;">
      <span>特記事項</span>
      <input type="text" data-bf="note" value="${escapeAttr(buf.note || "")}" placeholder="（任意）">
    </label>
  `;
}

function modalRowHtml(it, i) {
  return `
    <tr data-row="${i}">
      <td><input type="text" data-bi="${i}" data-bf="name" value="${escapeAttr(it.name)}" placeholder="品名"></td>
      <td><input type="number" min="0" step="0.1" data-bi="${i}" data-bf="qty" value="${it.qty}"></td>
      <td><select data-bi="${i}" data-bf="unit">
        ${UNITS.map(u => `<option value="${u}" ${u===it.unit?"selected":""}>${u}</option>`).join("")}
      </select></td>
      <td><input type="text" data-bi="${i}" data-bf="notes" value="${escapeAttr(it.notes || "")}"></td>
      <td><button class="row-delete-btn" data-row-del="${i}">削除</button></td>
    </tr>`;
}

function rerenderModalRows() {
  const tbody = document.getElementById("modalItemsBody");
  if (!tbody) return;
  tbody.innerHTML = editBuffer.items.map((it, i) => modalRowHtml(it, i)).join("");
}

function bindModalForm(root) {
  root.addEventListener("input", (e) => {
    const inp = e.target.closest("[data-bf]");
    if (!inp) return;
    if (inp.dataset.bi != null) {
      const i = +inp.dataset.bi;
      const f = inp.dataset.bf;
      let v = inp.value;
      if (f === "qty") v = parseFloat(v) || 0;
      editBuffer.items[i][f] = v;
    } else {
      editBuffer[inp.dataset.bf] = inp.value;
    }
  });
  root.addEventListener("change", (e) => {
    const sel = e.target.closest("select[data-bf]");
    if (!sel) return;
    if (sel.dataset.bi != null) {
      editBuffer.items[+sel.dataset.bi][sel.dataset.bf] = sel.value;
    }
  });
  root.addEventListener("click", (e) => {
    if (e.target.id === "modalAddItemBtn") {
      editBuffer.items.push({ name: "", qty: 0, unit: "kg", notes: "" });
      rerenderModalRows();
    } else if (e.target.matches("[data-row-del]")) {
      editBuffer.items.splice(+e.target.dataset.rowDel, 1);
      rerenderModalRows();
    }
  });
}

document.getElementById("editModalClose").addEventListener("click", closeEditModal);
document.getElementById("editModalCancel").addEventListener("click", closeEditModal);
document.getElementById("editModalSave").addEventListener("click", saveEditModal);
document.getElementById("editModalBackdrop").addEventListener("click", (e) => {
  if (e.target.id === "editModalBackdrop") closeEditModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !document.getElementById("editModalBackdrop").hidden) closeEditModal();
});

// ---------- Init ----------
renderDashboard();
