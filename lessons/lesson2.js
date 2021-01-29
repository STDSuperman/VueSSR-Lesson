const { createBundleRenderer } = require('vue-server-renderer');
const express = require('express');
const app = express();
const router = express.Router();
const chalk = require('chalk');
const fs = require('fs');
const template = fs.readFileSync('./index.html', 'utf-8')
const path = require('path');
let clientManifest = require(path.resolve(__dirname, '../dist', 'vue-ssr-client-manifest.json'));
let serverBundle = require(path.resolve(__dirname, '../dist', 'vue-ssr-server-bundle.json'));

app.use(express.static(path.resolve(__dirname, '../dist')));

router.get('*', (req, res) => {
    const context = { url: req.url };
    const renderer = createBundleRenderer(serverBundle, {
        template,
        clientManifest,
        runInNewContext: false
    });
    renderer.renderToString(context, (err, html) => {
        if (err) {
            if (err.code === 404) {
                return res.end('404 Not Found');
            }
            console.log(err)
        };
        res.setHeader('Content-Type', 'text/html')
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