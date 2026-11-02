param(
    [string]$DataRoot,
    [string]$DummyDllDirectory,
    [string]$StructuredOutput,
    [string]$MarkdownOutput
)

$ErrorActionPreference = 'Stop'
$projectDirectory = $PSScriptRoot
$repositoryRoot = (Resolve-Path (Join-Path $projectDirectory '..\..')).Path
if ([string]::IsNullOrWhiteSpace($DataRoot)) {
    $DataRoot = Join-Path $repositoryRoot 'extern\TurnBasedGameData'
}
if ([string]::IsNullOrWhiteSpace($DummyDllDirectory)) {
    $DummyDllDirectory = Join-Path $projectDirectory 'DummyDll'
}
if ([string]::IsNullOrWhiteSpace($StructuredOutput)) {
    $StructuredOutput = Join-Path $projectDirectory 'output\core-types.json'
}
if ([string]::IsNullOrWhiteSpace($MarkdownOutput)) {
    $MarkdownOutput = Join-Path $repositoryRoot 'packages\scenario-parser\docs\scenario-type-inheritance-inventory.md'
}

$project = Join-Path $projectDirectory 'scenario-type-scan.csproj'
$binary = Join-Path $projectDirectory 'bin\Debug\net10.0\scenario-type-scan.dll'

if (-not (Test-Path (Join-Path $DataRoot 'Config')) -or -not (Test-Path (Join-Path $DataRoot 'Story'))) {
    throw "TurnBasedGameData is missing or incomplete at: $DataRoot. Run git submodule update --init --recursive."
}
if (-not (Test-Path (Join-Path $DummyDllDirectory 'RPG.GameCore.Config.dll'))) {
    throw "Required DummyDll files are missing at: $DummyDllDirectory. See tool/scenario-type-scan/README.md."
}

dotnet build $project --nologo --verbosity quiet
if ($LASTEXITCODE -ne 0) {
    throw "scenario-type-scan build failed: $LASTEXITCODE"
}

$jsonText = & dotnet $binary $DataRoot $DummyDllDirectory inventory-json
if ($LASTEXITCODE -ne 0) {
    throw "scenario-type-scan inventory-json failed: $LASTEXITCODE"
}

$data = $jsonText | ConvertFrom-Json
if ($data.scan.coreTypeCount -ne @($data.types).Count) {
    throw "Core type count does not match generated rows: metadata=$($data.scan.coreTypeCount), rows=$(@($data.types).Count)"
}

$utf8 = [System.Text.UTF8Encoding]::new($false)
$structuredDirectory = Split-Path -Parent $StructuredOutput
$markdownDirectory = Split-Path -Parent $MarkdownOutput
[System.IO.Directory]::CreateDirectory($structuredDirectory) | Out-Null
[System.IO.Directory]::CreateDirectory($markdownDirectory) | Out-Null
[System.IO.File]::WriteAllText($StructuredOutput, $jsonText, $utf8)

function Escape-Markdown([object]$value) {
    if ($null -eq $value) { return '' }
    return ([string]$value).Replace('|', '\|').Replace("`r", '').Replace("`n", '<br>')
}

function Short-Type([string]$value) {
    return $value.Replace('RPG.GameCore.', '').Replace('RPG.Client.', 'RPG.Client.')
}

function Source-Text($sources) {
    $labels = [ordered]@{
        'Mission/Act' = 'Mission/Act'
        'Mission/Talk' = 'Mission/Talk'
        'Mission/Mission' = 'Mission/Mission_'
        'Story/Mission' = 'Story/Mission'
        'Story/Discussion' = 'Story/Discussion'
    }
    $parts = [System.Collections.Generic.List[string]]::new()
    foreach ($entry in $labels.GetEnumerator()) {
        $property = $sources.PSObject.Properties[$entry.Key]
        if ($null -ne $property -and [long]$property.Value -gt 0) {
            $parts.Add("$($entry.Value) $($property.Value)")
        }
    }
    return $parts -join '；'
}

$builder = [System.Text.StringBuilder]::new()
function Add-Line([string]$line = '') {
    [void]$builder.AppendLine($line)
}

Add-Line '# 剧情解析核心类型继承清单'
Add-Line
Add-Line ("> 生成日期 {0}。由 ``tool/scenario-type-scan/generate-inventory.ps1`` 根据 B 的真实 JSON 实例与 A 的 DummyDll 元数据生成；不要手工维护展开后的主表。" -f $data.generatedDate)
Add-Line '>'
Add-Line '> 数据源 B：根目录 `extern/TurnBasedGameData` 子模块；类型源 A：工具目录内被忽略的 `DummyDll/`。未读取 `dump.cs`。关联结论见 [scenario-parser-directions.md](./scenario-parser-directions.md)。'
Add-Line
Add-Line '## 1. 口径与总量'
Add-Line
Add-Line '- 核心范围：`Config/Level/Mission/*/Act`、`Mission/*/Talk`、`Mission_*.json`、`Story/Mission`、`Story/Discussion`。'
Add-Line ('- B 实际命中 {0} 个核心 `$type`；主表还插入这些类型继承路径上的游戏中间基类，展开后的行数见下表。' -f $data.scan.coreTypeCount)
Add-Line '- 继承树排除 `System.*`、`UnityEngine.*` 等框架基类；仅使用重复的全角中间点 `・` 表达游戏类型之间的继承层级，不使用空格、制表符或连接符。A 未解析类型保持零级。'
Add-Line '- “主要引用来源”只统计上述核心范围，同一类型可出现在多个桶。类别由可复跑的启发式规则生成，主要用于审查和分工，不是游戏官方分类。'
Add-Line
Add-Line '| 指标 | 数量 |'
Add-Line '|------|-----:|'
Add-Line "| 扫描 Config/Story JSON | $($data.scan.filesScanned) |"
Add-Line "| JSON 解析失败 | $($data.scan.invalidFiles) |"
Add-Line "| 核心剧情图文件 | $($data.scan.coreFiles) |"
Add-Line ('| 核心 `$type` | {0} |' -f $data.scan.coreTypeCount)
Add-Line "| 展开继承节点后的主表行数 | $($data.scan.expandedTreeNodeCount) |"
Add-Line "| 核心或任务外对白相关类型 | $($data.scan.relevantTypeCount) |"
Add-Line "| A 同目录 DLL 类型总数 | $($data.scan.dllTypeCount) |"
Add-Line
Add-Line '### 1.1 核心类型族'
Add-Line
Add-Line '| 类型族 | 类型数 | 实例数 |'
Add-Line '|--------|-------:|-------:|'
foreach ($family in $data.families) {
    Add-Line ("| ``{0}`` | {1} | {2} |" -f (Escape-Markdown $family.family), $family.types, $family.occurrences)
}
Add-Line
Add-Line '### 1.2 文件桶'
Add-Line
Add-Line '| 文件桶 | 不重复类型 | 实例数 |'
Add-Line '|--------|-----------:|-------:|'
foreach ($bucket in $data.buckets) {
    $label = if ($bucket.bucket -eq 'Mission/Mission') { 'Mission/Mission_' } else { $bucket.bucket }
    Add-Line ("| ``{0}`` | {1} | {2} |" -f $label, $bucket.types, $bucket.occurrences)
}
Add-Line
Add-Line '### 1.3 生成类别'
Add-Line
Add-Line '| 类别 | 类型数 | 实例数 |'
Add-Line '|------|-------:|-------:|'
foreach ($category in ($data.types | Group-Object Category | Sort-Object Name)) {
    $occurrences = ($category.Group | Measure-Object Occurrences -Sum).Sum
    Add-Line "| $(Escape-Markdown $category.Name) | $($category.Count) | $occurrences |"
}
Add-Line
Add-Line '## 2. 展开的核心类型继承与引用清单'
Add-Line
Add-Line '| 继承树　　　　　　　   | 类别　　　      | 总实例　　   | 文件数　　   | 功能说明 | 主要引用来源（实例） |'
Add-Line '|--------------------------|------------|-----------:|-----------:|----------|----------------------|'
$treeRows = 0
foreach ($row in $data.tree) {
    $treeRows++
    $sourceText = Source-Text $row.sources
    $occurrences = if ($null -eq $row.occurrences) { '—' } else { [string]$row.occurrences }
    $fileCount = if ($null -eq $row.fileCount) { '—' } else { [string]$row.fileCount }
    $description = Escape-Markdown $row.description
    Add-Line ("| {0} | {1} | {2} | {3} | {4} | {5} |" -f `
        (Escape-Markdown $row.treeLabel), (Escape-Markdown $row.category),
        $occurrences, $fileCount, $description, (Escape-Markdown $sourceText))
}
Add-Line
Add-Line '## 3. 审查提示'
Add-Line
Add-Line '- 表中类型名前连续的 `・` 数量表达游戏类型之间真实的元数据继承深度；插入的中间基类没有来源和实例数。该层级不表达 JSON 嵌套深度，JSON 嵌套仍须通用 walker 处理。'
Add-Line '- 类型数量不等于 handler 数量。类别为“对白载荷 / 选项载荷 / 剧情控制 / 演出生命周期”的类型才优先需要语义处理。'
Add-Line '- `PredicateConfig` 与 `TargetEvaluator` 在 L1 引用扫描中可以 opaque；若 L2/L3 要展示选项可见条件和说话目标，再逐步解释。'
Add-Line '- A/B 版本差异必须允许：类型目录负责提供提示，不能成为 JSON 解析的硬门槛。'

[System.IO.File]::WriteAllText($MarkdownOutput, $builder.ToString(), $utf8)
Write-Output "structured=$StructuredOutput"
Write-Output "markdown=$MarkdownOutput"
Write-Output "observedTypes=$($data.types.Count)"
Write-Output "treeRows=$treeRows"
