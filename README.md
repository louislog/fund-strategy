# 基金投资策略分析

![GitHub Repo stars](https://img.shields.io/github/stars/louislog/fund-strategy)
![GitHub forks](https://img.shields.io/github/forks/louislog/fund-strategy)
![](https://img.shields.io/badge/-%E8%B4%A2%E5%AF%8C%E8%87%AA%E7%94%B1-red)

无需数据库，通过 jsonp 借用基金网站的数据接口，根据历史数据，通过图表展示效果。

对历史的各个时间点，符合一定的条件时，进行某些投资策略，包括定投、止盈、补仓等投资操作，最后进行投资策略成果分析，通过图表展示效果。

## 内容列表

- [作品来源](#作品来源)
- [背景](#背景)
- [安装与运行](#安装与运行)
- [开发计划文档](#开发计划文档)
- [使用说明](#使用说明)
  - [基础回测功能](#基础回测功能)
  - [策略对比](#策略对比)
- [感谢](#感谢)

## 作品来源

本仓库在 **[SunshowerC/fund-strategy](https://github.com/SunshowerC/fund-strategy)** 开源项目的基础上进行二次开发与扩展（例如组合回测、策略引擎与本地/容器化部署等）。若你希望了解最初的设计思路与实现脉络，欢迎同时阅读上游仓库与其提交历史。

## 背景

很多人都在鼓吹指数定投，微笑曲线，巴菲特鼎力推荐 blabla，但割韭菜的大 V 太多，很容易被带节奏。

网上也有定投计算器，但往往只有一个结果，没有过程，不够得劲。

**数据不会说谎，用数据说话是程序员的浪漫。**

> 基于这个模型，也可以简单拓展成股票的交易模型，不过基于本人对炒股不是很熟，所以大家有兴趣的可以自行 fork 改造。

## 安装与运行

### 本地开发

需要 Node 开发环境（npm、node）。

```
npm install
```

运行：

```
npm start
```

### Docker（推荐用于本地或自建环境）

在项目根目录构建并启动：

```
docker compose up -d --build
```

构建完成后，应用通过 Nginx 提供静态资源，**访问地址**为：

**http://localhost:8000/fund/**

（根路径 `/` 会重定向到 `/fund/`，与构建时的 `publicPath` 一致。）

查看容器日志：

```
docker logs -f fund_strategy_instance
```

如需单独构建镜像（非 compose），可参考 `Dockerfile` 与 `docker-compose.yml` 中的 `production` 构建目标。

## 使用说明

这是个前端静态站点，数据来自公开的基金行情接口（运行时无需自建数据库）。部署或本地启动后，在浏览器中打开上述地址即可使用。

### 基础回测功能

1. 输入你想要回测的基金，可以直接输入搜索。
2. 设置定投策略
3. 【可选】设置止盈策略
4. 【可选】设置补仓策略
5. 点击查询

![image](https://user-images.githubusercontent.com/13402013/100250664-dfaa6800-2f78-11eb-936d-cc1acdad9c66.png)

### 策略对比

1. 保存两条及以上搜索条件
2. 点击策略对比

![image](https://user-images.githubusercontent.com/13402013/100251039-462f8600-2f79-11eb-93ed-45725c1da70f.png)

3. 将打开策略对比页（路由 `#/compare`），勾选需要对比的策略条件，查询得到结果

![image](https://user-images.githubusercontent.com/13402013/100251436-bb9b5680-2f79-11eb-9ca3-51155368fee6.png)

## 感谢

- **原作者 [SunshowerC](https://github.com/SunshowerC)**：感谢开源 [fund-strategy](https://github.com/SunshowerC/fund-strategy)，为本项目提供了清晰的问题定义与可扩展的基础架构，使二次开发得以在此之上开展。
- **数据提供方**：感谢相关基金信息平台提供的公开数据接口（本项目通过浏览器端请求使用，请以各平台服务条款为准）。
- **社区**：感谢每一位 star 与 issue/讨论的贡献者；祝理性投资、量力而行。
