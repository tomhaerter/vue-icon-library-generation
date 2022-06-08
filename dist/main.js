"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const fs_1 = require("fs");
const svgo_1 = require("svgo");
const compiler_dom_1 = require("@vue/compiler-dom");
function toTitle(str) {
    return str.replace(/(^|\s)\S/g, function (t) {
        return t.toUpperCase();
    });
}
class LibraryGeneration {
    constructor(path = '../svgs', name) {
        this.path = path;
        this.name = name;
    }
    create() {
        const outDir = path.join(__dirname, `../out/${this.name}`);
        const icons = this.getAllIcons(this.path);
        let imports = ``;
        let exports = ``;
        let exportTypes = ``;
        icons.forEach((icon) => {
            imports += `import ${icon.name} from './${icon.name}.js'\n`;
            exports += `${icon.name}\n,`;
            exportTypes += `export { default as ${icon.name} } from './${icon.name}'\n`;
            fs.writeFile(outDir + `/${icon.name}.js`, this.createVueIcon(icon), err => { });
            const type = `import type { FunctionalComponent, HTMLAttributes, VNodeProps } from 'vue';\ndeclare const ${icon.name}: FunctionalComponent<HTMLAttributes & VNodeProps>;\nexport default ${icon.name};\n`;
            fs.writeFile(outDir + `/${icon.name}.d.ts`, type, err => { });
        });
        const content = `${imports} \n  export {${exports}}`;
        fs.writeFile(outDir + '/index.js', content, err => { });
        fs.writeFile(outDir + '/index.d.ts', exportTypes, err => { });
    }
    getAllIcons(dir) {
        const directoryPath = path.join(__dirname, `${dir}`);
        let icons = [];
        const files = fs.readdirSync(directoryPath);
        files.forEach((file) => {
            if (fs.statSync(`${directoryPath}/${file}`).isDirectory()) {
                icons = [...icons, ...this.getAllIcons(`${dir}/${file}`)];
                return;
            }
            if (!file.includes('.svg'))
                return;
            const prefix = dir.replace(this.path, '').split('/').map((s) => toTitle(s)).join('');
            icons.push({
                name: `${prefix}${file.replace('.svg', '')}`,
                path: `${dir}/${file}`
            });
        });
        return icons;
    }
    createVueIcon(icon) {
        let content = (0, fs_1.readFileSync)(path.join(__dirname, icon.path)).toString();
        const result = (0, svgo_1.optimize)(content, {
            multipass: true,
            plugins: [
                'removeDimensions'
            ],
        });
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
                result.data = result.data.replace(m[0], `${m[1]}="currentColor"`);
            }
        }
        let { code } = (0, compiler_dom_1.compile)(result.data, {
            mode: 'module',
        });
        return code.replace('export function', 'export default function');
    }
    createPackageInfo() {
        const outDir = path.join(__dirname, `../out/${this.name}`);
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
        };
        fs.writeFile(outDir + '/package.json', JSON.stringify(info), err => {
        });
    }
}
/**
 * Start
 */
const outDir = path.join(__dirname, `../out`);
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
            const generator = new LibraryGeneration(path || '../svgs', name);
            generator.createPackageInfo();
            generator.create();
            rl.close();
        });
    });
}
else {
    const generator = new LibraryGeneration(processArgs[0], processArgs[1]);
    generator.createPackageInfo();
    generator.create();
    rl.close();
}
//# sourceMappingURL=main.js.map