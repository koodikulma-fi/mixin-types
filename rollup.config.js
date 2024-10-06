
// - Imports - //

import dts from 'rollup-plugin-dts';
import del from 'rollup-plugin-delete';
import { terser } from 'rollup-plugin-terser'; // See terser options here: https://github.com/terser/terser#minify-options


// - Config - //

// // Mode.
// const devMode = (process.env.NODE_ENV === 'development');
// console.log(`${ devMode ? 'development' : 'production' } mode bundle`);

export default [


    // - Declarations (+ delete dts folder) - //

    {
        input: 'dist/dts/index.d.ts',
        output: {
          file: 'dist/mixin-types.d.ts',
          format: 'es',
        },
        plugins: [
            dts(),
            del({ targets: 'dist/dts*', hook: 'buildEnd' }),
        ],
    },


    // - ES Module - //

    {
        input: 'dist/index.js',
        output: {
            file: 'dist/mixin-types.module.js',
            format: 'es',
        },
        plugins: [
            terser({
                ecma: 2015,
                mangle: false,
                compress: {
                    keep_fnames: true,
                    keep_fargs: true,
                    keep_classnames: true,
                },
                output: { quote_style: 1 }
            }),
        ],
    },


    // - CJS - //

    {
        input: 'dist/index.js',
        output: {
            file: 'dist/mixin-types.js',
            format: 'cjs',
            exports: "auto"
        },
        plugins: [
            terser({
                ecma: 2015,
                mangle: false,
                compress: {
                    keep_fnames: true,
                    keep_fargs: true,
                    keep_classnames: true,
                },
                output: { quote_style: 1 }
            }),
            
            del({ targets: ['dist/index.js'], hook: 'buildEnd' })
        ]
    },

];
