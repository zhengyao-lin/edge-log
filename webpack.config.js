const path = require("path");

const mode = process.env.NODE_ENV || "production";

module.exports = {
    mode,
    entry: "./src/index.ts",
    output: {
        filename: `index.js`,
        path: path.join(__dirname, "dist"),
    },
    devtool: "inline-source-map",
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
};
