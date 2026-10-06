# NeoPot DeepSeek Translate

使用 DeepSeek 官方 API（OpenAI 兼容的 Chat Completions）为 [NeoPot](https://github.com/shirumesu/NeoPot) 提供翻译服务，默认调用 **DeepSeek V4.1 Flash（`deepseek-flash`）**，思考模式默认走官方默认值。

本仓库格式参考 [shirumesu/Neopot-releases](https://github.com/shirumesu/Neopot-releases)。

## 目录结构

```
plugins/plugin-deepseek-translate/
├── info.json   # 插件清单
├── main.js     # 插件入口
└── icon.svg    # 图标
marketplace-plugins.json   # 插件市场索引（可选的第三方索引条目）
scripts/pack-plugins.mjs   # 打包为 dist/plugins/*.zip
```

## 安装

1. 打开 NeoPot → 插件页 → 安装插件目录。
2. 选择 `plugins/plugin-deepseek-translate` 目录（或先打包成 zip 再安装）。
3. 在翻译服务页新增服务实例，填入 DeepSeek API Key。
4. 在翻译设置里把该服务加入翻译服务列表。

## 配置

### 服务实例配置（`needs`）

| 字段 | 说明 |
| --- | --- |
| API Key | 必填，DeepSeek 平台 API Key（`sk-...`） |
| Model | 可选，默认使用插件级 Default Model |
| Prompt | 可选，自定义提示词，支持 `$text` `$from` `$to` `$detect` 占位符；未写 `$text` 时自动追加原文 |
| Extra JSON Arguments | 可选，直接合并进请求体的额外参数，例如 `{"temperature":0.3}` |

### 插件级配置（`options`）

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| Base URL | `https://api.deepseek.com/chat/completions` | 可填完整端点、基址或 `/v1` 基址 |
| Default Model | `deepseek-flash` | DeepSeek V4.1 Flash |
| Thinking Mode | `Default` | `Default` / `Enabled` / `Disabled` |
| Reasoning Effort | `Default` | `Default` / `low` / `high` / `max` |

### 关于思考模式

- `Thinking Mode = Default` 且 `Reasoning Effort = Default` 时，请求体不携带 `thinking` / `reasoning_effort`，即使用 DeepSeek 官方默认：**思考开启，effort = high**。
- `Enabled` 会显式发送 `"thinking": {"type": "enabled"}`；`Disabled` 会发送 `"thinking": {"type": "disabled"}` 并去掉 `reasoning_effort`。
- 指定 effort 时发送 `reasoning_effort`。按官方文档，`minimal`/`medium` 等会被映射，本插件只暴露 `low`/`high`/`max`。
- 思考模式下 `temperature`、`presence_penalty`、`frequency_penalty` 无效（不会报错但被忽略），因此本插件默认不发送 `temperature`；如需请写入 Extra JSON Arguments。

## 打包与发布

```bash
node scripts/pack-plugins.mjs
```

产物在 `dist/plugins/plugin-deepseek-translate.zip`。仓库内的 GitHub Actions（手动触发）会把 zip 上传到 `plugins` release，`marketplace-plugins.json` 中的 `download` 指向该 release。

打包发布后可把 `marketplace-plugins.json` 的原始地址加入 NeoPot 的插件市场源：
`https://raw.githubusercontent.com/chuangzaoh666/neopot-deepseek-translate/main/marketplace-plugins.json`

## 备注

- 本仓库不包含任何 API Key。
- 插件基于 DeepSeek OpenAI 兼容接口，模型 ID 以 DeepSeek 官方文档为准。
- 参考文档：<https://api-docs.deepseek.com/guides/thinking_mode/>

## License

GPL-3.0
