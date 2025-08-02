import { defineConfig } from "vite";

const project = 'attractors'

export default defineConfig({
    worker: {
        rollupOptions: {
            output: {
                entryFileNames: `assets/js/${project}/[name]-[hash].js`,
            }
        }
    },
    build: {
        rollupOptions: {
            output: {
                assetFileNames: (assetInfo) => {
                    let ext = assetInfo.names[0].split('.').at(-1)

                    if (!ext) {
                        console.warn(assetInfo.names)
                        return `assets/other/[name]-[hash][extname]`
                    }

                    if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
                        ext = 'img'
                    } else if (/ttf|woff|woff2/i.test(ext)) {
                        ext = 'fonts'
                    }

                    return `assets/${ext}/${project}/[name]-[hash][extname]`
                },
                entryFileNames: `assets/js/${project}/[name].js`,
                chunkFileNames: `assets/js/${project}/[name]-[hash].js`
            }
        }
    }
})
