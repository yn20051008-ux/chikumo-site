---
name: release-chikumo
description: 畜物語サイト（chikumo-site）の変更を公開する手順。コードや内容の変更が一段落したら必ず実行する。畜史(changelog)更新 → コミット&プッシュ → main へのPR作成 → マージ → main反映の検証、までをワンセットで行う。公開サイト(chikumo.jp)は main から配信されるため、main にマージするまで反映されない。「公開して」「反映して」「PR作って」「畜史(更新)」「マージして」などで使用。
---

# 畜物語サイト 公開ワークフロー（PR作成→マージ→畜史更新）

このサイトの変更は **main にマージされて初めて公開される**（chikumo.jp は main から自動デプロイ）。
作業ブランチに push しただけ／PRを作っただけでは**公開サイトに反映されない**。
変更が一段落したら、毎回この手順を最後まで通すこと。

## 手順

### 1. 畜史(changelog)を更新【忘れやすい・必須】
`changelog/index.html` の `var LOG=[ ... ]` の**先頭**に、今日の日付ブロックを追加（新しい順）。
すでに今日の日付ブロックがあれば、その `items` に追記する。
- tag は `new`(新ゲーム) / `feat`(新機能) / `imp`(改善) / `fix`(修正) から選ぶ
- 形式: `{ tag:"feat", t:"こっこの森：〇〇を追加", d:"説明…", li:["箇条1","箇条2"] }`（`d`/`li`は任意）
- 機能追加は `feat`、既存機能の調整・強化は `imp` として分けると履歴が読みやすい

### 2. 構文チェック
ゲームHTML（例 `mori/index.html`）はインラインの大きな`<script>`を含む。変更したら必ず構文確認：
```bash
o=$(grep -n "^<script>" mori/index.html|head -1|cut -d: -f1)
c=$(awk -v s="$o" 'NR>s&&/^<\/script>/{print NR;exit}' mori/index.html)
sed -n "$((o+1)),$((c-1))p" mori/index.html > /tmp/check.js && node --check /tmp/check.js && echo OK
```

### 3. コミット & プッシュ（作業ブランチ）
```bash
git add -A && git commit -m "<日本語の簡潔な説明>"
git push -u origin "$(git branch --show-current)"
```

### 4. main へのPRを作成
GitHub MCP の `create_pull_request`（base=`main`, head=作業ブランチ）。
- **注意**: このブランチで過去にPRを作っていても、それが**すでにマージ済み**なら、その後の新コミットは入らない。
  新しいコミットを公開するには **新しいPRを作る**こと（同一ブランチでも可）。
- 迷ったら先に `pull_request_read`(method:get) で既存PRの `merged` 状態を確認する。

### 5. マージ
`merge_pull_request`（merge_method:`merge`）で main にマージ。

### 6. main 反映を検証【必須】
```bash
git fetch origin main --quiet
git rev-list --count origin/main..HEAD          # → 0 なら main に全部入った
git show origin/main:<変更ファイル> | grep -c "<追加した目印の文字列>"   # → 1以上
```
`origin/main..HEAD` が 0 で、目印が main 側で見つかればOK。

### 7. ユーザーへ報告
- 公開した旨と PR番号/URL
- 「デプロイ反映に数分」「初回は Service Worker キャッシュで古い表示が残ることがある→スーパーリロード/タブ再起動」も添える

## よくある失敗（過去にやった）
- ❌ PRを作っただけ／push しただけで「反映された」と思い込む → main 未マージで公開されない
- ❌ 既存PRがマージ済みなのに、その後のコミットを新PRにせず放置 → 新機能が main に入らない
- ❌ 畜史の更新を忘れる
→ **必ず手順6の検証（`origin/main..HEAD` が 0）まで実施してから完了報告する。**
