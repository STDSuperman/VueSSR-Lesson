const { createBundleRenderer } = require('vue-server-renderer');
const express = require('express');
const app = express();
const router = express.Router();
const chalk = require('chalk');
const fs = require('fs');
const template = fs.readFileSync('./index.html', 'utf-8')
const path = require('path');
const webpack = require('webpack');
const WebpackDevMiddleware = require('webpack-dev-middleware');
const clientWebpackConfig = require('./build/webpack.client.config');
const serverWebpackConfig = require('./build/webpack.server.config')
const clientCompiler = webpack(clientWebpackConfig);
const serverCompiler = webpack(serverWebpackConfig);

app.use(WebpackDevMiddleware(clientCompiler, { serverSideRender: true }));
app.use(WebpackDevMiddleware(serverCompiler, { serverSideRender: true }));

app.use(express.static(path.resolve(__dirname, './dist')))

function getFileChunk(filename, outputPath, assets = []) {
    return assets.find(asset => {
        if (asset.name === filename) {
            return require(path.resolve(outputPath, asset.name));
        }
    });
}

router.get('/', (req, res) => {
    const { devMiddleware } = res.locals.webpack;
    const { outputPath, assets } = devMiddleware.stats.toJson();
    const clientManifest = getFileChunk('vue-ssr-client-manifest.json', outputPath, assets)
    const serverBundle = getFileChunk('vue-ssr-server-bundle.json', outputPath, assets)
    const context = {};
    createBundleRenderer(serverBundle, {
        template,
        clientManifest,
        runInNewContext: false
    }).renderToString(context)
    .then(html => res.send(html))
    .catch(err => {
        console.log(chalk.red(err));
        res.send('服务器异常');
    });
})

app.use(router);

app.listen(3000, function() {
    console.log(
        'App runing at:',
        `Local: ${ chalk.blueBright.underline('http://localhost:3000') }`
    )
});