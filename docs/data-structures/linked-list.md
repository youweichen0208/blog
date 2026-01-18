---
lang: zh-CN
title: 链表专栏
description: leetcode 链表总结
date: 2024-01-15
---

# LinkedList 链表系列

## 1. 双指针

### 160. 相交链表

给定两个单链表的头节点 `headA` 和 `headB`，找出并返回两个链表相交的起始节点。

**核心思路**：

```java
public class Solution {
    public ListNode getIntersectionNode(ListNode headA, ListNode headB) {
        if (headA == null || headB == null) return null;

        ListNode pA = headA, pB = headB;

        // 当 pA 和 pB 相遇时，要么是交点，要么都是 null
        while (pA != pB) {
            // pA 走完 A 链表后，从 B 链表头开始
            pA = (pA == null) ? headB : pA.next;
            // pB 走完 B 链表后，从 A 链表头开始
            pB = (pB == null) ? headA : pB.next;
        }

        return pA;
    }
}
```

**为什么有效**：

- 两个指针分别遍历两个链表
- 走到末尾后，切换到另一个链表的头部继续走
- 这样两个指针走过的总长度相同：`A + B = B + A`
- 如果有交点，必然在交点相遇；如果没有交点，最终都会走到 null

**复杂度**：

- 时间复杂度：O(m + n)
- 空间复杂度：O(1)

**关键点 - 为什么必须判断 `pA == null` 而不是 `pA.next == null`**：

如果使用 `pA.next == null` 作为判断条件：

```java
// ❌ 错误写法
pA = (pA.next == null) ? headB : pA.next;
```

会导致两个问题：

1. **无限循环**：指针会在最后一个节点就切换，永远不会走到 `null`

   - 例如：A: 1→2→null，B: 3→4→null
   - pA 在节点 2 时切换到 headB，在节点 4 时切换到 headA
   - 不断循环，永远不会相遇

2. **循环无法终止**：`while (pA != pB)` 的终止条件依赖于两个指针都能走到 `null`
   - 有交点时：在交点相遇
   - 无交点时：最终 `pA == pB == null`
   - 如果指针不能走到 `null`，无交点的情况下循环永远不会结束

**正确做法**：必须让指针走到 `null`，这样才能保证：

- 路径长度完全相等（包括走到 null 的那一步）
- 循环能够正确终止
