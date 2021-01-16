const { createBundleRenderer } = require('vue-server-renderer');
const express = require('express');
const app = express();
const router = express.Router();
const chalk = require('chalk');
const fs = require('fs');
const template = fs.readFileSync('./index.html', 'utf-8')
const path = require('path');
const webpack = require('webpack');
let clientManifest = require(path.resolve(__dirname, 'dist', 'vue-ssr-client-manifest.json'));
let serverBundle = require(path.resolve(__dirname, 'dist', 'vue-ssr-server-bundle.json'));
const WebpackDevMiddleware = require('webpack-dev-middleware');
const WebpackHotMiddleware = require('webpack-hot-middleware');
const clientWebpackConfig = require('./build/webpack.client.config');
const serverWebpackConfig = require('./build/webpack.server.config')
const clientCompiler = webpack(clientWebpackConfig);
const serverCompiler = webpack(serverWebpackConfig);
let renderer = {};
let buildCount = 0;

// 客户端构建
const clientMiddleware = WebpackDevMiddleware(clientCompiler)
app.use(clientMiddleware);

clientCompiler.hooks.done.tap('compilerDone', () => {
    console.log('客户端构建完成')
    clientManifest = JSON.parse(clientMiddleware.context.outputFileSystem.readFileSync(path.join(clientWebpackConfig.output.path, 'vue-ssr-client-manifest.json')).toString())
    runBuildRenderer();
})

// 服务端构建
const serverMiddleware = WebpackDevMiddleware(serverCompiler)
app.use(serverMiddleware);
serverCompiler.hooks.done.tap('compilerDone', () => {
    console.log('服务端构建完成')
    serverBundle = JSON.parse(serverMiddleware.context.outputFileSystem.readFileSync(path.join(clientWebpackConfig.output.path, 'vue-ssr-server-bundle.json')).toString())
    runBuildRenderer();
})

function runBuildRenderer(init = false) {
    buildCount++;
    if (!init && buildCount < 2) return;
    if (clientManifest && serverBundle) {
        buildCount = 0;
        console.log('新的renderer已产生')
        renderer = createBundleRenderer(serverBundle, {
            template,
            clientManifest,
            runInNewContext: false
        })
    }
}

app.use(WebpackHotMiddleware(clientCompiler, { log: false }));

app.use(express.static(path.resolve(__dirname, './dist')))

runBuildRenderer(true);

router.get('*', (req, res) => {
    const context = { url: req.url };
    renderer.renderToString(context, (err, html) => {
        if (err) res.send(err);
        res.send(html);
    })
})

app.use(router);

app.listen(3000, function() {
    console.log(
        'App runing at:',
        `Local: ${ chalk.blueBright.underline('http://localhost:3000') }`
    )
});