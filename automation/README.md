# 正論蒔宿の手紙 定期チェック（Mac ローカル発火版）

常時起動の Mac で **5時間ごと**に「正論蒔宿への手紙」(/letter/) を確認し、
利用者の手紙にフィードバックがあれば自動で改修PRを作成、結果を **ntfy で iPhone に通知**します。

- 認証は **あなたのMacのログインをそのまま使用**（`claude` のサブスクログイン＋`gh`）。
  → GitHub の Secret 登録も、`claude setup-token` も**不要**。API 別課金なし。
- マージはしません（PR作成/更新まで）。

## 構成ファイル
| ファイル | 役割 |
|---|---|
| `letter_loop.py` | 本体。手紙取得 → `claude -p` で確認/編集 → 差分があればPR → ntfy通知 |
| `jp.chikumo.letter-loop.plist` | launchd 設定テンプレート（5時間ごとに発火） |

## 前提（Mac に一度だけ用意するもの）
1. **Claude Code CLI**
   ```sh
   # 例: 公式インストール
   curl -fsSL https://claude.ai/install.sh | bash
   claude            # 起動して /login → Pro/Max サブスクでログイン（1回だけ）
   ```
2. **GitHub CLI**
   ```sh
   brew install gh
   gh auth login         # GitHub にログイン（1回だけ）
   gh auth setup-git     # git が gh の認証を使えるようにする
   ```
3. **Python3**（macOS 標準の `/usr/bin/python3` でOK）

## セットアップ手順
1. このリポジトリを Mac のどこかに置く（例 `~/chikumo-site`）。

2. まず手動でテスト実行（通知とPRの動作確認）:
   ```sh
   NTFY_TOPIC=あなたのntfyトピック名 python3 ~/chikumo-site/automation/letter_loop.py
   ```
   - iPhone に「改修なし」または「改修PRあり」の通知が来ればOK。
   - 初回は `~/.cache/chikumo-letter-loop/repo` に作業用クローンが作られます
     （あなたの開発用チェックアウトには触れません）。

3. 定期実行を登録:
   ```sh
   cp ~/chikumo-site/automation/jp.chikumo.letter-loop.plist \
      ~/Library/LaunchAgents/jp.chikumo.letter-loop.plist
   # エディタで __SCRIPT_PATH__ / __NTFY_TOPIC__ / __CLAUDE_BIN__ / __LOG_DIR__ を置換
   #   __CLAUDE_BIN__ は `which claude` の出力を貼る
   launchctl load ~/Library/LaunchAgents/jp.chikumo.letter-loop.plist
   ```
   これで5時間ごとに自動実行されます。

## 動作
1. `~/.cache/chikumo-letter-loop/repo` を最新の `origin/main` に揃える
2. Firebase 公開REST から手紙を取得（`letters.json`）
3. `claude -p` が手紙を確認し、必要なら `letter/` 等を編集（編集のみ）
4. 差分があれば `auto/letter-review` ブランチへ push → `gh pr create`（既存PRなら更新）
5. ntfy 通知（改修PRあり / 改修なし / 失敗）

## 通知の種類
| 結果 | 通知 |
|---|---|
| 改修PRあり | ✉️ PRの作成/更新＋URL |
| 改修なし | ✅ 差分なし |
| 失敗 | ⚠️ エラー内容（ログを確認） |

## 停止・確認
```sh
launchctl unload ~/Library/LaunchAgents/jp.chikumo.letter-loop.plist   # 停止
tail -f ~/Library/Logs/letter-loop.out.log                            # ログ確認
```

## 注意
- **Mac がスリープ中は発火しません**（復帰時にまとめて実行）。常時起動・スリープ抑止推奨。
- `LaunchAgent` はログインセッションで動くため、Mac にログインした状態が必要（Keychain アクセスのため）。
- 6/15 以降、`claude -p`（ヘッドレス）はサブスクの月額クレジット枠から消費。手紙チェックは軽量で枠内想定。
  追加課金を避けたい場合は Console で「追加クレジット(extra usage)」を OFF のままにしておく
  （枠超過時は課金されず停止＝失敗通知で気づける）。
- `NTFY_TOPIC` はリポジトリには書かず、テスト時の環境変数 / launchd の plist（ローカル）にのみ置く。
