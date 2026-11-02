using Mono.Cecil;

namespace ScenarioTypeScan;

/// <summary>
/// `va` 模式：按原生 VA 反查 DummyDll 方法归属（含混淆名）；无精确命中时给出最近的下方方法，
/// 用于原生切片审查时把调用点定位到所属函数。最近下方命中可能跨类型交错，仅作定位参考。
/// </summary>
internal static class VaLookupMode
{
    public static int Run(string dllDir, string[] vaTexts)
    {
        var wanted = vaTexts.Select(text => ulong.Parse(text.Trim().Replace("0x", ""), System.Globalization.NumberStyles.HexNumber)).ToHashSet();
        var rows = new List<(ulong va, string owner, string method, string signature)>();
        foreach (var file in Directory.EnumerateFiles(dllDir, "*.dll"))
        {
            try
            {
                using var assembly = AssemblyDefinition.ReadAssembly(file);
                foreach (var type in TypeGraph.Flatten(assembly.MainModule.Types))
                {
                    var owner = TypeGraph.Normalize(type.FullName);
                    foreach (var method in type.Methods)
                    {
                        foreach (var attribute in method.CustomAttributes)
                        {
                            if (attribute.AttributeType.FullName != "Il2CppDummyDll.AddressAttribute") continue;
                            foreach (var field in attribute.Fields)
                            {
                                var value = field.Argument.Value?.ToString();
                                if (value is null) continue;
                                var numeric = field.Name is "VA" or "RVA"
                                    ? ulong.Parse(value.Trim().Replace("0x", ""), System.Globalization.NumberStyles.HexNumber)
                                    : 0;
                                if (numeric != 0)
                                {
                                    var signature = method.ReturnType.FullName + " (" +
                                        string.Join(",", method.Parameters.Select(p => p.ParameterType.FullName)) + ")";
                                    rows.Add((numeric, owner, method.Name, signature));
                                }
                            }
                        }
                    }
                }
            }
            catch
            {
                // 与 AssemblyIndex 一致：跳过不可解析的占位程序集。
            }
        }
        var byVa = rows.DistinctBy(row => (row.va, row.owner, row.method)).OrderBy(row => row.va).ToList();
        foreach (var va in wanted)
        {
            var exact = byVa.Where(row => row.va == va).ToList();
            if (exact.Count > 0)
            {
                foreach (var match in exact)
                    Console.WriteLine($"{match.va:X16}\t{match.owner}\t{match.method}\t{match.signature}");
                continue;
            }
            var index = byVa.BinarySearch((va, string.Empty, string.Empty, string.Empty));
            if (index < 0) index = ~index - 1;
            if (index < 0)
            {
                Console.WriteLine($"{va:X16}\tNOT_FOUND");
                continue;
            }
            var nearest = byVa[index];
            Console.WriteLine($"{va:X16}\tNEAR\t{nearest.owner}\t{nearest.method}\t{nearest.signature}\tmethodVa={nearest.va:X16}\tdelta=+{va - nearest.va}");
        }
        return 0;
    }
}
