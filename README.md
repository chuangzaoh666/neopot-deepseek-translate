# NeoPot DeepSeek Translate

使用 DeepSeek 官方 OpenAI 兼容接口（Chat Completions）为 [NeoPot](https://github.com/shirumesu/NeoPot) 提供翻译服务，**只输出译文**，模型固定为 `deepseek-flash`。

- 提示词参考 [Tzulao55/pot-app-translate-plugin-deepseek](https://github.com/Tzulao55/pot-app-translate-plugin-deepseek)。
- 仓库格式参考 [shirumesu/Neopot-releases](https://github.com/shirumesu/Neopot-releases)。
- 遇到「保存设置失败 / Secret encryption is unavailable」，见文末[注意事项](#注意事项)。

## 关于模型

DeepSeek 官方说明，对 `deepseek-chat`、`deepseek-reasoner`、以及各 V4 系列（如 flash、pro）模型的请求都会被统一转换为 DeepSeek V4.1 处理，因此本插件**不提供模型选择**，固定使用 `deepseek-flash`。

## 目录结构

```
plugins/plugin-deepseek-translate/
├── info.json   # 插件清单
├── main.js     # 插件入口
└── icon.svg    # 图标
marketplace-plugins.json   # 插件市场索引
scripts/pack-plugins.mjs   # 打包为 dist/plugins/*.zip
```

## 安装

1. 打开 NeoPot → 插件页 → 安装插件目录。
2. 选择 `plugins/plugin-deepseek-translate` 目录（或先打包成 zip 再安装）。
3. 在翻译服务页新增服务实例，填入 DeepSeek API Key。
4. 在翻译设置里把该服务加入翻译服务列表。

## 配置（配置页为中文）

### 服务实例配置

| 字段 | 说明 |
| --- | --- |
| API 密钥 | 必填，DeepSeek 平台 API Key（`sk-...`） |

只有一个必填项。提示词与额外请求参数已固定写死在代码里（NeoPot 的可选输入框留空时无法保存，故不提供）。

### 插件级配置

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| 接口地址 | `https://api.deepseek.com/chat/completions` | 可填完整端点、基址或 `/v1` 基址 |
| 思考模式 | 开启 | 默认 / 开启 / 关闭 |
| 推理强度 | 默认 | 默认 / 低 / 高 / 最高 |

### 内置提示词与请求参数

系统提示词（取自参考插件）：

```
You are a professional translation engine, please translate the text into a colloquial, professional, elegant and fluent content, without the style of machine translation. You must only translate the text content, never interpret it.
```

用户消息：`Translate into <目标语言>:\n<原文>`

请求参数：`temperature=0.1`、`top_p=0.99`、`frequency_penalty=0`、`presence_penalty=0`、`max_tokens=2000`。

### 关于思考模式

- 默认 `思考模式 = 开启`、`推理强度 = 默认`：请求携带 `"thinking": {"type": "enabled"}`，不携带 `reasoning_effort`，即 effort 用官方默认 `high`。
- `关闭` 会发送 `"thinking": {"type": "disabled"}` 并去掉 `reasoning_effort`。
- 指定推理强度时发送 `reasoning_effort`（仅暴露 `low`/`high`/`max`）。
- 思考模式下 `temperature`、`presence_penalty`、`frequency_penalty` 会被忽略（不报错），`top_p` 有效范围为 0.95–1.0。

## 打包与发布

```bash
node scripts/pack-plugins.mjs
```

产物在 `dist/plugins/plugin-deepseek-translate.zip`。仓库内的 GitHub Actions（手动触发）会把 zip 上传到 `plugins` release，`marketplace-plugins.json` 中的 `download` 指向该 release。

打包发布后可把 `marketplace-plugins.json` 的原始地址加入 NeoPot 的插件市场源：
`https://raw.githubusercontent.com/chuangzaoh666/neopot-deepseek-translate/main/marketplace-plugins.json`

## 注意事项

### 保存 API 密钥失败（Secret encryption is unavailable）

现象：填入 API Key 点保存时提示保存失败，日志 `~/.config/NeoPot/logs/main.log` 报：

```
Secret encryption is unavailable on this system.
```

原因：NeoPot 会对键名含 `apikey`、`api_key`、`token`、`password`、`secret_key` 等片段的配置项用 Electron `safeStorage` 加密。在非 GNOME/KDE 桌面（如 niri、Hyprland 等），`XDG_CURRENT_DESKTOP` 不被 Chromium 识别，会选到 `basic_text` 后端，`safeStorage.isEncryptionAvailable()` 返回 `false`，导致保存整体失败。这不是本插件的问题，任何使用 `apiKey` 字段的 NeoPot 插件都会遇到。

解决：启动 NeoPot 时加 `--password-store=gnome-libsecret`（需要 gnome-keyring 正在运行且已解锁）：

```
~/.local/opt/neopot/AppRun --no-sandbox --password-store=gnome-libsecret
```

用 `.desktop` 启动时，把该参数写进 `Exec=` 行；用脚本/命令行启动同理。修改后需要重启 NeoPot 才生效。

自检方法（Electron 的桌面环境判断）：正常时应为 `gnome_libsecret` 且加解密可用：

```js
const { app, safeStorage } = require('electron')
app.whenReady().then(() => {
  console.log(safeStorage.getSelectedStorageBackend(), safeStorage.isEncryptionAvailable())
  app.quit()
})
```

### 其他

- 保存成功后，API Key 由 gnome-keyring 加密存储，仓库与配置文件中不含明文密钥。
- 请求固定 `max_tokens=2000`，翻译超长文本时可能被截断。
- 默认「思考模式=开启」会消耗推理 token（按输出计费），对成本敏感可在插件页设为「关闭」。
- 若直接运行原始 `neopot.appimage` 而不走 `AppRun`，同样需要自行加上 `--password-store=gnome-libsecret`。

## 来源与致谢

本插件的部分代码与提示词派生自以下 GPL-3.0 项目，因此整体以 GPL-3.0 发布：

- [shirumesu/Neopot-releases](https://github.com/shirumesu/Neopot-releases)（GPL-3.0）— `main.js` 的辅助函数与插件结构、`info.json` 字段。
- [Tzulao55/pot-app-translate-plugin-deepseek](https://github.com/Tzulao55/pot-app-translate-plugin-deepseek)（GPL-3.0）— 系统提示词。

## 备注

- 本仓库不包含任何 API Key。
- 参考文档：<https://api-docs.deepseek.com/guides/thinking_mode/>

## License

GPL-3.0（全文见 [LICENSE](LICENSE)）。
