// 案例探索用提取器：只读当前数据快照，不依赖 cli-hsr 生成物或 DummyDll。
import fs from 'node:fs';
import path from 'node:path';
import JSONBigFactory from 'json-bigint';

const JSONBig = JSONBigFactory({ storeAsString: true });
export const valueOf = value => value && typeof value === 'object' ? value.Value : value;
export function walk(node, visit, pointer = '$', parentType = null) {
  if (!node || typeof node !== 'object') return;
  if (!Array.isArray(node)) visit(node, pointer, parentType);
  const type = node.$type ?? parentType;
  for (const [key, value] of Object.entries(node)) {
    if (value && typeof value === 'object') walk(value, visit, `${pointer}.${key}`, type);
  }
}

export function createExtractor(dataRoot) {
  const cache = new Map();
  function read(file) {
    if (!cache.has(file)) cache.set(file, JSONBig.parse(fs.readFileSync(path.join(dataRoot, file), 'utf8')));
    return cache.get(file);
  }
  const exists = file => fs.existsSync(path.join(dataRoot, file));
  const table = name => read(`ExcelOutput/${name}.json`);
  const textMap = {};
  for (const file of fs.readdirSync(path.join(dataRoot, 'TextMap')).sort()) {
    if (/^TextMapCHS(?:_\d+)?\.json$/.test(file)) Object.assign(textMap, read(`TextMap/${file}`));
  }
  const text = hash => hash?.Hash == null ? null : textMap[String(hash.Hash)] ?? null;
  const index = (name, key) => new Map(table(name).map(row => [row[key], row]));
  const sentences = index('TalkSentenceConfig', 'TalkSentenceID');
  const displays = index('RogueDialogueOptionDisplay', 'OptionDisplayID');
  const excelOptions = index('RogueDialogueOption', 'OptionID');

  // 发现所有 Rogue 表中指向对白图、选项配置、NPC 的真实路径；不扫棋盘/战斗/Modifier。
  const isDialoguePath = v => typeof v === 'string' &&
    /^Config\/Level\/(?:RogueDialogue\/|Rogue\/(?:RogueNPC|RogueDialogue)\/).+\.json$/.test(v);
  function inventory() {
    const queue = [], links = [], files = new Map(), missing = [], tables = {};
    function collect(node, source) {
      walk(node, (object, pointer) => {
        for (const [field, target] of Object.entries(object)) {
          if (!isDialoguePath(target)) continue;
          links.push({ source, pointer: `${pointer}.${field}`, target });
          queue.push(target);
        }
      });
    }
    for (const file of fs.readdirSync(path.join(dataRoot, 'ExcelOutput')).sort()) {
      if (!/^Rogue.*\.json$/.test(file)) continue;
      const source = `ExcelOutput/${file}`;
      const before = links.length;
      collect(read(source), source);
      if (links.length > before) tables[file.slice(0, -5)] = { rows: read(source).length, paths: links.length - before };
    }
    const visited = new Set();
    for (let i = 0; i < queue.length; i++) {
      const file = queue[i];
      if (visited.has(file)) continue;
      visited.add(file);
      if (!exists(file)) { missing.push(file); continue; }
      files.set(file, read(file));
      collect(read(file), file);
    }
    // Act 与 Opt 的配对来自同一条 NPC DialogueList / Excel 行，不能靠文件名拼接。
    const optionPaths = new Map();
    function pair(root) {
      walk(root, node => {
        const graph = node.DialoguePath ?? node.LevelGraphPath;
        if (graph && node.OptionPath) {
          if (!optionPaths.has(graph)) optionPaths.set(graph, new Set());
          optionPaths.get(graph).add(node.OptionPath);
        }
      });
    }
    for (const name of Object.keys(tables)) pair(table(name));
    for (const root of files.values()) pair(root);
    return { tables, links, files, missing, optionPaths };
  }

  function extract(graphPath, optionPath = null) {
    const graph = read(graphPath), diagnostics = [], events = [], edges = [], groups = [], types = {};
    const localOptions = new Map();
    if (optionPath) {
      if (!exists(optionPath)) diagnostics.push({ kind: 'missing-option-file', source: optionPath });
      else for (const row of read(optionPath).OptionList ?? []) localOptions.set(row.OptionID, row);
    }
    function sentence(id, pointer) {
      id = valueOf(id);
      const row = sentences.get(id);
      const body = text(row?.TalkSentenceText);
      if (!row || body == null) diagnostics.push({ kind: 'missing-sentence', id, pointer });
      return { id, text: body, speaker: text(row?.TextmapTalkSentenceName), hash: row?.TalkSentenceText?.Hash ?? null };
    }
    const sequenceAt = pointer => /^(\$\.On(?:Start|Init)Sequece\.\d+)/.exec(pointer)?.[1] ?? null;
    walk(graph, (node, pointer, parentType) => {
      if (node.$type) types[node.$type] = (types[node.$type] ?? 0) + 1;
      const base = { pointer, sequence: sequenceAt(pointer), type: node.$type ?? parentType };
      if (/\.OptionList\.\d+$/.test(pointer) && parentType === 'RPG.GameCore.PlayRogueOptionTalk') {
        const local = localOptions.get(valueOf(node.RogueOptionID));
        const excel = excelOptions.get(valueOf(node.RogueOptionID));
        const displayId = local?.DisplayID ?? excel?.OptionDisplayID;
        const display = displays.get(displayId);
        const spoken = node.TalkSentenceID ? sentence(node.TalkSentenceID, pointer) : null;
        const inline = text(node.OptionTextmapID);
        const title = text(display?.OptionTitle);
        // 各文本源并存保留，展示表提供事件名称和效果；不宣称运行时优先级。
        const label = spoken?.text ?? title ?? inline;
        const resolution = spoken ? 'sentence' : title != null ? (local ? 'local-opt' : 'excel-option') : inline != null ? 'inline-textmap' : 'unresolved';
        if (label == null) diagnostics.push({ kind: 'missing-option-label', pointer, rogueOptionId: node.RogueOptionID ?? null,
          reason: !local && !excel ? 'no-option-config' : !display ? 'no-display-row' :
            !display.OptionTitle ? 'display-has-no-title' : 'title-hash-not-in-textmap' });
        if (node.OptionTextmapID && inline == null) diagnostics.push({ kind: 'missing-inline-hash', pointer, hash: node.OptionTextmapID.Hash });
        if (displayId != null && !display) diagnostics.push({ kind: 'missing-display', pointer, displayId });
        events.push({ ...base, kind: 'option', sentence: spoken, rogueOptionId: node.RogueOptionID ?? null,
          label, resolution, displayId: displayId ?? null, display: display ?? null,
          descriptionTemplate: text(display?.OptionDesc), inlineText: inline,
          configSource: local ? optionPath : excel ? 'ExcelOutput/RogueDialogueOption.json' : null,
          config: local ?? excel ?? null, raw: node });
      } else if (node.TalkSentenceID != null) {
        events.push({ ...base, kind: 'talk', sentence: sentence(node.TalkSentenceID, pointer), raw: node });
      }
      const type = node.$type?.split('.').at(-1);
      if (['PlayAndWaitRogueSimpleTalk', 'PlayRogueSimpleTalk', 'PlayAeonTalk', 'PlayRogueOptionTalk'].includes(type)) {
        // 保留 AeonTalkId / AeonTalkCount 等父任务元数据，载荷在 events 中逐项记录。
        const { SimpleTalkList, OptionList, ...metadata } = node;
        groups.push({ ...base, raw: metadata });
      }
      if (type && !['PlayAndWaitRogueSimpleTalk', 'PlayRogueSimpleTalk', 'PlayAeonTalk', 'PlayRogueOptionTalk'].includes(type)) {
        // 未解释的控制/展示任务也保留原文，walker 仍然穿透其所有子字段。
        events.push({ ...base, kind: 'control', raw: node });
      }
      if (node.TriggerCustomString) edges.push({ ...base, kind: 'option-trigger', signal: valueOf(node.TriggerCustomString) });
      if (type === 'TriggerCustomString') edges.push({ ...base, kind: 'trigger', signal: valueOf(node.CustomString) });
      if (node.SuccessCustomString) edges.push({ ...base, kind: 'dialogue-event', dialogueEventId: node.DialogueEventID, signal: valueOf(node.SuccessCustomString) });
    });
    const waiters = new Map();
    for (const event of events) {
      if (event.raw.$type !== 'RPG.GameCore.WaitCustomString') continue;
      const signal = valueOf(event.raw.CustomString);
      if (!waiters.has(signal)) waiters.set(signal, []);
      waiters.get(signal).push({ sequence: event.sequence, pointer: event.pointer });
    }
    for (const edge of edges) {
      edge.targets = waiters.get(edge.signal) ?? [];
      if (!edge.targets.length) diagnostics.push({ kind: 'unresolved-signal', pointer: edge.pointer, signal: edge.signal });
    }
    return { graphPath, optionPath, types, groups, events, edges, diagnostics };
  }
  return { read, table, text, exists, inventory, extract };
}
