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
