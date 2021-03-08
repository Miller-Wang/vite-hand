import { createApp } from "vue";
import App from "./App.vue";
// es6模块会自动发送请求，查找响应的文件
// vite会 根据需要的文件，进行改写

// 1.默认会请求main.js  在后端会将main.js中的内容进行改写操作，
// 所有的第三方模块(不带相对路径的)，全部加上 /@modules
createApp(App).mount("#app");
