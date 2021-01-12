const VueSSRClientPlugin = require('vue-server-renderer/client-plugin');
const webpackMerge = require('webpack-merge');
const baseConfig = require('./webpack.base.config');
const path = require('path')
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require('webpack')

const hotModuleScript = 'webpack-hot-middleware/client?path=/__webpack_hmr&timeout=10000&reload=true'

module.exports = webpackMerge.merge(baseConfig, {
    entry: [hotModuleScript, path.resolve(__dirname, '../entry-client.js')],
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
        new VueSSRClientPlugin(),
        new webpack.HotModuleReplacementPlugin()
    ]
})