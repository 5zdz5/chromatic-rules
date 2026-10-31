# 色域法则 · Chromatic Rules

一个关于规则组合的细胞自动机游戏。

在彩色格阵中编写 **消失** 与 **增殖** 规则，观察颜色疆域如何生长、退场与碰撞。

## 在线试玩

部署到 GitHub Pages 后访问：

**https://5zdz5.github.io/chromatic-rules/**

## 玩法

每条规则由五个部分组成：

- **主体**：规则作用的颜色
- **动作**：消失 / 增殖
- **半径**：R1 检查周围 8 格，R2 检查 24 格，R3 检查 48 格
- **阈值**：区域内至少有多少个邻色
- **邻色**：用于判定条件的颜色

结算规则：

- 同代规则基于同一快照同时结算
- 同一格同时满足消失与增殖时，消失优先
- 多条增殖规则争夺同一空位时，排在前面的规则优先
- 增殖会填满判定半径内所有空格，而不仅是上下左右相邻格

## 内容

- **初焰**：链式清除赤色
- **蔓延**：把翠色增长到 72
- **双前线**：同时清除赤色与紫色
- **临界**：清除赤色，并让青色、翠色各达到 45
- **沙盒**：自由绘制、编写规则，没有胜负和步数限制

内置自动演化、速度调节、规则悬停预览、最佳代数记录和深浅主题切换。进度保存在浏览器本地。

## 仓库结构

```
.
├── docs/                 # GitHub Pages 独立网页版
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── icon.svg
│   └── .nojekyll
└── chromatic-rules/      # DeepSeek Harness 插件版
    ├── client.js
    ├── index.js
    ├── cordis.patch.yml
    ├── locale/
    └── icon.svg
```

## GitHub Pages

Pages 使用 `main` 分支的 `/docs` 目录发布。页面没有构建步骤，也不依赖外部 CDN。

## Harness 插件

`chromatic-rules/` 中的插件版仍可作为 DeepSeek Harness bundle 安装，入口位于侧边栏面板列表。
