# MOCHI TYPE

60秒の日本語ローマ字タイピングゲーム。既存のFPSを残し、独立した `/typing.html` に追加しています。

```sh
# クラウド環境で用意した Node.js 22 を有効にする
source /workspace/.cloud-onboarding/toybox-fps-arena/activate.sh
npm run dev:typing
```

ポート5190のトップページを開くとゲームが表示されます。既存の `npm run dev` / `npm start` では `/typing.html` で遊べます。本番配信前は `npm run build` を実行してください。

- Spaceまたはスタートボタンで開始。IMEをOFFにしてローマ字入力。
- 3段階の難易度と82個のお題。`shi/si`, `chi/ti`, `tsu/tu`, `sha/sya`, 子音の重ね打ちや `ltu/xtu` などに対応。
- ミスなしでお題を10こ完成すると、8秒間スコアが2倍。ミスしても入力済みの文字は消えません。
- Escで一時停止。タブを離れても残り時間は減りません。
- 累計20・50・100・200こで新しいもちが図鑑に登場。記録はlocalStorageに保存。今日のミッションは日本時間で日付を判定します。
- スマートフォンは英字キーボードを使い、ローマ字部分をタップして入力します。
- 効果音はWeb Audioで生成。画像・フォントは同梱しており、外部API・アカウント登録は不要です。

```sh
npm run test:typing
npm run check
npm run build
```

ゲームルールは `typing-systems.mjs`、UIは `src/typing/` にあります。イラストは本ゲーム用に生成した素材です。丸ゴシックはM PLUS Rounded 1c（SIL Open Font License、`public/typing/fonts/OFL.txt`）です。
