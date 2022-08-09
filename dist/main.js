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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const fs = __importStar(require("graceful-fs"));
const svgo_1 = require("svgo");
const compiler_dom_1 = require("@vue/compiler-dom");
function toTitle(str) {
    return str.replace(/(^|\s)\S/g, (t) => t.toUpperCase());
}
class LibraryGeneration {
    constructor(_path = '../svgs', _name = '') {
        this.path = _path;
        this.name = _name;
    }
    create() {
        return __awaiter(this, void 0, void 0, function* () {
            const outDir = path.join(__dirname, `../out/${this.name}`);
            const icons = yield this.getAllIcons(this.path);
            let imports = '';
            let exports = '';
            let exportTypes = '';
            // eslint-disable-next-line no-restricted-syntax
            for (const icon of icons) {
                imports += `import ${icon.name} from './${icon.name}.js'\n`;
                exports += `${icon.name}\n,`;
                exportTypes += `export { default as ${icon.name} } from './${icon.name}'\n`;
                // eslint-disable-next-line no-await-in-loop
                fs.writeFile(`${outDir}/${icon.name}.js`, yield this.createVueIcon(icon), () => {
                });
                const type = `import type { FunctionalComponent, HTMLAttributes, VNodeProps } from 'vue';\ndeclare const ${icon.name}: FunctionalComponent<HTMLAttributes & VNodeProps>;\nexport default ${icon.name};\n`;
                fs.writeFile(`${outDir}/${icon.name}.d.ts`, type, () => {
                });
            }
            const content = `${imports} \n  export {${exports}}`;
            fs.writeFile(`${outDir}/index.js`, content, () => {
            });
            fs.writeFile(`${outDir}/index.d.ts`, exportTypes, () => {
            });
        });
    }
    getAllIcons(dir) {
        return new Promise((resolve) => {
            const directoryPath = path.join(__dirname, `${dir}`);
            let icons = [];
            fs.readdir(directoryPath, (err, files) => __awaiter(this, void 0, void 0, function* () {
                // eslint-disable-next-line no-restricted-syntax
                for (const file of files) {
                    if (fs.statSync(`${directoryPath}/${file}`)
                        .isDirectory()) {
                        // eslint-disable-next-line no-await-in-loop
                        icons = [...icons, ...(yield this.getAllIcons(`${dir}/${file}`))];
                        // eslint-disable-next-line no-continue
                        continue;
                    }
                    // eslint-disable-next-line no-continue
                    if (!file.includes('.svg'))
                        continue;
                    const prefix = dir.replace(this.path, '')
                        .split('/')
                        .map((s) => toTitle(s))
                        .join('');
                    icons.push({
                        name: `${prefix}${file.replace('.svg', '')
                            .replace(prefix.toLowerCase(), '')
                            .split('-')
                            .map((s) => toTitle(s))
                            .join('')}`,
                        path: `${dir}/${file}`,
                    });
                }
                resolve(icons);
            }));
        });
    }
    // eslint-disable-next-line class-methods-use-this
    createVueIcon(icon) {
        return new Promise((resolve) => {
            fs.readFile(path.join(__dirname, icon.path), (err, file) => {
                const content = file.toString();
                const result = (0, svgo_1.optimize)(content, {
                    multipass: true,
                    plugins: [
                        'removeDimensions',
                    ],
                });
                if (result.error)
                    resolve('');
                /**
                 * replace color in icons, so we can color them via css classes
                 * if not prefixed with "Color"
                 */
                if (!icon.name.startsWith('Color')) {
                    const regex = /(fill|stroke|color)="([^"]*)"/gm;
                    let m;
                    // eslint-disable-next-line no-cond-assign
                    while ((m = regex.exec(result.data)) !== null) {
                        if (m.index === regex.lastIndex) {
                            regex.lastIndex += 1;
                        }
                        if (m && m[2] !== 'none') {
                            result.data = result.data.replace(m[0], `${m[1]}="currentColor"`);
                        }
                    }
                }
                const { code } = (0, compiler_dom_1.compile)(result.data, {
                    mode: 'module',
                });
                resolve(code.replace('export function', 'export default function'));
            });
        });
    }
    createPackageInfo() {
        const outDir = path.join(__dirname, `../out/${this.name}`);
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir);
        }
        const info = {
            name: this.name,
            version: '1.0.0',
            description: 'Generated Icon Libary.',
            main: 'index.js',
            exports: 'index.js',
            license: 'MIT',
            publishConfig: {
                access: 'public',
            },
            peerDependencies: {
                vue: '>= 3',
            },
        };
        fs.writeFile(`${outDir}/package.json`, JSON.stringify(info), () => {
        });
    }
}
/**
 * Start
 */
const outDir = path.join(__dirname, '../out');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
}
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
const processArgs = process.argv.slice(2);
if (processArgs.length === 0) {
    rl.question('Path to folder containing SVGs (default: ../svgs): ', (_path) => {
        rl.question('Enter a package name: ', (_name) => {
            const generator = new LibraryGeneration(_path || '../svgs', _name);
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