// SPDX-License-Identifier: GPL-3.0-only
// DeepSeek Translate — NeoPot translate plugin
// Uses the DeepSeek OpenAI-compatible Chat Completions API.
// The model is fixed to "deepseek-flash" (DeepSeek routes its model requests to V4.1),
// so there is no model selection in the config page.
// Default thinking mode: enabled, reasoning effort: provider default (high).

function getConfig(options) {
  return options && options.config ? options.config : {};
}

function getPluginOptions(options) {
  return options && options.utils && options.utils.pluginOptions ? options.utils.pluginOptions : {};
}

function requireValue(value, label) {
  if (value === undefined || value === null || String(value).trim() === '') throw new Error('请先配置 ' + label + '。');
  return String(value);
}

function getHttp(options) {
  const http = options && options.utils ? options.utils.http : null;
  const fetchFn = typeof http === 'function' ? http : http && typeof http.fetch === 'function' ? http.fetch.bind(http) : globalThis.fetch.bind(globalThis);
  const Body = http && http.Body ? http.Body : {
    json: function (data) { return JSON.stringify(data); },
    text: function (data) { return String(data); },
    form: function (data) {
      const form = new FormData();
      Object.entries(data).forEach(function (entry) { if (entry[1] !== undefined && entry[1] !== null) form.append(entry[0], String(entry[1])); });
      return form;
    },
  };
  return { fetch: fetchFn, Body: Body };
}

function jsonBody(options, data) { return getHttp(options).Body.json(data); }

async function request(options, url, init) {
  const res = await getHttp(options).fetch(url, init || {});
  if (res && res.ok === false) throw new Error('HTTP ' + (res.status || 'unknown') + ': ' + await responseText(res));
  return res;
}

async function responseJson(res) {
  if (res && res.data !== undefined) return res.data;
  if (res && typeof res.json === 'function') return await res.json();
  const text = await responseText(res);
  return text ? JSON.parse(text) : null;
}

async function responseText(res) {
  if (res && typeof res.data === 'string') return res.data;
  if (res && res.data !== undefined) return JSON.stringify(res.data);
  if (res && typeof res.text === 'function') return await res.text();
  return '';
}

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

// Accept a full endpoint, a base URL, or a base URL ending in /v1.
function resolveEndpoint(baseUrl) {
  let url = String(baseUrl || '').trim();
  if (!url) url = 'https://api.deepseek.com/chat/completions';
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  if (/\/chat\/completions$/i.test(url)) return url;
  return stripTrailingSlash(url) + '/chat/completions';
}

function stripQuotedResult(value) {
  let text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) text = text.slice(1, -1);
  return text.trim();
}

// Fixed model: DeepSeek routes model requests to V4.1.
const MODEL = 'deepseek-flash';

// Prompt from Tzulao55/pot-app-translate-plugin-deepseek: translate only, never interpret.
const DEFAULT_SYSTEM_PROMPT = 'You are a professional translation engine, please translate the text into a colloquial, professional, elegant and fluent content, without the style of machine translation. You must only translate the text content, never interpret it.';

function buildMessages(text, to) {
  return [
    { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
    { role: 'user', content: 'Translate into ' + (to || '') + ':\n' + text },
  ];
}

// Default is "enabled" (explicit thinking on); effort "default" leaves reasoning_effort
// out so the provider default ("high") applies.
function applyThinking(payload, pluginOptions) {
  const thinking = String(pluginOptions.thinking || 'enabled').toLowerCase();
  const effort = String(pluginOptions.reasoningEffort || 'default').toLowerCase();
  if (thinking === 'enabled') payload.thinking = { type: 'enabled' };
  else if (thinking === 'disabled') payload.thinking = { type: 'disabled' };
  if (effort !== 'default' && effort !== '') payload.reasoning_effort = effort;
  if (thinking === 'disabled') delete payload.reasoning_effort;
}

async function translate(text, from, to, options = {}) {
  const config = getConfig(options);
  const pluginOptions = getPluginOptions(options);
  const apiKey = requireValue(config.apiKey, 'API 密钥');
  const endpoint = resolveEndpoint(pluginOptions.baseUrl);
  const payload = {
    model: MODEL,
    messages: buildMessages(text, to),
    stream: false,
    temperature: 0.1,
    top_p: 0.99,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 2000,
  };
  applyThinking(payload, pluginOptions);

  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey };
  const res = await request(options, endpoint, { method: 'POST', headers: headers, body: jsonBody(options, payload) });
  const result = await responseJson(res);
  const message = result && result.choices && result.choices[0] && result.choices[0].message;
  const content = message && message.content;
  if (content !== undefined && content !== null && String(content).trim() !== '') return stripQuotedResult(content);
  throw new Error(JSON.stringify(result));
}

async function openHomepage({ utils }) {
  await utils.openUrl('https://api-docs.deepseek.com/guides/thinking_mode/');
}

export { translate, openHomepage };
