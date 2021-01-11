const VueSSRClientPlugin = require('vue-server-renderer/client-plugin');
const webpackMerge = require('webpack-merge');
const baseConfig = require('./webpack.base.config');
const path = require('path')
const TerserPlugin = require("terser-webpack-plugin");

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
        },
        minimize: true,
        minimizer: [new TerserPlugin()]
    },
    plugins: [
        new VueSSRClientPlugin()
    ]
})