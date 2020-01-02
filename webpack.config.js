const path = require("path");

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
        presets: ["@babel/env", "@babel/preset-react"]
    }
};

module.exports = [
    /**
     * Options for worker
     */
    merge(common, {
        entry: "./src/worker/index.ts",
        output: merge(common.output, {
            filename: `worker/index.js`,
        }),
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
        output: merge(common.output, {
            filename: `frontend/index.js`,
        }),
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
    }),
];
