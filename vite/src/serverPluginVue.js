const path = require("path");
const fs = require("fs").promises;
function vuePlugin({ app, root }) {
  app.use(async (ctx, next) => {
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
    const { descriptor } = parse(content);

    // 请求的query参数中不带 ?type=template说明是原始的vue文件
    if (!ctx.query.type) {
      let code = "";
      if (descriptor.script.content) {
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

    if (ctx.query.type === "template") {
      ctx.type = "js";
      let content = descriptor.template.content;
      const { code } = compileTemplate({ source: content }); // 将app.vue中的template模板转换成render函数
      ctx.body = code;
    }
  });
}

exports.vuePlugin = vuePlugin;
