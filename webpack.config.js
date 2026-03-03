const path = require("path");
const webpack = require("webpack");

module.exports = {
  mode: "production",
  entry: "./src/index.tsx",
  output: {
    filename: "form.js",
    path: path.resolve(__dirname, "jupyterhub_fancy_profiles/static/dist"),
    publicPath: "/hub/fancy-profiles/static/dist/",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true, // IMPORTANT: ignore TypeScript type errors from unrelated legacy files
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __JHFP_THEME__: JSON.stringify(process.env.JHFP_THEME || "egi"),
    }),
  ],
};
