# DonPaChi FPS iPhone実機テスト手順

このプロジェクトはCapacitorでiOSアプリの箱を生成済みです。App Store公開ではなく、自分のiPhoneに無料で入れて試す用途です。

## 事前準備

1. Mac App StoreからXcodeをインストールします。
2. Xcodeを一度起動して、追加コンポーネントのインストールを完了します。
3. ターミナルでXcodeを有効化します。

```sh
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

## Web変更をiOS側へ反映

Web側を変更した後は、次のコマンドでiOSプロジェクトへコピーします。

```sh
npm run ios:sync
```

## XcodeでiPhoneに入れる

1. iPhoneをUSBでMacに接続します。
2. iPhone側で「このコンピュータを信頼」を許可します。
3. Xcodeで次を開きます。

```sh
open ios/App/App.xcodeproj
```

4. Xcode左上の実行先で自分のiPhoneを選びます。
5. `App` ターゲットの `Signing & Capabilities` を開きます。
6. `Automatically manage signing` をオンにします。
7. `Team` で自分のApple IDの `Personal Team` を選びます。
8. `Bundle Identifier` が他人と被る場合は、例のように少し変えます。

```text
com.hideo2112.donpachifps
```

9. Xcode左上の再生ボタンを押してiPhoneへ入れます。

## 注意

- 無料のPersonal Teamは、自分の端末で試す用途です。
- App Store公開やTestFlight配布にはApple Developer Programが必要です。
- オンライン対戦サーバーはRenderの `https://toybox-fps-arena.onrender.com` を使います。
- Xcodeを入れるまでは、このMacでは実機ビルドできません。
