
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    mode: 'production',
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
        })
    ],
    resolve: {
        extensions: ['.vue', '.js'],
        alias: {
            '@': path.resolve(__dirname, '../src')
        }
    }
}