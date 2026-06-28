# Supabase 集成指南：从数据库管理到实时应用

## 概述

Supabase 是一个开源的 Firebase 替代品。本质是**托管版本的 PostgreSQL + 开箱即用的周边能力**。

**核心组件**：
- **PostgreSQL 数据库**：企业级关系数据库，无需自己部署运维
- **Authentication**：内置用户认证系统（邮箱、第三方 OAuth）
- **Realtime**：WebSocket 驱动的实时数据同步
- **Storage**：托管的文件存储（类似 AWS S3）
- **Edge Functions**：Serverless 函数，在全球边界节点执行
- **Vector Search**：内置向量数据库，支持 AI 应用

**适用场景**：
- 快速 MVP：不想自己运维数据库，快速上线产品
- 实时应用：需要实时数据同步（协作编辑、聊天、通知）
- AI 应用：向量搜索、RAG 应用集成
- 现有 Postgres 用户升级：已用 Postgres（`pgx/v5`），迁移到托管方案

---

## 第一部分：Supabase 账户和项目创建

### 1.1 账户和项目初始化

1. **访问 Supabase**：https://supabase.com
2. **创建账户**（支持 GitHub OAuth）
3. **创建项目**：
   - Project name: `your-project-name`
   - Database password: 设置强密码（保管好）
   - Region: 选择地理位置最近的区域（如 Asia - Singapore）
   - 等待 3-5 分钟，项目初始化完成

### 1.2 获取连接信息

进入 **Project Settings → Database**，获取：

| 字段 | 用途 |
|------|------|
| **Host** | 数据库服务器地址 |
| **Port** | 通常是 5432 |
| **Database** | 默认 `postgres` |
| **User** | 通常 `postgres` |
| **Password** | 你创建项目时设置的密码 |
| **Connection String** | 完整连接串，格式：`postgresql://user:password@host:5432/database` |

也获取 **Project Settings → API**：

| 密钥 | 用途 |
|------|------|
| **URL** | REST API 入口，格式 `https://xxx.supabase.co` |
| **anon** | 匿名客户端公开密钥 |
| **service_role** | 服务端密钥，权限更高，不要暴露在前端 |

---

## 第二部分：数据库初始化和管理

### 2.1 连接到数据库

**方式 1：Supabase SQL Editor**（Web 界面）

1. 进入 **SQL Editor**
2. 新建 Query
3. 写 SQL，点击 Run

```sql
-- 创建用户表
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建文章表
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建评论表
CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
```

**方式 2：本地 psql 连接**

```bash
psql -h YOUR_HOST -U postgres -d postgres
# 输入密码

# 在 psql 中执行相同的 SQL
```

**方式 3：Python/Go 连接**

Python（使用 `psycopg2`）：
```python
import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect(
    host="your-host.supabase.co",
    port=5432,
    database="postgres",
    user="postgres",
    password="your-password"
)

cursor = conn.cursor(cursor_factory=RealDictCursor)
cursor.execute("SELECT * FROM users LIMIT 10")
rows = cursor.fetchall()
print(rows)

conn.close()
```

Go（使用 `pgx/v5`）：
```go
package main

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
)

func main() {
	conn, err := pgx.Connect(context.Background(),
		"postgresql://postgres:password@host:5432/postgres")
	if err != nil {
		panic(err)
	}
	defer conn.Close(context.Background())

	var email, username string
	err = conn.QueryRow(context.Background(),
		"SELECT email, username FROM users LIMIT 1").
		Scan(&email, &username)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Email: %s, Username: %s\n", email, username)
}
```

### 2.2 表设计最佳实践

**原则**：
- **使用 BIGSERIAL 作为主键**：支持大规模数据
- **时间戳必不可少**：`created_at` 和 `updated_at` 用于审计
- **外键和索引**：确保引用完整性和查询性能
- **NOT NULL 约束**：避免 NULL 值导致的 bug

**完整的生产表示例**：
```sql
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    -- 业务字段
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    -- 分类和标签
    category_id BIGINT REFERENCES categories(id),
    tags TEXT[] DEFAULT '{}',  -- 数组类型，支持多个标签
    -- SEO 和元数据
    slug VARCHAR(255) UNIQUE,
    meta_title VARCHAR(255),
    meta_description TEXT,
    -- 状态和可见性
    status VARCHAR(50) DEFAULT 'draft',  -- draft, published, archived
    is_active BOOLEAN DEFAULT TRUE,
    -- 审计字段
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT REFERENCES users(id),
    updated_by BIGINT REFERENCES users(id),
    -- 额外字段
    view_count INTEGER DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 0.0
);

-- 索引：常用查询条件
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- 更新触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### 2.3 行级安全策略（RLS）

RLS 是 Supabase 的安全基础：只允许用户访问他们有权限的数据。

**示例**：用户只能看到自己的文章

```sql
-- 1. 启用 RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 2. 创建策略：用户可以看所有发布的文章，和自己的所有文章
CREATE POLICY "Users can see published posts or own posts" ON posts
FOR SELECT
USING (published = true OR user_id = auth.uid());

-- 3. 用户只能插入自己的文章
CREATE POLICY "Users can insert own posts" ON posts
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 4. 用户只能更新自己的文章
CREATE POLICY "Users can update own posts" ON posts
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5. 用户只能删除自己的文章
CREATE POLICY "Users can delete own posts" ON posts
FOR DELETE
USING (user_id = auth.uid());
```

**验证 RLS**（在应用中测试）：
```python
# 以用户身份查询（假设已认证）
# Supabase 会自动注入 auth.uid()
# 用户 A 只能看到自己的文章 + 所有发布的文章
```

---

## 第三部分：Python/Go 应用集成

### 3.1 Python 集成（Supabase Python Client）

**安装**：
```bash
pip install supabase
```

**初始化和基本用法**：
```python
from supabase import create_client, Client

# 初始化（从环境变量读取更安全）
url = "https://your-project.supabase.co"
key = "your-anon-key"
supabase: Client = create_client(url, key)

# ========== SELECT ==========
# 获取所有用户
response = supabase.table("users").select("*").execute()
users = response.data

# 条件查询
response = supabase.table("users").select("*").eq("email", "john@example.com").execute()
user = response.data[0] if response.data else None

# 分页
response = supabase.table("posts") \
    .select("*") \
    .eq("user_id", user_id) \
    .order("created_at", desc=True) \
    .range(0, 9) \
    .execute()
posts = response.data

# ========== INSERT ==========
new_post = supabase.table("posts").insert({
    "user_id": user_id,
    "title": "My First Post",
    "content": "Hello, Supabase!",
    "published": True,
}).execute()

# 批量插入
posts_data = [
    {"user_id": 1, "title": "Post 1", "content": "Content 1"},
    {"user_id": 1, "title": "Post 2", "content": "Content 2"},
]
supabase.table("posts").insert(posts_data).execute()

# ========== UPDATE ==========
supabase.table("posts") \
    .update({"published": True, "title": "Updated Title"}) \
    .eq("id", post_id) \
    .execute()

# ========== DELETE ==========
supabase.table("posts") \
    .delete() \
    .eq("id", post_id) \
    .execute()
```

**带认证的 REST API 调用**：
```python
from supabase import create_client

url = "https://your-project.supabase.co"
key = "your-anon-key"
supabase = create_client(url, key)

# 用户登录
auth_response = supabase.auth.sign_up({
    "email": "user@example.com",
    "password": "password123",
})
user = auth_response.user
session = auth_response.session

# 之后的查询会使用 session token，自动跳过 RLS 检查
supabase.table("posts").insert({
    "user_id": user.id,
    "title": "My Post",
    "content": "...",
}).execute()
```

### 3.2 Go 集成

**使用标准 pgx 连接**：
```go
package main

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
)

type Post struct {
	ID        int64
	UserID    int64
	Title     string
	Content   string
	Published bool
	CreatedAt string
}

func main() {
	// 连接字符串
	connStr := "postgresql://postgres:password@host:5432/postgres"
	
	conn, err := pgx.Connect(context.Background(), connStr)
	if err != nil {
		panic(err)
	}
	defer conn.Close(context.Background())

	// SELECT
	query := "SELECT id, user_id, title, content, published, created_at FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10"
	rows, err := conn.Query(context.Background(), query, userID)
	if err != nil {
		panic(err)
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var p Post
		err := rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Content, &p.Published, &p.CreatedAt)
		if err != nil {
			panic(err)
		}
		posts = append(posts, p)
	}

	// INSERT
	insertQuery := `
		INSERT INTO posts (user_id, title, content, published)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`
	var postID int64
	var createdAt string
	err = conn.QueryRow(context.Background(), insertQuery,
		userID, "My Post", "Content here", true).
		Scan(&postID, &createdAt)
	if err != nil {
		panic(err)
	}

	fmt.Printf("Post created: ID=%d, CreatedAt=%s\n", postID, createdAt)

	// UPDATE
	updateQuery := "UPDATE posts SET published = true WHERE id = $1"
	_, err = conn.Exec(context.Background(), updateQuery, postID)
	if err != nil {
		panic(err)
	}

	// DELETE
	deleteQuery := "DELETE FROM posts WHERE id = $1"
	_, err = conn.Exec(context.Background(), deleteQuery, postID)
	if err != nil {
		panic(err)
	}
}
```

**使用事务**：
```go
tx, err := conn.Begin(context.Background())
if err != nil {
	panic(err)
}
defer tx.Rollback(context.Background())

// 在事务中执行多个操作
// 如果任何一个失败，整个事务回滚
_, err = tx.Exec(context.Background(), "INSERT INTO posts ...")
if err != nil {
	panic(err)
}

_, err = tx.Exec(context.Background(), "UPDATE users SET post_count = post_count + 1 WHERE id = $1", userID)
if err != nil {
	panic(err)
}

// 提交事务
err = tx.Commit(context.Background())
if err != nil {
	panic(err)
}
```

### 3.3 FastAPI/Flask 集成示例

**FastAPI + Supabase**：
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client

app = FastAPI()
supabase = create_client("https://xxx.supabase.co", "your-anon-key")

class PostCreate(BaseModel):
    title: str
    content: str
    published: bool = False

@app.post("/posts")
async def create_post(post: PostCreate, user_id: int):
    try:
        response = supabase.table("posts").insert({
            "user_id": user_id,
            "title": post.title,
            "content": post.content,
            "published": post.published,
        }).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/posts/{post_id}")
async def get_post(post_id: int):
    response = supabase.table("posts") \
        .select("*") \
        .eq("id", post_id) \
        .execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Post not found")
    return response.data[0]

@app.get("/users/{user_id}/posts")
async def get_user_posts(user_id: int, limit: int = 10, offset: int = 0):
    response = supabase.table("posts") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .range(offset, offset + limit - 1) \
        .execute()
    return response.data
```

---

## 第四部分：实时功能和 WebSocket

### 4.1 实时数据库更新

Supabase 支持 WebSocket 驱动的实时推送。适合：
- 协作编辑（多用户同时编辑一个文档）
- 实时通知（收到新评论/消息立即通知）
- 在线状态（显示谁在线）

**Python 示例**（使用 Supabase Realtime）：
```python
from supabase import create_client
import asyncio

supabase = create_client("https://xxx.supabase.co", "your-key")

# 监听 posts 表的所有变化
def on_posts_change(payload):
    print(f"Change: {payload['eventType']} - {payload['new']}")

# 订阅
subscription = supabase.table("posts").on("*", on_posts_change).subscribe()

# 运行事件循环
try:
    # 保持连接打开
    while True:
        asyncio.sleep(1)
except KeyboardInterrupt:
    supabase.realtime.unsubscribe(subscription)
```

### 4.2 文件存储集成

Supabase Storage 用于上传和管理文件。

**Python**：
```python
# 上传文件
with open("avatar.jpg", "rb") as f:
    supabase.storage.from_("avatars").upload(
        path=f"user_{user_id}/avatar.jpg",
        file=f,
    )

# 获取公开 URL
url = supabase.storage.from_("avatars").get_public_url(
    path=f"user_{user_id}/avatar.jpg"
)

# 删除文件
supabase.storage.from_("avatars").remove([f"user_{user_id}/avatar.jpg"])
```

**Go**：
```go
import "os"

// 上传文件
file, _ := os.Open("avatar.jpg")
defer file.Close()

err := supabaseStorageClient.Upload("avatars", f"user_{userID}/avatar.jpg", file)

// 获取公开 URL（已配置 public 权限的 bucket）
url := fmt.Sprintf("https://xxx.supabase.co/storage/v1/object/public/avatars/user_%d/avatar.jpg", userID)
```

---

## 第五部分：与 Claude 的集成

### 5.1 Supabase 连接器

Cowork 中的 Supabase 连接器让 Claude 用自然语言查询数据库。

**配置步骤**：
1. **Settings → Connectors**
2. **搜索 Supabase**
3. **授权**：
   - 输入你的 Supabase Project URL
   - 输入 service_role key（权限更高）
4. **测试连接**

获取 service_role key：
- Supabase Settings → API
- 找到 service_role secret（不要暴露在公开代码中）

### 5.2 使用场景

**Scenario 1：查询数据**
```
Supabase 中有多少篇文章是已发布的？
按创建时间排序，最新的 10 篇是什么？
```

Claude 会：
- 调用连接器执行查询
- 返回结果
- 支持排序、分页、聚合等

**Scenario 2：数据分析**
```
统计一下过去 7 天内每天新增了多少篇文章？
```

Claude 会：
- 构建 SQL 聚合查询
- 分组按日期
- 返回时间序列图表

**Scenario 3：数据更新**
```
把用户 123 的 email 改成 newemail@example.com
```

Claude 会：
- 执行 UPDATE 语句
- 确认更改成功

### 5.3 从 Claude Code 直接调用

如果你在 Claude Code 中开发 Python 应用，可以直接使用 Supabase 客户端：

```python
# 在 Claude Code 中
from supabase import create_client

supabase = create_client(
    url=os.getenv("SUPABASE_URL"),
    key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
)

# 查询
users = supabase.table("users").select("*").execute().data

# 更新
supabase.table("users").update({"last_seen": "now()"}).eq("id", user_id).execute()
```

---

## 第六部分：从自托管 Postgres 迁移到 Supabase

### 6.1 迁移步骤

**前置条件**：你已有 Postgres 数据库（DigitalOcean 或自托管）。

**步骤**：

1. **导出现有数据库 schema**：
```bash
pg_dump --schema-only -h old-host -U postgres -d postgres > schema.sql
```

2. **在 Supabase 中应用 schema**：
```bash
psql -h new-supabase-host -U postgres -d postgres < schema.sql
```

3. **导出数据**：
```bash
pg_dump -a -h old-host -U postgres -d postgres > data.sql
```

4. **导入数据到 Supabase**：
```bash
psql -h new-supabase-host -U postgres -d postgres < data.sql
```

5. **验证数据完整性**：
```sql
-- 比较旧库和新库的行数
SELECT COUNT(*) FROM users;  -- 两边都查一次
```

6. **更新应用连接字符串**，指向 Supabase

7. **运行测试确保应用正常**

### 6.2 迁移中的常见问题

**问题 1：序列值不对齐**

旧库中的 `id` 序列可能不是连续的。Supabase 继承后 ID 从某个数字开始。

**解决**：
```sql
-- 重置序列
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users) + 1);
```

**问题 2：外键约束冲突**

如果表有循环引用，迁移顺序很重要。

**解决**：
```sql
-- 暂时禁用外键检查
ALTER TABLE table_name DISABLE TRIGGER ALL;
-- 导入数据
-- 重新启用
ALTER TABLE table_name ENABLE TRIGGER ALL;
```

**问题 3：性能下降**

Supabase 默认开启 RLS，可能导致查询变慢。

**优化**：
- 确保索引已创建
- 检查 RLS 策略是否过复杂
- 使用 `EXPLAIN` 分析慢查询

---

## 第七部分：最佳实践

### 7.1 数据库设计

**原则**：
- **归一化**：避免数据冗余（Boyce-Codd 范式）
- **索引策略**：在常用的 WHERE、JOIN、ORDER BY 字段上创建索引
- **备用键（Surrogate Key）**：使用 BIGSERIAL，而不是业务键作为主键
- **时间戳标准化**：统一使用 `TIMESTAMP WITH TIME ZONE`

**反面示例（不要这样做）**：
```sql
-- 坏：冗余存储用户名和邮箱
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    user_name VARCHAR(100),  -- 冗余！应该 JOIN users 表获取
    user_email VARCHAR(255),  -- 冗余！
    ...
);
```

**好的示例**：
```sql
-- 好：只存储外键，需要用户信息时 JOIN
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    title VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
);

-- 查询时 JOIN
SELECT p.id, p.title, u.name, u.email
FROM posts p
JOIN users u ON p.user_id = u.id;
```

### 7.2 安全性

**RLS 策略**：
- 始终为敏感表启用 RLS
- 为每个表定义清晰的访问策略
- 定期审计 RLS 策略

**API Key 管理**：
- `anon` key：暴露给前端，权限受 RLS 限制
- `service_role` key：服务端使用，权限无限制，保护好！
- 使用环境变量，不要硬编码

**备份**：
- Supabase 自动备份（付费计划）
- 定期导出重要数据作为本地备份

```bash
# 导出所有数据（定期执行）
pg_dump -h your-host -U postgres -d postgres | gzip > backup-$(date +%Y%m%d).sql.gz
```

### 7.3 性能优化

**查询优化**：
```python
# 不好：SELECT *，然后在应用中处理
response = supabase.table("posts").select("*").execute()
posts = [p for p in response.data if p["published"] == True]

# 好：在数据库层面过滤
response = supabase.table("posts") \
    .select("*") \
    .eq("published", True) \
    .execute()
```

**索引使用**：
```sql
-- 查询前分析执行计划
EXPLAIN ANALYZE SELECT * FROM posts WHERE user_id = 1 AND published = True;

-- 如果 Seq Scan，说明需要索引
CREATE INDEX idx_posts_user_published ON posts(user_id, published);
```

**连接池**：
```python
# 使用连接池复用连接，而不是为每个请求创建新连接
# Supabase Python 客户端内部已处理
# 但直接使用 psycopg2 时需要手动配置
```

### 7.4 监控和告警

**Supabase 内置监控**：
- Dashboard → Database 查看连接数、查询速率、存储使用
- 如果接近限额，及时升级计划

**应用层监控**：
- 使用 Sentry 追踪数据库错误
- 记录慢查询日志
- 监控连接池健康状况

---

## 第八部分：案例分析

### 案例：博客平台完整流程

**需求**：构建一个允许用户发布文章、评论的博客平台。

**数据库设计**：
```sql
-- 用户表
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);
CREATE INDEX idx_users_email ON users(email);

-- 文章表
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_published_at ON posts(published_at DESC);

-- 评论表
CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- RLS 策略
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts visible to all" ON posts
FOR SELECT USING (published = true OR user_id = auth.uid());

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments visible to all" ON comments
FOR SELECT USING (true);
```

**Python 后端实现**：
```python
from fastapi import FastAPI, Depends, HTTPException
from supabase import create_client
import os

app = FastAPI()
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
)

# 发布文章
@app.post("/posts")
async def create_post(user_id: int, title: str, content: str):
    response = supabase.table("posts").insert({
        "user_id": user_id,
        "title": title,
        "content": content,
        "published": False,
    }).execute()
    return response.data[0]

# 发布文章（更新为已发布）
@app.put("/posts/{post_id}/publish")
async def publish_post(post_id: int, user_id: int):
    response = supabase.table("posts") \
        .update({
            "published": True,
            "published_at": "now()",
        }) \
        .eq("id", post_id) \
        .eq("user_id", user_id) \
        .execute()
    if not response.data:
        raise HTTPException(status_code=403, detail="Not authorized")
    return response.data[0]

# 获取已发布的文章列表
@app.get("/posts")
async def list_posts(page: int = 1, limit: int = 10):
    offset = (page - 1) * limit
    response = supabase.table("posts") \
        .select("id, title, excerpt, slug, user_id, created_at") \
        .eq("published", True) \
        .order("published_at", desc=True) \
        .range(offset, offset + limit - 1) \
        .execute()
    return response.data

# 评论文章
@app.post("/posts/{post_id}/comments")
async def comment_post(post_id: int, user_id: int, content: str):
    response = supabase.table("comments").insert({
        "post_id": post_id,
        "user_id": user_id,
        "content": content,
    }).execute()
    return response.data[0]
```

**性能优化**：
- 文章列表使用了 `published_at DESC` 索引，查询快速
- 评论表有 `post_id` 索引，加载某篇文章的评论很快
- 使用分页避免一次加载所有数据

---

## 第九部分：故障排查

### Q1：查询很慢

**检查清单**：
```sql
-- 1. 查看执行计划
EXPLAIN ANALYZE SELECT * FROM posts WHERE user_id = 1;

-- 2. 如果显示 Seq Scan，添加索引
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- 3. 分析表统计信息
ANALYZE posts;

-- 4. 检查 RLS 策略是否过复杂
-- 复杂的 RLS 策略会导致额外的 JOIN 和扫描
```

### Q2：RLS 导致的权限问题

**调试**：
```python
# 错误：用户看不到自己的数据
response = supabase.table("posts").select("*").eq("id", post_id).execute()
# 返回空列表，即使这篇文章确实属于该用户

# 原因：RLS 策略设置错误
# 检查：是否使用了 auth.uid()？auth.uid() 是否能正确识别用户？
```

**修复**：
```sql
-- 检查当前用户 ID
SELECT auth.uid();

-- 确保 RLS 策略正确参考该字段
CREATE POLICY "Users can see own posts" ON posts
FOR SELECT
USING (user_id = auth.uid());
```

### Q3：连接达到上限

**症状**：应用报错 `too many connections`

**原因**：
- 连接池配置太小
- 有长期占用的连接

**解决**：
```sql
-- 查看当前连接数
SELECT count(*) FROM pg_stat_activity;

-- 检查空闲连接
SELECT pid, usename, state, query_start FROM pg_stat_activity WHERE state = 'idle';

-- 升级 Supabase 计划（更高的连接数限制）
```

---

## 总结

**Supabase 的核心价值链**：

```
快速开发 MVP
    ↓
PostgreSQL 开箱即用（无需运维）
    ↓
RLS 提供数据隔离（安全开箱即用）
    ↓
Realtime/WebSocket 支持（实时应用简单）
    ↓
与 Claude 连接器集成（自然语言查询）
    ↓
快速迭代和部署
```

**何时选择 Supabase**：
- ✅ 快速 MVP 和 POC
- ✅ 实时协作应用
- ✅ AI 应用（向量搜索）
- ✅ 已用 Postgres，想省运维成本

**何时继续自托管 Postgres**：
- ❌ 极高可用性要求（多区域、自动故障转移）
- ❌ 完全控制基础设施
- ❌ 成本极度敏感（大规模数据）
