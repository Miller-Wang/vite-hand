const static = require("koa-static");
const path = require("path");
function serverStaticPlugin({ app, root }) {
  app.use(static(root));
  app.use(static(path.resolve(root, "public")));
}

exports.serverStaticPlugin = serverStaticPlugin;
