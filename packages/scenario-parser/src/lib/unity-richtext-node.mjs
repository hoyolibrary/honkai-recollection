/**
 * unity-richtext 的 Node 运行时（先复制跑通，后续再考虑回归 workspace 复用）。
 *
 * 为什么不能直接 import 'unity-richtext'：
 *   1. 其 dist 虽为 ESM 产物，但 package.json 未声明 "type": "module"，Node 把 dist/index.js
 *      按 CJS 解析直接语法报错；
 *   2. dist 内相对 import 均缺 .js 扩展名，即便补上 type 也无法被 Node ESM 加载。
 * 处理：首次运行时把 dist 的 .js 复制到系统临时目录并补全 import 扩展名后动态加载；
 * 以源文件 (路径, 大小, mtime) 指纹做缓存，unity-richtext 子模块更新后自动重建。
 *
 * 同时增加额外标签转换器 （unbreak/icon/align等）与 HSR 插值表达式处理器
 * （{F#}{M#} 性别、{RUBY_B#}{RUBY_E#} 注音、{NICKNAME} 等变量；去掉 DOMPurify——输入为
 * 受信游戏数据；返回 Node 而非字符串以避免被 createDecodedTextNode 当纯文本转义）。
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const DIST_ROOT = path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "..", "..", "..", "unity-richtext", "dist",
);

function listDistFiles() {
  const files = [];
  for (const entry of fs.readdirSync(DIST_ROOT, { recursive: true })) {
    const p = path.join(DIST_ROOT, entry);
    if (fs.statSync(p).isFile() && p.endsWith(".js")) files.push(p);
  }
  return files;
}

function distFingerprint(files) {
  const parts = files.map(p => {
    const st = fs.statSync(p);
    return `${path.relative(DIST_ROOT, p)}:${st.size}:${st.mtimeMs}`;
  });
  // VENDOR_VERSION 变化时强制重建缓存（vendoring 逻辑自身修正后旧缓存不可用）
  return crypto.createHash("sha1").update(`v2|${parts.join("|")}`).digest("hex").slice(0, 16);
}

/** 为 Node ESM 补全相对 import/export-from 的扩展名（.js → .mjs，目录引用 → /index.mjs） */
function rewriteEsmImports(source, distRoot, fromFile) {
  const baseDir = path.dirname(fromFile);
  return source.replace(/(from\s+)(["'])(\.[^"']+)\2/g, (match, head, quote, spec) => {
    const resolved = path.resolve(baseDir, spec);
    if (fs.existsSync(`${resolved}.js`)) return `${head}${quote}${spec}.mjs${quote}`;
    if (fs.existsSync(path.join(resolved, "index.js"))) return `${head}${quote}${spec}/index.mjs${quote}`;
    return match;
  });
}

// 缓存放在包内 .cache/（gitignore）：bare import（antlr4/lodash.template）需要沿包路径向上
// 找到 workspace 根 node_modules，放到系统临时目录则无法解析
const CACHE_ROOT = path.join(pkgRoot(), ".cache");

function pkgRoot() {
  return path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
}

function vendorToCache() {
  const files = listDistFiles();
  const fingerprint = distFingerprint(files);
  const targetRoot = path.join(CACHE_ROOT, `unity-richtext-esm-${fingerprint}`);
  const marker = path.join(targetRoot, ".complete");
  if (!fs.existsSync(marker)) {
    const staleRoots = fs.existsSync(CACHE_ROOT)
      ? fs.readdirSync(CACHE_ROOT)
        .filter(name => /^unity-richtext-esm-/.test(name) && name !== path.basename(targetRoot))
        .map(name => path.join(CACHE_ROOT, name))
      : [];
    fs.rmSync(targetRoot, { recursive: true, force: true });
    for (const file of files) {
      const rel = path.relative(DIST_ROOT, file);
      // 复制为 .mjs：缓存目录无 package.json，.js 会被 Node 按 CJS 解析
      const target = path.join(targetRoot, rel.replace(/\.js$/, ".mjs"));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, rewriteEsmImports(fs.readFileSync(file, "utf8"), DIST_ROOT, file), "utf8");
    }
    fs.writeFileSync(marker, fingerprint, "utf8");
    for (const stale of staleRoots) fs.rmSync(stale, { recursive: true, force: true });
  }
  return path.join(targetRoot, "index.mjs");
}

// dist 仅在解析期使用 document / DOMParser / Element 等 DOM 全局，jsdom 提供即可
function setupDomGlobals() {
  if (globalThis.document && globalThis.DOMParser && globalThis.Element) return;
  const { JSDOM } = createRequire(import.meta.url)("jsdom");
  const dom = new JSDOM("<!DOCTYPE html><body></body>");
  for (const key of ["document", "DOMParser", "Element", "Node", "HTMLElement", "DocumentFragment"]) {
    if (!globalThis[key]) globalThis[key] = dom.window[key];
  }
}

/**
 * HSR 插值表达式处理器（去 DOMPurify；hasHtml 时返回元素避免被当纯文本转义）
 */
export class HSRInterpolationProcessor {
  constructor(variables) {
    this.variables = variables || { playerGender: "M", NICKNAME: "" };
  }

  processImageInterpolation(text, data) {
    return {
      hasHtml: false,
      text: text.replaceAll(/\{Img#(\d+)\}/gi, (match, index) => {
        const rawValue = data[parseInt(index) - 1];
        if (rawValue) {
          try {
            const url = new URL(rawValue).href;
            return `<img class="hsr-embedded-img" src="${url}" alt="" />`;
          } catch {
            // 非法 URL 保留原文
          }
        }
        return match;
      }),
    };
  }

  processFormattedSkillInterpolation(text, data) {
    return {
      hasHtml: false,
      text: text.replaceAll(/#(\d+)\[([A-Za-z0-9]+)\](%*)/g, (match, index, format, hasPercent) => {
        let rawValue = data[parseInt(index) - 1];
        hasPercent ||= "";
        if (hasPercent) rawValue *= 100;
        if (format === "i") return String(~~rawValue) + hasPercent;
        if (format.startsWith("f")) return rawValue.toFixed(parseInt(format.slice(1))) + hasPercent;
        return String(rawValue) + hasPercent;
      }),
    };
  }

  processSimpleSkillInterpolation(text, data) {
    return {
      hasHtml: false,
      text: text.replaceAll(/#(\d+)(%*)/g, (match, index, hasPercent) => {
        let rawValue = data[parseInt(index) - 1];
        hasPercent ||= "";
        if (hasPercent) rawValue *= 100;
        return String(rawValue) + hasPercent;
      }),
    };
  }

  processGenderInterpolation(text) {
    return {
      hasHtml: false,
      text: text.replaceAll(/\{([FM])#([^}]+)\}/g, (match, gender, content) =>
        gender === this.variables.playerGender ? content : ""),
    };
  }

  processRubyInterpolation(text) {
    let hasHtml = false;
    const result = text.replaceAll(/\{RUBY_B#([^}]+)\}([^{]+)\{RUBY_E#\}/g, (match, ruby, name) => {
      hasHtml = true;
      return `<ruby>${name}<rt>${ruby}</rt></ruby>`;
    });
    return { hasHtml, text: result };
  }

  processDictInterpolation(text) {
    return {
      hasHtml: false,
      text: text.replaceAll(/#\{([A-Za-z0-9:_]+)\}/g, (match, variable) => this.variables[variable] || variable),
    };
  }

  processVariableInterpolation(text) {
    return {
      hasHtml: false,
      // 变量名允许 #（TEXTJOIN#n 文本拼接变量）
      text: text.replaceAll(/\{([A-Za-z0-9_#]+)\}/g, (match, variable) => this.variables[variable] ?? ""),
    };
  }

  process(text, data) {
    data ||= [];
    let hasHtml = false;
    try {
      if (data.length > 0) {
        for (const step of [
          t => this.processImageInterpolation(t, data),
          t => this.processFormattedSkillInterpolation(t, data),
          t => this.processSimpleSkillInterpolation(t, data),
        ]) {
          const result = step(text);
          text = result.text;
          hasHtml ||= result.hasHtml;
        }
      }
      for (const step of [
        t => this.processGenderInterpolation(t),
        t => this.processRubyInterpolation(t),
        t => this.processDictInterpolation(t),
        t => this.processVariableInterpolation(t),
      ]) {
        const result = step(text);
        text = result.text;
        hasHtml ||= result.hasHtml;
      }
      if (hasHtml) {
        const span = globalThis.document.createElement("span");
        span.innerHTML = text;
        return span;
      }
      return text;
    } catch {
      return text;
    }
  }
}

let converterModulePromise;

async function loadConverterModule() {
  setupDomGlobals();
  if (!converterModulePromise) {
    converterModulePromise = import(pathToFileUrl(vendorToCache()));
  }
  return converterModulePromise;
}

function pathToFileUrl(p) {
  const resolved = path.resolve(p);
  let pathname = resolved.replace(/\\/g, "/");
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  return `file://${encodeURI(pathname)}`;
}

/**
 * 创建配置好 HSR 额外标签与插值的转换器
 */
export async function createHsrConverter(variables) {
  const { UnityRichTextConverter, TagConverter } = await loadConverterModule();

  class UnbreakConverter extends TagConverter {
    supportedTags = ["unbreak"];
    convert(context, domParser) {
      const element = this.createElement("span", domParser);
      this.setAttributes(element, { class: "hsr-tag--unbreak" });
      return element;
    }
  }

  class IconConverter extends TagConverter {
    supportedTags = ["icon"];
    convert(context, domParser) {
      const element = this.createElement("span", domParser);
      const sprite = `url('https://cdn2.dicloud.work/static/apps/hkstarrail/richtextsprite/${context.attributes.SpriteName}.png') no-repeat center/contain`;
      this.setAttributes(element, {
        class: "hsr-tag--icon",
        style: { "-webkit-mask": sprite, mask: sprite },
      });
      return element;
    }
  }

  class AlignConverter extends TagConverter {
    supportedTags = ["align"];
    convert(context, domParser) {
      const element = this.createElement("div", domParser);
      this.setAttributes(element, {
        class: "hsr-tag--align",
        style: { "text-align": String(context.attributes.align ?? "") },
      });
      return element;
    }
  }

  // 注音直通：<ruby>/<rt> 原样生成（配合 renderRichText 的解析前 ruby 变换；
  // 无此转换器时会落到 DefaultTagConverter 变成 span）
  class RubyTagConverter extends TagConverter {
    supportedTags = ["ruby", "rt", "rp"];
    convert(context, domParser) {
      return this.createElement(context.tagName, domParser);
    }
  }

  const converter = new UnityRichTextConverter();
  converter.registerConverter(new UnbreakConverter());
  converter.registerConverter(new AlignConverter());
  converter.registerConverter(new IconConverter());
  converter.registerConverter(new RubyTagConverter());
  converter.interpolationProcessor = new HSRInterpolationProcessor(variables);
  return converter;
}

/**
 * 渲染一条文本到 HTML。
 * ruby 注音在解析前先变换为真实标签：插值处理器按解析后的「文本节点」逐段执行，
 * 跨嵌套标签的 {RUBY_B#<color…>…</color>}…{RUBY_E#}（实测 37 句）会因被标签切分而漏处理；
 * 统一前置处理后处理器内的 ruby 分支自然不再命中。
 */
export function renderRichText(converter, text) {
  const variables = converter.interpolationProcessor?.variables ?? { playerGender: "M" };
  // 1) 转义不成标签的孤立 <（如 ">>>EpieiKeia"、颜文字 "<ﾉ)♡"），交由实体解码还原为文本
  let preprocessed = String(text ?? "").replace(/<(?!\/?[A-Za-z])/g, "&lt;");
  // 2) 跨富文本标签的性别分支（如 {M#<color…>…</color>}）：插值按解析后的文本节点逐段执行，
  //    会被标签切分而失效，解析前整体处理（普通不跨标签的形式也随之统一前置）
  preprocessed = preprocessed.replace(/\{([FM])#((?:[^{}]|<[^>]*>)+)\}/g, (match, gender, content) =>
    gender === variables.playerGender ? content : "");
  // 3) ruby 注音前置变换：rt 与基底可内含一层非 RUBY_ 花括号组（{NICKNAME}/{TEXTJOIN#n} 等），
  //    但不得跨过相邻的 {RUBY_B#…}（连续注音对会被贪婪基底吞并），允许空基底
  preprocessed = preprocessed.replaceAll(
    /\{RUBY_B#((?:[^{}]|{(?!RUBY_)[^{}]*})+)\}((?:[^{}]|{(?!RUBY_)[^{}]*})*)\{RUBY_E#\}/g,
    (match, ruby, name) => `<ruby>${name}<rt>${ruby}</rt></ruby>`,
  );
  // 空输入（如仅含未选中性别分支的文本）直接返回，ANTLR 解析器不接受空串
  if (!preprocessed.trim()) return "";
  return converter.parseToHTML(preprocessed);
}
