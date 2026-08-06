#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
正論蒔宿の手紙 定期チェック（Mac ローカル発火版）

launchd から5時間ごとに実行され、以下を行う:
  1. 「みんなの手紙」(Firebase) を取得
  2. claude -p で手紙を確認し、必要なら letter/ を改修（Claude はファイル編集のみ）
  3. 差分があれば ブランチ作成→commit→push→gh で PR 作成/更新（★マージはしない）
  4. 結果を ntfy で iPhone に通知（改修あり / 改修なし / 失敗）

認証（このスクリプトは“あなたのMacのログイン”をそのまま使う。トークンの埋め込みは無し）:
  - Claude … ローカルで `claude` に /login 済みのサブスクを使用（API キー不要・別課金なし）
  - GitHub … `gh auth login` 済みの認証を使用（PR 作成に使う）

設定（環境変数。launchd の EnvironmentVariables から渡す）:
  - NTFY_TOPIC : ntfy のトピック名（必須。iPhone で購読中のもの）
  - NTFY_URL   : 省略時 https://ntfy.sh
  - CLAUDE_BIN : 省略時 "claude"
  - GH_BIN     : 省略時 "gh"

手動テスト:
  NTFY_TOPIC=あなたのトピック python3 automation/letter_loop.py
"""

import json
import os
import subprocess
import sys
import urllib.request

REPO_URL = "https://github.com/yn20051008-ux/chikumo-site.git"
BASE = "main"
BRANCH = "auto/letter-review"
FIREBASE = ("https://chikumonogatarikiroku-default-rtdb.asia-southeast1."
            "firebasedatabase.app/letters/makiyado.json")
# ユーザーの開発用チェックアウトを汚さないよう、自動処理は専用クローンで行う
WORK_DIR = os.path.expanduser("~/.cache/chikumo-letter-loop/repo")

CLAUDE_BIN = os.environ.get("CLAUDE_BIN", "claude")
GH_BIN = os.environ.get("GH_BIN", "gh")
NTFY_TOPIC = os.environ.get("NTFY_TOPIC", "").strip()
NTFY_URL = os.environ.get("NTFY_URL", "https://ntfy.sh").rstrip("/")

PROMPT = """\
あなたは静的サイト「畜物語」(chikumo.jp) の、ページ「正論蒔宿への手紙」(/letter/) の
定期レビュー担当です。利用者が投稿した手紙の中にあるフィードバックを読んで、
サイト改修で対応できるものがあれば最小限の安全な変更を行ってください。

【入力ファイル】
- ./letters.json … 「みんなの手紙」の現在の内容（Firebaseから取得）。
  形は { "<id>": { "flag":"🇯🇵", "name":"なまえ", "msg":"本文", "ts":166... }, ... }
- ./letter/index.html … 手紙ページ本体（HTML+JSの単一ファイル）

【手順】
1. letters.json を読み、各手紙の本文(msg)・なまえ(name)を確認する。
2. 「テスト」「てすと」「test」「動作確認」など動作確認目的の投稿や、
   意味をなさない投稿は対象外として無視する。
3. サイトへの実フィードバック（アイデア・要望・不具合報告）があり、かつ
   コード改修で対応できる内容なら、関連ファイル（主に letter/index.html、
   必要なら他のファイルも）を編集して対応する。
4. 改修すべき内容が無ければ、ファイルを一切変更しないこと（変更が無ければPRは作られません）。

【厳守事項】
- git の commit / push / ブランチ作成 / PR作成 を自分で実行しないこと。
  あなたはワーキングツリーのファイルを編集するだけ。後続処理が差分をPR化します。
- letters.json は編集・追加しないこと（実行時の一時ファイルです）。
- main を壊す変更や、無関係の大規模リファクタはしないこと。最小限・安全な変更に限る。
- 既存の挙動（投稿・上書き・国旗ピッカー・NGフィルタ等）を壊さないこと。
- HTMLのインライン<script>を編集したら `node --check` 相当で構文を確認すること。
"""


def sh(cmd, cwd=None, check=True):
    """サブコマンドを実行。check=True で失敗時に例外。"""
    p = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    if check and p.returncode != 0:
        raise RuntimeError(
            "コマンド失敗: %s\n--- stdout ---\n%s\n--- stderr ---\n%s"
            % (" ".join(cmd), p.stdout, p.stderr)
        )
    return p


def notify(title, message, priority=3, tags="incoming_envelope"):
    """ntfy に通知をPOST（JSON発行形式＝日本語・絵文字も安全）。"""
    print("[notify] %s | %s" % (title, message))
    if not NTFY_TOPIC:
        print("  NTFY_TOPIC 未設定のため通知をスキップ")
        return
    body = json.dumps(
        {"topic": NTFY_TOPIC, "title": title, "message": message,
         "priority": priority, "tags": tags.split(",")}
    ).encode("utf-8")
    try:
        req = urllib.request.Request(
            NTFY_URL, data=body, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=20).read()
    except Exception as e:  # 通知失敗は本処理を止めない
        print("  ntfy 通知失敗:", e)


def ensure_repo():
    """専用クローンを最新の origin/main に揃える（無ければクローン）。"""
    if not os.path.isdir(os.path.join(WORK_DIR, ".git")):
        os.makedirs(os.path.dirname(WORK_DIR), exist_ok=True)
        sh(["git", "clone", REPO_URL, WORK_DIR])
    sh(["git", "fetch", "origin", BASE], cwd=WORK_DIR)
    sh(["git", "checkout", "-B", BASE, "origin/%s" % BASE], cwd=WORK_DIR)
    sh(["git", "reset", "--hard", "origin/%s" % BASE], cwd=WORK_DIR)
    sh(["git", "clean", "-fd"], cwd=WORK_DIR)


def fetch_letters():
    """Firebase 公開REST から手紙一覧を取得。失敗時は空 {} として続行。"""
    try:
        with urllib.request.urlopen(FIREBASE, timeout=30) as r:
            data = r.read().decode("utf-8")
        json.loads(data)  # 妥当性チェック（壊れていれば例外）
        return data
    except Exception as e:
        print("手紙の取得に失敗（空として続行）:", e)
        return "{}"


def run_claude():
    """claude -p で手紙を確認・必要なら編集（ファイル編集のみ許可）。"""
    cmd = [
        CLAUDE_BIN, "-p", PROMPT,
        "--allowedTools",
        "Read,Edit,Write,Bash(node:*),Bash(cat:*),Bash(grep:*),Bash(ls:*)",
    ]
    p = subprocess.run(cmd, cwd=WORK_DIR, text=True, capture_output=True)
    if p.stdout:
        print("[claude stdout 末尾]\n", p.stdout[-2000:])
    if p.returncode != 0:
        print("[claude stderr 末尾]\n", (p.stderr or "")[-2000:])
        raise RuntimeError("claude -p が失敗（終了コード %d）" % p.returncode)


def has_changes():
    return bool(sh(["git", "status", "--porcelain"], cwd=WORK_DIR).stdout.strip())


def open_or_update_pr():
    """差分を専用ブランチへ push し、PR を作成 or 既存PRを更新。URLと操作種別を返す。"""
    sh(["git", "checkout", "-B", BRANCH], cwd=WORK_DIR)
    sh(["git", "add", "-A"], cwd=WORK_DIR)
    sh(["git",
        "-c", "user.name=chikumo-bot",
        "-c", "user.email=chikumo-bot@users.noreply.github.com",
        "commit", "-m", "letter: 手紙のフィードバックにもとづく自動改修"],
       cwd=WORK_DIR)
    # auto/letter-review はこの自動処理が専有するブランチなので force で更新してよい
    sh(["git", "push", "--force", "-u", "origin", BRANCH], cwd=WORK_DIR)

    # 既存のオープンPRがあれば、その URL を返す（force-push で内容は更新済み）
    existing = sh([GH_BIN, "pr", "list", "--head", BRANCH, "--base", BASE,
                   "--state", "open", "--json", "url",
                   "--jq", ".[0].url // \"\""], cwd=WORK_DIR, check=False)
    url = (existing.stdout or "").strip()
    if url:
        return url, "updated"

    created = sh([GH_BIN, "pr", "create", "--base", BASE, "--head", BRANCH,
                  "--title", "🤖 正論蒔宿の手紙：自動レビューによる改修",
                  "--body",
                  ("定期チェック（5時間ごと）で、手紙のフィードバックにもとづく改修が"
                   "検出されたため自動作成/更新されたPRです。\n\n"
                   "- 変更内容は diff を確認してください。\n"
                   "- 問題なければマージしてください（自動マージはしません）。")],
                 cwd=WORK_DIR)
    return created.stdout.strip().splitlines()[-1], "created"


def main():
    if not NTFY_TOPIC:
        print("警告: NTFY_TOPIC が未設定です（通知は飛びません）。")
    try:
        ensure_repo()
        letters = fetch_letters()
        with open(os.path.join(WORK_DIR, "letters.json"), "w",
                  encoding="utf-8") as f:
            f.write(letters)

        run_claude()

        # letters.json は成果物に含めない（差分判定の前に必ず除去）
        lp = os.path.join(WORK_DIR, "letters.json")
        if os.path.exists(lp):
            os.remove(lp)

        if not has_changes():
            notify("正論蒔宿の手紙：改修なし",
                   "手紙を確認しましたが、対応すべき改修はありませんでした（差分なし）。",
                   priority=2, tags="white_check_mark")
            print("差分なし。終了。")
            return

        url, op = open_or_update_pr()
        notify("正論蒔宿の手紙：改修PRあり",
               "手紙のフィードバックで改修PRを%sしました。マージ判断をどうぞ → %s"
               % ("更新" if op == "updated" else "作成", url),
               priority=4, tags="incoming_envelope")
        print("PR %s: %s" % (op, url))

    except Exception as e:
        notify("手紙チェック：失敗",
               "Macローカル実行でエラーが発生しました: %s" % e,
               priority=5, tags="warning")
        print("ERROR:", e)
        sys.exit(1)


if __name__ == "__main__":
    main()
