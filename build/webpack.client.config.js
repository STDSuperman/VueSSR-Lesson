const VueSSRClientPlugin = require('vue-server-renderer/client-plugin');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const baseConfig = require('./webpack.base.config');
const path = require('path')

module.exports = webpackMerge.merge(baseConfig, {
    entry: path.resolve(__dirname, '../entry-client.js'),
    optimization: {
        splitChunks: {
            cacheGroups: {
                common: {
                    minChunks: 2,
                    priority: -10,
                    reuseExistingChunk: true
                }
            }
        }
    },
    plugins: [
        new VueSSRClientPlugin()
    ]
})