# Vue Icon Library Generation
### small tool to help generate icon components from a folder of SVGs (and  optimizing the SVGs with the help of SVGO)

## How to generate Icons
1. clone the repository or just download the `dist/main.js` file  
2. create a folder and put all your svgs into it, _**you can also sort SVGs in folders the components will be prefixed with the folder name.**_
3. run `yarn start` or `node dist/main.js`
4. enter the relative path to the  folder containing your `SVGs`  default: `../svgs`
5. enter some name for your icon library  e.g. `project-icons`

you may also use  the tool via commandline  e.g. `node dist/main.js ../svgs my-icon-library`

## How to use Icons in a project

1. copy the icon library folder (e.g. `project-icons` ) form the `/out` folder into your project
2. install the library via  `yarn add ./someFolder/project-icons` or  `npm install ./someFolder/project-icons`

