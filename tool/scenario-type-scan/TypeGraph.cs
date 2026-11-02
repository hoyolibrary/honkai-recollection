using Mono.Cecil;

namespace ScenarioTypeScan;

/// <summary>Cecil 类型图的共享查询助手：类型扁平化、名称规范化与继承链解析。</summary>
internal static class TypeGraph
{
    public static IEnumerable<TypeDefinition> Flatten(IEnumerable<TypeDefinition> roots)
    {
        foreach (var type in roots)
        {
            yield return type;
            foreach (var nested in Flatten(type.NestedTypes)) yield return nested;
        }
    }

    public static string Normalize(string name)
    {
        var comma = name.IndexOf(',');
        return (comma >= 0 ? name[..comma] : name).Replace('/', '+');
    }

    public static IEnumerable<string> Ancestors(TypeDefinition type, IReadOnlyDictionary<string, TypeDefinition> types)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var cursor = type.BaseType;
        while (cursor is not null && seen.Add(cursor.FullName))
        {
            var name = Normalize(cursor.FullName);
            yield return name;
            if (!types.TryGetValue(name, out var resolved)) yield break;
            cursor = resolved.BaseType;
        }
    }

    public static string BaseChain(TypeDefinition? type, IReadOnlyDictionary<string, TypeDefinition> types) =>
        type is null ? "<not-found>" : string.Join(" <- ", Ancestors(type, types));

    public static List<string> InheritancePath(string name, TypeDefinition? type, IReadOnlyDictionary<string, TypeDefinition> types)
    {
        if (type is null) return [name];
        return Ancestors(type, types).Reverse().Where(x => x != "System.Object").Append(name).ToList();
    }

    public static string Fields(TypeDefinition? type) => type is null ? "" : string.Join(',',
        type.Fields.Where(x => !x.IsStatic).Select(x => $"{x.Name}:{Normalize(x.FieldType.FullName)}"));

    public static string StructuralFields(TypeDefinition? type) => type is null ? "" : string.Join(',',
        type.Fields.Where(x => !x.IsStatic && IsStructural(x.FieldType.FullName))
            .Select(x => $"{x.Name}:{Normalize(x.FieldType.FullName)}"));

    public static bool IsStructural(string name) => name.Contains("TaskConfig", StringComparison.Ordinal) ||
        name.Contains("Predicate", StringComparison.Ordinal) || name.Contains("Sequence", StringComparison.Ordinal) ||
        name.Contains("OptionTalk", StringComparison.Ordinal) || name.Contains("SimpleTalk", StringComparison.Ordinal) ||
        name.Contains("TalkInfo", StringComparison.Ordinal) || name.Contains("CaseContainer", StringComparison.Ordinal);
}
