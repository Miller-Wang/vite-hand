const path = require("path");
const fs = require("fs").promises;
function vuePlugin({ app, root }) {
  app.use(async (ctx, next) => {
    if (!ctx.path.endsWith(".vue")) {
      return next();
    }

    // 处理.vue文件
    const filePath = path.join(root, ctx.path);
    const content = await fs.readFile(filePath, "utf8");

    // 解析vue模板
    // 解析模板
    const { compileTemplate, parse } = require(path.resolve(
      root,
      "node_modules",
      "@vue/compiler-sfc/dist/compiler-sfc.cjs"
    ));

    const { descriptor } = parse(content);
    if (!ctx.query.type) {
      let code = "";

      if (descriptor.script.content) {
        let content = descriptor.script.content;

        code += content.replace(
          /((?:^|\n|;)\s*)export default/,
          "$1const __script="
        );
      }

      // 编译 .vue文件
      if (descriptor.template) {
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

/**
 * 
 * import HelloWorld from '/src/components/HelloWorld.vue'

const __script = {
    name: 'App',
    components: {
        HelloWorld
    }
}

import {render as __render} from "/src/App.vue?type=template"
__script.render = __render
__script.__hmrId = "/src/App.vue"
typeof __VUE_HMR_RUNTIME__ !== 'undefined' && __VUE_HMR_RUNTIME__.createRecord(__script.__hmrId, __script)
__script.__file = "/Users/wangmengliang/Desktop/interview/vite-vue/src/App.vue"
export default __script
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy93YW5nbWVuZ2xpYW5nL0Rlc2t0b3AvaW50ZXJ2aWV3L3ZpdGUtdnVlL3NyYy9BcHAudnVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFNQSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFbkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUNiLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7SUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNYO0FBQ0YiLCJmaWxlIjoiL1VzZXJzL3dhbmdtZW5nbGlhbmcvRGVza3RvcC9pbnRlcnZpZXcvdml0ZS12dWUvc3JjL0FwcC52dWUiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiPHRlbXBsYXRlPlxuICA8aW1nIGFsdD1cIlZ1ZSBsb2dvXCIgc3JjPVwiLi9hc3NldHMvbG9nby5wbmdcIiAvPlxuICA8SGVsbG9Xb3JsZCBtc2c9XCJIZWxsbyBWdWUgMy4wICsgVml0ZVwiIC8+XG48L3RlbXBsYXRlPlxuXG48c2NyaXB0PlxuaW1wb3J0IEhlbGxvV29ybGQgZnJvbSAnLi9jb21wb25lbnRzL0hlbGxvV29ybGQudnVlJ1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIG5hbWU6ICdBcHAnLFxuICBjb21wb25lbnRzOiB7XG4gICAgSGVsbG9Xb3JsZFxuICB9XG59XG48L3NjcmlwdD5cbiJdfQ==

 * 
 */
