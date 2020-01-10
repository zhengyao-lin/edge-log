const path = require("path");
const webpack = require("webpack");
const HTMLWebpackPlugin = require("html-webpack-plugin");

const common = {
    mode: process.env.NODE_ENV || "production",
    // devtool: "inline-source-map",
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", "mjs"]
    },
    output: {
        path: path.join(__dirname, "dist"),
    },
    performance: {
        maxEntrypointSize: 1024 * 1024,
        maxAssetSize: 1024 * 1024,
    },
    node: {
        fs: "empty",
    },
};

const merge = (a, b) => Object.assign({}, a, b);

const babelLoader = {
    loader: "babel-loader",
    options: {
        presets: ["@babel/env", "@babel/preset-react"],
    },
};

const genFrontEndConfig = entries => {
    const plugins = [];

    for (const key in entries) {
        plugins.push(
            new HTMLWebpackPlugin({
                chunks: [key],
                filename: path.basename(key) + ".html",
                template: "src/frontend/template.ejs",
            })
        );
    }

    return {
        entry: entries,
        output: {
            filename: "[name].js",
            path: path.join(__dirname, "dist/static"),
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: /node_modules/,
                    use: [babelLoader, "ts-loader"],
                },
                {
                    test: /\.css$/,
                    use: ["style-loader", "css-loader"],
                },
                {
                    test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
                    use: [
                        {
                            loader: "file-loader",
                            options: {
                                name: "[name].[ext]",
                                outputPath: "fonts/",
                            },
                        },
                    ],
                },
                {
                    test: /\.(gif|png|jpe?g|svg)$/,
                    use: [
                        {
                            loader: "file-loader",
                            options: {
                                name: "[name].[ext]",
                                outputPath: "images/",
                            },
                        },
                    ],
                },
            ],
        },
        plugins: [
            // new webpack.HashedModuleIdsPlugin(),
        ].concat(plugins),
        optimization: {
            splitChunks: {
                chunks: "all",
                maxInitialRequests: Infinity,
                minSize: 0,
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name(module) {
                            const packageName = module.context.match(
                                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                            )[1];

                            return `npm.${packageName.replace("@", "")}`;
                        },
                    },
                },
            },
        },
    };
};

module.exports = [
    /**
     * Options for worker
     */
    merge(common, {
        entry: "./src/worker/index.ts",
        output: {
            filename: `index.js`,
            path: path.join(__dirname, "dist/worker"),
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: /node_modules/,
                    use: ["ts-loader"],
                },
                {
                    test: /\.mjs$/,
                    include: /node_modules/,
                    type: "javascript/auto",
                },
            ],
        },
    }),

    /**
     * Options for the (static) frontend
     */
    merge(
        common,
        genFrontEndConfig({
            main: ["@babel/polyfill", "./src/frontend/pages/main.tsx"],
        })
    ),
];
