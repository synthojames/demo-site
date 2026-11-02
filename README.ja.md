# demo-site

[English](README.md) | **日本語**

**ヘッドレスCMS型コーポレートサイト**のデモです。「コンテンツの変更」と「コードの変更」を分離した変更管理モデルを示します。架空の企業(株式会社サンプルマーケット)を題材に、少人数のIT部門が、非エンジニアによるテキスト公開を安全に許可しつつ、インフラとコードをレビュー下に置く方法を実演します。

**技術スタック:** [Sanity](https://www.sanity.io/)(CMS)・[Astro](https://astro.build/)(静的サイト)・[Cloudflare](https://developers.cloudflare.com/workers/static-assets/)(Wrangler経由のホスティング)・GitHub Actions(CI/CD)・Terraform(リポジトリのガバナンス)

## 仕組み

```
 編集者 ──► Sanity Studio ──公開──► repository_dispatch (sanity-publish)
                                            │
                                            ▼
                       deploy-content.yml: 「最後に承認されたコード」を
                       新しいコンテンツでビルド ─► Cloudflare
 開発者 ─► PR ─► チェック + ITレビュー ─► main ─► deploy.yml
                                    (本番承認) ─► Cloudflare
```

- **コンテンツ**はSanityに保存され、ビルド時に取得されます(`src/lib/sanity.ts`)。サイトは完全な静的サイトです。
- **コンテンツの公開**はレビュアーなしで自動デプロイされます。テキストに対する統制は、Sanity自体のロール、下書き/公開の区別、スキーマのフィールド制限で行います。コンテンツのビルドは、本番デプロイに成功した最新のコミットを使うため、未レビューのコードがコンテンツ経路で公開されることはありません。
- **コードの変更**は、プルリクエスト、必須チェック、CODEOWNERSによるレビューを通り、本番デプロイには環境の承認が必要です。
- **整合性監視:** デプロイのたびに、配信ファイルのSHA-256マニフェストを記録します。スケジュール実行のワークフローが1時間に2回、公開サイトとマニフェストを突き合わせ、不一致があれば失敗します。

## リポジトリ構成

| パス | 内容 |
|---|---|
| `src/` | Astroサイト: `index`(ホーム)、`[slug]`(CMSページ)、`news` と `news/[id]` |
| `studio/` | Sanity Studioプロジェクトとスキーマ(`page`、`newsItem`) |
| `terraform/` | GitHubのリポジトリ設定、ブランチルールセット、デプロイ環境をコード化 |
| `scripts/` | 整合性チェック用の `make-manifest.sh` と `verify-manifest.sh` |
| `.github/workflows/` | CI/CDパイプライン(後述) |
| `.github/CODEOWNERS` | レビュー担当の定義(重要パスには追加行あり) |
| `wrangler.jsonc` | Cloudflareのデプロイ設定(`./dist` を配信) |

## コンテンツモデル

`studio/schemaTypes/` で定義しています。編集者に対する主なガードレールはフィールド制限です。

- **ページ**(`page`): 管理用タイトル、スラッグ、見出し(最大60文字)、本文(必須、最大400文字)。スラッグは半角英小文字・数字・ハイフンのみです。`news` は予約済みで、スラッグ `home` は `/` で配信されます。
- **お知らせ**(`newsItem`): タイトル(最大80文字)、公開日、本文(任意)。一覧は `/news`、詳細は `/news/<id>/` です。

Astroのビルドでもページのスラッグ(形式、重複、予約語)を検証し、不正なページは公開せずにビルドを失敗させます。

## ローカル開発

Nodeが必要です(`.nvmrc` を参照。`package.json` では `>=22.23.4`)。

```bash
# サイト
npm ci --ignore-scripts
npm run dev        # http://localhost:4321
npm run build      # ./dist に出力
npm run preview

# Studio(別プロジェクト。Node 24以上が必要)
cd studio
npm ci
npm run dev        # Sanity Studioをlocalhostで起動
```

ビルドは `src/lib/sanity.ts` で設定されたSanityプロジェクトから公開済みコンテンツを取得し、`home` ページが存在しない場合は失敗します。

## CI/CDワークフロー

| ワークフロー | トリガー | 目的 |
|---|---|---|
| `pr-checks.yml` | `main` へのプルリクエスト | `npm audit`(本番依存、high以上)とビルド。ジョブ名 `Build and audit` は必須ステータスチェックです。 |
| `deploy.yml` | `main` へのpush | ビルドし、`production` 環境(承認必須)を経てCloudflareへデプロイ、その後に整合性マニフェストを記録します。 |
| `deploy-content.yml` | `repository_dispatch`(`sanity-publish`) | `main` で最後にデプロイ成功したコミットを探し、新しいコンテンツで再ビルドして `content-publish` 環境(レビュアーなし)経由でデプロイし、マニフェストを記録します。 |
| `integrity-check.yml` | 30分ごと(毎時17分・47分)および手動 | 公開サイトを記録済みマニフェストと比較します。デプロイ中の可能性に備え、失敗時は90秒後に1回再試行します。 |

サプライチェーン対策: アクションはコミットSHAで固定し、ワークフローの権限は既定で無し(ジョブごとに付与)、依存関係は `--ignore-scripts` でインストールします。

## ガバナンス(Terraform)

`terraform/` でGitHubリポジトリ自体を管理しています。

- スカッシュマージのみ。マージ後にブランチを削除。
- シークレットスキャン、プッシュ保護、脆弱性アラートを有効化。
- **`main-hard-rules` ルールセット:** 削除と強制pushを禁止し、PRを必須化。`Build and audit` チェックの成功とブランチの最新化が必要です。バイパス不可。
- **`main-review` ルールセット:** コードオーナーによる承認1件が必要で、pushすると古い承認は無効になります。バイパスできるのはリポジトリ管理者のみで、PR経由に限ります。
- **環境:** `production`(必須レビュアーあり、`main` に限定)と `content-publish`(レビュアーなし、`main` に限定)。

> 1人で運用するデモのため、`production` では `prevent_self_review` を無効にしています。実運用では有効にし、承認者を2名以上にして、重要パスのCODEOWNERSにセキュリティチームを加えます。

リポジトリは公開されているため、stateファイルと `*.tfvars` はgit管理から除外しています。GitHubトークンは環境変数 `GITHUB_TOKEN` から読み込むため、コミットしないでください。

```bash
cd terraform
export GITHUB_TOKEN=...   # リポジトリ管理者権限のトークン
terraform init
terraform plan
```

## 必要な設定

| 場所 | 名前 | 用途 |
|---|---|---|
| GitHubシークレット | `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` | Wranglerによるデプロイ |
| GitHub変数 | `SITE_URL` | 整合性チェックの対象URL |
| Sanity | GitHubのdispatches APIへのWebhook(イベントタイプ `sanity-publish`) | 公開時に `deploy-content.yml` を起動 |
