const path = require('path');

module.exports = {
  entry: './src/main.ts',
  output: {
    filename: 'script.js',
    path: path.resolve(__dirname, './'),
    clean: false
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  devtool: 'source-map'
};