---
title: 利用bolt.new开发一个博客网页
date: 2024-10-27
---
bolt.new 是一个全栈AI Web编程工具，自动编写代码、运行、编辑和部署应用程序。用户只需通过简单的提示命令，快速生成代码，并且立即在浏览器中运行和测试代码。

![](https://blog-images.luckyabner.top/20251029-202410272036539.png)
下图中，我让ai以nextjs,javsscript和tailwindcss为技术栈生成一个个人博客网站，左侧为我与ai的对话，右侧就能看到代码的实时生成。
![](https://blog-images.luckyabner.top/20251029-202410272039655.png)

等待一会儿代码生成完后就可以点击Preview查看效果，且可以实现点击交互。

![](https://blog-images.luckyabner.top/20251029-202410272043893.png)

但是这时只生成了一个页面，当我点击Blog按钮时，会报错提示页面不存在，但是同时也提供了一个修复按钮，点击后就会自动修复bug。

![](https://blog-images.luckyabner.top/20251029-202410272046056.png)
![](https://blog-images.luckyabner.top/20251029-202410272047070.png)

修复完成后，就能看到Blog页面。

![](https://blog-images.luckyabner.top/20251029-202410272048376.png)
  整个网站都遵循了简约风格，且还支持切换白天/夜晚主题。
![](https://blog-images.luckyabner.top/20251029-202410272050018.png)
![](https://blog-images.luckyabner.top/20251029-202410272052623.png)
以上即为最终成果，bolt.new 为我快速生成了一个项目demo，且提供了一套UI样式供我参考，也让我了解到了一个规范的nextjs项目的文件脉络是怎样的，节约了很多时间，大大提高了效率。