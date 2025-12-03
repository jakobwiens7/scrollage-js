const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return [

        // ES Module Build
        {
            entry: './src/index.js',
            experiments: { outputModule: true },
            output: {
                path: path.resolve(__dirname, 'dist'),
                filename: 'scrollage.esm.js',
                library: { type: 'module' },
                module: true
            },
            module: {
                rules: [{
                    test: /\.scss$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        'css-loader',
                        {
                            loader: 'sass-loader',
                            options: {
                                implementation: require('sass')
                            }
                        }
                    ]
                }]
              },
              optimization: {
                    minimize: false // Disable minification completely
              },
              plugins: [
                new MiniCssExtractPlugin({
                    filename: 'scrollage.css' // Unminified CSS
                })
            ]
        },
  
        // Traditional Browser Build (UMD)
        {
            entry: './src/index.js',
            output: {
                path: path.resolve(__dirname, 'dist'),
                filename: isProduction ? 'scrollage.min.js' : 'scrollage.js',
                //filename: 'scrollage.min.js',
                library: {
                    name: 'Scrollage',
                    type: 'umd',
                    export: 'default'
                },
                globalObject: 'this'
            },
            module: {
                rules: [{
                    test: /\.scss$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        'css-loader',
                        {
                            loader: 'sass-loader',
                            options: {
                                implementation: require('sass') // ✅ Use Dart Sass
                            }
                        }
                    ]
                }]
              },
              optimization: {
                minimize: isProduction,
                minimizer: [
                     new TerserPlugin({
                        extractComments: {
                            filename: 'LICENSE.txt' // Only for UMD build
                        }
                    })
                ]
              },
              plugins: [
                new MiniCssExtractPlugin({
                    filename: isProduction ? 'scrollage.min.css' : 'scrollage.css'
                })
            ]
        }
    ];
}