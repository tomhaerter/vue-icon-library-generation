import * as path from "path";
import * as fs from "fs";
import {readFileSync} from "fs";
import {optimize} from 'svgo'
import {compile} from "@vue/compiler-dom";

function toTitle(str: string) {
    return str.replace(/(^|\s)\S/g, function (t) {
        return t.toUpperCase()
    });
}

interface Icon {
    path: string
    name: string
}

class LibraryGeneration {
    private readonly path
    private readonly name

    constructor(path = '../svgs', name: string) {
        this.path = path
        this.name = name
    }

    create() {
        const outDir = path.join(__dirname, `../out/${this.name}`)
        const icons = this.getAllIcons(this.path);

        let imports = ``;
        let exports = ``
        let exportTypes = ``
        icons.forEach((icon) => {
            imports += `import ${icon.name} from './${icon.name}.js'\n`
            exports += `${icon.name}\n,`
            exportTypes += `export { default as ${icon.name} } from './${icon.name}'\n`
            fs.writeFile(outDir + `/${icon.name}.js`, this.createVueIcon(icon), err => {})

            const type = `import type { FunctionalComponent, HTMLAttributes, VNodeProps } from 'vue';\ndeclare const ${icon.name}: FunctionalComponent<HTMLAttributes & VNodeProps>;\nexport default ${icon.name};\n`
            fs.writeFile(outDir + `/${icon.name}.d.ts`, type, err => {})
        })

        const content = `${imports} \n  export {${exports}}`
        fs.writeFile(outDir + '/index.js', content, err => {})
        fs.writeFile(outDir + '/index.d.ts', exportTypes, err => {})
    }

    getAllIcons(dir) {
        const directoryPath = path.join(__dirname, `${dir}`);
        let icons = [] as Icon[]
        const files = fs.readdirSync(directoryPath)

        files.forEach((file) => {
            if (fs.statSync(`${directoryPath}/${file}`).isDirectory()) {
                icons = [...icons, ...this.getAllIcons(`${dir}/${file}`)]
                return
            }

            if (!file.includes('.svg')) return;
            const prefix = dir.replace(this.path, '').split('/').map((s) => toTitle(s)).join('')

            icons.push({
                name: `${prefix}${file.replace('.svg', '')}`,
                path: `${dir}/${file}`
            })
        });

        return icons
    }

    createVueIcon(icon: Icon) {
        let content = readFileSync(path.join(__dirname, icon.path)).toString();

        const result = optimize(content, {
            multipass: true,
            plugins: [
                'removeDimensions'
            ],
        })

        /**
         * replace color in icons, so we can color them via css classes
         */
        const regex = /(fill|stroke|color)="([^"]*)"/gm;
        let m;

        while ((m = regex.exec(result.data)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            if (m && m[2] !== "none") {
                result.data = result.data.replace(m[0], `${m[1]}="currentColor"`)
            }
        }

        let { code } = compile(result.data, {
            mode: 'module',
        })

        return code.replace('export function', 'export default function')
    }

    createPackageInfo() {
        const outDir = path.join(__dirname, `../out/${this.name}`)
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir);
        }

        const info = {
            "name": this.name,
            "version": "1.0.0",
            "description": "Generated Icon Libary.",
            "main": "index.js",
            "exports": "index.js",
            "license": "MIT",
            "publishConfig": {
                "access": "public"
            },
            "peerDependencies": {
                "vue": ">= 3"
            }
        }

        fs.writeFile(outDir + '/package.json', JSON.stringify(info), err => {
        })
    }
}


/**
 * Start
 */
const outDir = path.join(__dirname, `../out`)
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
}

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const processArgs = process.argv.slice(2);

if (processArgs.length === 0) {
    rl.question('Path to folder containing SVGs (default: ../svgs): ', function (path) {
        rl.question('Enter a package name: ', function (name) {
            const generator = new LibraryGeneration(path || '../svgs', name)
            generator.createPackageInfo()
            generator.create()
            rl.close()
        })
    })
} else {
    const generator = new LibraryGeneration(processArgs[0], processArgs[1])
    generator.createPackageInfo()
    generator.create()
    rl.close()
}


