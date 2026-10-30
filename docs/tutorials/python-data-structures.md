---
lang: zh-CN
title: Python 数据结构：从基础容器到栈、队列与二叉树
description: 面向懂 Java 的 Python 初学者，用可独立运行的示例掌握 list、tuple、dict、set、栈、队列、最小堆和二叉树，并理解常见错误与操作复杂度。
date: 2026-10-31
tags:
  - Python
  - Java
  - 数据结构
  - 入门教程
---

# Python 数据结构：从基础容器到栈、队列与二叉树

如果你会用 Java 的 `ArrayList`、`Map` 和 `Queue`，学习 Python 数据结构时，首先要建立的是“相同需求在 Python 中怎么表达”的联系。本文每种结构只使用一套常见写法，再通过完整程序解释它为什么有效。

示例使用 Python 3 内置功能和标准库，建议使用 Python 3.8 或更高版本。每个 `python` 代码块都可以单独保存为 `demo.py`，在终端执行 `python3 demo.py`，下一段输出就是预期结果。练习答案也可以独立运行，不需要先执行前文代码。

## 1. 先学够用的 Python 语法

### 1.1 变量、缩进和条件判断

Python 赋值时不用声明变量类型，也不用分号结尾。对象仍然有类型，例如 `3` 是整数，`"3"` 是字符串，二者不能直接相加。Java 用花括号表示代码块，Python 用缩进，本文统一使用四个空格。

`None` 表示没有值，概念上接近 Java 的 `null`；判断它时写 `is None`。一般值比较使用 `==`，不要把它与赋值符号 `=` 混淆。布尔值写作 `True`、`False`，逻辑运算写作 `and`、`or`、`not`。

```python
score = 82
name = None

if score >= 90:
    print("优秀")
elif score >= 60:
    print("通过")
else:
    print("继续练习")

if name is None:
    print("未填写姓名")
```

输出：

```text
通过
未填写姓名
```

`if`、`elif`、`else` 后的冒号不能省略。同一代码块要保持相同缩进；复制 Java 代码里的花括号到这里会导致语法错误。

### 1.2 长度、成员判断、索引和切片

`len(values)` 相当于获取集合大小。`x in values` 判断元素是否存在；对于字典，它判断的是键。空列表、空字典、空集合等在条件中为假，因此 `if values:` 表示“容器非空”，`if not values:` 表示“容器为空”。

列表索引从 `0` 开始，`[-1]` 表示最后一个元素。切片 `[start:end]` 包含起点、不包含终点，得到一个新的外层列表；省略端点表示从开头或到结尾。

```python
values = [10, 20, 30, 40]
print(len(values))
print(20 in values)
print(values[0], values[-1])
print(values[1:3])
print(values[:2])
print(values[2:])

empty = []
if not empty:
    print("没有元素")
```

输出：

```text
4
True
10 40
[20, 30]
[10, 20]
[30, 40]
没有元素
```

直接访问不存在的索引会抛出 `IndexError`，包括对空列表访问 `[-1]`。切片越过边界则会截取到现有范围。注意 `if value:` 也会把 `0`、`False` 和空字符串判为假；如果只想判断有没有值，应使用 `value is None`。

### 1.3 循环、函数和返回值

`for value in values` 接近 Java 的增强 `for`，每次取出一个元素。`while` 在条件为真时持续执行，需要确保条件最终能变为假。函数用 `def` 定义，参数不用写类型；`return` 结束函数并返回结果，没有显式返回值时返回 `None`。

```python
def sum_values(values):
    total = 0
    for value in values:
        total = total + value
    return total

print(sum_values([2, 4, 6]))
print(sum_values([]))

remaining = 2
while remaining > 0:
    print(remaining)
    remaining = remaining - 1
```

输出：

```text
12
0
2
1
```

累加器从 `0` 开始，所以空列表也有明确结果。Python 没有 Java 的 `i++` 写法；这里显式写出更新过程。后文还会用到 `count += 1`，含义是把 `count` 加一后重新赋值。

## 2. list：按位置组织可变数据

### 2.1 用途、Java 对照和常用操作

需要保存有顺序、允许重复、后续还会修改的一组数据时，使用 `list`。它的使用场景接近 Java 的 `ArrayList`，不是固定长度的 Java 数组。

读取或修改指定位置用 `values[i]`，末尾追加用 `append()`，按位置删除并取得元素用 `pop(i)`，遍历直接用 `for`，原地升序排序用 `sort()`。先把这几个操作组合起来，就能完成很多日常任务。

### 2.2 完整示例与输出

```python
scores = [80, 60, 90]
print(scores[0])
scores[1] = 70
scores.append(85)
removed = scores.pop(0)
print("删除：", removed)
print("当前：", scores)
scores.sort()
print("排序：", scores)
for score in scores:
    print(score)
```

输出：

```text
80
删除： 80
当前： [70, 90, 85]
排序： [70, 85, 90]
70
85
90
```

删除下标 `0` 后，后面的元素位置会前移。`sort()` 直接修改 `scores`，遍历看到的就是排序后的顺序。

### 2.3 常见错误

不要写 `scores = scores.sort()`：`sort()` 返回 `None`，这样会让变量失去原列表引用。`append()` 也返回 `None`，而 `pop()` 返回被删除的元素。

`pop(1)` 删除的是下标为 `1` 的元素，不是数值 `1`。对空列表 `pop()` 或使用越界下标会抛出 `IndexError`。排序时应让元素能相互比较，例如统一使用整数；混放整数和字符串通常不能直接排序。遍历过程中删除当前列表元素还可能漏处理数据，初学时尽量把遍历与修改分开。

## 3. tuple：表达固定组合

### 3.1 用途、Java 对照和常用操作

一个坐标、一条“姓名和年龄”记录，通常有固定的位置含义，可以用 `tuple`。Java 中你可能为这种数据定义一个小类或 `record`；元组只表达位置组合，没有字段名，也不等同于 Java 的记录类型。

元组创建后不能替换、添加或删除其中的位置。读取仍可用索引，更常见的是解包：把各个位置依次赋给多个变量。

### 3.2 完整示例与输出

```python
person = ("小林", 28)
name, age = person
print(name)
print(age)
print(person[0])

single = (7,)
print(len(single))
print(single)
```

输出：

```text
小林
28
小林
1
(7,)
```

`name, age = person` 要求左边变量数量与右边元素数量一致。单元素元组的逗号不能省：`(7)` 只是整数 `7` 加了一对括号。

### 3.3 常见错误

`person[1] = 29` 会抛出 `TypeError`，因为元组的位置不可修改。需要反复增删元素的集合应选择列表。

“元组不可变”指它保存的对象引用不能被替换。如果元组里面装着列表，那个列表本身仍可修改；元组不会递归冻结内部对象。

## 4. dict：按键查找与词频统计

### 4.1 用途、Java 对照和常用操作

需要根据姓名找分数、根据单词找次数时，用 `dict`，对应 Java 的 `Map` 使用场景。写 `counts[key] = value` 可以新增或覆盖一个键，`counts[key]` 读取已有键，`del counts[key]` 删除已有键。

`counts.get(key, default)` 在键不存在时返回默认值，不会自动把默认值存进去。`items()` 让循环同时拿到键和值。词频统计正好需要“读取旧次数，再加一并写回”。

### 4.2 完整示例与输出

```python
words = ["java", "python", "python", "java", "python"]
counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1

print(counts["python"])
print(counts.get("go", 0))
print("go" in counts)

counts["go"] = 1
counts["go"] = 2
print(counts["go"])
del counts["go"]

for word, count in counts.items():
    print(word, count)
```

输出：

```text
3
0
False
2
java 2
python 3
```

第一次遇到 `java`，默认次数为 `0`，写回 `1`；第二次遇到它，读取已有的 `1`，写回 `2`。字典的键不会重复，重复赋值只会更新值。Python 3.7 起字典保证按插入顺序迭代，因此这里先输出 `java`。

### 4.3 常见错误

读取或删除不存在的键会抛出 `KeyError`。可选读取用 `get()`；删除不确定存在的键时，先用 `if key in counts:` 判断。只写 `get(key)` 时，缺失键返回 `None`，不能直接拿它加一。

`"python" in counts` 检查键，不是检查次数中是否有这个值。字典键必须可哈希：本文使用字符串和整数即可，列表不能作为键。遍历 `items()` 时不要新增或删除字典键，否则可能抛出 `RuntimeError`。

## 5. set：去重和成员判断

### 5.1 用途、Java 对照和常用操作

只关心“有没有”，不关心重复次数和位置时，用 `set`，对应 Java 的 `Set` 使用场景。`set(values)` 去重，`value in seen` 判断成员，`add()` 添加，`discard()` 删除；删除不存在的元素也不会报错。

### 5.2 完整示例与输出

```python
names = ["小林", "小周", "小林"]
seen = set(names)
print(len(seen))
print("小林" in seen)
seen.add("小陈")
seen.add("小陈")
seen.discard("小周")
seen.discard("不存在")
print(len(seen))
print("小周" in seen)
print(seen == {"小林", "小陈"})
```

输出：

```text
2
True
2
False
True
```

重复添加同一个名字不会增加大小。最后比较两个集合是否包含相同成员，结果与存储或显示顺序无关。

### 5.3 常见错误：顺序和空集合

集合不提供索引，也不保证迭代顺序，不要用 `seen[0]`，更不要依赖打印集合时元素的先后顺序。需要保持原输入顺序的去重结果时，可以用集合记录是否见过，同时把首次出现的元素放进列表，练习会展示这一种写法。

空集合必须写 `set()`；`{}` 是空字典。非空的 `{"java", "python"}` 才是集合字面量，`{"java": 2}` 是字典。集合元素也必须可哈希，不能直接放入列表。

```python
empty_dict = {}
empty_set = set()
empty_dict["python"] = 1
empty_set.add("python")
print(empty_dict)
print("python" in empty_set)
```

输出：

```text
{'python': 1}
True
```

## 6. 引用共享与浅拷贝

把一个列表赋给另一个变量，类似 Java 中让两个引用指向同一个集合，并不会复制数据。`copy()` 会创建新的外层列表，但它是浅拷贝：内部对象仍然共享。

```python
original = [[1], [2]]
alias = original
copied = original.copy()

alias.append([3])
print(original)
print(copied)

copied[0].append(9)
print(original)
print(copied)
```

输出：

```text
[[1], [2], [3]]
[[1], [2]]
[[1, 9], [2], [3]]
[[1, 9], [2]]
```

`alias` 与 `original` 指向同一个外层列表，因此追加 `[3]` 对两者都可见。`copied` 的外层独立，所以没有 `[3]`；但它的第一个内部列表与原列表共享，所以追加 `9` 会同时体现。列表切片同样只复制外层。需要独立的嵌套数据时，应明确各层对象如何创建，不能把浅拷贝当作全部复制。

## 7. 栈：只用 list 实现后进先出

### 7.1 用途、Java 对照和常用操作

撤销操作、保存尚未匹配的左括号，都需要“最近放进去的先取出来”，即后进先出（LIFO）。Java 中可以用 `Deque` 表达栈语义；Python 本文只使用列表尾部，不需要旧式 `java.util.Stack` 的对应类。

`append()` 入栈，`pop()` 出栈，`[-1]` 查看栈顶。后两者都要先判断非空。

```text
入栈 A → B → C
栈底 [A, B, C] 栈顶
出栈 C → B → A
```

```python
stack = []
stack.append("A")
stack.append("B")
stack.append("C")
if stack:
    print("栈顶：", stack[-1])
while stack:
    print(stack.pop())
print(len(stack))
```

输出：

```text
栈顶： C
C
B
A
0
```

### 7.2 完整应用：括号匹配

本例只接受 `()`、`[]`、`{}` 六种字符，其他字符直接判为无效；空字符串视为匹配成功。这样输入规则明确，读者不必猜测是否应该忽略普通文字。

```python
def is_balanced(text):
    stack = []
    pairs = {')': '(', ']': '[', '}': '{'}
    for char in text:
        if char in "([{":
            stack.append(char)
        elif char in pairs:
            if not stack or stack[-1] != pairs[char]:
                return False
            stack.pop()
        else:
            return False
    return not stack

for text in ["{[()]}", "([)]", ")", "((", "", "a"]:
    print(repr(text), is_balanced(text))
```

输出：

```text
'{[()]}' True
'([)]' False
')' False
'((' False
'' True
'a' False
```

`repr(text)` 让空字符串也显示为带引号的 `''`，便于核对。遇到右括号时，它只能匹配最近一个尚未配对的左括号，所以检查栈顶。`or` 会短路：如果栈为空，后面的 `stack[-1]` 就不会执行，避免越界。

### 7.3 常见错误

不能只比较左右括号总数，`([)]` 的数量正确，但嵌套顺序错误。也不能在循环结束时直接返回 `True`，因为 `((` 会留下未匹配的左括号。最后的 `return not stack` 就是在检查是否全部配对。

## 8. 队列：只用 collections.deque

### 8.1 用途、Java 对照和常用操作

按提交顺序处理任务需要先进先出（FIFO）。Java 中可用 `Queue` 接口和 `ArrayDeque` 实现类似需求；Python 使用标准库 `collections.deque`。虽然它支持双端操作，本文只从右边入队、左边出队。

`append()` 入队，`popleft()` 出队，`[0]` 查看队首，取元素前先判空。这里限定普通单线程任务处理，不讨论并发队列或等待通知机制。

```text
入队 A → B → C
队首 [A, B, C] 队尾
出队 A → B → C
```

### 8.2 完整示例与输出

```python
from collections import deque

queue = deque(["下载文件", "解析内容"])
queue.append("保存结果")
if queue:
    print("下一个：", queue[0])
while queue:
    task = queue.popleft()
    print("处理：", task)
print("剩余：", len(queue))
```

输出：

```text
下一个： 下载文件
处理： 下载文件
处理： 解析内容
处理： 保存结果
剩余： 0
```

### 8.3 常见错误：为什么不用 list.pop(0)

列表头部删除需要移动后续元素，单次是 O(n)，反复清空长度为 n 的列表可能累计到 O(n²)。`deque.popleft()` 的端点删除是 O(1)，更适合队列。

如果误用 `queue.pop()`，会从右端取出最新任务，变成栈的顺序。空队列上调用 `popleft()` 或读取 `[0]` 会抛出 `IndexError`。另外，`deque` 中间位置的索引访问不是 O(1)，不要把它当成列表的全面替代品。

## 9. 优先队列：只用 heapq 最小堆

### 9.1 用途、Java 对照和常用操作

有些任务要按紧急程度执行，与提交顺序无关。这接近 Java `PriorityQueue` 的用途。这里约定数字越小，优先级越高；所有元素都是整数，不引入自定义比较规则。

`heapq` 是操作普通列表的模块：已有数据先用 `heapify()` 原地建堆，再用 `heappush()` 入堆、`heappop()` 弹出最小值，`heap[0]` 查看最小值。空列表本身就是合法的空堆。

### 9.2 完整示例与输出

```python
import heapq

priorities = [5, 2, 8, 2]
heapq.heapify(priorities)
heapq.heappush(priorities, 1)
if priorities:
    print("最先处理：", priorities[0])
while priorities:
    print(heapq.heappop(priorities))
```

输出：

```text
最先处理： 1
1
2
2
5
8
```

两个 `2` 都会保留，堆不会去重。反复弹出最小值，输出才形成升序。

### 9.3 常见错误：堆不等于排好序的列表

最小堆只要求父节点不大于子节点，不要求兄弟节点之间有序。例如 `[1, 3, 2]` 已经满足最小堆条件，但不是升序列表。因此不要认为 `heap[1]` 一定是第二小的值，也不要遍历底层列表来“按优先级处理”。

建堆后不能直接用普通 `append()` 添加元素或随意改写位置，这可能破坏堆的约束。`heapify()` 返回 `None`，不要把结果重新赋给列表变量。空堆上 `heappop()` 或 `[0]` 都会抛出 `IndexError`，仍需判空。

## 10. 二叉树：从节点对象到遍历

### 10.1 用途、Java 对照与节点类

二叉树用来表示每个节点最多连接两个子节点的层级关系。Java 中通常定义节点类，保存值以及左右孩子引用；Python 的做法相同，只是创建对象不用 `new`。

`class TreeNode:` 定义类。`__init__` 在新建实例时初始化属性，`self` 指向当前实例，类似 Java 方法内部的 `this`，但必须显式写在实例方法参数的第一个位置。调用 `TreeNode(1)` 时只传值，Python 会负责传入 `self`。

我们使用一棵普通二叉树：

```text
      1
     / \
    2   3
   / \
  4   5
```

节点保存 `val`、`left`、`right` 三个属性。不存在的子节点用 `None` 表示。连接节点就是把一个节点对象赋给另一个节点的 `left` 或 `right`。

### 10.2 完整示例：递归中序与队列层序

```python
from collections import deque


class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def inorder(root):
    result = []

    def visit(node):
        if node is None:
            return
        visit(node.left)
        result.append(node.val)
        visit(node.right)

    visit(root)
    return result


def level_order(root):
    result = []
    if root is None:
        return result
    queue = deque([root])
    while queue:
        node = queue.popleft()
        result.append(node.val)
        if node.left is not None:
            queue.append(node.left)
        if node.right is not None:
            queue.append(node.right)
    return result


root = TreeNode(1)
root.left = TreeNode(2)
root.right = TreeNode(3)
root.left.left = TreeNode(4)
root.left.right = TreeNode(5)

print("中序：", inorder(root))
print("层序：", level_order(root))
print("空树：", inorder(None), level_order(None))
single = TreeNode(9)
print("单节点：", inorder(single), level_order(single))
```

输出：

```text
中序： [4, 2, 5, 1, 3]
层序： [1, 2, 3, 4, 5]
空树： [] []
单节点： [9] [9]
```

`visit` 是定义在 `inorder` 内部的辅助函数，可以访问外层的 `result`。每次调用 `inorder` 都会创建新的结果列表，辅助函数只向这个列表追加元素，不重新给它赋值。

### 10.3 中序遍历：递归究竟如何返回

中序的顺序是“左子树 → 当前节点 → 右子树”。第一次 `visit(1)` 先调用 `visit(2)`，后者又调用 `visit(4)`。遇到节点 `4` 的左孩子 `None` 时，`return` 只结束这一层调用，程序回到节点 `4`，继续执行追加 `4` 和访问右孩子。

节点 `4` 处理完后，回到节点 `2` 的左子树调用之后，追加 `2`，再访问节点 `5`。整棵左子树结束，才回到根节点追加 `1`，最后访问右子树的 `3`。每一层调用都记着“返回后从哪里继续”，这就是递归调用栈的作用。

空节点判断必须放在访问属性之前，否则读取 `None.left` 会失败。树很深时递归可能触发 `RecursionError`，本例适合入门小树，不承诺处理任意深度；递归机制可继续阅读[递归详解](../data-structures/recursion)。

### 10.4 层序遍历：队列如何变化

层序要求先处理浅层，再处理深层。队列里存的是**节点对象**，这样取出节点时还能找到它的孩子。下表为了易读，只显示节点的值：

| 刚处理的节点 | 处理后队列（左边为队首） | 已输出 |
| --- | --- | --- |
| 尚未处理 | `[1]` | `[]` |
| 1 | `[2, 3]` | `[1]` |
| 2 | `[3, 4, 5]` | `[1, 2]` |
| 3 | `[4, 5]` | `[1, 2, 3]` |
| 4 | `[5]` | `[1, 2, 3, 4]` |
| 5 | `[]` | `[1, 2, 3, 4, 5]` |

先放左孩子，再放右孩子，保证同一层从左到右。`None` 不入队；空树直接返回空列表。这里返回的是按层访问的扁平列表，不是每层一个子列表。

### 10.5 常见误解：二叉树、搜索树和 TreeMap

普通二叉树只限制每个节点最多两个孩子，不限制值的大小关系。二叉搜索树还要求左子树的值小于当前值、右子树的值大于当前值（这里按不含重复键的定义）。因此搜索树中序遍历可以得到升序，普通二叉树不一定可以；本例输出就不是升序。

Java `TreeMap` 是按键排序的映射容器，不是可以直接操作左右孩子的普通节点树，也不是 Python `dict` 的排序承诺。需要学习节点与遍历时用本节的 `TreeNode`；需要按键查值时用 `dict`。手动连接时也要避免把祖先连接成孩子而形成环，否则这些遍历无法正常结束。

## 11. 选型与复杂度速查

### 11.1 Java / Python 概念对照

下面是使用场景对照，不表示双方所有 API 或行为完全相同。

| 需求 | Java 中熟悉的概念 | 本文 Python 写法 | 选择理由 |
| --- | --- | --- | --- |
| 按位置读写、允许重复 | `ArrayList` | `list` | 可变的有序序列 |
| 固定组合记录 | 小类 / `record` | `tuple` | 各位置不能替换，支持解包 |
| 按键查值、计数 | `Map` | `dict` | 维护键到值的映射 |
| 去重、判断出现过没有 | `Set` | `set` | 只保留不同成员 |
| 后进先出 | `Deque` 的栈操作 | `list.append/pop` | 只操作末尾 |
| 先进先出 | `Queue` / `ArrayDeque` | `deque.append/popleft` | 两端操作高效 |
| 每次取最小优先级 | `PriorityQueue` | `heapq` 最小堆 | 动态维护最小元素 |
| 手动表达树形关系 | 节点类 | `TreeNode` | 显式连接左右孩子 |

### 11.2 常用操作复杂度

n 表示当前元素数，k 表示切片长度，h 表示树高，w 表示树的最大层宽。下表用于常见 CPython 实现的选型，假定单次元素比较、哈希计算等自身成本为 O(1)；长字符串、超大整数或复杂对象的计算成本需要另算。

| 结构 | 操作 | 时间复杂度 |
| --- | --- | --- |
| `list` / `tuple` | 长度、单个索引访问 | O(1) |
| `list` | 修改单个位置 | O(1) |
| `list` | 尾部 `append()` / `pop()` | 摊还 O(1) |
| `list` | 头部或中间 `pop(i)` | O(n)，受移动元素数量影响 |
| `list` / `tuple` | `in` 成员查找、遍历全部元素 | O(n) |
| `list` | 切片 / `copy()` | O(k) / O(n) |
| `list` | `sort()` | 最坏 O(n log n) |
| `dict` | 查找、`get`、写入、删除、键的 `in` | 平均 O(1)，最坏 O(n) |
| `set` | `in`、`add`、`discard` | 平均 O(1)，最坏 O(n) |
| `dict` / `set` | 遍历全部元素 | O(n) |
| `deque` | `append`、`popleft`、读取 `[0]` | O(1) |
| `deque` | 访问中间位置 | O(n) |
| `heapq` | `heapify` | O(n) |
| `heapq` | `heappush` / `heappop` | 通常按 O(log n) 计；底层列表扩缩容成本按摊还计 |
| 最小堆 | 查看 `[0]` | O(1) |
| 二叉树 | 中序 / 层序遍历所有节点 | O(n) |

**平均** O(1) 依赖哈希分布等条件，不能理解成每次操作都一样快。**摊还** O(1) 是把偶尔发生的列表扩缩容成本分摊到一系列操作上；单次追加可能因扩容而花 O(n)。堆操作还要沿树高调整元素，所以并不是 O(1)。

空间也要考虑：括号匹配最坏使用 O(n) 栈空间，中序遍历额外调用栈为 O(h)，层序遍历的队列为 O(w)。本文两个树遍历都保存完整结果，还各需 O(n) 的结果列表。空间复杂度与是否返回结果、是否仅打印有关。

## 12. 五道练习与参考解答

建议先按题目独立实现，再展开答案。每题只提供一种解法，继续使用前文的数据结构。

### 12.1 词频统计

输入已经分词的列表 `["red", "blue", "red", "green", "blue", "red"]`，返回每个词出现的次数；空输入返回空字典。无需处理标点和大小写。

<details>
<summary>参考解答与预期结果</summary>

```python
def count_words(words):
    counts = {}
    for word in words:
        counts[word] = counts.get(word, 0) + 1
    return counts

print(count_words(["red", "blue", "red", "green", "blue", "red"]))
print(count_words([]))
```

输出：

```text
{'red': 3, 'blue': 2, 'green': 1}
{}
```

默认值 `0` 处理首次出现的词。平均时间 O(n)，空间 O(u)，u 为不同单词数。

</details>

### 12.2 去重并判断是否重复

给定整数列表 `[3, 1, 3, 2, 1]`，返回按首次出现顺序排列的去重列表，同时返回是否存在重复元素。

<details>
<summary>参考解答与预期结果</summary>

```python
def unique_values(values):
    seen = set()
    result = []
    has_duplicate = False
    for value in values:
        if value in seen:
            has_duplicate = True
        else:
            seen.add(value)
            result.append(value)
    return result, has_duplicate

print(unique_values([3, 1, 3, 2, 1]))
print(unique_values([]))
print(unique_values([7]))
```

输出：

```text
([3, 1, 2], True)
([], False)
([7], False)
```

集合负责判断是否出现过，列表负责保存顺序。返回的两个值组成元组。平均时间 O(n)，空间 O(u)。

</details>

### 12.3 括号匹配

判断字符串是否是有效括号序列，只接受六种括号字符，空字符串有效，其他字符无效。验证正常嵌套、交叉嵌套、多余右括号和缺少右括号。

<details>
<summary>参考解答与预期结果</summary>

```python
def is_balanced(text):
    stack = []
    pairs = {')': '(', ']': '[', '}': '{'}
    for char in text:
        if char in "([{":
            stack.append(char)
        elif char in pairs:
            if not stack or stack[-1] != pairs[char]:
                return False
            stack.pop()
        else:
            return False
    return not stack

for text in ["([]){}", "([)]", ")(", "(()", "", "a()"]:
    print(repr(text), is_balanced(text))
```

输出：

```text
'([]){}' True
'([)]' False
')(' False
'(()' False
'' True
'a()' False
```

每个字符最多入栈、出栈各一次，时间 O(n)，最坏空间 O(n)。

</details>

### 12.4 按任务优先级处理

用整数代表待处理任务的优先级，数字越小越先处理。初始数据 `[4, 1, 3, 1]`，再加入优先级 `2`，返回处理顺序，保留重复优先级。

<details>
<summary>参考解答与预期结果</summary>

```python
import heapq


def process_priorities(initial, incoming):
    heap = initial.copy()
    heapq.heapify(heap)
    for priority in incoming:
        heapq.heappush(heap, priority)
    processed = []
    while heap:
        processed.append(heapq.heappop(heap))
    return processed

print(process_priorities([4, 1, 3, 1], [2]))
print(process_priorities([], []))
print(process_priorities([], [7]))
```

输出：

```text
[1, 1, 2, 3, 4]
[]
[7]
```

先复制输入，避免建堆和出堆改变调用方列表。这里只处理数字，不定义相同优先级任务之间的先后关系。令 n 为总任务数，整体时间 O(n log n)，空间 O(n)。

</details>

### 12.5 二叉树层序遍历

构造下图的树，返回从上到下、同层从左到右的值列表，同时处理空树和单节点树。

```text
    10
   /  \
  6    15
   \
    8
```

<details>
<summary>参考解答与预期结果</summary>

```python
from collections import deque


class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def level_order(root):
    if root is None:
        return []
    result = []
    queue = deque([root])
    while queue:
        node = queue.popleft()
        result.append(node.val)
        if node.left is not None:
            queue.append(node.left)
        if node.right is not None:
            queue.append(node.right)
    return result


root = TreeNode(10)
root.left = TreeNode(6)
root.right = TreeNode(15)
root.left.right = TreeNode(8)
print(level_order(root))
print(level_order(None))
print(level_order(TreeNode(42)))
```

输出：

```text
[10, 6, 15, 8]
[]
[42]
```

节点 `8` 比节点 `15` 深一层，即使它在左子树，也要等 `15` 处理后再访问。时间 O(n)，队列空间 O(w)，返回列表空间 O(n)。

</details>

## 13. 参考文档

本文的容器操作、返回值和异常行为依据 [Python 数据结构教程](https://docs.python.org/3/tutorial/datastructures.html) 核对；双端队列操作和端点访问成本参见 [collections.deque 文档](https://docs.python.org/3/library/collections.html#collections.deque)；最小堆约束、建堆及入堆出堆语义参见 [heapq 文档](https://docs.python.org/3/library/heapq.html)。阅读文档时可先查本文用到的方法，再扩展其他 API。
