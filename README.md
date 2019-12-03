# xiayinchang.github.io
博客使用语雀写作，使用 Hexo 从语雀拉取文章并生成静态文件（该过程通过 Github Action 自动触发），静态文件使用 Github Pages托管。

master 分支是 Hexo 生成的静态文件， src 分支是 Hexo 项目。通过 Github Action 触发 src 分支自动编译后自动推送静态文件至 master 分支触发 Github Pages 自动部署。
