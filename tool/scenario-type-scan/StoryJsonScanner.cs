using System.Text.Json;

namespace ScenarioTypeScan;

/// <summary>
/// 扫描 data-root 下 Config/Story 的剧情 JSON，统计各 `$type` 在核心（Mission/Act、Mission/Talk、
/// Story/Mission、Story/Discussion）与全量数据中的出现分布，并记录对白载荷载体的直接命中情况。
/// </summary>
internal static class StoryJsonScanner
{
    /// <summary>summary / inventory-json 输出共用的核心 bucket 顺序。</summary>
    public static readonly string[] CoreBuckets =
        ["Mission/Act", "Mission/Talk", "Mission/Mission", "Story/Mission", "Story/Discussion"];

    public static StoryScanResult Scan(string dataRoot)
    {
        var stats = new Dictionary<string, TypeStats>(StringComparer.Ordinal);
        var untypedCarriers = new Dictionary<string, long>(StringComparer.Ordinal);
        var invalid = new List<string>();
        long filesScanned = 0;
        long coreFiles = 0;
        long talkFiles = 0;

        foreach (var top in new[] { "Config", "Story" })
        {
            var root = Path.Combine(dataRoot, top);
            foreach (var file in Directory.EnumerateFiles(root, "*.json", SearchOption.AllDirectories))
            {
                filesScanned++;
                var relative = Path.GetRelativePath(dataRoot, file);
                var bucket = Bucket(relative);
                var core = IsCore(relative);
                if (core) coreFiles++;
                try
                {
                    using var doc = JsonDocument.Parse(File.ReadAllBytes(file));
                    if (Visit(doc.RootElement, relative, bucket, core, null, stats, untypedCarriers)) talkFiles++;
                }
                catch (Exception ex)
                {
                    invalid.Add($"{relative}\t{ex.GetType().Name}: {ex.Message}");
                }
            }
        }

        return new StoryScanResult(stats, untypedCarriers, invalid, filesScanned, coreFiles, talkFiles);
    }

    private static bool Visit(JsonElement node, string file, string bucket, bool core, string? nearestType,
        Dictionary<string, TypeStats> stats, Dictionary<string, long> untypedCarriers)
    {
        if (node.ValueKind == JsonValueKind.Array)
        {
            var found = false;
            foreach (var item in node.EnumerateArray())
                found |= Visit(item, file, bucket, core, nearestType, stats, untypedCarriers);
            return found;
        }
        if (node.ValueKind != JsonValueKind.Object) return false;

        string? typeName = null;
        var direct = false;
        foreach (var property in node.EnumerateObject())
        {
            if (property.NameEquals("$type") && property.Value.ValueKind == JsonValueKind.String)
                typeName = TypeGraph.Normalize(property.Value.GetString()!);
            if (IsCarrierField(property.Name)) direct = true;
        }

        TypeStats? current = null;
        if (typeName is not null)
        {
            if (!stats.TryGetValue(typeName, out current)) stats[typeName] = current = new(typeName);
            current.TotalOccurrences++;
            current.Files.Add(file);
            Increment(current.Buckets, bucket);
            if (core)
            {
                current.CoreOccurrences++;
                current.CoreFiles.Add(file);
                Increment(current.CoreBuckets, bucket);
            }
        }

        if (direct)
        {
            if (current is not null) current.DirectCarrierOccurrences++;
            else Increment(untypedCarriers, nearestType ?? "<no-typed-ancestor>");
        }

        var contains = direct;
        var nextNearest = typeName ?? nearestType;
        foreach (var property in node.EnumerateObject())
        {
            if (property.NameEquals("$type")) continue;
            contains |= Visit(property.Value, file, bucket, core, nextNearest, stats, untypedCarriers);
        }
        if (contains && current is not null) current.TalkDescendantOccurrences++;
        return contains;
    }

    private static bool IsCarrierField(string name) =>
        name.Contains("TalkSentence", StringComparison.OrdinalIgnoreCase) || name is "SentenceID" or "SentenceList";

    private static bool IsCore(string relative)
    {
        var path = relative.Replace('\\', '/');
        if (path.StartsWith("Story/Mission/", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("Story/Discussion/", StringComparison.OrdinalIgnoreCase)) return true;
        if (!path.StartsWith("Config/Level/Mission/", StringComparison.OrdinalIgnoreCase)) return false;
        return path.Contains("/Act/", StringComparison.OrdinalIgnoreCase) ||
               path.Contains("/Talk/", StringComparison.OrdinalIgnoreCase) ||
               Path.GetFileName(path).StartsWith("Mission_", StringComparison.OrdinalIgnoreCase);
    }

    private static string Bucket(string relative)
    {
        var path = relative.Replace('\\', '/');
        if (path.StartsWith("Story/Mission/", StringComparison.OrdinalIgnoreCase)) return "Story/Mission";
        if (path.StartsWith("Story/Discussion/", StringComparison.OrdinalIgnoreCase)) return "Story/Discussion";
        if (path.StartsWith("Story/BattlePerformance/", StringComparison.OrdinalIgnoreCase)) return "Story/BattlePerformance";
        if (path.StartsWith("Config/Level/Mission/", StringComparison.OrdinalIgnoreCase))
        {
            if (path.Contains("/Act/", StringComparison.OrdinalIgnoreCase)) return "Mission/Act";
            if (path.Contains("/Talk/", StringComparison.OrdinalIgnoreCase)) return "Mission/Talk";
            return "Mission/Mission";
        }
        foreach (var name in new[] { "MunicipalChatConfig", "RogueDialogue", "Rogue", "NPCDialogue", "NPC", "PropDialogue", "CrowdBubble" })
            if (path.StartsWith($"Config/Level/{name}/", StringComparison.OrdinalIgnoreCase)) return $"Level/{name}";
        var parts = path.Split('/');
        return string.Join('/', parts.Take(Math.Min(parts.Length, 3)));
    }

    private static void Increment(Dictionary<string, long> values, string key)
    {
        values.TryGetValue(key, out var value);
        values[key] = value + 1;
    }

    public static string Counts(IReadOnlyDictionary<string, long> values) => string.Join(',', values
        .OrderByDescending(x => x.Value).ThenBy(x => x.Key, StringComparer.Ordinal).Select(x => $"{x.Key}:{x.Value}"));

    public static string TopCounts(IReadOnlyDictionary<string, long> values, int count) => string.Join(',', values
        .OrderByDescending(x => x.Value).ThenBy(x => x.Key, StringComparer.Ordinal).Take(count)
        .Select(x => $"{x.Key}:{x.Value}"));
}

internal sealed record StoryScanResult(
    Dictionary<string, TypeStats> Stats,
    Dictionary<string, long> UntypedCarriers,
    List<string> InvalidFiles,
    long FilesScanned,
    long CoreFiles,
    long TalkFiles);

internal sealed class TypeStats(string name)
{
    public string Name { get; } = name;
    public long TotalOccurrences { get; set; }
    public long CoreOccurrences { get; set; }
    public long DirectCarrierOccurrences { get; set; }
    public long TalkDescendantOccurrences { get; set; }
    public HashSet<string> Files { get; } = new(StringComparer.OrdinalIgnoreCase);
    public HashSet<string> CoreFiles { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, long> Buckets { get; } = new(StringComparer.Ordinal);
    public Dictionary<string, long> CoreBuckets { get; } = new(StringComparer.Ordinal);
}
