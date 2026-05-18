import test from "node:test";
import assert from "node:assert/strict";

import { buildOutlineRenderItems, toggleCollapsedOutlineId } from "../renderer-modules/outline-utils.mjs";

test("buildOutlineRenderItems assigns order labels and parents", () => {
  const items = buildOutlineRenderItems([
    { id: "h1", level: 1, text: "Heading 1" },
    { id: "h2", level: 2, text: "Heading 2" },
    { id: "h3", level: 3, text: "Heading 3" },
  ]);

  assert.deepEqual(
    items.map((item) => ({
      id: item.id,
      orderLabel: item.orderLabel,
      parentId: item.parentId,
      hasChildren: item.hasChildren,
    })),
    [
      { id: "h1", orderLabel: "1", parentId: "", hasChildren: true },
      { id: "h2", orderLabel: "1.1", parentId: "h1", hasChildren: true },
      { id: "h3", orderLabel: "1.1.1", parentId: "h2", hasChildren: false },
    ],
  );
});

test("buildOutlineRenderItems hides descendants of collapsed headings", () => {
  const items = buildOutlineRenderItems(
    [
      { id: "h1", level: 1, text: "Heading 1" },
      { id: "h2", level: 2, text: "Heading 2" },
    ],
    ["h1"],
  );

  assert.equal(items[0].isCollapsed, true);
  assert.equal(items[1].isHidden, true);
});

test("toggleCollapsedOutlineId adds and removes ids", () => {
  assert.deepEqual(toggleCollapsedOutlineId([], "demo"), ["demo"]);
  assert.deepEqual(toggleCollapsedOutlineId(["demo"], "demo"), []);
});
