import * as path from 'path';
import * as fs from 'graceful-fs';
import { optimize, OptimizedSvg } from 'svgo';
import { compile } from '@vue/compiler-dom';

function toTitle(str: string) {
  return str.replace(/(^|\s)\S/g, (t) => t.toUpperCase());
}

interface Icon {
  path: string;
  name: string;
}

class LibraryGeneration {
  private readonly path;

  private readonly name;

  constructor(_path = '../svgs', _name: string = '') {
    this.path = _path;
    this.name = _name;
  }

  async create() {
    const outDir = path.join(__dirname, `../out/${this.name}`);
    const icons = await this.getAllIcons(this.path);

    let imports = '';
    let exports = '';
    let exportTypes = '';
    // eslint-disable-next-line no-restricted-syntax
    for (const icon of icons) {
      imports += `import ${icon.name} from './${icon.name}.js'\n`;
      exports += `${icon.name}\n,`;
      exportTypes += `export { default as ${icon.name} } from './${icon.name}'\n`;
      // eslint-disable-next-line no-await-in-loop
      fs.writeFile(`${outDir}/${icon.name}.js`, await this.createVueIcon(icon), () => {
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
  }

  getAllIcons(dir): Promise<Icon[]> {
    return new Promise((resolve) => {
      const directoryPath = path.join(__dirname, `${dir}`);
      let icons = [] as Icon[];
      fs.readdir(directoryPath, async (err, files) => {
        // eslint-disable-next-line no-restricted-syntax
        for (const file of files) {
          if (fs.statSync(`${directoryPath}/${file}`)
            .isDirectory()) {
            // eslint-disable-next-line no-await-in-loop
            icons = [...icons, ...(await this.getAllIcons(`${dir}/${file}`))];
            // eslint-disable-next-line no-continue
            continue;
          }

          // eslint-disable-next-line no-continue
          if (!file.includes('.svg')) continue;
          const prefix = dir.replace(this.path, '')
            .split('/')
            .map((s) => toTitle(s))
            .join('');

          icons.push({
            name: `${prefix}${file.replace('.svg', '')
              .replace('prefix', '')
              .split('-')
              .map((s) => toTitle(s))
              .join('')}`,
            path: `${dir}/${file}`,
          });
        }

        resolve(icons);
      });
    });
  }

  // eslint-disable-next-line class-methods-use-this
  createVueIcon(icon: Icon) {
    return new Promise((resolve) => {
      fs.readFile(path.join(__dirname, icon.path), (err, file) => {
        const content = file.toString();
        const result = optimize(content, {
          multipass: true,
          plugins: [
            'removeDimensions',
          ],
        }) as OptimizedSvg;

        if (result.error) resolve('');

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

        const { code } = compile(result.data, {
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
} else {
  const generator = new LibraryGeneration(processArgs[0], processArgs[1]);
  generator.createPackageInfo();
  generator.create();
  rl.close();
}
