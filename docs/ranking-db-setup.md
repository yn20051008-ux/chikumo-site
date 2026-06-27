# ランキング（結果発表）DB セットアップ & セキュリティ手順

対象ゲーム：コッコリンク（/link/）・コッコ救出（/rescue/）・こっこの森（/mori/ 総資産ランキング）・コッコスプラット3D（/splat3d/）・こっこダービー（/derby/ 通算勝ち点ランキング）・コッコグレイズ（/graze/ 弾幕回避スコアランキング）・コッコ・インベーダー（/invaders/ 迎撃スコアランキング）・コッコラッシュ（/rush/ 通勤ランスコアランキング）・コッコ縁波（/ennami/ 家の高さスコアランキング）・コッコ天秤（/tenbin/ 数学の塔スコアランキング）・コッコ継（/tsugi/ 世界史・到達時代スコアランキング）・コッコ大河（/taiga/ 日本史・到達時代スコアランキング）・コッコ地球（/chikyu/ 地理・到達地域スコアランキング）・コッコ元素（/genso/ 化学・到達段スコア）・コッコ生命（/seimei/ 生物・到達段スコア）
保存先：既存 Firebase プロジェクト `chikumonogatarikiroku` の Realtime Database
ノード：リンク=`rankings/link` ／ 救出=`rankings/rescue` ／ こっこの森=`rankings/mori` ／ スプラット3D=`rankings/splat3d` ／ ダービー=`rankings/derby` ／ グレイズ=`rankings/graze` ／ インベーダー=`rankings/invaders` ／ ラッシュ=`rankings/rush`（**新規DBは不要**）

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
      },
      "mori": {
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
          ".validate": "newData.hasChildren(['name','score'])",
          "name":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "flag":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99999999" },
          "day":   { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 999999" },
          "ts":    { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      },
      "splat3d": {
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
      },
      "derby": {
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
          ".validate": "newData.hasChildren(['name','score'])",
          "name":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "flag":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99999999" },
          "wins":  { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 999999" },
          "ts":    { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      },
      "graze": {
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
          ".validate": "newData.hasChildren(['name','score'])",
          "name":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "flag":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99999999" },
          "grazes": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 999999" },
          "ts":    { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      },
      "invaders": {
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
          ".validate": "newData.hasChildren(['name','score'])",
          "name":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "flag":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 9999999" },
          "wave":  { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99999" },
          "ts":    { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      },
      "rush": {
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
          ".validate": "newData.hasChildren(['name','score'])",
          "name":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "flag":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99999999" },
          "eggs":  { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 999999" },
          "ts":    { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      },
      "match": {
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
          ".validate": "newData.hasChildren(['name','score'])",
          "name":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "flag":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99999999" },
          "chain": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 9999" },
          "ts":    { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      },
      "ennami": {
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
          ".validate": "newData.hasChildren(['name','score'])",
          "name":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "flag":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 9999999" },
          "home":  { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99999" },
          "ts":    { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      },
      "tenbin": {
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
          ".validate": "newData.hasChildren(['name','score'])",
          "name":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "flag":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 9999999" },
          "lvl":   { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 999" },
          "ts":    { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      },
      "tsugi": {
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
          ".validate": "newData.hasChildren(['name','score'])",
          "name":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "flag":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 9999999" },
          "lvl":   { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99" },
          "ts":    { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      },
      "taiga": {
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
          ".validate": "newData.hasChildren(['name','score'])",
          "name":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "flag":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 9999999" },
          "lvl":   { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99" },
          "ts":    { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      },
      "chikyu": {
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
          ".validate": "newData.hasChildren(['name','score'])",
          "name":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "flag":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 9999999" },
          "lvl":   { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99" },
          "ts":    { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      },
      "genso": {
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
          ".validate": "newData.hasChildren(['name','score'])",
          "name":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "flag":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 9999999" },
          "lvl":   { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99" },
          "ts":    { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      },
      "seimei": {
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (!data.exists() || newData.child('score').val() >= data.child('score').val())",
          ".validate": "newData.hasChildren(['name','score'])",
          "name":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "flag":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 9999999" },
          "lvl":   { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99" },
          "ts":    { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      }
    },
    "letters": {
      "makiyado": {
        ".read": true,
        "$uid": {
          ".write": "auth != null && auth.uid === $uid",
          ".validate": "newData.hasChildren(['name','msg'])",
          "name":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "flag":  { ".validate": "newData.isString() && newData.val().length <= 16" },
          "msg":   { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 60" },
          "ts":    { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        }
      }
    }
  }
}
```

※他機能のルールが既存にある場合は、`"rankings"` / `"letters"` ブロックだけをマージしてください（丸ごと置換しない）。

> **正論蒔宿への手紙（/letter/）について**：ノード `letters/makiyado`。1人1通（`auth.uid`／端末IDの自分の枠のみ書込）・**上書き可**。本文 `msg` は最大20文字（絵文字対応のためルール上は60 UTF-16単位まで許可）。ゲーム同様、匿名認証OFFの“オープン”状態でも投稿は動きます。

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

## こっこの森（/mori/）について
- **総資産 世界ランキング**：おかね＋買った道具＋しゅうかく品の評価額（=総資産）の自己ベストを登録。
- 登録できるのは **島の時刻 あさ7時（7:00〜9:00）** のあいだだけ（🏠おうちで「ねる」とあさになり登録できる）。
- 閲覧は **🏆ボタン（プレイ中／タイトル）からいつでも** 可能。
- ゲームの進行データはこれまで通り **ブラウザ保存（localStorage）**、ランキングだけ **サーバー保存（Firebase）**。

## コッコスプラット3D（/splat3d/）について
- **スコア 世界ランキング**：1プレイのスコアの自己ベストを登録（1端末1枠・最高スコアのみ保持）。
- 登録は **リザルト画面**（CLEAR! / TIME UP…）から、名前＋国旗を入れて「🏆 登録」。
- 閲覧は **タイトルの「🏆 世界ランキング」ボタン** からいつでも可能。
- 登録すると「◯位にランクイン！」の結果発表演出が出る。
- ゲームのベストスコアはこれまで通り **ブラウザ保存（localStorage）**、世界ランキングだけ **サーバー保存（Firebase）**。

## こっこダービー（/derby/）について
- **通算「勝ち点」世界ランキング**：1試合ごとに勝ち点がたまり、その通算（キャリア）自己ベストを登録（1端末1枠・最高勝ち点のみ保持）。
- 勝ち点は **勝つほど・つよい相手・大差ほど高い**（勝ち=難易度ベース10/25/50＋得失点差×5、引き分け=2/5/10、負け=0）。`score`=通算勝ち点、`wins`=通算勝利数。
- 登録は **リザルト画面**から、名前＋国旗を入れて「🏆 登録」。閲覧は **タイトルの「🏆 世界ランキング」ボタン** からいつでも可能。
- 通算勝ち点・勝利数は **ブラウザ保存（localStorage）**、世界ランキングだけ **サーバー保存（Firebase）**。

## コッコグレイズ（/graze/）について
- **スコア 世界ランキング**：1プレイのスコアの自己ベストを登録（1端末1枠・最高スコアのみ保持）。`score`=スコア、`grazes`=グレイズ回数。
- 登録は **GAME OVER画面**から、名前＋国旗を入れて「🏆 登録」。閲覧は **タイトルの「🏆 世界ランキング」ボタン** からいつでも可能。
- 登録すると「◯位にランクイン！」の結果発表演出が出る。
- ベストスコアは **ブラウザ保存（localStorage）**、世界ランキングだけ **サーバー保存（Firebase）**。

## コッコ・インベーダー（/invaders/）について
- **スコア 世界ランキング**：1プレイのスコアの自己ベストを登録（1端末1枠・最高スコアのみ保持）。`score`=スコア、`wave`=到達ウェーブ。
- 登録は **GAME OVER画面**から、名前＋国旗を入れて「🏆 登録」。閲覧は **タイトルの「🏆 世界ランキング」ボタン** からいつでも可能。
- 登録すると「◯位にランクイン！」の結果発表演出が出る。
- ハイスコアは **ブラウザ保存（localStorage）**、世界ランキングだけ **サーバー保存（Firebase）**。

## こっこマッチ（/match/）について
- **スコア 世界ランキング**：1プレイ（60秒タイムアタック）のスコアの自己ベストを登録（1端末1枠・最高スコアのみ保持）。`score`=スコア、`chain`=最大れんさ（カスケード）数。
- 登録は **TIME UP（リザルト）画面**から、名前＋国旗を入れて「🏆 登録」。閲覧は **タイトルの「🏆 世界ランキング」ボタン** からいつでも可能。
- 登録すると「◯位にランクイン！」の結果発表演出（ドラムロール→順位ドーン＋紙吹雪・花火、1位は👑WORLD CHAMPION）が流れる。
- ベストスコアは **ブラウザ保存（localStorage）**、世界ランキングだけ **サーバー保存（Firebase）**。ノードは `rankings/match`（koro/poko 同様、匿名認証OFFの“オープン”状態でも登録は動く）。

## コッコ元素（/genso/）・コッコ生命（/seimei/）について
- 学習シリーズの理科版。`score`=スコア、`lvl`=到達した最高段（0〜5）を段ラベルに変換して表示。仕組み・登録/閲覧は天秤/地球と同じ。
- ノードは `rankings/genso`（化学）・`rankings/seimei`（生物）。匿名認証OFFの“オープン”状態でも登録は動く。

## コッコ地球（/chikyu/）について
- **スコア 世界ランキング**：1プレイ（60秒）で親子がめぐった『到達地域』とスコアの自己ベストを登録（1端末1枠・最高スコアのみ保持）。`score`=スコア、`lvl`=到達した最高の地域band（0〜5）を地域ラベルに変換して表示。
- 国と首都を結ぶ地理版。仕組み・登録/閲覧の流れは継/大河と同じ。ノードは `rankings/chikyu`。
- 登録は **リザルト画面**から、名前＋国旗を入れて「🏆 世界に登録」。閲覧は **タイトルの「🏆 世界ランキング」ボタン** から。1位は👑、順位表に到達地域（🌍）も表示。匿名認証OFFの“オープン”状態でも登録は動く。

## コッコ大河（/taiga/）について
- **スコア 世界ランキング**：1プレイ（60秒）で親子が日本史の大河をくだった『到達時代』とスコアの自己ベストを登録（1端末1枠・最高スコアのみ保持）。`score`=スコア、`lvl`=到達した最高の時代band（0〜6）を分野ラベルに変換して表示。
- コッコ継（/tsugi/ 世界史）の日本史版。仕組み・登録/閲覧の流れは継と同じ。ノードは `rankings/taiga`。
- 登録は **リザルト画面**から、名前＋国旗を入れて「🏆 世界に登録」。閲覧は **タイトルの「🏆 世界ランキング」ボタン** から。1位は👑、順位表に到達時代（🌊）も表示。匿名認証OFFの“オープン”状態でも登録は動く。

## コッコ継（/tsugi/）について
- **スコア 世界ランキング**：1プレイ（60秒）で親子が世界史の大河をくだった『到達時代』とスコアの自己ベストを登録（1端末1枠・最高スコアのみ保持）。`score`=スコア、`lvl`=到達した最高の時代band（0〜6）を分野ラベルに変換して表示。
- 登録は **リザルト画面**から、名前＋国旗を入れて「🏆 世界に登録」。閲覧は **タイトルの「🏆 世界ランキング」ボタン** からいつでも可能。
- 登録すると「◯位にランクイン！」の結果発表演出が出る（1位は👑WORLD CHAMPION）。順位表には到達時代（🌊）も表示。
- ベストは **サーバー保存（Firebase）**。ノードは `rankings/tsugi`（koro/poko/tenbin 同様、匿名認証OFFの“オープン”状態でも登録は動く）。

## コッコ天秤（/tenbin/）について
- **スコア 世界ランキング**：1プレイ（60秒）で親子が登った『数学の塔』の高さ（到達分野）とスコアの自己ベストを登録（1端末1枠・最高スコアのみ保持）。`score`=スコア、`lvl`=到達した最高レベル（分野ラベルに変換して表示）。
- 登録は **リザルト画面**から、名前＋国旗を入れて「🏆 世界に登録」。閲覧は **タイトルの「🏆 世界ランキング」ボタン** からいつでも可能。
- 登録すると「◯位にランクイン！」の結果発表演出が出る（1位は👑WORLD CHAMPION）。順位表には到達分野（🧗）も表示。
- ベストは **サーバー保存（Firebase）**。ノードは `rankings/tenbin`（koro/poko/ennami 同様、匿名認証OFFの“オープン”状態でも登録は動く）。

## コッコ縁波（/ennami/）について
- **スコア 世界ランキング**：1プレイ（60秒）で建てた「家」の高さときずな連数から算出したスコアの自己ベストを登録（1端末1枠・最高スコアのみ保持）。`score`=スコア、`home`=建てた家の段数。
- 登録は **リザルト画面**から、名前＋国旗を入れて「🏆 世界に登録」。閲覧は **タイトルの「🏆 世界ランキング」ボタン** からいつでも可能。
- 登録すると「◯位にランクイン！」の結果発表演出が出る（1位は👑WORLD CHAMPION）。
- ベストは **サーバー保存（Firebase）**。ノードは `rankings/ennami`（koro/poko/match 同様、匿名認証OFFの“オープン”状態でも登録は動く）。

## コッコラッシュ（/rush/）について
- **スコア 世界ランキング**：1プレイのスコアの自己ベストを登録（1端末1枠・最高スコアのみ保持）。`score`=スコア、`eggs`=集めたたまご数。
- 登録は **しゅっきん失敗（GAME OVER）画面**から、名前＋国旗を入れて「🏆 登録」。閲覧は **タイトルの「🏆 世界ランキング」ボタン** からいつでも可能。
- 登録すると「◯位にランクイン！」の結果発表演出が出る。
- ベストスコアは **ブラウザ保存（localStorage）**、世界ランキングだけ **サーバー保存（Firebase）**。

## 動作テスト
1. （上記2ステップ実施後）https://chikumo.jp/link/ ・ /rescue/ ・ /mori/ をプレイ → /mori/ はあさ7時に🏆から名前を入れて「登録」
2. 「登録しました！🏆」＋「◯位にランクイン！」が出れば成功
3. 別端末でも同じランキングが見える
4. 検証：ブラウザのコンソールから他人の枠へ `set()` を試す → `permission_denied` で**拒否される**ことを確認

うまく登録できない場合：コンソール(F12)に `permission_denied` が出ていれば、上の2ステップ（特に匿名認証の有効化）が未完了です。
