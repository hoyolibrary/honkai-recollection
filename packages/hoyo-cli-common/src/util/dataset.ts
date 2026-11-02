import _ from 'lodash';

export interface GropJoinConfig<T extends {}, U extends {}, K extends string, A extends Record<string, any> = {}> {
  /** 子表B的列表 */
  list: U[];
  /** B的主键属性 */
  key: keyof U;
  /** A存放B主键列表的外键属性 */
  bIdsKey: keyof T;
  /** 要生成的A存放B的列表的导航属性 */
  bListKey: K;
  /** 可选的回调，用于根据子表数据聚合生成新的属性 */
  aggregate?: (children: U[], a: T) => A;
}

export interface GropJoinConfig2<T extends {}, U extends {}, K extends string, A extends Record<string, any> = {}> {
  /** 子表B的列表 */
  list: U[];
  /** A的主键属性 */
  key: keyof T;
  /** B存放A的外键的属性 */
  aIdKey: keyof U;
  /** 要生成的A存放B的列表的导航属性 */
  bListKey: K;
  /** 可选的回调，用于根据子表数据聚合生成新的属性 */
  aggregate?: (children: U[], a: T) => A;
}


/**
 * 对source 与 config.list 执行Group Join，
 * 并将结果直接拼接到 {@link source} 的对象中
 * @param config 连接配置参数
 * @returns 带有连接结果的A的列表
 */
export function mutateGroupJoin<
  T extends {},
  U extends {},
  K extends string,
  A extends Record<string, any> = {}
>(
  source: T[],
  config: GropJoinConfig<T, U, K, A>,
): (T & A & { [P in K]: U[] })[] {

  const { list, key, bIdsKey, bListKey, aggregate } = config;

  // 1. 预分配 Map，避免频繁扩容
  const bMap = new Map<any, U[]>();

  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const id = b[key];
    
    
    let sameKeyBList = bMap.get(id);
    if (!sameKeyBList) {
      sameKeyBList = [];
      bMap.set(id, sameKeyBList);
    }
    sameKeyBList.push(b);
  }

  // 2. 原地修改 aList 减少新数组和新对象的创建
  for (let i = 0; i < source.length; i++) {
    const a = source[i];
    const bIds = (a[bIdsKey] as any[]) || [];
    const children: U[] = [];

    for (let j = 0; j < bIds.length; j++) {
      const id = bIds[j];
      const targetB = bMap.get(id);
      if (targetB && targetB.length > 0) {
        children.push(...targetB);
      }
    }

    // 直接在原对象上挂载属性，避免 {...a} 产生新对象
    (a as any)[bListKey] = children;

    if (aggregate) {
      const summary = aggregate(children, a);
      Object.assign(a, summary);
    }
  }

  return source as any;
}

/**
 * 对source 与 config.list 执行Group Join（反向关联版本），
 * 实体B中通过aIdKey属性存放A的外键形成反向的关联关系
 * 并将结果直接拼接到 {@link source} 的对象中
 * @param config 连接配置参数
 * @returns 带有连接结果的A的列表
 */
export function mutateGroupJoin2<
  T extends {},
  U extends {},
  K extends string,
  A extends Record<string, any> = {}
>(
  source: T[],
  config: GropJoinConfig2<T, U, K, A>,
): (T & A & { [P in K]: U[] })[] {

  const { list, key, aIdKey, bListKey, aggregate } = config;

  // 使用 lodash 的 groupBy 简化分组逻辑
  // 根据B实体中的aIdKey（指向A的外键）对B列表进行分组
  const bGroups = _.groupBy(list, b => b[aIdKey]);

  // 2. 原地修改 source 减少新数组和新对象的创建
  for (let i = 0; i < source.length; i++) {
    const a = source[i];
    const aId = a[key];
    const children: U[] = [];

    // 根据A的主键值从分组结果中获取对应的B列表
    if (aId != null) {
      // 使用 String 转换确保类型兼容，因为 groupBy 的 key 是 string 类型
      const targetB = bGroups[String(aId)];
      if (targetB && targetB.length > 0) {
        children.push(...targetB);
      }
    }

    // 直接在原对象上挂载属性，避免 {...a} 产生新对象
    (a as any)[bListKey] = children;

    if (aggregate) {
      const summary = aggregate(children, a);
      Object.assign(a, summary);
    }
  }

  return source as any;
}
