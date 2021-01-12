
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack')

module.exports = {
    mode: 'development',
    module: {
        rules: [
            { test: /\.js$/, loader: 'babel-loader' },
            { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
            { test: /\.scss$/, loader: 'sass-loader' },
            { test: /\.vue$/, loader: 'vue-loader' },
        ]
    },
    plugins: [
        new VueLoaderPlugin(),
        new MiniCssExtractPlugin({
            filename: 'css/[name].[contenthash:8].css'
        }),
        new webpack.NoEmitOnErrorsPlugin()
    ],
    stats: {
        logging: 'none'
    },
    resolve: {
        extensions: ['.vue', '.ts', '.js'],
        alias: {
            '@': path.resolve(__dirname, '../src')
        }
    }
}