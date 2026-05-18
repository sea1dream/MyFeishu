function clampHeadingLevel(level) {
  return Math.min(3, Math.max(1, Number(level) || 1));
}

export function toggleCollapsedOutlineId(collapsedIds, targetId) {
  const next = new Set(Array.isArray(collapsedIds) ? collapsedIds : []);

  if (next.has(targetId)) {
    next.delete(targetId);
  } else {
    next.add(targetId);
  }

  return [...next];
}

export function buildOutlineRenderItems(items, collapsedIds = []) {
  const counters = [0, 0, 0];
  const lastIdsByLevel = ["", "", ""];
  const collapsed = new Set(collapsedIds);

  const decoratedItems = items.map((item) => {
    const level = clampHeadingLevel(item.level);
    counters[level - 1] += 1;

    for (let index = level; index < counters.length; index += 1) {
      counters[index] = 0;
      lastIdsByLevel[index] = "";
    }

    for (let index = 0; index < level - 1; index += 1) {
      if (!counters[index]) {
        counters[index] = 1;
      }
    }

    const parentId = level > 1 ? lastIdsByLevel[level - 2] : "";
    const nextItem = {
      ...item,
      level,
      levelLabel: `H${level}`,
      orderLabel: counters.slice(0, level).join("."),
      parentId,
    };

    lastIdsByLevel[level - 1] = item.id;
    return nextItem;
  });

  const lookup = new Map(decoratedItems.map((item) => [item.id, item]));

  return decoratedItems.map((item) => {
    const ancestorIds = [];
    let currentParentId = item.parentId;

    while (currentParentId) {
      ancestorIds.push(currentParentId);
      currentParentId = lookup.get(currentParentId)?.parentId || "";
    }

    return {
      ...item,
      ancestorIds,
      hasChildren: decoratedItems.some((candidate) => candidate.parentId === item.id),
      isCollapsed: collapsed.has(item.id),
      isHidden: ancestorIds.some((ancestorId) => collapsed.has(ancestorId)),
    };
  });
}
