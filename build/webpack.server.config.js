const webpackMerge = require('webpack-merge');
const baseConfig = require('./webpack.base.config');
const path = require('path');
const VueSSRServerPlugin = require('vue-server-renderer/server-plugin')
const nodeExternals = require('webpack-node-externals')

module.exports = webpackMerge.merge(baseConfig, {
    entry: path.resolve(__dirname, '../entry-server.js'),
    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: 'server-bundle.js',
        libraryTarget: 'commonjs2'
    },
    target: 'node',
    externals: nodeExternals({
        allowlist: [/\.css$/]
    }),
    devtool: 'source-map',
    plugins: [new VueSSRServerPlugin()]
})