# コッコリンク ランキング DB セットアップ手順

## 結論：新規データベースは不要です
コッコリンク（/link/）のオンラインランキング「結果発表」は、**救出ゲーム（/rescue/）と同じ Firebase プロジェクト
`chikumonogatarikiroku` の Realtime Database をそのまま再利用**します。
データの保存先だけ分けてあります：

| ゲーム | 保存ノード |
|---|---|
| コッコ救出 | `rankings/rescue` |
| コッコリンク | `rankings/link` |

新しいプロジェクト作成・課金設定・APIキー発行などは**一切不要**です。
唯一必要なのは「`rankings/link` ノードへの読み書きを許可するセキュリティルールになっているか」の確認だけです。

---

## 確認・設定手順（Firebase コンソール）

1. https://console.firebase.google.com/ を開く
2. プロジェクト **chikumonogatarikiroku** を選択
3. 左メニュー **構築 → Realtime Database** を開く
4. 上部タブ **ルール（Rules）** を開く
5. すでに `rankings` 配下が読み書き許可になっていれば**そのままでOK**（救出が動いているなら大抵このケース）。
   不安な場合や、救出専用ルールになっている場合は、下の「推奨ルール」を貼り付けて **公開（Publish）** を押す

---

## 推奨ルール（救出・リンク 両対応・コピペ用）

`rankings/<ゲーム名>/<端末ID>` 単位で、1端末1枠・自己ベストのみ更新できる安全なルールです。
（救出ぶんの `rankings/rescue` もそのまま動きます）

```json
{
  "rules": {
    "rankings": {
      ".read": true,
      "$game": {
        "$uid": {
          ".write": true,
          ".validate": "newData.hasChildren(['name','score'])",
          "name":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "flag":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99999999" },
          "chain": { ".validate": "newData.isNumber() && newData.val() >= 0" },
          "rescued": { ".validate": "newData.isNumber() && newData.val() >= 0" },
          "ts":    { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      }
    }
  }
}
```

※既存のルールに他の項目（別機能）がある場合は、上記の `"rankings": { ... }` ブロックだけを既存ルールにマージしてください（丸ごと置き換えると他機能が消えます）。

---

## 動作テスト
1. https://chikumo.jp/link/ を開いてプレイ → タイムアップ後の画面で「なまえ」を入れて **ランキング登録**
2. 「登録しました！🏆」と表示され、「◯位にランクイン！」の結果発表演出が出れば成功
3. 別端末／別ブラウザで開くと、同じランキングが共有表示される

うまくいかない時は、ブラウザのコンソール（F12）に Firebase の `permission_denied` が出ていないか確認 → 出ていれば上記ルールを公開してください。

---

## 補足：別プロジェクトで運用したい場合（任意）
ランキングを救出と完全に分離したい等で**新しい Firebase プロジェクト**を使う場合のみ、以下が必要です：
1. Firebase コンソールで新規プロジェクト作成 → Realtime Database を作成（ロケーションは asia-southeast1 等）
2. プロジェクト設定 → 「ウェブアプリを追加」で `firebaseConfig`（apiKey/databaseURL など）を取得
3. `link/index.html` 内の `firebase.initializeApp({...})` の値を新しい config に差し替え
4. 上記「推奨ルール」を公開
※基本は不要です。既存プロジェクト再利用を推奨します。
