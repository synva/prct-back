# prct用簡易backend

## 環境構築

- install node.js

- install mongodb

``` bash
# 以下はmacの手順で、windowsは適切調べてください

# install
brew install mongodb-community
# start service
brew services start mongodb-community
# コマンドでDBにつなぐ
mongo
# コレクション指定
use prct
# ユーザー作成
db.createUser({
  user: "prct",
  pwd: "password",
  roles: [{role: "readWrite", db: "idrims"}]
})
# exit mongo
exit
```

## install dependencies

``` bash
cd /your/path/like/desktop/prct-back
yarn install
```

## backend起動

### if linux

``` bash
cd /your/path/like/desktop/prct-back
yarn start
```

### if windows

環境変数に`NODE_ENV`を追加、あたいは"development"

``` bash
cd /your/path/like/desktop/prct-back
npm run windev
```

# 注意

Typescriptではなく、PureなJavascriptです。
ソースコードを修正する度に、サービスを再起動する必要があります。
mongodbのGUIについてはMongoDB Compassをおすすめ
