const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/index.tsx",
  output: {
    filename: "form.js",
    path: path.resolve(__dirname, "jupyterhub_fancy_profiles/static/dist"),
    publicPath: "/hub/fancy-profiles/static/dist/",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              // Critical: do not typecheck the whole repo (it contains legacy broken TS)
              transpileOnly: true,
              // Compile only files that are part of the webpack bundle graph
              onlyCompileBundledFiles: true,
            },
          },
        ],
      },
    ],
  },
  devtool: false,
};
