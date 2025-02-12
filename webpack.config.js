const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        entry: {
            'bundle': './src/index.js'
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            //filename: isProduction ? 'scrollage.min.js' : 'scrollage.js'
            filename: 'scrollage.min.js'
        },
        devtool: isProduction ? false : 'source-map',
        module: {
            rules: [
                {
                    test: /\.scss$/,
                    use: [
                        MiniCssExtractPlugin.loader, // Extracts CSS into separate file
                        'css-loader',  // Handles CSS imports
                        'sass-loader'  // Compiles SCSS to CSS
                    ]
                }
            ]
        },
        optimization: {
            minimize: isProduction,
            minimizer: [
                new TerserPlugin({
                    extractComments: {
                        filename: 'LICENSE.txt',
                    }
                })
            ]
        },
        plugins: [
            new MiniCssExtractPlugin({
                //filename: isProduction ? 'scrollage.min.css' : 'scrollage.css'
                filename: 'scrollage.min.css'
            })
        ],
        watch: !isProduction
    }
};