using Mono.Cecil;

namespace ScenarioTypeScan;

/// <summary>
/// 剧情类型分类：家族归属、业务分类（Category）、关键基类判定及其描述，
/// 与 inventory-json 的继承树展开（ExpandTree）。
/// </summary>
internal static class Classification
{
    public static string Family(string name, IReadOnlyDictionary<string, TypeDefinition> types)
    {
        if (!types.TryGetValue(name, out var type)) return "not-found";
        var chain = TypeGraph.Ancestors(type, types).Prepend(name).ToHashSet(StringComparer.Ordinal);
        foreach (var family in new[]
        {
            "RPG.GameCore.PredicateConfig", "RPG.GameCore.TargetEvaluator", "RPG.GameCore.TaskConfig",
            "RPG.GameCore.SequenceConfig", "RPG.GameCore.JsonConfig"
        })
            if (chain.Contains(family)) return family;
        return chain.LastOrDefault() ?? "unknown";
    }

    public static string Category(string name, TypeDefinition? type, IReadOnlyDictionary<string, TypeDefinition> types, bool carrier)
    {
        var family = Family(name, types);
        if (family == "RPG.GameCore.PredicateConfig") return "分支条件";
        if (family == "RPG.GameCore.TargetEvaluator") return "目标选择";
        if (name is "RPG.GameCore.WaitCustomString" or "RPG.GameCore.TriggerCustomString" or
            "RPG.GameCore.TriggerCustomStringList" or "RPG.GameCore.TriggerCustomStringOnDialogEnd") return "剧情控制·事件总线";
        if (name is "RPG.GameCore.TriggerPerformance" or "RPG.GameCore.LevelPerformanceInitialize" or
            "RPG.GameCore.EndPerformance" or "RPG.GameCore.WaitPerformanceEnd" or
            "RPG.GameCore.FinishLevelGraph" or "RPG.GameCore.FinishPerformanceMission" or
            "RPG.GameCore.PlayTimeline" or "RPG.GameCore.PlayTimelinePrefab" or "RPG.GameCore.PlayVideo")
            return "演出生命周期";
        if (name.Contains("OptionTalk", StringComparison.Ordinal)) return "选项载荷";
        if (carrier) return "对白载荷";
        if (type is not null && type.Fields.Any(x => !x.IsStatic && TypeGraph.IsStructural(x.FieldType.FullName))) return "结构·容器/回调";
        if (name.Contains("Talk", StringComparison.Ordinal) || name.Contains("Dialogue", StringComparison.Ordinal)) return "对话交互/控制";
        if (name.Contains("Camera", StringComparison.Ordinal) || name.Contains("VCam", StringComparison.Ordinal) ||
            name.Contains("Timeline", StringComparison.Ordinal) || name.Contains("Performance", StringComparison.Ordinal) ||
            name.Contains("Transition", StringComparison.Ordinal)) return "演出动作";
        if (name.Contains("Audio", StringComparison.Ordinal) || name.Contains("Voice", StringComparison.Ordinal) ||
            name.Contains("Sound", StringComparison.Ordinal)) return "音频";
        if (name.Contains("UI", StringComparison.Ordinal) || name.Contains("Page", StringComparison.Ordinal) ||
            name.Contains("Toast", StringComparison.Ordinal) || name.Contains("Reading", StringComparison.Ordinal)) return "UI/交互";
        if (name.Contains("Mission", StringComparison.Ordinal) || name.Contains("Quest", StringComparison.Ordinal)) return "任务状态";
        if (name.Contains("Character", StringComparison.Ordinal) || name.Contains("Npc", StringComparison.Ordinal) ||
            name.Contains("NPC", StringComparison.Ordinal) || name.Contains("Entity", StringComparison.Ordinal) ||
            name.Contains("Prop", StringComparison.Ordinal)) return "角色/实体动作";
        if (family == "RPG.GameCore.JsonConfig") return "数据/值对象";
        return "其它任务动作";
    }

    public static string KeyBase(string name, TypeDefinition? type, IReadOnlyDictionary<string, TypeDefinition> types)
    {
        if (type is null) return "未解析";
        var chain = TypeGraph.Ancestors(type, types).Prepend(name).ToHashSet(StringComparer.Ordinal);
        foreach (var key in new[]
        {
            "RPG.GameCore.SimpleTalkListConfig", "RPG.GameCore.OptionTalkInfo", "RPG.GameCore.AdvWaitingEventBase",
            "RPG.GameCore.PredicateConfig", "RPG.GameCore.CompositeConfig", "RPG.GameCore.TargetEvaluator",
            "RPG.GameCore.TaskConfig", "RPG.GameCore.JsonConfig"
        })
            if (chain.Contains(key)) return key;
        return TypeGraph.Normalize(type.BaseType?.FullName ?? "System.Object");
    }

    public static string KeyBaseDescription(string name, TypeDefinition? type, IReadOnlyDictionary<string, TypeDefinition> types) =>
        KeyBase(name, type, types) switch
        {
            "RPG.GameCore.SimpleTalkListConfig" => "顺序对白列表基类；共享 SimpleTalkInfo[] SimpleTalkList。",
            "RPG.GameCore.OptionTalkInfo" => "选项载荷基类；共享 TalkSentenceID、TriggerCustomString 与 VisibleFilter。",
            "RPG.GameCore.AdvWaitingEventBase" => "事件等待 task 基类；共享 IsLoop，派生类通过 OnEvent/OnChange 等回调续接。",
            "RPG.GameCore.PredicateConfig" => "条件节点基类；它本身继承 TaskConfig，并以 Inverse 反转结果。",
            "RPG.GameCore.CompositeConfig" => "组合 task 基类；派生类负责顺序、选择或随机执行子 TaskList。",
            "RPG.GameCore.TargetEvaluator" => "目标求值器；定位 NPC、Prop、Anchor、玩家或对话实体。",
            "RPG.GameCore.TaskConfig" => "可执行任务节点基类；共享 TaskEnabled。叶子可作为 opaque task 保留。",
            "RPG.GameCore.JsonConfig" => "可序列化配置/值对象基类；自身不是可执行 task。",
            _ => "A 中未解析；按未知节点保留并继续递归。"
        };

    public static string ExactTypeDescription(string name) => name switch
    {
        "RPG.GameCore.JsonConfig" => "可序列化配置/值对象根；自身不表示可执行 task。",
        "RPG.GameCore.TaskConfig" => "可执行任务节点根；共享 TaskEnabled。未知叶子可保持 opaque，但仍须递归其 object/array。",
        "RPG.GameCore.PredicateConfig" => "条件节点根；共享 Inverse。它本身继承 TaskConfig，不能仅靠 TaskConfig 判断动作或条件。",
        "RPG.GameCore.CompositeConfig" => "组合 task 根；SequenceConfig、SelectorConfig、RandomConfig 通过子 TaskList 组织执行。",
        "RPG.GameCore.SequenceConfig" => "顺序组合节点；声明 TaskConfig[] TaskList。",
        "RPG.GameCore.SelectorConfig" => "选择组合节点；声明 TaskConfig[] TaskList。",
        "RPG.GameCore.RandomConfig" => "随机组合节点；以 OddsList、TaskList 和随机次数/去重配置选择子 task。",
        "RPG.GameCore.SimpleTalkListConfig" => "顺序对白共享基类；声明 SimpleTalkInfo[] SimpleTalkList。",
        "RPG.GameCore.OptionTalkInfo" => "选项载荷基类；共享 TalkSentenceID、TriggerCustomString 与 VisibleFilter。",
        "RPG.GameCore.AdvWaitingEventBase" => "事件等待 task 根；共享 IsLoop，派生类通过 OnEvent、OnChange 等回调续接。",
        "RPG.GameCore.TargetSeqOperation" => "目标表达式中间基类。",
        "RPG.GameCore.TargetEvaluator" => "目标求值器根；选择 NPC、Prop、Anchor、玩家或对话实体。",
        _ => ""
    };

    public static IEnumerable<TreeInventoryRow> ExpandTree(IEnumerable<TreeBuildNode> nodes, int depth)
    {
        foreach (var node in nodes)
        {
            var observed = node.Observed;
            var description = ExactTypeDescription(node.Name);
            yield return new TreeInventoryRow(
                node.Name,
                string.Concat(Enumerable.Repeat("・", depth)) + node.Name,
                depth,
                observed is not null,
                observed?.Category ?? (description.Length > 0 ? "关键基类" : "继承节点"),
                observed?.Occurrences,
                observed?.FileCount,
                observed?.Sources ?? new Dictionary<string, long>(StringComparer.Ordinal),
                description);
            foreach (var child in ExpandTree(node.Children.Values.OrderBy(x => x.Name, StringComparer.Ordinal), depth + 1))
                yield return child;
        }
    }
}

internal sealed record InventoryRow(
    string Type,
    string TreeLabel,
    string InheritanceChain,
    string SortPath,
    int Depth,
    string Family,
    string Category,
    string KeyBase,
    string KeyBaseDescription,
    long Occurrences,
    int FileCount,
    IReadOnlyDictionary<string, long> Sources,
    bool Resolved,
    string DeclaredFields);

internal sealed class TreeBuildNode(string name)
{
    public string Name { get; } = name;
    public Dictionary<string, TreeBuildNode> Children { get; } = new(StringComparer.Ordinal);
    public InventoryRow? Observed { get; set; }
}

internal sealed record TreeInventoryRow(
    string Type,
    string TreeLabel,
    int Depth,
    bool IsObserved,
    string Category,
    long? Occurrences,
    int? FileCount,
    IReadOnlyDictionary<string, long> Sources,
    string Description);
