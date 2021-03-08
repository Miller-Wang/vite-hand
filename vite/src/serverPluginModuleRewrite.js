const { readBody, rewriteImports } = require("./utils");

// 模块重写插件
function moduleRewritePlugin({ app, root }) {
  app.use(async (ctx, next) => {
    await next(); // 静态服务
    // 默认会先执行，静态服务中间件  会将结果放到ctx.body
    // 需要将流转换 字符串
    // 只需要处理js中的引用问题
    if (ctx.body && ctx.response.is("js")) {
      const r = await readBody(ctx.body);
      const result = rewriteImports(r);
      ctx.body = result;
    }
  });
}

exports.moduleRewritePlugin = moduleRewritePlugin;

// 不执行中间件里面的逻辑
