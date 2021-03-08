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
