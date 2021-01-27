const Vue = require('vue');
const { createRenderer } = require('vue-server-renderer');
const express = require('express');
const chalk = require('chalk')

const server = express();
const app = new Vue({
    template: '<div>这里是服务端渲染Demo</div>'
});

const renderer = createRenderer();
server.use((req, res) => {
    renderer.renderToString(app, (err, html) => {
        if (err) throw err;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
    })
})

server.listen(3000, () => {
    console.log(
        'App runing at:',
        `Local: ${ chalk.blueBright.underline('http://localhost:3000') }`
    )
});