using Mono.Cecil;

namespace ScenarioTypeScan;

/// <summary>summary / carriers / structural / core-list 四个控制台表格输出模式。</summary>
internal static class ReportModes
{
    public static int Summary(StoryScanResult scan, AssemblyIndex index)
    {
        Console.WriteLine("CORE_BUCKETS\tbucket\ttypes\toccurrences");
        foreach (var bucket in StoryJsonScanner.CoreBuckets)
        {
            var rows = scan.Stats.Values.Where(x => x.CoreBuckets.ContainsKey(bucket)).ToList();
            Console.WriteLine($"BUCKET\t{bucket}\t{rows.Count}\t{rows.Sum(x => x.CoreBuckets[bucket])}");
        }
        Console.WriteLine("UNTYPED_CARRIERS\t" + StoryJsonScanner.Counts(scan.UntypedCarriers));
        return 0;
    }

    public static int Carriers(StoryScanResult scan, AssemblyIndex index)
    {
        Console.WriteLine("CARRIER\ttype\tdirectObjects\tnestedDirectObjects\tcoreOcc\ttotalOcc\tbaseChain\ttopBuckets\tfields");
        var names = scan.Stats.Values.Where(x => x.DirectCarrierOccurrences > 0).Select(x => x.Name)
            .Concat(scan.UntypedCarriers.Keys.Where(x => x != "<no-typed-ancestor>"))
            .Distinct(StringComparer.Ordinal)
            .OrderBy(x => x, StringComparer.Ordinal);
        foreach (var name in names)
        {
            scan.Stats.TryGetValue(name, out var row);
            index.Types.TryGetValue(name, out var type);
            Console.WriteLine(string.Join('\t', "CARRIER", name,
                (row?.DirectCarrierOccurrences ?? 0).ToString(),
                scan.UntypedCarriers.GetValueOrDefault(name).ToString(),
                (row?.CoreOccurrences ?? 0).ToString(), (row?.TotalOccurrences ?? 0).ToString(),
                TypeGraph.BaseChain(type, index.Types), row is null ? "" : StoryJsonScanner.TopCounts(row.Buckets, 10), TypeGraph.Fields(type)));
        }
        if (scan.UntypedCarriers.TryGetValue("<no-typed-ancestor>", out var count))
            Console.WriteLine($"CARRIER\t<no-typed-ancestor>\t0\t{count}");
        return 0;
    }

    public static int Structural(StoryScanResult scan, AssemblyIndex index)
    {
        Console.WriteLine("STRUCTURAL\ttype\tcoreOcc\ttalkDesc\tbaseChain\tfields");
        foreach (var row in scan.Stats.Values
                     .Where(x => x.CoreOccurrences > 0 && x.TalkDescendantOccurrences > 0)
                     .OrderByDescending(x => x.TalkDescendantOccurrences).ThenBy(x => x.Name, StringComparer.Ordinal))
        {
            index.Types.TryGetValue(row.Name, out var type);
            Console.WriteLine(string.Join('\t', "STRUCT", row.Name, row.CoreOccurrences.ToString(),
                row.TalkDescendantOccurrences.ToString(), TypeGraph.BaseChain(type, index.Types), TypeGraph.StructuralFields(type)));
        }
        return 0;
    }

    public static int CoreList(StoryScanResult scan, AssemblyIndex index)
    {
        Console.WriteLine("CORE\tfamily\ttype\toccurrences\tfiles\tbaseChain");
        foreach (var row in scan.Stats.Values.Where(x => x.CoreOccurrences > 0)
                     .OrderBy(x => Classification.Family(x.Name, index.Types), StringComparer.Ordinal)
                     .ThenBy(x => x.Name, StringComparer.Ordinal))
        {
            index.Types.TryGetValue(row.Name, out var type);
            Console.WriteLine(string.Join('\t', "CORE", Classification.Family(row.Name, index.Types), row.Name,
                row.CoreOccurrences.ToString(), row.CoreFiles.Count.ToString(), TypeGraph.BaseChain(type, index.Types)));
        }
        return 0;
    }
}
