using Mono.Cecil;

namespace ScenarioTypeScan;

/// <summary>
/// 加载 DummyDll 目录中所有可解析的托管程序集，提供规范化全名到 <see cref="TypeDefinition"/> 的索引。
/// </summary>
internal sealed class AssemblyIndex : IDisposable
{
    private readonly List<AssemblyDefinition> _assemblies;

    private AssemblyIndex(List<AssemblyDefinition> assemblies)
    {
        _assemblies = assemblies;
    }

    public Dictionary<string, TypeDefinition> Types { get; } = new(StringComparer.Ordinal);

    public static AssemblyIndex Load(string dllDir)
    {
        var assemblies = new List<AssemblyDefinition>();
        var index = new AssemblyIndex(assemblies);
        foreach (var file in Directory.EnumerateFiles(dllDir, "*.dll"))
        {
            try
            {
                var assembly = AssemblyDefinition.ReadAssembly(file);
                assemblies.Add(assembly);
                foreach (var type in TypeGraph.Flatten(assembly.MainModule.Types))
                    index.Types.TryAdd(TypeGraph.Normalize(type.FullName), type);
            }
            catch
            {
                // Some Unity/native placeholder assemblies may not be valid managed metadata.
            }
        }
        return index;
    }

    public void Dispose()
    {
        foreach (var assembly in _assemblies) assembly.Dispose();
        _assemblies.Clear();
    }
}
