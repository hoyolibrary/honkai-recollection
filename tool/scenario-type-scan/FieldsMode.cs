using System.Text.Json;
using Mono.Cecil;

namespace ScenarioTypeScan;

/// <summary>
/// `fields` 模式：按名称正则导出 DummyDll 中命中类型的字段元数据（含字段引用闭包与继承链），
/// 供 schema 生成脚本对照 Excel JSON 消费。输出为结构化 JSON。
/// </summary>
internal static class FieldsMode
{
    public static int Run(string dllDir, System.Text.RegularExpressions.Regex matcher, string? outFile)
    {
        var types = new Dictionary<string, TypeDefinition>(StringComparer.Ordinal);
        var assemblies = new List<AssemblyDefinition>();
        foreach (var file in Directory.EnumerateFiles(dllDir, "*.dll"))
        {
            try
            {
                var assembly = AssemblyDefinition.ReadAssembly(file);
                assemblies.Add(assembly);
                foreach (var type in TypeGraph.Flatten(assembly.MainModule.Types))
                    types.TryAdd(TypeGraph.Normalize(type.FullName), type);
            }
            catch
            {
                // Some Unity/native placeholder assemblies may not be valid managed metadata.
            }
        }

        var queue = new Queue<string>();
        foreach (var name in types.Keys)
            if (matcher.IsMatch(name)) queue.Enqueue(name);

        var payload = new SortedDictionary<string, object?>(StringComparer.Ordinal);
        var included = new HashSet<string>(StringComparer.Ordinal);
        var unresolved = new HashSet<string>(StringComparer.Ordinal);
        while (queue.Count > 0)
        {
            var name = queue.Dequeue();
            if (!included.Add(name)) continue;
            if (!types.TryGetValue(name, out var type))
            {
                unresolved.Add(name);
                continue;
            }

            var fields = new List<object>();
            foreach (var field in type.Fields.Where(x => !x.IsStatic))
            {
                fields.Add(new
                {
                    name = field.Name,
                    type = FormatType(field.FieldType),
                    attrs = field.CustomAttributes
                        .Select(a => TypeGraph.Normalize(a.AttributeType.FullName))
                        .Where(x => !x.StartsWith("Il2CppDummyDll", StringComparison.Ordinal) &&
                                    !x.StartsWith("System.Runtime.CompilerServices", StringComparison.Ordinal) &&
                                    !x.StartsWith("System.Diagnostics", StringComparison.Ordinal))
                        .ToArray(),
                });
                foreach (var referenced in ReferencedTypes(field.FieldType)) queue.Enqueue(referenced);
            }

            payload[name] = new
            {
                resolved = true,
                isEnum = type.IsEnum,
                enumUnderlying = type.IsEnum
                    ? FormatType(type.Fields.First(x => x.Name == "value__").FieldType)
                    : null,
                // 枚举成员名（static literal 字段），供 schema 生成 TS 字符串联合类型
                members = type.IsEnum
                    ? type.Fields.Where(x => x.IsStatic && x.IsLiteral).Select(x => x.Name).ToArray()
                    : null,
                baseType = type.BaseType is null ? null : TypeGraph.Normalize(type.BaseType.FullName),
                baseChain = TypeGraph.Ancestors(type, types).ToArray(),
                fields,
                staticFields = type.Fields.Where(x => x.IsStatic).Select(x => new
                {
                    name = x.Name,
                    type = FormatType(x.FieldType),
                    isLiteral = x.IsLiteral,
                    constant = x.HasConstant ? x.Constant : null,
                }).ToArray(),
                properties = type.Properties.Select(x => new
                {
                    name = x.Name,
                    type = FormatType(x.PropertyType),
                }).ToArray(),
                methods = type.Methods.Select(x => new
                {
                    name = x.Name,
                    returnType = FormatType(x.ReturnType),
                    parameters = x.Parameters.Select(p => new { name = p.Name, type = FormatType(p.ParameterType) }).ToArray(),
                    isStatic = x.IsStatic,
                    nativeAddress = x.CustomAttributes
                        .Where(a => a.AttributeType.FullName == "Il2CppDummyDll.AddressAttribute")
                        .SelectMany(a => a.Fields)
                        .ToDictionary(a => a.Name, a => a.Argument.Value?.ToString()),
                    instructionCount = x.HasBody ? x.Body.Instructions.Count : 0,
                    instructionPreview = x.HasBody ? x.Body.Instructions.Take(8).Select(i => i.OpCode.Name).ToArray() : [],
                }).ToArray(),
            };
        }

        var json = JsonSerializer.Serialize(new { matched = included.Count, unresolved = unresolved.Count, types = payload },
            new JsonSerializerOptions { WriteIndented = true });
        foreach (var assembly in assemblies) assembly.Dispose();
        if (outFile is null)
        {
            Console.Write(json);
        }
        else
        {
            Directory.CreateDirectory(Path.GetDirectoryName(outFile)!);
            File.WriteAllText(outFile, json);
            Console.WriteLine($"FIELDS\tincluded={included.Count}\tunresolved={unresolved.Count}\tout={outFile}");
        }
        return 0;
    }

    private static string StripArity(string name)
    {
        var tick = name.IndexOf('`');
        return tick >= 0 ? name[..tick] : name;
    }

    private static string FormatType(TypeReference type) => type switch
    {
        ArrayType array => FormatType(array.ElementType) + "[]",
        ByReferenceType byRef => FormatType(byRef.ElementType) + "&",
        PointerType pointer => FormatType(pointer.ElementType) + "*",
        GenericInstanceType generic => StripArity(generic.Name) + "<" +
            string.Join(", ", generic.GenericArguments.Select(FormatType)) + ">",
        _ => TypeGraph.Normalize(type.FullName),
    };

    private static IEnumerable<string> ReferencedTypes(TypeReference type)
    {
        switch (type)
        {
            case ArrayType array:
                foreach (var referenced in ReferencedTypes(array.ElementType)) yield return referenced;
                yield break;
            case GenericInstanceType generic:
                foreach (var argument in generic.GenericArguments)
                    foreach (var referenced in ReferencedTypes(argument)) yield return referenced;
                yield break;
            case GenericParameter:
                yield break;
        }
        var name = TypeGraph.Normalize(type.FullName);
        if (name.StartsWith("System.", StringComparison.Ordinal)) yield break;
        yield return name;
    }
}
