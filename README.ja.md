# QRコードリーダー

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-qr-reader/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-qr-reader/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-qr-reader/)

[English README](README.md)

スマートフォンでの使いやすさを重視した、ブラウザ内だけで動作する完全内包型の単一HTML QRコードリーダーです。

## 🚀 デモ

### [GitHub PagesでQRコードリーダーを開く](https://ttomohisa.github.io/htmlapps-qr-reader/)

GitHub Pagesから最初のHTMLを読み込んだ後、カメラ映像・選択画像・QR解析・読み取り結果の判定・履歴保存は端末内で処理されます。読み取った内容や画像をアプリがサーバーへアップロードすることはありません。

## 主な機能

- 起動時に背面カメラを自動で開始
- カメラ映像からQRコードを連続して自動読み取り
- スクリーンショットや保存済み画像からQRコードを読み取り
- コピーした画像をスキャナーへ貼り付けて読み取り（ブラウザーが画像を渡す場合、Ctrl+V / Cmd+V）
- 対応ブラウザではネイティブの `BarcodeDetector` を利用し、非対応時は内包した `jsQR` を使用
- 対応しているカメラ・ブラウザではライトをON / OFF
- 光学ズーム対応時はカメラのズームを利用し、非対応時はデジタルズームへフォールバック
- スライダー、上下スワイプ、ピンチ操作の3種類でズーム
- 複数カメラがある端末ではカメラ切替
- Safe Areaに対応したスマートフォン優先のフルスクリーンUI
- 読み取り結果をアイコン付きで表示し、「開く」「コピー」「共有」を操作可能
- URL / メール / 電話 / SMS / 位置情報 / Wi-Fi / vCard / テキストを判定
- URLを自動では開かず、内容を確認してから操作
- 最大200件の読み取り履歴を端末内に保存・検索
- 履歴一覧から「開く」「コピー」「共有」「削除」を直接操作
- 個別削除と履歴全消去に自前の確認ダイアログを使用
- 1つのHTML内で日本語・英語を切り替え
- SVG faviconをHTML内に埋め込み
- ビルド済みHTMLは実行時の外部通信なし

## すぐに使う

### Webで使う

[デモを開く](https://ttomohisa.github.io/htmlapps-qr-reader/)だけで利用できます。インストールやアカウント登録は不要です。

カメラ利用には通常セキュアコンテキストが必要なため、スマートフォンでカメラ読み取りを使う場合はGitHub PagesなどのHTTPS環境を推奨します。

### 単一HTMLで使う

1. このリポジトリをダウンロードまたはクローンします。
2. Windowsで `build-standalone.bat` を実行します。
3. 生成された `dist/index.html` を開きます。

画像からのQR読み取りは単一HTMLを直接開いても利用できます。カメラについてはブラウザの制約により、`file://` で開いたページでは `getUserMedia()` が利用できず、HTTPSまたは `localhost` が必要になる場合があります。

### 完全内包版をビルドする

1. このリポジトリをダウンロードまたはクローンします。
2. Windows 10/11で `build-standalone.bat` をダブルクリックします。
3. 初回だけ、`dependencies.json` で固定した `jsqr@1.4.0` を取得します。
4. QR解析ライブラリを埋め込んだ `dist/index.html` が生成されます。
5. 2回目以降は、`-ForceDownload` を指定しない限り `.cache` を再利用します。

Python、Node.js、ローカルWebサーバーは不要です。Windows標準のPowerShellと `tar.exe` を使用します。

## 使い方

1. アプリを開き、カメラの使用を許可します。
2. 背面カメラをQRコードへ向けます。自動で読み取ります。
3. 読み取り結果の内容を確認します。
4. 必要に応じて **開く**、**コピー**、**共有** を選びます。
5. カメラではなく画像を使う場合は **画像から** を選ぶか、コピーした画像をスキャナーへ **Ctrl+V / Cmd+V** で貼り付けます。
6. 過去の読み取り結果は **履歴** から確認できます。

### 画像の貼り付け

入力欄にフォーカスがなく、ダイアログが閉じたスキャナー画面で貼り付けます。その貼り付け操作でブラウザーから渡された最初の画像を、通常の画像読み込みと同じ端末内の解析処理で読み取ります。クリップボードのテキストを読み取ったり、貼り付けたURLを取得したり、クリップボードの許可を要求したりしません。画像を渡せないブラウザーでは **画像から** を使ってください。

処理する画像は一度に1枚です。結果を閉じてから次の画像を貼り付けます。同じ画像をすぐに読み直しても結果を表示し、4秒以内の連続した同じ結果は1件の履歴にまとめます。カメラの同一結果は従来どおり1.8秒間の重複検出を抑えます。

### カメラ操作

- **ライト** — 対応端末ではカメラライトをON / OFFします。
- **画像から** — 保存済み画像やスクリーンショットを選択します。
- **履歴** — この端末に保存した読み取り履歴を開きます。
- **カメラ** — 利用可能なカメラを切り替えます。
- **ズームスライダー** — ズーム倍率を細かく調整します。
- **上下スワイプ** — カメラ画面を上下へスワイプしてズームします。
- **ピンチ** — 2本指のピンチ操作でズームします。

ライトや光学ズームを利用できるかどうかは、端末・カメラ・ブラウザが公開している機能に依存します。光学ズームが利用できない場合はデジタルズームへ自動で切り替えます。

### 読み取り履歴

履歴は `localStorage` に保存され、アプリから外部へ送信されません。

- 最大200件の読み取り結果を保持します。
- 日付ごとにグループ表示します。
- 長いURLやテキストは一覧内で収まるよう省略表示します。
- 各履歴から **開く**、**コピー**、**共有**、**削除** を直接実行できます。
- 個別削除と **履歴を全消去** は、自前の確認ダイアログを表示してから実行します。
- ブラウザのサイトデータを削除すると履歴も消えます。

## GitHub Pagesで公開する

このリポジトリには、完全内包版をビルドしてGitHub Pagesへ自動公開するワークフローが含まれています。

1. リポジトリ名を `htmlapps-qr-reader` としてGitHubへプッシュします。
2. **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択します。
3. `main` ブランチへプッシュするか、Actions画面から **Deploy QR Reader to GitHub Pages** を手動実行します。
4. ビルド成功後、`https://ttomohisa.github.io/htmlapps-qr-reader/` で公開されます。

`main` へのプッシュ時には、固定した依存パッケージから `dist/index.html` を再生成し、外部ランタイム参照や未置換プレースホルダーが残っていないことを検査してから公開します。

## 開発とビルド

```text
.
├─ src/index.template.html       # アプリ本体のテンプレート
├─ dependencies.json             # 固定したnpm依存と内包対象
├─ app.config.json               # アプリ情報とビルド設定
├─ build-standalone.bat          # Windows用ビルド入口
├─ build-standalone.ps1          # 単一HTML生成処理
├─ scripts/
│  ├─ check-repository.ps1       # リポジトリ・ビルド検証
│  └─ verify-standalone.ps1      # 生成HTMLの検証
├─ dist/index.html               # ビルド後に生成される公開物
└─ .github/workflows/
   └─ deploy-pages.yml           # GitHub Pagesへの自動公開
```

### 依存ライブラリを更新する

`dependencies.json` のバージョンまたは内包対象のパスを変更し、`build-standalone.bat` を再実行します。

キャッシュを破棄して再取得する場合：

```bat
build-standalone.bat -ForceDownload
```

ビルド処理は以下を自動で行います。

- npm公式レジストリから固定バージョンのtarballを取得
- `jsQR` を生成HTMLへ直接内包
- `dist/dependency-manifest.json` にSHA-256を記録
- 未置換のビルドプレースホルダーを検査
- 外部スクリプト、スタイルシート、frame、CSS URL、module importが残っていないことを検査
- Content Security Policyに `connect-src 'none'` が残っていることを検査
- GitHub Pages用の `dist/.nojekyll` を生成

## プライバシーと通信防止

生成されたHTMLには `connect-src 'none'` を含むContent Security Policyを設定しています。カメラ映像、選択画像、読み取ったQRコードの値、履歴はブラウザ内に留まります。

GitHub Pages版ではページを開くための最初のHTML配信は発生しますが、読み取ったQRコードの内容、画像、カメラフレームをアプリが外部サービスへ送信することはありません。QR解析ライブラリもHTML内に内包して実行します。

ネットワークを完全に切った状態で画像から読み取る場合は、生成済みの `dist/index.html` をローカルで開いてください。

## ブラウザ上の注意事項・制限

- カメラ利用には `getUserMedia()` への対応とブラウザ権限が必要です。
- カメラは通常HTTPSまたは `localhost` が必要で、`file://` では利用できない場合があります。
- ライト、光学ズーム、カメラ切替は端末とブラウザが公開している機能に依存します。
- Web Share APIに対応していないブラウザでは共有ボタンを表示しません。
- 小さい、ぼやけた、コントラストが低い、反射しているQRコードは読み取りにくい場合があります。
- 履歴はブラウザストレージに保存するため、サイトデータ削除やプライベートブラウズの仕様によって消える場合があります。

## 使用ライブラリ

| ライブラリ | バージョン | ライセンス | 用途 |
| --- | ---: | --- | --- |
| jsQR | 1.4.0 | Apache-2.0 | カメラ映像・画像からのQR解析フォールバック |

対応ブラウザでは追加ライブラリを増やさず、ブラウザ標準の `BarcodeDetector` APIも利用します。第三者ライブラリの詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を確認してください。

## ライセンス

Copyright © 2026 ttomohisa

このプロジェクトは [MIT License](LICENSE) で公開されています。

### 自動回帰テスト

Node.js 22以降とPowerShellを用意し、`scripts/check-repository.ps1` を実行します。ビルド後、ソーステンプレート・リポジトリの `qr-reader.html`・生成した `dist/index.html` に対してNodeテストを実行します。ソース変更後の `qr-reader.html` は `./build-standalone.ps1 -OutputPath qr-reader.html` で再生成してください。通常の単一HTMLビルドにはNode.jsは不要です。

合成QRデータを実際に内包したjsQR 1.4.0で解析し、画像貼り付け・再読み取り・同時処理・解放処理・履歴・URL安全性を確認します。DOM、canvas、画像コーデック、カメラの境界はテスト用の代替であり、Android/iOS実機でのカメラ・クリップボード・表示確認は別途必要です。
