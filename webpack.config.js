const path = require("path");
const HTMLWebpackPlugin = require("html-webpack-plugin");
const ScriptExtHtmlWebpackPlugin = require("script-ext-html-webpack-plugin");

const common = {
    mode: process.env.NODE_ENV || "production",
    devtool: "inline-source-map",
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"],
    },
    output: {
        path: path.join(__dirname, "dist"),
    },
    performance: {
        maxEntrypointSize: 1024 * 1024,
        maxAssetSize: 1024 * 1024,
    },
};

const merge = (a, b) => Object.assign({}, a, b);

const babelLoader = {
    loader: "babel-loader",
    options: {
        presets: ["@babel/env", "@babel/preset-react"],
    },
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
            ],
        },
    }),

    /**
     * Options for the (static) frontend
     */
    merge(common, {
        entry: "./src/frontend/index.tsx",
        output: {
            filename: `index.js`,
            path: path.join(__dirname, "dist/frontend"),
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
            ],
        },
        plugins: [
            new HTMLWebpackPlugin({
                filename: "index.html",
                template: "src/frontend/index.ejs",
            }),
            new ScriptExtHtmlWebpackPlugin({
                inline: "index.js",
            }),
        ],
    }),
];
