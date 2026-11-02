import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createExtractor, walk } from './extractor.mjs';

const caseRoot = path.dirname(fileURLToPath(import.meta.url));
const dataRoot = path.resolve(caseRoot, '../../data');
const outRoot = path.resolve(process.argv[2] ?? caseRoot);
const extractor = createExtractor(dataRoot);
const { table, read, text, extract } = extractor;
const inventory = extractor.inventory();
const rowAt = (name, key, id) => {
  const row = table(name).find(row => row[key] === id);
  assert.ok(row, `${name}.${key}=${id}`);
  return row;
};

// 每个案例都从 Excel 入口出发。NPC 案例保留同一 DialogueList 项给出的 Act / Opt 配对。
function direct(name, key, id, field, titleField, targetSentence = null) {
  const row = rowAt(name, key, id);
  return { name: text(row[titleField]), entry: { table: name, key, id, row },
    targetSentence, ...extract(row[field], row.OptionPath) };
}
function npc(name, id, label) {
  const row = rowAt(name, 'RogueNPCID', id);
  const config = read(row.NPCJsonPath);
  assert.equal(config.DialogueList.length, 1, '样本预期单个 DialogueList 项');
  const dialogue = config.DialogueList[0];
  const handbooks = [];
  for (const book of ['RogueHandBookEvent', 'RogueTournHandBookEvent']) {
    for (const event of table(book)) {
      if (event.UnlockNPCProgressIDList?.some(item => item.FDOELDMEBPE === id)) {
        handbooks.push({ table: book, id: event.EventHandbookID, name: text(event.EventTitle),
          pointer: 'UnlockNPCProgressIDList[].FDOELDMEBPE', row: event });
      }
    }
  }
  return { name: label ?? handbooks[0]?.name ?? `${name} ${id}`, entry: { table: name, key: 'RogueNPCID', id, row },
    handbooks, npcConfig: { path: row.NPCJsonPath, raw: config },
    ...extract(dialogue.DialoguePath, dialogue.OptionPath) };
}
const cases = [
  direct('RogueMagicStory', 'StoryID', 53023, 'LevelGraphPath', 'StoryName', 403058523),
  direct('RogueTournTitanTalent', 'ID', 13002, 'ActJson', 'ActTitle', 403818312),
  npc('RogueNPC', 10101),
  npc('RogueTournNPC', 410301),
  npc('RogueTournNPC', 710301),
  direct('RogueDLCSubStory', 'RogueDLCSubStoryID', 101, 'LevelGraphPath', 'SubStoryName'),
  npc('RogueNPC', 103, '星神对白（RogueNPC 103）'),
  npc('RogueMagicNPC', 510801, '不可知域事件：酒馆'),
];

const options = item => item.events.filter(event => event.kind === 'option');
const talks = item => item.events.filter(event => event.kind === 'talk');
const checks = [];
function check(name, callback) { callback(); checks.push(name); }
check('两个指定句子都从真实 Excel 路径抵达，并解析到非空中文', () => {
  for (const item of cases.slice(0, 2)) {
    assert.ok(talks(item).find(event => event.sentence.id === item.targetSentence)?.sentence.text);
    assert.equal(item.diagnostics.length, 0);
  }
  assert.equal(cases[0].name, '未来学大会•其三');
  assert.equal(cases[1].name, '约束人德之法');
  assert.equal(talks(cases[0]).length, 9);
  assert.equal(options(cases[0]).length, 6);
  assert.equal(talks(cases[1]).length, 14);
  assert.equal(options(cases[1]).length, 7);
});
check('并列选项保留共享汇合目标，不重复展开正文', () => {
  const firstGroup = cases[0].edges.filter(edge => edge.kind === 'option-trigger').slice(0, 3);
  assert.equal(firstGroup.length, 3);
  for (const edge of firstGroup) {
    assert.equal(edge.signal, 'TalkSentence_403058528');
    assert.equal(edge.targets[0].sequence, '$.OnStartSequece.1');
  }
  assert.equal(talks(cases[0]).filter(event => event.sentence.id === 403058528).length, 1);
});
check('普通事件图鉴关联 NPC / Act / Opt，旧内联 Hash 缺失仍能还原选项', () => {
  const item = cases[2];
  assert.ok(item.handbooks.some(row => row.table === 'RogueHandBookEvent' && row.id === 2));
  assert.deepEqual(options(item).map(event => event.displayId), [10101, 10102]);
  assert.deepEqual(options(item).map(event => event.label), ['克里珀的恩赐。', '克里珀的祝福。']);
  assert.ok(options(item).every(event => event.resolution === 'local-opt' && event.inlineText === null));
  assert.equal(options(item)[0].display.OptionTitle.Hash, '1838324248690805109');
});
check('差分宇宙复用正文但选项 ID / 配置不同，模板与参数均保留', () => {
  const item = cases[3];
  assert.ok(item.handbooks.some(row => row.table === 'RogueTournHandBookEvent' && row.id === 5));
  assert.equal(options(item)[0].displayId, 10305);
  assert.equal(options(item)[0].descriptionTemplate, '获得#2-#5个随机2星祝福。');
  assert.equal(options(item)[0].config.DescValue, 1);
  assert.equal(options(item)[0].config.DescValue2, 3);
  assert.deepEqual(talks(item).map(event => event.sentence.id), talks(cases[4]).map(event => event.sentence.id));
});
check('新版 Opt 路径缺失时可通过 RogueDialogueOption 显式关联展示表', () => {
  const item = cases[4];
  assert.ok(item.diagnostics.some(entry => entry.kind === 'missing-option-file'));
  assert.equal(options(item).length, 3);
  assert.ok(options(item).every(event => event.resolution === 'excel-option' && event.label));
  assert.equal(options(item)[0].rogueOptionId, 1030501);
  assert.equal(options(item)[0].displayId, 210305);
  assert.ok(options(item)[0].config.ParamList.length);
});
check('寰宇蝗灾独立 LevelGraphPath / OptionPath 与特殊选项元数据', () => {
  assert.equal(options(cases[5])[0].config.SpecialOptionID, 2);
  assert.ok(cases[5].edges.every(edge => edge.targets.length));
});
check('PlayAeonTalk 子载荷与普通 Rogue 顺序对白一并提取', () => {
  assert.ok(talks(cases[6]).some(event => event.type === 'RPG.GameCore.PlayAeonTalk'));
  const group = cases[6].groups.find(group => group.type === 'RPG.GameCore.PlayAeonTalk');
  assert.equal(group.raw.AeonTalkId, 1);
  assert.equal(group.raw.AeonTalkCount, 5);
  assert.ok(cases[6].edges.every(edge => edge.targets.length));
});
check('WaitDialogueEvent 回调边保留，不能将无 Trigger 选项猜接到回调', () => {
  const item = cases[7];
  assert.ok(item.edges.some(edge => edge.kind === 'dialogue-event' && edge.dialogueEventId === 110803));
  assert.ok(options(item).some(event => !event.raw.TriggerCustomString));
  assert.ok(item.edges.filter(edge => edge.kind === 'dialogue-event').every(edge => edge.targets.length));
});
check('所有样本逐项覆盖原图 TalkSentenceID 与 RogueOptionID，不靠 ID 区间补句', () => {
  for (const item of cases) {
    let sentences = 0, rogueOptions = 0;
    walk(read(item.graphPath), node => {
      if (node.TalkSentenceID != null) sentences++;
      if (node.RogueOptionID != null) rogueOptions++;
    });
    assert.equal(item.events.filter(event => event.sentence).length, sentences);
    assert.equal(options(item).filter(event => event.rogueOptionId != null).length, rogueOptions);
    assert.ok(!item.diagnostics.some(entry => ['missing-sentence', 'missing-option-label', 'missing-display', 'unresolved-signal'].includes(entry.kind)), item.graphPath);
  }
});

// 扩面巡检：所有由 Rogue Excel 入口可达的图。未知/缺失保留清单，不将覆盖率写成全游戏覆盖率。
const coverage = { tables: inventory.tables, referencedFiles: inventory.files.size + inventory.missing.length,
  presentFiles: inventory.files.size, missingFiles: inventory.missing, graphCount: 0, graphVariants: 0,
  typeCounts: {}, resolutions: {}, diagnostics: {}, issues: [], targetReferences: {}, checks };
for (const [graphPath, graph] of inventory.files) {
  if (!graph.OnStartSequece && !graph.OnInitSequece) continue;
  coverage.graphCount++;
  const paired = [...(inventory.optionPaths.get(graphPath) ?? [])];
  const variants = paired.length ? paired : [null];
  for (const optionPath of variants) {
    coverage.graphVariants++;
    const item = extract(graphPath, optionPath);
    // 类型按文件计一次，选项解析/诊断按 Act + Opt 配对计数。
    if (optionPath === variants[0]) {
      for (const [type, count] of Object.entries(item.types)) coverage.typeCounts[type] = (coverage.typeCounts[type] ?? 0) + count;
      for (const target of [403058523, 403818312]) {
        if (talks(item).some(event => event.sentence.id === target)) {
          (coverage.targetReferences[target] ??= []).push({ graphPath,
            incoming: inventory.links.filter(link => link.target === graphPath) });
        }
      }
    }
    for (const event of options(item)) coverage.resolutions[event.resolution] = (coverage.resolutions[event.resolution] ?? 0) + 1;
    for (const issue of item.diagnostics) {
      coverage.diagnostics[issue.kind] = (coverage.diagnostics[issue.kind] ?? 0) + 1;
      // 内联旧 Hash 缺失非常多，计数但仅留少量例证；其他缺口完整保留。
      if (issue.kind !== 'missing-inline-hash' || coverage.diagnostics[issue.kind] <= 5) {
        coverage.issues.push({ graphPath, optionPath, ...issue });
      }
    }
  }
}
check('入口驱动扩面巡检确实覆盖指定两句且每句仅命中一个演出文件', () => {
  for (const target of [403058523, 403818312]) assert.equal(coverage.targetReferences[target].length, 1);
  assert.ok(coverage.graphCount > 900);
  assert.equal(coverage.diagnostics['missing-sentence'] ?? 0, 0);
});
check('空展示行与缺失配置显式保留为缺口，不用相似 ID 猜选项文本', () => {
  const empty = coverage.issues.filter(issue => issue.kind === 'missing-option-label' && issue.graphPath.endsWith('/Act0390101.json'));
  assert.equal(empty.length, 4);
  assert.ok(empty.every(issue => issue.reason === 'display-has-no-title'));
  assert.ok(coverage.issues.some(issue => issue.kind === 'missing-option-label' && issue.reason === 'no-option-config'));
});

const snapshot = execFileSync('git', ['-C', dataRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const result = { snapshot, cases };
fs.mkdirSync(outRoot, { recursive: true });
fs.writeFileSync(path.join(outRoot, 'output.chs.json'), JSON.stringify(result, null, 2) + '\n');
fs.writeFileSync(path.join(outRoot, 'coverage.json'), JSON.stringify({ snapshot, ...coverage }, null, 2) + '\n');

// 每个原始 sequence 展示一次，跳转链接表示分支/汇合，不假定数组顺序就是播放顺序。
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>');
const lines = ['# 模拟宇宙 / 差分宇宙案例对白', '', `数据快照：\`${snapshot}\`。`, '',
  '按原图 sequence 分节；选项指向目标节，入口/监听序列不代表连续播放。正文保留原始富文本标记，效果模板中的 #n 不做未经验证的替换。', ''];
for (const [caseIndex, item] of cases.entries()) {
  lines.push(`## ${caseIndex + 1}. ${item.name}`, '', `入口：\`${item.entry.table}.${item.entry.key}=${item.entry.id}\`。`, '',
    `演出：\`${item.graphPath}\`。`, '');
  for (const book of item.handbooks ?? []) lines.push(`图鉴：${book.table} / ${book.id}「${book.name}」。`, '');
  if (item.optionPath) lines.push(`选项配置：\`${item.optionPath}\`。`, '');
  const sequences = [...new Set(item.events.map(event => event.sequence).filter(Boolean))];
  const anchor = sequence => `case-${caseIndex + 1}-${sequence.replaceAll(/[^\w]/g, '-')}`;
  for (const sequence of sequences) {
    lines.push(`<a id="${anchor(sequence)}"></a>`, '', `### ${sequence}`, '');
    for (const event of item.events.filter(event => event.sequence === sequence)) {
      if (event.kind === 'talk') lines.push(`**${escape(event.sentence.speaker || '旁白')}**（${event.sentence.id}）：${escape(event.sentence.text)}`, '');
      if (event.kind === 'option') {
        const edge = item.edges.find(edge => edge.pointer === event.pointer);
        const target = edge?.targets.map(target => `[${target.sequence}](#${anchor(target.sequence)})`).join(' / ');
        lines.push(`- **选项** ${escape(event.label)}（${event.sentence?.id ?? `RogueOptionID=${event.rogueOptionId}`}） → ${target || '等待运行时事件；本图未提供直接跳转'}`);
        if (event.descriptionTemplate) lines.push(`  <br>效果模板：${escape(event.descriptionTemplate)}`);
        if (event.config) lines.push(`  <br>配置：<code>${escape(JSON.stringify(event.config))}</code>`);
        lines.push('');
      }
      if (event.kind === 'control') {
        const type = event.raw.$type.split('.').at(-1);
        if (['WaitCustomString', 'WaitDialogueEvent', 'TriggerCustomString', 'TriggerDialogueEvent', 'WaitPerformanceEnd', 'FinishLevelGraph', 'WaitRogueSimpleTalkFinish'].includes(type)) {
          lines.push(`> ${type}：<code>${escape(JSON.stringify(event.raw))}</code>`, '');
        }
      }
    }
    for (const edge of item.edges.filter(edge => edge.sequence === sequence && edge.kind === 'dialogue-event')) {
      lines.push(`事件 ${edge.dialogueEventId} 成功 → ${edge.targets.map(target => `[${target.sequence}](#${anchor(target.sequence)})`).join(' / ')}。`, '');
    }
  }
}
fs.writeFileSync(path.join(outRoot, 'dialogue.chs.md'), lines.join('\n'));
console.log(JSON.stringify({ snapshot, cases: cases.length, checks: checks.length, graphCount: coverage.graphCount,
  graphVariants: coverage.graphVariants, missingFiles: coverage.missingFiles.length,
  resolutions: coverage.resolutions, diagnostics: coverage.diagnostics }, null, 2));
