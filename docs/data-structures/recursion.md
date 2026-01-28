---
lang: zh-CN
title: 递归详解
description: 从基础到进阶的递归完整教程
date: 2026-01-21
---

# 递归详解

## 1. 什么是递归？

**递归**就是函数调用自己的过程。就像照镜子时，镜子里还有镜子，形成无限套娃。

### 1.1 生活中的递归例子

**俄罗斯套娃**：

- 打开一个娃娃，里面还有一个娃娃
- 继续打开，直到最小的娃娃（终止条件）

**电影《盗梦空间》**：

- 梦中梦中梦...
- 最终回到现实（终止条件）

## 2. 递归的两个核心要素

### 2.1 递归终止条件（Base Case）

**必须有一个明确的停止条件**，否则会无限递归导致栈溢出。

```java
// 错误：没有终止条件
public void badRecursion(int n) {
    System.out.println(n);
    badRecursion(n - 1);  // 永远不会停止！
}

// 正确：有终止条件
public void goodRecursion(int n) {
    if (n <= 0) {  // 终止条件
        return;
    }
    System.out.println(n);
    goodRecursion(n - 1);
}
```

### 2.2 递归调用（Recursive Case）

**问题规模逐渐缩小**，最终达到终止条件。

## 3. 第一个递归例子：倒计时

```java
public void countdown(int n) {
    // 终止条件
    if (n <= 0) {
        System.out.println("发射！");
        return;
    }

    // 递归调用
    System.out.println(n);
    countdown(n - 1);  // 问题规模减小
}

// 调用
countdown(3);
```

**执行过程**：

```
countdown(3)
  打印 3
  └─ countdown(2)
       打印 2
       └─ countdown(1)
            打印 1
            └─ countdown(0)
                 打印 "发射！"
                 返回
            返回
       返回
  返回

输出：
3
2
1
发射！
```

## 4. 经典例子：阶乘

**问题**：计算 n! = n × (n-1) × (n-2) × ... × 1

### 4.1 数学定义（递归定义）

```
n! = n × (n-1)!
0! = 1  (终止条件)
```

### 4.2 代码实现

```java
public int factorial(int n) {
    // 终止条件
    if (n == 0 || n == 1) {
        return 1;
    }

    // 递归调用
    return n * factorial(n - 1);
}
```

### 4.3 执行过程图解

```
factorial(4)
= 4 × factorial(3)
= 4 × (3 × factorial(2))
= 4 × (3 × (2 × factorial(1)))
= 4 × (3 × (2 × 1))
= 4 × (3 × 2)
= 4 × 6
= 24
```

**调用栈**：

```
factorial(4)
  ├─ 计算 4 × factorial(3)
  │   ├─ 计算 3 × factorial(2)
  │   │   ├─ 计算 2 × factorial(1)
  │   │   │   └─ 返回 1
  │   │   └─ 返回 2 × 1 = 2
  │   └─ 返回 3 × 2 = 6
  └─ 返回 4 × 6 = 24
```

## 5. 递归的执行过程：递进与回归

递归分为两个阶段：

### 5.1 递进阶段（Winding）

从外层调用到内层，问题规模不断缩小。

### 5.2 回归阶段（Unwinding）

从最内层返回到外层，逐层计算结果。

**示例：sum(3) = 1 + 2 + 3**

```java
public int sum(int n) {
    if (n == 1) {
        return 1;
    }
    return n + sum(n - 1);
}
```

**执行过程**：

```
递进阶段 ↓              回归阶段 ↑
sum(3)                 = 3 + 3 = 6
  └─ 3 + sum(2)        = 2 + 1 = 3
       └─ 2 + sum(1)   = 1
            └─ 1
```

## 6. 经典例子：斐波那契数列

**问题**：F(n) = F(n-1) + F(n-2)，F(0)=0, F(1)=1

```java
public int fibonacci(int n) {
    // 终止条件
    if (n == 0) return 0;
    if (n == 1) return 1;

    // 递归调用
    return fibonacci(n - 1) + fibonacci(n - 2);
}
```

**执行树（fibonacci(4)）**：

```
                    fib(4)
                   /      \
              fib(3)      fib(2)
             /     \      /     \
        fib(2)  fib(1) fib(1) fib(0)
        /    \
    fib(1) fib(0)
```

**注意**：这个实现有大量重复计算，效率低。可以用动态规划优化。

## 7. 递归 vs 循环

同样的问题可以用递归或循环解决：

### 7.1 阶乘对比

**递归版本**：

```java
public int factorialRecursive(int n) {
    if (n <= 1) return 1;
    return n * factorialRecursive(n - 1);
}
```

**循环版本**：

```java
public int factorialIterative(int n) {
    int result = 1;
    for (int i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}
```

### 7.2 何时使用递归？

**适合递归的场景**：

- 问题本身具有递归性质（树、图遍历）
- 代码更简洁易懂
- 分治算法（归并排序、快速排序）

**不适合递归的场景**：

- 递归深度太大（栈溢出风险）
- 有大量重复计算（需要优化）
- 简单的线性问题（循环更高效）

## 8. 二叉树递归（进阶）

树是最适合递归的数据结构！

### 8.1 计算二叉树的最大深度

```java
public int maxDepth(TreeNode root) {
    // 终止条件：空节点深度为 0
    if (root == null) {
        return 0;
    }

    // 递归计算左右子树深度
    int leftDepth = maxDepth(root.left);
    int rightDepth = maxDepth(root.right);

    // 当前节点深度 = max(左子树, 右子树) + 1
    return Math.max(leftDepth, rightDepth) + 1;
}
```

**执行过程**：

```
        3
       / \
      9  20
        /  \
       15   7

maxDepth(3)
  ├─ leftDepth = maxDepth(9) = 1
  └─ rightDepth = maxDepth(20)
       ├─ leftDepth = maxDepth(15) = 1
       └─ rightDepth = maxDepth(7) = 1
       └─ return max(1, 1) + 1 = 2
  └─ return max(1, 2) + 1 = 3
```

### 8.2 翻转二叉树

```java
public TreeNode invertTree(TreeNode root) {
    // 终止条件
    if (root == null) {
        return null;
    }

    // 递归翻转左右子树
    TreeNode left = invertTree(root.left);
    TreeNode right = invertTree(root.right);

    // 交换左右子树
    root.left = right;
    root.right = left;

    return root;
}
```

### 8.3 二叉树的最近公共祖先

**问题描述**：

给定一个二叉树，找到该树中两个指定节点的最近公共祖先。

最近公共祖先的定义：对于有根树 T 的两个节点 p、q，最近公共祖先表示为一个节点 x，满足 x 是 p、q 的祖先且 x 的深度尽可能大（一个节点也可以是它自己的祖先）。

**解题思路**：

这是一道经典的递归问题，核心思想是：

1. **递归终止条件**：

   - 如果当前节点为空，返回 null
   - 如果当前节点等于 p 或 q，返回当前节点

2. **递归搜索**：

   - 在左子树中查找 p 和 q
   - 在右子树中查找 p 和 q

3. **判断逻辑**（关键！）：
   - 如果左右子树都找到了节点（left != null && right != null），说明 p 和 q 分别在当前节点的两侧，**当前节点就是最近公共祖先**
   - 如果只有左子树找到了，说明 p 和 q 都在左子树，返回左子树的结果
   - 如果只有右子树找到了，说明 p 和 q 都在右子树，返回右子树的结果

**代码实现**：

```java
class Solution {
    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        // 递归终止条件
        if (root == null || root == p || root == q) {
            return root;
        }

        // 在左子树中查找（递进阶段）
        TreeNode left = lowestCommonAncestor(root.left, p, q);
        // 在右子树中查找（递进阶段）
        TreeNode right = lowestCommonAncestor(root.right, p, q);

        // 回归阶段：根据左右子树的结果做判断
        // 如果左右子树都找到了，当前节点就是最近公共祖先
        if (left != null && right != null) {
            return root;
        }

        // 否则返回不为空的那个子树的结果
        return left != null ? left : right;
    }
}
```

**为什么判断要在 left 和 right 后面？**

因为我们需要**先知道左右子树的搜索结果**，才能做出判断。这是**后序遍历**的思想：

1. 先处理左子树（递归到底）
2. 再处理右子树（递归到底）
3. 最后处理当前节点（根据左右子树的结果做判断）

**图解示例**：

```
        3
       / \
      5   1
     / \ / \
    6  2 0  8
      / \
     7   4
```

**示例 1**：找 p=5, q=1 的最近公共祖先

```
lowestCommonAncestor(3, 5, 1)
  ├─ left = lowestCommonAncestor(5, 5, 1)
  │  └─ root == p，返回 5
  │
  ├─ right = lowestCommonAncestor(1, 5, 1)
  │  └─ root == q，返回 1
  │
  └─ left != null && right != null
     └─ 返回 3 ✓
```

**示例 2**：找 p=5, q=4 的最近公共祖先

```
lowestCommonAncestor(3, 5, 4)
  ├─ left = lowestCommonAncestor(5, 5, 4)
  │  ├─ root == p，返回 5
  │  └─ 但继续在 5 的子树中搜索
  │     └─ 在右子树找到 4
  │  └─ 最终返回 5
  │
  ├─ right = lowestCommonAncestor(1, 5, 4)
  │  └─ 没找到，返回 null
  │
  └─ left != null && right == null
     └─ 返回 left (5) ✓
```

**复杂度分析**：

- **时间复杂度**：O(n)，需要遍历所有节点
- **空间复杂度**：O(n)，递归栈的深度

### 8.4 回文链表（递归的巧妙应用）

**问题描述**：

给你一个单链表的头节点 `head`，请你判断该链表是否为回文链表。如果是，返回 `true`；否则，返回 `false`。

**示例**：

```
输入：head = [1,2,2,1]
输出：true

输入：head = [1,2]
输出：false
```

**递归解法思路**：

利用递归的特性：递归会先到达链表末尾，然后在回溯时从后往前比较。这是一个理解递归执行顺序的绝佳例子！

**代码实现**：

```java
class Solution {
    private ListNode frontPointer;

    public boolean isPalindrome(ListNode head) {
        frontPointer = head;
        return recursiveCheck(head);
    }

    private boolean recursiveCheck(ListNode currentNode) {
        if (currentNode != null) {
            // 递归到链表末尾
            if (!recursiveCheck(currentNode.next)) {
                return false;
            }
            // 回溯时比较
            if (currentNode.val != frontPointer.val) {
                return false;
            }
            // 前指针向后移动
            frontPointer = frontPointer.next;
        }
        return true;
    }
}
```

**核心机制解析**：

这道题最巧妙的地方在于 `frontPointer` 如何与回溯时的节点保持对应。关键在于理解**递归的执行顺序**和 **frontPointer 的移动时机**：

1. **递进阶段**：`frontPointer` **不移动**，一直停留在头节点
2. **回归阶段**：每次比较后，`frontPointer` 才向前移动一步

**执行过程图解**（链表：1 → 2 → 2 → 1）：

```
阶段一：递进（Winding）- frontPointer 不动

recursiveCheck(node1)  // frontPointer = node1 (不动)
  └─ recursiveCheck(node2)  // frontPointer = node1 (不动)
       └─ recursiveCheck(node3)  // frontPointer = node1 (不动)
            └─ recursiveCheck(node4)  // frontPointer = node1 (不动)
                 └─ recursiveCheck(null)  // 返回 true

阶段二：回归（Unwinding）- 开始比较和移动

第 1 次比较（最深层返回）：
在 recursiveCheck(node4) 中：
  currentNode.val = 1 (node4)
  frontPointer.val = 1 (node1)  ← 还是头节点
  比较：1 == 1 ✓
  frontPointer = frontPointer.next  ← 移动到 node2

第 2 次比较：
在 recursiveCheck(node3) 中：
  currentNode.val = 2 (node3)
  frontPointer.val = 2 (node2)  ← 已移动到第二个节点
  比较：2 == 2 ✓
  frontPointer = frontPointer.next  ← 移动到 node3

第 3 次比较：
在 recursiveCheck(node2) 中：
  currentNode.val = 2 (node2)
  frontPointer.val = 2 (node3)  ← 已移动到第三个节点
  比较：2 == 2 ✓
  frontPointer = frontPointer.next  ← 移动到 node4

第 4 次比较：
在 recursiveCheck(node1) 中：
  currentNode.val = 1 (node1)
  frontPointer.val = 1 (node4)  ← 已移动到第四个节点
  比较：1 == 1 ✓
```

**为什么能保证对应？**

1. **递归栈**：保证 `currentNode` 从后往前遍历（node4 → node3 → node2 → node1）
2. **延迟执行**：比较代码在递归返回后才执行
3. **同步移动**：`frontPointer` 在每次比较后向前移动（node1 → node2 → node3 → node4）
4. **自然对应**：两个指针从两端向中间移动，自然形成对应关系

**可视化对比**：

```
链表：1 → 2 → 2 → 1

递进阶段（frontPointer 不动）：
frontPointer
    ↓
    1 → 2 → 2 → 1
                ↑
          递归到这里

回归阶段（开始比较和移动）：

第 1 次：
frontPointer
    ↓
    1 → 2 → 2 → 1
                ↑
          currentNode
比较 1 == 1 ✓，frontPointer 右移

第 2 次：
    frontPointer
        ↓
    1 → 2 → 2 → 1
            ↑
      currentNode
比较 2 == 2 ✓，frontPointer 右移

第 3 次：
        frontPointer
            ↓
    1 → 2 → 2 → 1
        ↑
  currentNode
比较 2 == 2 ✓，frontPointer 右移

第 4 次：
            frontPointer
                ↓
    1 → 2 → 2 → 1
    ↑
currentNode
比较 1 == 1 ✓
```

**关键要点**：

- 利用**调用栈**实现了"从后往前"的遍历
- 用**类变量**实现了"从前往后"的遍历
- 两者在回溯过程中完美同步
- 这是递归的巧妙之处：一次遍历实现双向比较

**复杂度分析**：

- **时间复杂度**：O(n)
- **空间复杂度**：O(n)，递归调用栈的深度

**其他解法对比**：

虽然递归解法很优雅，但实际面试中更推荐使用**反转后半部分链表**的方法（空间复杂度 O(1)）。递归解法的价值在于帮助理解递归的执行机制。

---

### 8.4.1 深入理解：递归代码的执行顺序

很多人对递归的"回归"过程感到困惑：**回归是在递进完成后立即开始吗？回归阶段具体执行哪些代码？**

让我们深入剖析这个问题。

#### 代码结构分析

```java
private boolean recursiveCheck(ListNode currentNode) {
    if (currentNode != null) {
        // ═══════════════════════════════════════
        // ① 递归调用（递进阶段）
        // ═══════════════════════════════════════
        if (!recursiveCheck(currentNode.next)) {
            return false;
        }
        // ↑↑↑ 执行到这里就跳到下一层递归了
        // ↑↑↑ 下面的代码暂时不执行！

        // ═══════════════════════════════════════
        // ② 比较操作（回归阶段）
        // ═══════════════════════════════════════
        if (currentNode.val != frontPointer.val) {
            return false;
        }

        // ═══════════════════════════════════════
        // ③ 移动指针（回归阶段）
        // ═══════════════════════════════════════
        frontPointer = frontPointer.next;
    }
    return true;
}
```

**关键理解**：

- **递进阶段**：只执行 ①（递归调用），②③ 完全不执行
- **回归阶段**：不再执行 ①，只执行 ②③
- **原因**：递归调用就像一个"暂停按钮"，后面的代码要等递归返回后才执行

#### 完整执行流程（链表：1 → 2 → 1）

**阶段一：递进（只执行 ①，不执行 ②③）**

```
═══════════════════════════════════════════════════════════
调用 recursiveCheck(node1)
═══════════════════════════════════════════════════════════
frontPointer = node1
currentNode = node1

执行：if (currentNode != null) → true
执行：① if (!recursiveCheck(node2)) → 调用 recursiveCheck(node2)
      ↑
      └─ 跳转到新的函数调用，②③ 还没执行！

═══════════════════════════════════════════════════════════
调用 recursiveCheck(node2)
═══════════════════════════════════════════════════════════
frontPointer = node1（没变！）
currentNode = node2

执行：if (currentNode != null) → true
执行：① if (!recursiveCheck(node3)) → 调用 recursiveCheck(node3)
      ↑
      └─ 跳转到新的函数调用，②③ 还没执行！

═══════════════════════════════════════════════════════════
调用 recursiveCheck(node3)
═══════════════════════════════════════════════════════════
frontPointer = node1（还是没变！）
currentNode = node3

执行：if (currentNode != null) → true
执行：① if (!recursiveCheck(null)) → 调用 recursiveCheck(null)
      ↑
      └─ 跳转到新的函数调用，②③ 还没执行！

═══════════════════════════════════════════════════════════
调用 recursiveCheck(null)  ← 到达终止条件！
═══════════════════════════════════════════════════════════
currentNode = null

执行：if (currentNode != null) → false
执行：return true  ← 直接返回，开始回归！
```

**此时的状态**：
- ✅ 所有的 ① 都执行完了（递进完成）
- ❌ 所有的 ②③ 都还没执行（等待回归）
- 📚 调用栈里有 4 层函数调用
- 🔍 frontPointer 一直停留在 node1

**阶段二：回归（执行 ②③，不再执行 ①）**

```
═══════════════════════════════════════════════════════════
回到 recursiveCheck(node3)  ← 从 ① 之后继续执行
═══════════════════════════════════════════════════════════
frontPointer = node1
currentNode = node3

① recursiveCheck(null) 已经返回 true 了
   继续执行下面的代码：

② 执行：if (node3.val != frontPointer.val)
         if (1 != 1) → false，不返回

③ 执行：frontPointer = frontPointer.next
         frontPointer 从 node1 移动到 node2

执行：return true  ← 返回到上一层

═══════════════════════════════════════════════════════════
回到 recursiveCheck(node2)  ← 从 ① 之后继续执行
═══════════════════════════════════════════════════════════
frontPointer = node2（刚才移动过了）
currentNode = node2

① recursiveCheck(node3) 已经返回 true 了
   继续执行下面的代码：

② 执行：if (node2.val != frontPointer.val)
         if (2 != 2) → false，不返回

③ 执行：frontPointer = frontPointer.next
         frontPointer 从 node2 移动到 node3

执行：return true  ← 返回到上一层

═══════════════════════════════════════════════════════════
回到 recursiveCheck(node1)  ← 从 ① 之后继续执行
═══════════════════════════════════════════════════════════
frontPointer = node3（刚才移动过了）
currentNode = node1

① recursiveCheck(node2) 已经返回 true 了
   继续执行下面的代码：

② 执行：if (node1.val != frontPointer.val)
         if (1 != 1) → false，不返回

③ 执行：frontPointer = frontPointer.next
         frontPointer 从 node3 移动到 null

执行：return true  ← 返回到最外层，完成！
```

#### 可视化对比

```
代码结构：
┌─────────────────────────────────────┐
│ if (currentNode != null) {          │
│                                     │
│   ① 递归调用 ← 递进阶段只执行这里    │
│   ↓                                 │
│   【暂停线】                         │
│   ↓                                 │
│   ② 比较 ← 回归阶段才执行这里        │
│   ③ 移动 ← 回归阶段才执行这里        │
│ }                                   │
│ return true                         │
└─────────────────────────────────────┘

执行顺序：
递进：① → ① → ① → ① (到达终止条件)
       ↓   ↓   ↓   ↓
回归：      ②③ ← ②③ ← ②③ ← ②③
```

#### 调用栈的变化

```
递进阶段（栈不断增长）：

栈顶 → | recursiveCheck(null)      | ← 到达终止条件
       | recursiveCheck(node3)     | ← ②③ 未执行
       | recursiveCheck(node2)     | ← ②③ 未执行
栈底 → | recursiveCheck(node1)     | ← ②③ 未执行

═══════════════════════════════════════

回归阶段（栈不断弹出，执行 ②③）：

第 1 次弹出：
栈顶 → | recursiveCheck(node3)     | ← 执行 ②③
       | recursiveCheck(node2)     |
栈底 → | recursiveCheck(node1)     |

第 2 次弹出：
栈顶 → | recursiveCheck(node2)     | ← 执行 ②③
栈底 → | recursiveCheck(node1)     |

第 3 次弹出：
栈顶 → | recursiveCheck(node1)     | ← 执行 ②③
```

#### 为什么会这样？

这是**函数调用的本质**：

```java
// 当你写这样的代码：
int result = someFunction();
System.out.println(result);

// 执行顺序是：
// 1. 调用 someFunction()
// 2. 等待 someFunction() 返回
// 3. 把返回值赋给 result
// 4. 执行 println
```

在递归中也一样：

```java
if (!recursiveCheck(currentNode.next)) {  // ← 执行到这里
    return false;
}
// ↑ 必须等 recursiveCheck 返回后，才能继续执行下面的代码
if (currentNode.val != frontPointer.val) {  // ← 等递归返回才执行
    return false;
}
```

#### 核心总结

**回归的时机**：
1. ✅ 递归到达终止条件后，**立即**开始回归
2. ✅ 回归时，会执行递归调用**之后**的代码（②③）
3. ✅ 回归是**自动**的，由调用栈机制保证

**执行顺序**：
- **递进阶段**：只执行递归调用（①），后面的代码（②③）不执行
- **回归阶段**：不再执行递归调用（①），只执行后面的代码（②③）
- **关键点**：递归调用就像一个"暂停按钮"，按下后后面的代码都要等待

**回文链表的巧妙之处**：
1. 利用递归栈实现"从后往前"遍历（currentNode）
2. 利用类变量实现"从前往后"遍历（frontPointer）
3. 在回归阶段同步比较和移动
4. 一次遍历完成双向检查

这就是为什么递归能够如此优雅地解决回文链表问题！

---

### 8.4.2 深入理解：return 的传递机制

很多人会有疑问：**递归函数最外层的 return 是不是直接返回最终结果？最外层的 return 是不是最后执行？**

让我们深入理解这两个问题。

#### 问题一：return 是直接返回最终结果吗？

**答案：不是！每层的 return 都只返回给它的上一层调用者。**

`return` 语句本身不知道自己在第几层，它只是把结果返回给**调用它的那一层**。

#### return 的本质

```java
// return 的作用：
// 1. 结束当前函数
// 2. 把值返回给调用者

int result = someFunction();  // ← 调用者在这里接收返回值
```

#### 阶乘函数的 return 传递链

```java
public int factorial(int n) {
    if (n <= 1) {
        return 1;  // ← 终止条件的 return
    }
    return n * factorial(n - 1);  // ← 递归调用的 return
}

// 调用
int result = factorial(3);
```

**执行过程**：

```
═══════════════════════════════════════════════════════════
第 1 层：factorial(3)
═══════════════════════════════════════════════════════════
n = 3
执行：return 3 * factorial(2)
      └─ 需要先计算 factorial(2)

═══════════════════════════════════════════════════════════
第 2 层：factorial(2)
═══════════════════════════════════════════════════════════
n = 2
执行：return 2 * factorial(1)
      └─ 需要先计算 factorial(1)

═══════════════════════════════════════════════════════════
第 3 层：factorial(1)
═══════════════════════════════════════════════════════════
n = 1
执行：return 1  ← 返回给第 2 层
      ↑
      └─ 这个 return 只返回给 factorial(2)
      └─ 不是直接返回给最外层！

═══════════════════════════════════════════════════════════
回到第 2 层：factorial(2)
═══════════════════════════════════════════════════════════
factorial(1) 返回了 1
计算：2 * 1 = 2
执行：return 2  ← 返回给第 1 层
      ↑
      └─ 这个 return 只返回给 factorial(3)
      └─ 还不是最终结果！

═══════════════════════════════════════════════════════════
回到第 1 层：factorial(3)
═══════════════════════════════════════════════════════════
factorial(2) 返回了 2
计算：3 * 2 = 6
执行：return 6  ← 返回给最外层调用者
      ↑
      └─ 这个 return 才返回给 result = factorial(3)
      └─ 这才是最终结果！
```

#### 可视化：return 的传递链

```
调用链（递进）：
result = factorial(3)
           ↓
         factorial(3)
           ↓
         factorial(2)
           ↓
         factorial(1)
           ↓
         return 1

返回链（回归）- 每个 return 只返回给上一层：
result = factorial(3)  ← 最终接收 6
           ↑
         return 6  ← factorial(3) 返回
           ↑
         return 2  ← factorial(2) 返回
           ↑
         return 1  ← factorial(1) 返回
```

#### 回文链表的 return 传递

```java
private boolean recursiveCheck(ListNode currentNode) {
    if (currentNode != null) {
        if (!recursiveCheck(currentNode.next)) {
            return false;
        }
        if (currentNode.val != frontPointer.val) {
            return false;
        }
        frontPointer = frontPointer.next;
    }
    return true;  // ← 这个 return 只返回给上一层！
}
```

**执行过程**：

```
═══════════════════════════════════════════════════════════
第 1 层：recursiveCheck(node1)
═══════════════════════════════════════════════════════════
调用 recursiveCheck(node2)，等待返回...

═══════════════════════════════════════════════════════════
第 2 层：recursiveCheck(node2)
═══════════════════════════════════════════════════════════
调用 recursiveCheck(node3)，等待返回...

═══════════════════════════════════════════════════════════
第 3 层：recursiveCheck(node3)
═══════════════════════════════════════════════════════════
调用 recursiveCheck(null)，等待返回...

═══════════════════════════════════════════════════════════
第 4 层：recursiveCheck(null)
═══════════════════════════════════════════════════════════
currentNode == null
return true  ← 返回给第 3 层（不是最外层！）

═══════════════════════════════════════════════════════════
回到第 3 层：recursiveCheck(node3)
═══════════════════════════════════════════════════════════
接收到 true，执行比较和移动
return true  ← 返回给第 2 层（不是最外层！）

═══════════════════════════════════════════════════════════
回到第 2 层：recursiveCheck(node2)
═══════════════════════════════════════════════════════════
接收到 true，执行比较和移动
return true  ← 返回给第 1 层（不是最外层！）

═══════════════════════════════════════════════════════════
回到第 1 层：recursiveCheck(node1)
═══════════════════════════════════════════════════════════
接收到 true，执行比较和移动
return true  ← 返回给最外层调用者（这才是最终结果！）
```

#### 类比：接力赛

```
递归的 return 就像接力赛：

第 4 层 (最深层)
  return true
    ↓ 传递给
第 3 层
  return true
    ↓ 传递给
第 2 层
  return true
    ↓ 传递给
第 1 层
  return true
    ↓ 传递给
最外层调用者 ← 最终接收结果

每个人只负责传递给下一个人，
不是直接传递给终点！
```

---

#### 问题二：最外层的 return 是最后执行吗？

**答案：不一定！取决于 return 语句的位置。**

让我们看几种情况：

#### 情况 1：return 在函数末尾（最常见）

```java
private boolean recursiveCheck(ListNode currentNode) {
    if (currentNode != null) {
        if (!recursiveCheck(currentNode.next)) {
            return false;  // ← 提前返回
        }
        if (currentNode.val != frontPointer.val) {
            return false;  // ← 提前返回
        }
        frontPointer = frontPointer.next;
    }
    return true;  // ← 最后执行（如果没有提前返回）
}
```

**执行顺序**：

```
if (currentNode != null) {
    ① 递归调用
    ② 比较
    ③ 移动
}
④ return true  ← 最后执行
```

**结论**：如果没有提前返回，末尾的 return 确实是最后执行的。

#### 情况 2：return 在递归调用之前（前序位置）

```java
public void preorder(TreeNode root) {
    if (root == null) {
        return;  // ← 终止条件，可能提前返回
    }

    System.out.println(root.val);  // ← 先执行这个
    preorder(root.left);           // ← 再递归
    preorder(root.right);
    // ← 没有显式 return，函数自动返回
}
```

**执行顺序**：

```
① 打印当前节点  ← 先执行
② 递归左子树
③ 递归右子树
④ 函数结束（隐式 return）
```

**结论**：前序遍历中，打印操作在递归之前，所以先执行。

#### 情况 3：return 在递归调用之后（后序位置）

```java
public int maxDepth(TreeNode root) {
    if (root == null) {
        return 0;  // ← 终止条件
    }

    int leftDepth = maxDepth(root.left);   // ← 先递归
    int rightDepth = maxDepth(root.right); // ← 再递归

    return Math.max(leftDepth, rightDepth) + 1;  // ← 最后计算并返回
}
```

**执行顺序**：

```
① 递归左子树
② 递归右子树
③ 计算最大深度
④ return 结果  ← 最后执行
```

**结论**：后序遍历中，计算操作在递归之后，所以最后执行。

#### 情况 4：多个 return 语句

```java
public int factorial(int n) {
    if (n <= 1) {
        return 1;  // ← 终止条件，提前返回
    }
    return n * factorial(n - 1);  // ← 递归情况
}
```

**执行顺序**：

```
如果 n <= 1：
  return 1  ← 直接返回，后面的代码不执行

如果 n > 1：
  ① 计算 factorial(n - 1)
  ② 计算 n * 结果
  ③ return 结果
```

**结论**：如果满足终止条件，会提前返回，后面的 return 不会执行。

#### 详细对比：不同位置的 return

```java
// 示例 1：return 在末尾
public boolean check1(int n) {
    if (n > 0) {
        check1(n - 1);  // ① 递归
        System.out.println(n);  // ② 打印
    }
    return true;  // ③ 最后执行
}

// 示例 2：return 在中间
public boolean check2(int n) {
    if (n <= 0) {
        return true;  // ① 提前返回
    }
    check2(n - 1);  // ② 递归
    System.out.println(n);  // ③ 打印
    return true;  // ④ 最后执行（如果没有提前返回）
}

// 示例 3：return 在递归之前
public boolean check3(int n) {
    if (n <= 0) {
        return true;  // ① 提前返回
    }
    System.out.println(n);  // ② 先打印
    return check3(n - 1);  // ③ 递归并返回结果
}
```

#### 关键理解

**1. "最外层的 return" 有两个含义**：

- **代码结构上的最外层**：函数末尾的 return 语句
- **调用栈上的最外层**：第一次调用递归函数

**2. 执行顺序取决于代码位置**：

```java
// return 在末尾 → 最后执行
public void func1() {
    递归调用();
    其他操作();
    return;  // ← 最后执行
}

// return 在开头 → 可能提前执行
public void func2() {
    if (终止条件) {
        return;  // ← 提前返回
    }
    递归调用();
    return;  // ← 或者最后执行
}
```

**3. 回归阶段的执行顺序**：

```
递归调用之前的代码 → 递进阶段执行
递归调用之后的代码 → 回归阶段执行
```

#### 实际例子：回文链表

```java
private boolean recursiveCheck(ListNode currentNode) {
    if (currentNode != null) {
        // ═══════════════════════════════════════
        // 递进阶段
        // ═══════════════════════════════════════
        if (!recursiveCheck(currentNode.next)) {
            return false;  // ← 如果子调用返回 false，提前返回
        }

        // ═══════════════════════════════════════
        // 回归阶段
        // ═══════════════════════════════════════
        if (currentNode.val != frontPointer.val) {
            return false;  // ← 如果不匹配，提前返回
        }
        frontPointer = frontPointer.next;
    }
    return true;  // ← 如果没有提前返回，最后执行这个
}
```

**执行顺序总结**：

1. 如果 `currentNode == null`：直接执行 `return true`（最后一行）
2. 如果递归调用返回 `false`：提前 `return false`
3. 如果比较不匹配：提前 `return false`
4. 如果都通过：执行到最后的 `return true`

#### 核心总结

**关于 return 的传递**：
1. ❌ **错误**：最外层的 return 直接返回最终结果
2. ✅ **正确**：每层的 return 都只返回给它的上一层调用者
3. ✅ return 语句本身不知道自己在第几层
4. ✅ 返回值通过调用栈一层层传递

**关于 return 的执行顺序**：
1. ❌ **错误**：最外层的 return 一定最后执行
2. ✅ **正确**：取决于 return 语句在代码中的位置
3. ✅ 如果有多个 return，可能会提前返回
4. ✅ 函数末尾的 return 只有在没有提前返回时才执行

**形象比喻**：
- return 不是"电梯"（直达最外层）
- return 是"楼梯"（一层层往上走）
- 每层都要经过，不能跳过
- 但可以在任何一层"下车"（提前返回）

## 9. 递归的三种遍历顺序

### 9.1 前序遍历（Pre-order）

**顺序**：根 → 左 → 右

```java
public void preorder(TreeNode root) {
    if (root == null) return;

    System.out.println(root.val);  // 先处理根
    preorder(root.left);           // 再处理左
    preorder(root.right);          // 最后处理右
}
```

### 9.2 中序遍历（In-order）

**顺序**：左 → 根 → 右

```java
public void inorder(TreeNode root) {
    if (root == null) return;

    inorder(root.left);            // 先处理左
    System.out.println(root.val);  // 再处理根
    inorder(root.right);           // 最后处理右
}
```

### 9.3 后序遍历（Post-order）

**顺序**：左 → 右 → 根

```java
public void postorder(TreeNode root) {
    if (root == null) return;

    postorder(root.left);          // 先处理左
    postorder(root.right);         // 再处理右
    System.out.println(root.val);  // 最后处理根
}
```

**示例树**：

```
    1
   / \
  2   3
```

- **前序**：1 → 2 → 3
- **中序**：2 → 1 → 3
- **后序**：2 → 3 → 1

**最近公共祖先使用的是后序遍历**，因为需要先获取左右子树的结果，再处理当前节点。

## 10. 递归调试技巧

### 10.1 添加打印语句

```java
public int factorial(int n) {
    System.out.println("进入 factorial(" + n + ")");

    if (n <= 1) {
        System.out.println("返回 1");
        return 1;
    }

    int result = n * factorial(n - 1);
    System.out.println("factorial(" + n + ") = " + result);
    return result;
}
```

### 10.2 画递归树

手动画出递归调用树，理解执行流程。

### 10.3 从小规模开始

先测试 n=1, n=2, n=3，理解规律后再测试大规模。

## 11. 常见错误

### 11.1 忘记终止条件

```java
// 会导致栈溢出
public int bad(int n) {
    return n + bad(n - 1);  // 没有终止条件
}
```

### 11.2 终止条件错误

```java
// n=0 时会继续递归
public int factorial(int n) {
    if (n == 1) return 1;  // 应该是 n <= 1
    return n * factorial(n - 1);
}
```

### 11.3 没有返回值

```java
// 缺少 return
public int sum(int n) {
    if (n == 1) return 1;
    n + sum(n - 1);  // 应该是 return n + sum(n - 1);
}
```

### 11.4 判断逻辑放错位置

```java
// 错误：在获取 left 和 right 之前判断
public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) {
        return root;
    }

    //  这时候 left 和 right 还没有值！
    if (left != null && right != null) {  // 编译错误
        return root;
    }

    TreeNode left = lowestCommonAncestor(root.left, p, q);
    TreeNode right = lowestCommonAncestor(root.right, p, q);

    return left != null ? left : right;
}
```

## 12. 练习题

从简单到困难：

### 基础题

1. **打印 1 到 n**（递归实现）
2. **计算 x 的 n 次方**
3. **反转字符串**
4. **判断回文串**

### 进阶题

5. **二叉树的所有路径**
6. **二叉树的最近公共祖先**
7. **合并两个有序链表**
8. **二叉树的层序遍历**

### 困难题

9. **全排列**
10. **N 皇后问题**
11. **括号生成**
12. **二叉树的序列化与反序列化**

## 13. 总结

递归的核心思想：

1. **找到终止条件**（最小子问题）
2. **找到递归关系**（大问题如何分解成小问题）
3. **相信递归**（假设递归调用已经正确解决了子问题）
4. **注意执行顺序**（前序、中序、后序）

记住：**递归就是把大问题分解成小问题，直到小到可以直接解决为止**。

### 递归三要素

| 要素         | 说明                 | 示例                                    |
| ------------ | -------------------- | --------------------------------------- |
| **终止条件** | 什么时候停止递归     | `if (root == null) return null;`        |
| **递归调用** | 如何缩小问题规模     | `lowestCommonAncestor(root.left, p, q)` |
| **返回值**   | 如何利用子问题的结果 | `return left != null ? left : right;`   |

### 递归 vs 迭代

| 特性           | 递归         | 迭代     |
| -------------- | ------------ | -------- |
| **代码简洁性** | 简洁优雅     | 相对复杂 |
| **空间复杂度** | O(n) 栈空间  | O(1)     |
| **性能**       | 函数调用开销 | 更快     |
| **适用场景**   | 树、图、分治 | 简单循环 |

掌握递归，你就掌握了解决复杂问题的强大工具！
