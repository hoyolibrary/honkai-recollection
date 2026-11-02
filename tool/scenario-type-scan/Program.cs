using System.Text.RegularExpressions;
using ScenarioTypeScan;

if (args.Length < 2 || (args.Length > 5 && args[2] != "va"))
{
    Console.Error.WriteLine("usage: scenario-type-scan <data-root> <dummy-dll-dir> [summary|carriers|structural|core-list|inventory-json|fields|va]");
    return 2;
}

var dataRoot = Path.GetFullPath(args[0]);
var dllDir = Path.GetFullPath(args[1]);
var mode = args.Length >= 3 ? args[2] : "summary";

if (mode == "va")
{
    // va <hex-va>...：按原生 VA 反查方法归属，供原生切片审查定位调用目标。
    if (args.Length < 4)
    {
        Console.Error.WriteLine("usage: scenario-type-scan <data-root> <dummy-dll-dir> va <hex-va> [hex-va...]");
        return 2;
    }
    return VaLookupMode.Run(dllDir, args[3..]);
}

if (mode == "fields")
{
    // fields <name-regex> [output-file]：导出命中类型（含字段引用闭包）的完整字段元数据，供 schema 生成消费。
    if (args.Length < 4)
    {
        Console.Error.WriteLine("usage: scenario-type-scan <data-root> <dummy-dll-dir> fields <name-regex> [output-file]");
        return 2;
    }
    var matcher = new Regex(args[3]);
    var outFile = args.Length == 5 ? Path.GetFullPath(args[4]) : null;
    return FieldsMode.Run(dllDir, matcher, outFile);
}

var scan = StoryJsonScanner.Scan(dataRoot);
using var index = AssemblyIndex.Load(dllDir);

if (mode == "inventory-json") return InventoryJsonMode.Run(scan, index, dataRoot, dllDir);

// 与分发前的旧行为一致：summary 头两行在所有非 inventory-json 模式下都会输出。
var coreTypes = scan.Stats.Values.Where(x => x.CoreOccurrences > 0).ToList();
Console.WriteLine(string.Join('\t', "SUMMARY",
    $"scanned={scan.FilesScanned}", $"invalid={scan.InvalidFiles.Count}", $"coreFiles={scan.CoreFiles}",
    $"talkFiles={scan.TalkFiles}", $"coreTypes={coreTypes.Count}",
    $"relevantTypes={scan.Stats.Values.Count(x => x.CoreOccurrences > 0 || x.DirectCarrierOccurrences > 0 || x.TalkDescendantOccurrences > 0)}",
    $"dllTypes={index.Types.Count}"));
Console.WriteLine("CORE_FAMILIES\tfamily\ttypes\toccurrences");
foreach (var group in coreTypes.GroupBy(x => Classification.Family(x.Name, index.Types)).OrderBy(x => x.Key, StringComparer.Ordinal))
    Console.WriteLine($"FAMILY\t{group.Key}\t{group.Count()}\t{group.Sum(x => x.CoreOccurrences)}");

return mode switch
{
    "summary" => ReportModes.Summary(scan, index),
    "carriers" => ReportModes.Carriers(scan, index),
    "structural" => ReportModes.Structural(scan, index),
    "core-list" => ReportModes.CoreList(scan, index),
    _ => UnknownMode(mode),
};

static int UnknownMode(string mode)
{
    Console.Error.WriteLine($"unknown mode: {mode}");
    return 2;
}
