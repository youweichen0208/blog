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
// ❌ 错误：没有终止条件
public void badRecursion(int n) {
    System.out.println(n);
    badRecursion(n - 1);  // 永远不会停止！
}

// ✅ 正确：有终止条件
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

- ✅ 问题本身具有递归性质（树、图遍历）
- ✅ 代码更简洁易懂
- ✅ 分治算法（归并排序、快速排序）

**不适合递归的场景**：

- ❌ 递归深度太大（栈溢出风险）
- ❌ 有大量重复计算（需要优化）
- ❌ 简单的线性问题（循环更高效）

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

### 8.3 二叉树的最近公共祖先 ⭐

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
// ❌ 会导致栈溢出
public int bad(int n) {
    return n + bad(n - 1);  // 没有终止条件
}
```

### 11.2 终止条件错误

```java
// ❌ n=0 时会继续递归
public int factorial(int n) {
    if (n == 1) return 1;  // 应该是 n <= 1
    return n * factorial(n - 1);
}
```

### 11.3 没有返回值

```java
// ❌ 缺少 return
public int sum(int n) {
    if (n == 1) return 1;
    n + sum(n - 1);  // 应该是 return n + sum(n - 1);
}
```

### 11.4 判断逻辑放错位置

```java
// ❌ 错误：在获取 left 和 right 之前判断
public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) {
        return root;
    }

    // ❌ 这时候 left 和 right 还没有值！
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
6. **二叉树的最近公共祖先** ⭐
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

| 要素 | 说明 | 示例 |
|------|------|------|
| **终止条件** | 什么时候停止递归 | `if (root == null) return null;` |
| **递归调用** | 如何缩小问题规模 | `lowestCommonAncestor(root.left, p, q)` |
| **返回值** | 如何利用子问题的结果 | `return left != null ? left : right;` |

### 递归 vs 迭代

| 特性 | 递归 | 迭代 |
|------|------|------|
| **代码简洁性** | ✅ 简洁优雅 | ❌ 相对复杂 |
| **空间复杂度** | ❌ O(n) 栈空间 | ✅ O(1) |
| **性能** | ❌ 函数调用开销 | ✅ 更快 |
| **适用场景** | 树、图、分治 | 简单循环 |

掌握递归，你就掌握了解决复杂问题的强大工具！
