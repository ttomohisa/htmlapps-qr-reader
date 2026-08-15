# QRコードリーダー

スマホ操作を重視した、完全内包型の単一HTML QRコードリーダーです。

## 主な機能

- 起動時に背面カメラを開始
- カメラ映像からQRコードを自動読み取り
- スクリーンショット・保存済み画像から読み取り
- ライト制御（対応端末のみ）
- 光学ズーム対応時はカメラのズームを使用
- 非対応時はデジタルズームへフォールバック
- ズームスライダー、上下スワイプ、ピンチ操作
- カメラ切替
- 読み取り履歴（localStorage、最大200件）
- URL / メール / 電話 / SMS / 位置情報 / Wi-Fi / vCard / テキストを判定
- URLは自動で開かず、読み取り結果を確認してから操作
- 日本語 / 英語切替
- 実行時の外部通信なし

## ビルド

Windows 10/11 で `build-standalone.bat` を実行してください。

初回ビルド時だけ npm から `jsqr@1.4.0` を取得し、`dist/index.html` 内へ埋め込みます。2回目以降は `.cache` を利用します。

```text
build-standalone.bat
```

生成物:

- `dist/index.html` — 配布用の完全内包HTML
- `dist/dependency-manifest.json` — 内包依存とハッシュ

## GitHub Pages

`.github/workflows/deploy-pages.yml` を含んでいます。最初にリポジトリの **Settings → Pages → Source** を **GitHub Actions** に設定してください。

カメラ利用はブラウザーの制約上、GitHub PagesなどのHTTPS環境での利用を推奨します。画像からの読み取りはカメラ権限なしでも利用できます。

## プライバシー

カメラフレーム、選択画像、読み取り結果はブラウザー内で処理します。配布用HTMLではCSPの `connect-src 'none'` により実行時通信を遮断します。

## ライセンス

本アプリは MIT License。QR解析に `jsQR`（Apache-2.0）を使用します。詳細は `THIRD_PARTY_NOTICES.md` を参照してください。
