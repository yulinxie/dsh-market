# 自建 DSH 插件市场索引

先澄清一件事：**DSH 目前没有官方插件市场**。源码里的原话是「目前没有官方插件市场；发现标签页只列出用户添加的索引源」（`@deepseek-ai/dsh-experimental-plugin-market-bundle` 的 README）。所以没有"提交上架"的地方。

DSH 的「市场」= 用户自己配置的一串 **索引 URL**。索引是一份 JSON（格式 1），DSH 读取后渲染成「插件 → 发现」页里的列表，点安装时它会调用插件管理器执行 `pnpm add`。换句话说：**你自己托管一份索引，就等价于开了一个市场**，别人把 URL 加进「发现」就能看到并安装。

本目录里的 `index.json` 就是这样一份索引，已用 DSH 自带的校验器（`dsh-plugin-market-index`，格式 1）验证通过，并托管在 GitHub Pages 上：

```
https://yulinxie.github.io/dsh-market/index.json
```

把这个地址填进「发现」页即可（下面还有本机自托管的办法）。

## 在 DSH 里打开「发现」页

1. 侧边栏 → **插件** → **实验性插件** 旁的 **更多** → 启用 **自定义插件市场**；
2. 插件页出现 **已安装 / 发现** 两个标签，进「发现」，添加索引 URL。

注意启用这个组合包会同时给 Creator 会话加一个只读的 `plugin_market` 工具（会话上下文变大一点），不想要就再关掉。

## 本机先试一下

```sh
node serve.mjs 8099          # 只本机
node serve.mjs 8099 --lan    # 局域网，别的电脑也能读
```

然后在「发现」里加：

```
http://127.0.0.1:8099/index.json
```

会看到「账户余额胶囊」这一条，点安装会执行：

```
git+https://github.com/yulinxie/dsh-plugin-balance.git#7a8b62b…
```

即从已发布的公开仓库拉取固定 commit。若目标机器已装过同名的本地插件，先卸载再装。

## 两个前提（决定走哪条路线）

### 1. 名字被占了

`dsh-plugin-balance` 在 npm 上已经有别人的包（作者 Andrew111888，最新 1.4.4，2026-08 起发了 15 个版本）。你发布会被 403 拒绝；反过来，谁要是 `pnpm add dsh-plugin-balance`，装到的是别人的额度悬浮窗，不是你这个。

我查了一下，这两个名字目前是空着的：

- `dsh-plugin-account-balance`
- `dsh-plugin-balance-pill`

或者用带作用域的名字（你自己的 npm 用户名即可）：`@你的用户名/dsh-plugin-balance`。

### 2. 得有个能装的来源

索引里的每个版本只能是两种来源之一：

```json
{ "type": "npm" }                                   // → pnpm 装 name@version
{ "type": "npm", "registry": "https://npm.example.com/" }  // 私有源
{ "type": "git", "url": "https://github.com/you/repo", "commit": "<40 位小写 sha>" }  // → git+https://…git#<commit>
```

没有"HTTP 直链 tarball"这一种，所以 `.tgz` 只能本地装，进不了市场。

## 路线 A：发到 npm（最省事）

```sh
# 1. 改 package.json：去掉 "private": true，改成空着能用的名字
# 2. 登录并发布
npm login
npm publish --access public
# 3. 校验结果
npm view dsh-plugin-account-balance version
```

索引里对应改成：

```json
{ "name": "dsh-plugin-account-balance", "versions": [{ "version": "0.1.0", "publishTimestamp": 1794034800, "source": { "type": "npm" }, "engines": { "dsh": ">=0.2.0-rc.1 <0.3.0" } }] }
```

之后任何人（包括换电脑的你自己）在「发现」里加你的索引 URL，点安装即可。

## 路线 B：发到 GitHub，索引指向 commit（已采用）

仓库已在：<https://github.com/yulinxie/dsh-plugin-balance>（公开，`main` 分支，匿名 clone 验证通过）。

`index.json` 里当前就是这样，指向一个固定 commit：

```json
"source": {
  "type": "git",
  "url": "https://github.com/yulinxie/dsh-plugin-balance",
  "commit": "7a8b62b8b9d9f2212dc011d46532db3468d4c695"
}
```

装出来的 spec 是 `git+https://github.com/yulinxie/dsh-plugin-balance.git#7a8b62b…`。**发新版时**：push 之后把 `commit` 换成新 sha、`version` 换成新版本号、`publishTimestamp` 换成当前时间，再验证一次。

注意 `url` 必须是规范形式、至少两段路径、不能带凭据/查询串；`commit` 必须是完整 40 位 sha（短 sha 校验不过）。包在仓库子目录里就再加 `"path": "子目录名"`。

给别的仓库复用时：

```sh
git init && git add -A && git commit -m "0.1.0"
git remote add origin https://github.com/你/仓库.git
git push -u origin main
git rev-parse HEAD     # 40 位 sha，填进索引
```

## 路线 C：私有 registry

公司内网用 Verdaccio / Nexus 之类，发布后用 `source.registry` 指过去，安装会先问这个源。适合不想公开、又多台机器的情况。

## 托管索引文件

索引就是个静态文件，放哪都行，只要满足：`http(s)`、无凭据、无 query/fragment、GET 不重定向（DSH 明确拒绝重定向）。

- **GitHub Pages**：`https://你.github.io/仓库/index.json`（推荐，稳定）
- **raw.githubusercontent.com**：`https://raw.githubusercontent.com/你/仓库/main/index.json`（能用，但每次绑定分支）
- **自己的服务器/NAS**：任意静态托管，`serve.mjs --lan` 也算
- 局域网测试用 `http://<本机IP>:8099/index.json`

## 索引格式要点（格式 1）

| 位置 | 规则 |
|---|---|
| `format` | 必须是 `1` |
| `title` | 必填；要么字符串，要么 `{ "en": "...", "zh": "..." }` 且**必须有 en** |
| `metadata.categories/labels/sortKeys` | 声明表；插件里引用了没声明的 id 直接报错 |
| `plugins[].name` | 必须是合法 npm 包名（小写、可带 `@scope/`） |
| `plugins[].versions[]` | 非空、版本不能重复、按 SemVer 自动降序 |
| `publishTimestamp` | 整数 Unix **秒**，`[0, 10^11)` |
| `icon` | `https:` 绝对地址、`data:` 内联（≤32 KiB），或相对索引 URL 的同源地址 |
| `engines.dsh` | 必须是合法 SemVer 范围，不能写 `workspace:` |

改完想复验，告诉我，我用 DSH 自带的那份校验器再跑一遍（它会指到 `$.plugins[0].versions[0].engines.dsh` 这种精确路径）。

## 两个坑

- **索引没有签名**：索引里写什么名字、什么版本，只是市场的"声明"；真正装进去的是那个包自己的 manifest。指向别人仓库/包名的索引，等于让别人替你决定装什么。
- **市场不支持升级**：索引更新后已装的包只会显示 `update-available`，升级要先卸载再装。
