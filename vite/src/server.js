const Koa = require("koa");
const { moduleResolvePlugin } = require("./serverPluginModuleResolve");
const { moduleRewritePlugin } = require("./serverPluginModuleRewrite");

const { serverStaticPlugin } = require("./serverPluginServeStatic");
const { vuePlugin } = require("./serverPluginVue");

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

console.log("vite server2");

createServer().listen(4000, () => {
  console.log("vite start 4000");
});

// nodemon
