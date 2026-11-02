using System.Text.Json;

namespace ScenarioTypeScan;

/// <summary>
/// `inventory-json` 模式：把核心类型统计与 DummyDll 继承树组装成结构化清单 JSON，
/// 供 packages/scenario-parser/docs 的继承树 Markdown 生成消费。
/// </summary>
internal static class InventoryJsonMode
{
    public static int Run(StoryScanResult scan, AssemblyIndex index, string dataRoot, string dllDir)
    {
        var types = index.Types;
        var coreTypes = scan.Stats.Values.Where(x => x.CoreOccurrences > 0).ToList();
        var relevantTypes = scan.Stats.Values.Where(x =>
            x.CoreOccurrences > 0 || x.DirectCarrierOccurrences > 0 || x.TalkDescendantOccurrences > 0).ToList();
        var carrierNames = scan.Stats.Values.Where(x => x.DirectCarrierOccurrences > 0).Select(x => x.Name)
            .Concat(scan.UntypedCarriers.Keys).ToHashSet(StringComparer.Ordinal);

        var rows = coreTypes.Select(row =>
        {
            types.TryGetValue(row.Name, out var type);
            var path = TypeGraph.InheritancePath(row.Name, type, types);
            var anchor = path.FindIndex(x => x == "RPG.GameCore.JsonConfig");
            if (anchor < 0) anchor = 0;
            var visiblePath = path.Skip(anchor).ToArray();
            var depth = Math.Max(0, visiblePath.Length - 1);
            return new InventoryRow(
                row.Name,
                string.Concat(Enumerable.Repeat("・", depth)) + row.Name,
                string.Join(" <- ", visiblePath.Reverse()),
                string.Join('\u001f', visiblePath),
                depth,
                Classification.Family(row.Name, types),
                Classification.Category(row.Name, type, types, carrierNames.Contains(row.Name)),
                Classification.KeyBase(row.Name, type, types),
                Classification.KeyBaseDescription(row.Name, type, types),
                row.CoreOccurrences,
                row.CoreFiles.Count,
                row.CoreBuckets.OrderByDescending(x => x.Value).ThenBy(x => x.Key, StringComparer.Ordinal)
                    .ToDictionary(x => x.Key, x => x.Value, StringComparer.Ordinal),
                type is not null,
                TypeGraph.Fields(type));
        }).OrderBy(x => x.SortPath, StringComparer.Ordinal).ThenBy(x => x.Type, StringComparer.Ordinal).ToArray();

        var rootNodes = new Dictionary<string, TreeBuildNode>(StringComparer.Ordinal);
        var allNodes = new Dictionary<string, TreeBuildNode>(StringComparer.Ordinal);
        foreach (var row in rows)
        {
            TreeBuildNode? parent = null;
            foreach (var name in row.SortPath.Split('\u001f', StringSplitOptions.RemoveEmptyEntries))
            {
                if (!allNodes.TryGetValue(name, out var node)) allNodes[name] = node = new(name);
                if (parent is null) rootNodes.TryAdd(name, node);
                else parent.Children.TryAdd(name, node);
                parent = node;
            }
            if (parent is not null) parent.Observed = row;
        }
        var treeRows = Classification.ExpandTree(rootNodes.Values.OrderBy(x => x.Name, StringComparer.Ordinal), 0).ToArray();

        var familySummary = rows.GroupBy(x => x.Family).OrderBy(x => x.Key, StringComparer.Ordinal)
            .Select(x => new { family = x.Key, types = x.Count(), occurrences = x.Sum(y => y.Occurrences) });
        var bucketSummary = StoryJsonScanner.CoreBuckets.Select(bucket => new
        {
            bucket,
            types = rows.Count(x => x.Sources.ContainsKey(bucket)),
            occurrences = rows.Sum(x => x.Sources.GetValueOrDefault(bucket))
        });
        var payload = new
        {
            generatedDate = DateTime.Today.ToString("yyyy-MM-dd"),
            sources = new { dataRoot, dummyDllDirectory = dllDir },
            scan = new
            {
                filesScanned = scan.FilesScanned,
                invalidFiles = scan.InvalidFiles.Count,
                coreFiles = scan.CoreFiles,
                talkFiles = scan.TalkFiles,
                coreTypeCount = rows.Length,
                expandedTreeNodeCount = treeRows.Length,
                relevantTypeCount = relevantTypes.Count,
                dllTypeCount = types.Count
            },
            families = familySummary,
            buckets = bucketSummary,
            types = rows,
            tree = treeRows
        };
        Console.Write(JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = true }));
        return 0;
    }
}
