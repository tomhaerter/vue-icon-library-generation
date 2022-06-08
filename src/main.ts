import * as path from "path";
import * as fs from "fs";
import {readFileSync} from "fs";
import {optimize} from 'svgo'

function toTitle(str: string) {
    return str.replace(/(^|\s)\S/g, function (t) {
        return t.toUpperCase()
    });
}

interface Icon {
    path: string
    name: string
}

const getAllIcons = (dir = 'svgs') => {
    const directoryPath = path.join(__dirname, `../${dir}`);
    let icons = [] as Icon[]
    const files = fs.readdirSync(directoryPath)

    files.forEach(function (file) {
        if (fs.statSync(`${directoryPath}/${file}`).isDirectory()) {
            icons = [...icons, ...getAllIcons(`${dir}/${file}`)]
            return
        }

        if(!file.includes('.svg')) return;
        const prefix = dir.replace('svgs/', '').split('/').map((s) => toTitle(s)).join('')

        icons.push({
            name: `${prefix}${file.replace('.svg', '')}`,
            path: `${dir}/${file}`
        })
    });

    return icons
}


const createVueIcon = (icon: Icon) => {
    let content = readFileSync(path.join(__dirname, `../${icon.path}`)).toString();

    const result = optimize(content, {
        multipass: true,
    })

    /**
     * replace color in icons so we can color them via css classes
     */
    const regex = /(fill|stroke|color)="([^"]*)"/gm;
    let m;

    while ((m = regex.exec(result.data)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        if(m && m[2] !== "none") {
            result.data = result.data.replace(m[0], `${m[1]}="currentColor"`)
        }
    }

    return `export default {
        template: \`${result.data}\`
      }`
}

const createPackageInfo = (name) => {
    const outDir = path.join(__dirname, `../out/${name}`)
    if (!fs.existsSync(outDir)){
        fs.mkdirSync(outDir);
    }

    const info = {
        "name": name,
        "version": "1.0.0",
        "description": "Generated Icon Libary.",
        "main": "index.js",
        "exports": "index.js",
        "license": "MIT"
    }

    fs.writeFile(outDir + '/package.json', JSON.stringify(info), err => {})
}

const createVueIconLibrary = (name) => {
    const outDir = path.join(__dirname, `../out/${name}`)
    const icons = getAllIcons();

    let imports = ``;
    let exports = ``
    icons.forEach((icon) => {
        imports += `import ${icon.name} from './${icon.name}.js'\n`
        exports += `${icon.name}\n,`
        fs.writeFile(outDir + `/${icon.name}.js`, createVueIcon(icon), err => {})
    })

    const content = `${imports} \n  export default {${exports}}`
    fs.writeFile(outDir + '/index.js', content, err => {})
}


/**
 * Start
 */
const outDir = path.join(__dirname, `../out`)
if (!fs.existsSync(outDir)){
    fs.mkdirSync(outDir);
}

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter a package name: ', function (name) {
    createPackageInfo(name)
    createVueIconLibrary(name)
    rl.close()
})


