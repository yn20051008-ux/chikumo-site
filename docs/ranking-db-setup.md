# ランキング（結果発表）DB セットアップ & セキュリティ手順

対象ゲーム：コッコリンク（/link/）・コッコ救出（/rescue/）
保存先：既存 Firebase プロジェクト `chikumonogatarikiroku` の Realtime Database
ノード：リンク=`rankings/link` ／ 救出=`rankings/rescue`（**新規DBは不要**）

---

## 動作モードは2つ（登録は最初から動きます）

新版クライアントは賢く動きます：
- **匿名認証が使えれば** → 本物の `auth.uid` で登録（＝厳格ルールで保護できる安全モード）
- **使えなければ** → 端末IDにフォールバックして**そのまま登録できる**（＝設定不要で遊べる）

> つまり「ランキング登録できない」状態にはなりません。何も設定しなくても登録は動きます（セキュリティは“オープン”のまま）。
> **他人の改ざん・破壊まで防ぎたい場合のみ**、下の2ステップで“安全モード”に上げてください。

### ステップ1：匿名認証を有効化（安全モードにする場合）
1. https://console.firebase.google.com/ → プロジェクト **chikumonogatarikiroku**
2. 左メニュー **構築 → Authentication** → **ログイン方法（Sign-in method）**
3. **匿名（Anonymous）** を選び **有効にする → 保存**

### ステップ2：セキュリティルールを公開（安全モードにする場合・ステップ1とセットで）
1. 左メニュー **構築 → Realtime Database → ルール（Rules）**
2. 下の「強化ルール」を貼り付けて **公開（Publish）**

---

## 強化ルール（コピペ用）

これにより防げること：
- ✅ **他人の枠の書き換え・なりすまし**（`auth.uid === $uid` の自分の枠だけ書込可）
- ✅ **ランキングノードごと削除・破壊**（`rankings` / 各ゲーム直下に書込権限なし）
- ✅ **自分のスコアを下げる改ざん**（`newData.score >= data.score` の単調増加のみ）
- ✅ **異常値・不正な型・余計なフィールド**（型・範囲・上限チェック、未知キー拒否）
- ✅ link/rescue 以外の勝手なノード作成（明示ノードのみ許可）

```json
{
  "rules": {
    "rankings": {
      ".read": true,
      "link": {
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
          ".validate": "newData.hasChildren(['name','score'])",
          "name":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "flag":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 200000" },
          "chain": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 9999" },
          "ts":    { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      },
      "rescue": {
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
          ".validate": "newData.hasChildren(['name','score'])",
          "name":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "flag":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 9999999" },
          "rescued": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99999" },
          "ts":    { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      }
    }
  }
}
```

※他機能のルールが既存にある場合は、`"rankings"` ブロックだけをマージしてください（丸ごと置換しない）。

---

## 正直な限界と、さらに強くする手段

上記で「他人の妨害・破壊・異常値」はほぼ防げますが、
**「自分の枠に、許容範囲内の偽スコアを書く（自己水増し）」は静的サイト単独では完全には防げません**
（ゲームがブラウザ＝クライアントだけで完結しているため、改造クライアントは作れてしまう）。

完全防止が必要な場合は、以下のいずれかをご検討ください（必要なら実装します）。

### A. App Check（reCAPTCHA）で「正規サイト以外からの書き込み」を遮断（中コスト・効果大）
1. Firebase コンソール → **App Check** → ウェブアプリに **reCAPTCHA v3** を登録（サイトキー取得）
2. Realtime Database を **App Check 必須(enforce)** に設定
3. 各ゲームの `<head>` に App Check 初期化を追加（サイトキーをいただければ組み込みます）
→ ブラウザのコンソールや bot からの直書きを大幅に抑止できます。

### B. Cloud Functions でサーバー検証（高コスト・最も堅牢）
- スコア送信を Functions 経由にし、サーバー側で妥当性（プレイ時間・リプレイ署名・上限）を検証してから書き込む。
- Realtime DB の直書きは全面禁止にし、Functions(管理者権限)だけが書ける構成。
- Firebase の従量課金(Blaze)プランが必要。要望があれば関数のひな型と手順を用意します。

---

## 動作テスト
1. （上記2ステップ実施後）https://chikumo.jp/link/ または /rescue/ をプレイ → 結果画面で名前を入れて「ランキング登録」
2. 「登録しました！🏆」＋「◯位にランクイン！」が出れば成功
3. 別端末でも同じランキングが見える
4. 検証：ブラウザのコンソールから他人の枠へ `set()` を試す → `permission_denied` で**拒否される**ことを確認

うまく登録できない場合：コンソール(F12)に `permission_denied` が出ていれば、上の2ステップ（特に匿名認証の有効化）が未完了です。
