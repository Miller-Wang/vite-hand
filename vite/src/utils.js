const { Readable } = require("stream");
const { parse } = require("es-module-lexer");
const MagicString = require("magic-string");

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
