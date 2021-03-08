## vite 介绍

- 一眨眼 vite 的 2.0 版本已经发布了，作为下一代前端开发工具，它究竟有什么魔力？今天我们来研究一下，做个简单的实现
- vite 的特点是快，本地开发可以达到秒启动，极大提高了开发体验
- 原理：vite 是基于浏览器对 ESMoudule 的支持，script 标签加上 type="module"就可以解析 ES6 模块，浏览器解析到 ES6 的 import 语法时，会根据路径从服务端获取要引入的文件，服务端会根据 import 的文件路径和类型进行解析
- vite 只加载当前页面依赖到的文件，加载时通过后端服务进行代码解析，变成了懒加载+服务端解析代码的方式
- vite 主要作用是本地开发使用，项目上线打包内部还是用 rollup 来进行打包
- 对比 webpack 是将整个项目打包后放入内存中，所以每次启动对整个项目进行打包，浏览器加载也是对整个项目进行加载
- 这个是 vite 加载文件的流程图，(koa 中间件画的不太规范)
- 接下来我们来一步步实现整个流程
  ![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a48d45f3797f44af967f599da8817885~tplv-k3u1fbpfcp-watermark.image)

## 生成 vite 项目

### 项目生成与启动

```
npm init vite-app vite-vue
// 安装对应依赖
yarn add
// 启动项目
yarn vite
```

### 加载文件分析

- 可以看到，启动项目加载了 项目中的 `index.html`文件，script 的 type 是`module`说明是 ESModule 加载的

![](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f248ece5c18b4ebcba2ab360cab143c9~tplv-k3u1fbpfcp-watermark.image)

- 加载执行 main.js 文件
  ![](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e88f0c3e6893482aad76398ff50eb417~tplv-k3u1fbpfcp-watermark.image)

## 在项目中建一个文件夹 vite 来实现我们自己的 vite

```
mkdir vite && cd vite
npm init -y
```

### 实现命令行`vite`命令

- 1.在 vite 下新建 bin 目录，并新建`www.js`文件，作为项目的入口文件
- 2.在 package.json 中配置新增 bin，当我们执行 vite 命令的时候，会执行 bin 对应的文件

```json
"bin": "./bin/www.js"
```

- 生成 vite 命令，将 vite 命令链接到电脑的可执行文件，这样就可以直接在命令行使用 vite 命令了

```
npm link
```

- `www.js`文件
  - `#! /usr/bin/env node` 声明这个文件是用 node 来执行

```js
#! /usr/bin/env node

// 执行的入口，执行vite命令的时候会在控制台打印
console.log("vite命令入口");
// 引用项目中的src/server文件，并执行
require("../src/server");
```

### 新建 src 目录，在 src 文件中实现需要的功能

## 首先实现静态文件服务

- 安装 koa 与静态服务中间件

```
yarn add koa koa-static
```

- 引用 koa，通过`createServer`函数创建一个 koa 应用，监听在 4000 端口上
- 创建一个上下文，给不同的插件共享功能，app-当前应用，root-执行 vite 命令时的工作目录
- 引入静态服务中间件`serverStaticPlugin`，将上下文`context`，传入中间件中，使用中间件

```js
const Koa = require("koa");
const { serverStaticPlugin } = require("./serverPluginServeStatic");

function createServer() {
  let app = new Koa();
  // 实现静态服务功能，就是访问服务器，返回对应的文件  koa-static

  const context = {
    app,
    root: process.cwd(), // 执行命令的工作目录
  };

  const resolvePlugin = [
    serverStaticPlugin, // 1.静态服务插件，实现返回文件功能
  ];

  resolvePlugin.forEach((plugin) => plugin(context));
  return app;
}

createServer().listen(4000, () => {
  console.log("vite start 4000");
});
```

- 静态服务中间件`serverStaticPlugin`，将执行 vite 命令时的工作目录，和根目录下的`public`作为静态服务的根目录，在根目录中找不到时会到 public 目录中去找到资源文件

```
const static = require("koa-static");
const path = require("path");
function serverStaticPlugin({ app, root }) {
  app.use(static(root));
  app.use(static(path.resolve(root, "public")));
}

exports.serverStaticPlugin = serverStaticPlugin;
```

我们在项目中执行一下 vite 命令，看下效果

- 成功加载了 index.html 和 main.js 文件
  ![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/497108c6b3b0451f8f9706b44b15b66f~tplv-k3u1fbpfcp-watermark.image)
- 但是会发现控制台报了个错
  ![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8877818650fb43e6b52604c691b6cce2~tplv-k3u1fbpfcp-watermark.image)

- 这是因为`vue`是第三方模块，在 main.js 中直接 import 了'vue'文件，但是`vue`没有相对或者绝对路径，加载 vue 时识别不了

## 然后我们来实现`ModuleRewrite`和`ModuleResolve`中间件处理引用第三方模块的问题

- 逻辑是，当我们发现有第三方模的引用时，在引用前加上特殊标识 `/@modules/`
- 当客户端请求带有 `/@modules/`路径的模块时，我们在加载`node_modules`中的模块

### `ModuleRewrite`中间件

- 安装 `es-module-lexer`和 `magic-string`来处理正则和字符串

```
// 正则  字符串处理
yarn add es-module-lexer  magic-string
```

- `serverPluginModuleRewrite`中间件 重写 import，修改 import 加载的第三方模块路径
- 服务端收到请求后，先执行静态服务中间件，将资源的文件流放在 ctx.body 中
- 通过`readBody`将文件流转换为字符串，
- 再用`rewriteImports`方法找出其中的 import 语法，改写第三方模块的引用路径，将 `import xx from "vue";`修改为`import xx from "/@modules/vue";`

```js
const { readBody, rewriteImports } = require("./utils");

// 模块重写插件
function moduleRewritePlugin({ app, root }) {
  console.log("中间件逻辑");
  app.use(async (ctx, next) => {
    await next(); // 静态服务
    // 默认会先执行，静态服务中间件  会将结果放到ctx.body
    // 需要将流转换 字符串
    // 只需要处理js中的引用问题
    if (ctx.body && ctx.response.is("js")) {
      // 将文件流转换为字符串
      const r = await readBody(ctx.body);
      console.log(ctx.body);

      const result = rewriteImports(r);
      ctx.body = result;
    }
  });
}

exports.moduleRewritePlugin = moduleRewritePlugin;
```

- 两个工具函数实现

```js
const { Readable } = require("stream");
const { parse } = require("es-module-lexer");
const MagicString = require("magic-string");

// 将流转换为字符串
async function readBody(stream) {
  if (stream instanceof Readable) {
    return new Promise((resolve, reject) => {
      let res = "";
      stream.on("data", function (chunk) {
        res += chunk;
      });

      stream.on("end", function () {
        resolve(res);
      });

      stream.on("error", reject);
    });
  } else {
    return stream;
  }
}

// 重写第三方库的import方法
function rewriteImports(source) {
  let imports = parse(source)[0];
  let ms = new MagicString(source);
  console.log("ms", ms);
  // 所有import的语法
  console.log(imports);
  if (imports.length > 0) {
    for (let i = 0; i < imports.length; i++) {
      let { s, e } = imports[i];
      let id = source.slice(s, e); // 应用 的标识
      // 不是./ 或者 /
      if (/^[^\/\.@]/.test(id)) {
        id = `/@modules/${id}`;
        ms.overwrite(s, e, id);
      }
    }
  }
  return ms.toString();
}

module.exports = {
  readBody,
  rewriteImports,
};
```

- 执行`vite`命令，可以看到返回的 main.js 文件被重写
  ![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2eaa00423cea4a60871f8235115f43d1~tplv-k3u1fbpfcp-watermark.image)

### `ModuleResolve` 模块加载中间件

- 主要用来解析我们上一步，重写的路径的第三方模块
- 匹配请求路径，如果发现是`/@modules/`前缀，就在`node_modules`中找对应模块返回给浏览器(这一步先写死，只写了 vue 对应要真实加载的文件)

```js
const reg = /^\/@modules\//;
const path = require("path");
const fs = require("fs").promises;
function moduleResolvePlugin({ app, root }) {
  app.use(async (ctx, next) => {
    // 如果没有匹配到 /@modules， 就往下执行
    if (!reg.test(ctx.path)) {
      return next();
    }

    const id = ctx.path.replace(reg, "");
    ctx.type = "js"; // 返回的是js

    // 找到真实的vue文件，找node_modules里面的库
    let mapping = {
      vue: path.resolve(
        root,
        "node_modules",
        "@vue/runtime-dom/dist/runtime-dom.esm-browser.js"
      ),
    };

    const content = await fs.readFile(mapping[id], "utf8");
    ctx.body = content;
  });
}

exports.moduleResolvePlugin = moduleResolvePlugin;
```

- 执行命令，可以看到四个文件都成功加载了，但是我们的浏览器是不识别.vue 文件的
  ![](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/18a06d64da984f01af5457b65065c8ab~tplv-k3u1fbpfcp-watermark.image)

## 解析 vue 文件

- vue 文件中包含了`template`和`script`两个部分，vite 中将 vue 文件进行了拆分，script 部分放在 App.vue 文件中，template 部分放在了`App.vue?type=template`请求中
- 在 App.vue 中插入了 import `App.vue?type=template`代码，来加载 template 模板

![](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/23f3df3cc4324075bf9d1be2f6013007~tplv-k3u1fbpfcp-watermark.image)

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/50d72f30d3bc4e9a8bc908aef9342d46~tplv-k3u1fbpfcp-watermark.image)

### `serverPluginVue`中间件

- 新建`serverPluginVue`中间件，来解析 vue 文件
- 引用 vue 中的`compiler-sfc`,获取 compileTemplate-编译 template 模板, parse-解析 vue 文件

```js
const path = require("path");
const fs = require("fs").promises;
function vuePlugin({ app, root }) {
  app.use(async (ctx, next) => {
    // 不是vue文件直接返回
    if (!ctx.path.endsWith(".vue")) {
      return next();
    }

    // 获取.vue文件内容
    const filePath = path.join(root, ctx.path);
    const content = await fs.readFile(filePath, "utf8");

    // compileTemplate - 解析vue模板
    // parse - 解析vue文件方法
    const { compileTemplate, parse } = require(path.resolve(
      root,
      "node_modules",
      "@vue/compiler-sfc/dist/compiler-sfc.cjs"
    ));
    // 解析vue文件
    const { descriptor } = parse(content);
    // 请求的query参数中不带 ?type=template说明是原始的vue文件
    if (!ctx.query.type) {
      let code = "";

      if (descriptor.script) {
        let content = descriptor.script.content;
        // 将script中的 export default替换为const __script=
        code += content.replace(
          /((?:^|\n|;)\s*)export default/,
          "$1const __script="
        );
      }

      // vue文件中有template模板代码
      if (descriptor.template) {
        // 加入引入 import 'App.vue?type=template'，来引入template内容
        const requestPath = ctx.path + `?type=template`;
        code += `\nimport {render as __render} from "${requestPath}"`;
        code += `\n__script.render = __render`;
      }

      code += `\nexport default __script`;

      ctx.type = "js";
      ctx.body = code;
    }

    // 请求的query参数带 ?type=template说明是加载 编译后的template内容
    if (ctx.query.type === "template") {
      ctx.type = "js";
      let content = descriptor.template.content;
      const { code } = compileTemplate({ source: content }); // 将app.vue中的template模板转换成render函数
      ctx.body = code;
    }
  });
}

exports.vuePlugin = vuePlugin;
```

## 引入中间件使用

- 注意中间件的使用顺序

```js
function createServer() {
  let app = new Koa();
  // 实现静态服务功能，就是访问服务器，返回对应的文件  koa-static
  // 创建一个上下文，给不同的插件共享功能
  const context = {
    app,
    root: process.cwd(), // 执行命令的工作目录
  };

  // 解析.vue文件
  const resolvePlugin = [
    moduleRewritePlugin, // 2.重写我们的请求路径
    moduleResolvePlugin, // vue内部可能还有引入其他模块，都要修改为 /@modules
    vuePlugin, // 解析.vue文件
    serverStaticPlugin, // 1.静态服务插件，实现返回文件功能
  ];

  resolvePlugin.forEach((plugin) => plugin(context));
  return app;
}
```

### [代码奉上](https://github.com/Miller-Wang/vite-hand)

> 这样我们实现了一个简化版的 vite  
> 漏洞和不足之处，还请大家指正
