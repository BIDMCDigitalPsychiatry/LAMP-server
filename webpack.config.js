const path = require('path');
const nodeExternals = require('webpack-node-externals');
// const TerserPlugin = require('terser-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = {
  target: 'node',
  entry: "./src/app.ts",
devtool: 'sourcemap',
externals: {
     "vm2": "require('vm2')",
     "pouchdb": "require('pouchdb')",
     "pouchdb-find": "require('pouchdb-find')",
     
},

  
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          'ts-loader',
        ]
      }      
    ]
  },           
  resolve: {
    extensions: [ '.ts', '.js', '.json' ],

  },

  
 
  output: {
    path: path.resolve(__dirname, './build'),
    filename: 'app.js',
  },
  plugins: [
    new Dotenv({path:  './.env',
 // load this now instead of the ones in '.env'
    safe: true, // load '.env.example' to verify the '.env' variables are all set. Can also be a string to a different file.
    allowEmptyValues: true, // allow empty variables (e.g. `FOO=`) (treat it as empty string, rather than missing)
    systemvars: true, // load all the predefined 'process.env' variables which will trump anything local per dotenv specs.
    silent: true, // hide any errors
    defaults: false // load '.env.defaults' as the default values if empty.})
    })]
  
};