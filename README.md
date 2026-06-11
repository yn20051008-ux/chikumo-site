# 畜物語 / chikumo-site

畜物語サイト本体の静的ファイルを管理するリポジトリです。

- 公開URL: https://chikumo.jp/
- GitHub: https://github.com/yn20051008-ux/chikumo-site
- スマホ編集入口: https://github.dev/yn20051008-ux/chikumo-site

## スマホで編集する

1. スマホで https://github.dev/yn20051008-ux/chikumo-site を開く
2. GitHub にログインする
3. 編集したいHTMLファイルを開く
4. 左側の Source Control から変更内容を確認する
5. メッセージを入れて Commit & Push する
6. 数十秒から数分後に https://chikumo.jp/ に反映される

直接1ファイルだけ直す場合は、GitHubのWeb編集も使えます。

- トップページ: https://github.com/yn20051008-ux/chikumo-site/edit/main/index.html
- 作品一覧: https://github.com/yn20051008-ux/chikumo-site/edit/main/story/index.html
- 第1話: https://github.com/yn20051008-ux/chikumo-site/edit/main/story/01/index.html
- 第2話: https://github.com/yn20051008-ux/chikumo-site/edit/main/story/02/index.html

## 公開設定

GitHub Pages は `main` ブランチのルート `/` を公開元にしています。

- Custom domain: `chikumo.jp`
- CNAME file: `CNAME`
- Pages URL: https://chikumo.jp/

## Codex から扱う時

この環境では `gh` CLI でGitHub操作できます。CodexのGitHub App連携としてPRやIssueを直接扱うには、対象リポジトリへGitHub Appのアクセス許可が必要です。

現在の基本作業ディレクトリ:

```bash
cd /Users/siojakieiseuke/chikumo-site
```

よく使う確認:

```bash
git status --short --branch
git remote -v
gh repo view yn20051008-ux/chikumo-site
```
