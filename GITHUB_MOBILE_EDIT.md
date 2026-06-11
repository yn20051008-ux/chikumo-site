# スマホ編集メモ

## 入口

- サイト: https://chikumo.jp/
- リポジトリ: https://github.com/yn20051008-ux/chikumo-site
- ブラウザ版VS Code: https://github.dev/yn20051008-ux/chikumo-site

## どのファイルを直すか

| 直したい場所 | ファイル |
|---|---|
| トップページ | `index.html` |
| 作品一覧 | `story/index.html` |
| 第1話 | `story/01/index.html` |
| 第2話 | `story/02/index.html` |
| はじまり | `hajimari/index.html` |
| 十四式 | `jusshiki/index.html` |
| 観測ログ | `observer-log/index.html` |
| PWA設定 | `manifest.json` |
| サイトマップ | `sitemap.xml` |

## スマホでの最短手順

1. https://github.dev/yn20051008-ux/chikumo-site を開く
2. 目的のHTMLを開いて編集する
3. 左メニューの Source Control を開く
4. 変更内容を確認する
5. commit message を入れる
6. Commit & Push を押す
7. https://chikumo.jp/ を開き直して反映を確認する

## 反映されない時

- 数分待ってから再読み込みする
- Safari/Chromeのキャッシュを消す
- `sw.js` が効いているため、PWAとして追加済みの場合は一度アプリを閉じて開き直す
- GitHub Pagesの状態を見る: https://github.com/yn20051008-ux/chikumo-site/deployments

## Codex連携

Codex側からリポジトリ、PR、Issueを直接扱うには、Codex GitHub Appを `yn20051008-ux/chikumo-site` にインストールしてアクセスを許可する必要があります。

`gh` CLI経由の操作はこのMac上では可能です。
