---
lang: zh-CN
title: Prometheus + Grafana 监控系统搭建指南
description: 从零开始搭建专业的运维监控系统
date: 2026-01-25
---

# Prometheus + Grafana 监控系统搭建指南

## 1. 监控系统概述

### 1.1 什么是 Prometheus？

**Prometheus** 是一个开源的系统监控和告警工具，由 SoundCloud 开发，现已成为 CNCF（云原生计算基金会）的毕业项目。

**核心特点**：

- **多维数据模型**：使用时间序列数据，通过指标名称和键值对标识
- **灵活的查询语言**：PromQL 可以实现复杂的数据查询和聚合
- **不依赖分布式存储**：单节点即可工作，简化部署
- **拉取模式**：主动从目标拉取数据，而非被动接收
- **服务发现**：支持静态配置和动态服务发现

### 1.2 什么是 Grafana？

**Grafana** 是一个开源的数据可视化和监控平台，可以将 Prometheus 采集的数据以图表形式展示。

**核心特点**：

- **丰富的可视化**：支持多种图表类型（折线图、柱状图、热力图等）
- **多数据源支持**：不仅支持 Prometheus，还支持 MySQL、InfluxDB 等
- **仪表板模板**：社区提供大量现成的仪表板模板
- **告警功能**：可以基于查询结果设置告警规则
- **用户权限管理**：支持多用户和团队管理

### 1.3 为什么选择这个组合？

| 特性 | Prometheus | Grafana |
|------|-----------|---------|
| **数据采集** | 强大 | 不支持 |
| **数据存储** | 时序数据库 | 不存储 |
| **数据可视化** | 简单 | 专业 |
| **告警功能** | 支持 | 支持 |
| **易用性** | 需要学习 PromQL | 界面友好 |

**组合优势**：Prometheus 负责数据采集和存储，Grafana 负责数据展示，各司其职，完美配合。

### 1.4 架构图解

```
┌─────────────────────────────────────────────────────────┐
│                     监控架构                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐     │
│  │  服务器   │      │  MySQL   │      │  Redis   │     │
│  │  (Node)  │      │          │      │          │     │
│  └────┬─────┘      └────┬─────┘      └────┬─────┘     │
│       │                 │                  │            │
│       │ metrics         │ metrics          │ metrics    │
│       ↓                 ↓                  ↓            │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐     │
│  │  Node    │      │  MySQL   │      │  Redis   │     │
│  │ Exporter │      │ Exporter │      │ Exporter │     │
│  └────┬─────┘      └────┬─────┘      └────┬─────┘     │
│       │                 │                  │            │
│       └─────────────────┼──────────────────┘            │
│                         │ pull (HTTP)                   │
│                         ↓                               │
│                  ┌─────────────┐                        │
│                  │ Prometheus  │                        │
│                  │  (存储+查询) │                        │
│                  └──────┬──────┘                        │
│                         │                               │
│                         │ PromQL 查询                   │
│                         ↓                               │
│                  ┌─────────────┐                        │
│                  │   Grafana   │                        │
│                  │  (可视化)    │                        │
│                  └─────────────┘                        │
│                         │                               │
│                         ↓                               │
│                  ┌─────────────┐                        │
│                  │ Alertmanager│                        │
│                  │   (告警)     │                        │
│                  └─────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

## 2. 环境准备

### 2.1 服务器配置要求

**最低配置**：

- CPU：2 核
- 内存：4GB
- 磁盘：20GB
- 操作系统：Ubuntu 20.04+ / Debian 11+ / CentOS 7+

**推荐配置**（生产环境）：

- CPU：4 核
- 内存：8GB
- 磁盘：50GB SSD
- 操作系统：Ubuntu 22.04 LTS

### 2.2 Docker 环境安装

如果已经安装 Docker，可以跳过此步骤。

```bash
# 更新软件包
apt update

# 安装 Docker
apt install -y docker.io docker-compose

# 启动 Docker 服务
systemctl start docker
systemctl enable docker

# 验证安装
docker --version
docker-compose --version
```

### 2.3 端口规划

| 服务 | 端口 | 说明 |
|------|------|------|
| Prometheus | 9090 | Web UI 和 API |
| Grafana | 3000 | Web UI |
| Alertmanager | 9093 | 告警管理 |
| Node Exporter | 9100 | 服务器指标 |
| MySQL Exporter | 9104 | MySQL 指标 |
| Redis Exporter | 9121 | Redis 指标 |

**防火墙配置**：

```bash
# 开放必要端口
ufw allow 9090/tcp  # Prometheus
ufw allow 3000/tcp  # Grafana
ufw allow 9100/tcp  # Node Exporter
```

## 3. Prometheus 部署

### 3.1 创建工作目录

```bash
mkdir -p /opt/monitoring/{prometheus,grafana,alertmanager}
cd /opt/monitoring
```

### 3.2 创建 Prometheus 配置文件

**Step 1**：创建 `prometheus.yml`

```bash
cat > /opt/monitoring/prometheus/prometheus.yml <<'EOF'
# Prometheus 全局配置
global:
  scrape_interval: 15s       # 抓取间隔，默认 15 秒
  evaluation_interval: 15s   # 规则评估间隔
  scrape_timeout: 10s        # 抓取超时时间

  # 外部标签，用于联邦集群或远程存储
  external_labels:
    cluster: 'production'
    region: 'cn-east'

# 告警管理器配置
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

# 告警规则文件
rule_files:
  - '/etc/prometheus/rules/*.yml'

# 抓取配置
scrape_configs:
  # Prometheus 自身监控
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
        labels:
          instance: 'prometheus-server'

  # Node Exporter（服务器监控）
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
        labels:
          instance: 'server-01'
          env: 'production'

  # MySQL 监控（可选）
  - job_name: 'mysql'
    static_configs:
      - targets: ['mysql-exporter:9104']
        labels:
          instance: 'mysql-master'

  # Redis 监控（可选）
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
        labels:
          instance: 'redis-cache'
EOF
```

**配置说明**：

1. **global**：全局配置
   - `scrape_interval`：多久抓取一次数据
   - `evaluation_interval`：多久评估一次告警规则

2. **scrape_configs**：抓取目标配置
   - `job_name`：任务名称
   - `static_configs`：静态配置的目标
   - `targets`：目标地址列表

### 3.3 创建告警规则

**Step 2**：创建告警规则文件

```bash
mkdir -p /opt/monitoring/prometheus/rules

cat > /opt/monitoring/prometheus/rules/node_alerts.yml <<'EOF'
groups:
  - name: node_alerts
    interval: 30s
    rules:
      # CPU 使用率告警
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CPU 使用率过高 (instance {{ $labels.instance }})"
          description: "CPU 使用率超过 80%，当前值: {{ $value }}%"

      # 内存使用率告警
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "内存使用率过高 (instance {{ $labels.instance }})"
          description: "内存使用率超过 85%，当前值: {{ $value }}%"

      # 磁盘使用率告警
      - alert: HighDiskUsage
        expr: (1 - (node_filesystem_avail_bytes{fstype!~"tmpfs|fuse.lxcfs"} / node_filesystem_size_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "磁盘使用率过高 (instance {{ $labels.instance }})"
          description: "磁盘 {{ $labels.mountpoint }} 使用率超过 85%，当前值: {{ $value }}%"

      # 服务宕机告警
      - alert: InstanceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "实例宕机 (instance {{ $labels.instance }})"
          description: "{{ $labels.job }} 实例 {{ $labels.instance }} 已宕机超过 1 分钟"
EOF
```

### 3.4 使用 Docker Compose 部署

**Step 3**：创建 `docker-compose.yml`

```bash
cat > /opt/monitoring/docker-compose.yml <<'EOF'
version: '3.8'

services:
  # Prometheus 服务
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/rules:/etc/prometheus/rules
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'  # 数据保留 30 天
      - '--web.enable-lifecycle'             # 启用热重载
    networks:
      - monitoring

  # Node Exporter（服务器监控）
  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring

  # Grafana 服务
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_INSTALL_PLUGINS=grafana-clock-panel,grafana-simple-json-datasource
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - monitoring

  # Alertmanager（告警管理）
  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager-data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    networks:
      - monitoring

volumes:
  prometheus-data:
  grafana-data:
  alertmanager-data:

networks:
  monitoring:
    driver: bridge
EOF
```

### 3.5 下载 Docker 镜像（可选）

在启动服务前，可以先手动下载镜像，避免首次启动时等待时间过长。

```bash
# 下载 Prometheus 镜像
docker pull prom/prometheus:latest

# 下载 Grafana 镜像
docker pull grafana/grafana:latest

# 下载 Node Exporter 镜像
docker pull prom/node-exporter:latest

# 下载 Alertmanager 镜像
docker pull prom/alertmanager:latest

# 查看已下载的镜像
docker images | grep -E "prometheus|grafana|alertmanager|node-exporter"
```

**说明**：

- 如果不手动下载，`docker-compose up -d` 会自动拉取所需镜像
- 手动下载的好处是可以看到下载进度，避免首次启动时长时间等待
- 镜像大小：
  - Prometheus: ~200MB
  - Grafana: ~300MB
  - Node Exporter: ~20MB
  - Alertmanager: ~60MB

### 3.6 启动服务

```bash
cd /opt/monitoring
docker-compose up -d
```

**首次启动说明**：

如果之前没有手动下载镜像，Docker Compose 会自动执行以下操作：

1. 拉取所需的 Docker 镜像
2. 创建 Docker 网络（monitoring）
3. 创建 Docker 卷（prometheus-data、grafana-data、alertmanager-data）
4. 启动所有容器

启动过程可能需要 1-3 分钟，取决于网络速度。

### 3.7 验证部署

**Step 4**：检查服务状态

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f prometheus
```

**Step 5**：访问 Prometheus Web UI

打开浏览器访问：`http://your-server-ip:9090`

验证步骤：
1. 点击 **Status** → **Targets**
2. 检查所有目标是否为 **UP** 状态

## 4. Grafana 配置

### 4.1 登录 Grafana

**Step 1**：访问 Grafana

打开浏览器访问：`http://your-server-ip:3000`

**默认账号**：
- 用户名：`admin`
- 密码：`admin123`

首次登录会提示修改密码。

### 4.2 添加 Prometheus 数据源

**Step 2**：配置数据源

1. 点击左侧菜单 **Configuration** → **Data Sources**
2. 点击 **Add data source**
3. 选择 **Prometheus**
4. 配置参数：
   - **Name**: `Prometheus`
   - **URL**: `http://prometheus:9090`
   - **Access**: `Server (default)`
5. 点击 **Save & Test**

如果显示 **Data source is working**，说明连接成功。

### 4.3 导入预制仪表板

**Step 3**：导入 Node Exporter 仪表板

1. 点击左侧菜单 **+** → **Import**
2. 输入仪表板 ID：`1860`（Node Exporter Full）
3. 点击 **Load**
4. 选择数据源：`Prometheus`
5. 点击 **Import**

**推荐仪表板 ID**：

| 仪表板 | ID | 说明 |
|--------|-----|------|
| Node Exporter Full | 1860 | 服务器完整监控 |
| Node Exporter for Prometheus | 11074 | 简化版服务器监控 |
| MySQL Overview | 7362 | MySQL 监控 |
| Redis Dashboard | 11835 | Redis 监控 |
| Docker Container & Host Metrics | 10619 | Docker 监控 |

## 5. 监控目标配置

### 5.1 MySQL 监控（可选）

**Step 1**：部署 MySQL Exporter

在 `docker-compose.yml` 中添加：

```yaml
  mysql-exporter:
    image: prom/mysqld-exporter:latest
    container_name: mysql-exporter
    restart: unless-stopped
    ports:
      - "9104:9104"
    environment:
      - DATA_SOURCE_NAME=exporter:password@(mysql-host:3306)/
    networks:
      - monitoring
```

**Step 2**：在 MySQL 中创建监控用户

```sql
CREATE USER 'exporter'@'%' IDENTIFIED BY 'password';
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'%';
FLUSH PRIVILEGES;
```

### 5.2 Redis 监控（可选）

在 `docker-compose.yml` 中添加：

```yaml
  redis-exporter:
    image: oliver006/redis_exporter:latest
    container_name: redis-exporter
    restart: unless-stopped
    ports:
      - "9121:9121"
    environment:
      - REDIS_ADDR=redis-host:6379
      - REDIS_PASSWORD=your-redis-password
    networks:
      - monitoring
```

## 6. Alertmanager 告警配置

### 6.1 创建 Alertmanager 配置

```bash
cat > /opt/monitoring/alertmanager/alertmanager.yml <<'EOF'
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alertmanager@example.com'
  smtp_auth_username: 'alertmanager@example.com'
  smtp_auth_password: 'your-password'

# 告警路由
route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'email'

  # 子路由
  routes:
    - match:
        severity: critical
      receiver: 'email-critical'
      continue: true

# 接收器配置
receivers:
  - name: 'email'
    email_configs:
      - to: 'team@example.com'
        headers:
          Subject: '[Prometheus] {{ .GroupLabels.alertname }}'

  - name: 'email-critical'
    email_configs:
      - to: 'oncall@example.com'
        headers:
          Subject: '[CRITICAL] {{ .GroupLabels.alertname }}'

# 抑制规则
inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
EOF
```

### 6.2 重启 Alertmanager

```bash
docker-compose restart alertmanager
```

### 6.3 验证告警

访问：`http://your-server-ip:9093`

## 7. PromQL 常用查询

### 7.1 系统指标

```promql
# CPU 使用率
100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 内存使用率
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# 磁盘使用率
(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100

# 网络流量（接收）
rate(node_network_receive_bytes_total[5m])

# 网络流量（发送）
rate(node_network_transmit_bytes_total[5m])

# 磁盘 I/O
rate(node_disk_io_time_seconds_total[5m])
```

### 7.2 应用指标

```promql
# HTTP 请求速率
rate(http_requests_total[5m])

# HTTP 请求延迟（P95）
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# 错误率
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
```

## 8. 故障排查

### 8.1 Prometheus 无法抓取数据

**问题现象**：Targets 页面显示目标为 **DOWN** 状态

**排查步骤**：

1. **检查网络连通性**

   ```bash
   # 从 Prometheus 容器内测试
   docker exec -it prometheus wget -O- http://node-exporter:9100/metrics
   ```

2. **检查防火墙**

   ```bash
   ufw status
   ufw allow 9100/tcp
   ```

3. **检查 Exporter 是否运行**

   ```bash
   docker ps | grep exporter
   curl http://localhost:9100/metrics
   ```

### 8.2 Grafana 无法连接 Prometheus

**问题现象**：数据源测试失败

**解决方案**：

1. 确保 Prometheus 和 Grafana 在同一 Docker 网络
2. 使用容器名称而非 localhost：`http://prometheus:9090`
3. 检查 Prometheus 是否正常运行：

   ```bash
   curl http://localhost:9090/-/healthy
   ```

### 8.3 告警不生效

**排查步骤**：

1. **检查告警规则语法**

   ```bash
   docker exec -it prometheus promtool check rules /etc/prometheus/rules/*.yml
   ```

2. **查看告警状态**

   访问：`http://your-server-ip:9090/alerts`

3. **检查 Alertmanager 配置**

   ```bash
   docker exec -it alertmanager amtool check-config /etc/alertmanager/alertmanager.yml
   ```

### 8.4 性能优化建议

1. **调整数据保留时间**

   ```yaml
   command:
     - '--storage.tsdb.retention.time=15d'  # 减少到 15 天
   ```

2. **增加抓取间隔**

   ```yaml
   global:
     scrape_interval: 30s  # 从 15s 增加到 30s
   ```

3. **限制内存使用**

   ```yaml
   deploy:
     resources:
       limits:
         memory: 2G
   ```

## 9. 生产环境最佳实践

### 9.1 数据持久化

确保使用 Docker volumes 持久化数据：

```yaml
volumes:
  - prometheus-data:/prometheus
  - grafana-data:/var/lib/grafana
```

### 9.2 备份策略

```bash
# 备份 Prometheus 数据
docker run --rm -v prometheus-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/prometheus-backup-$(date +%Y%m%d).tar.gz /data

# 备份 Grafana 数据
docker run --rm -v grafana-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/grafana-backup-$(date +%Y%m%d).tar.gz /data
```

### 9.3 安全加固

1. **修改默认密码**
2. **启用 HTTPS**
3. **配置防火墙规则**
4. **使用反向代理（Nginx）**

### 9.4 监控指标规划

| 层级 | 监控内容 | 工具 |
|------|---------|------|
| **基础设施** | CPU、内存、磁盘、网络 | Node Exporter |
| **中间件** | MySQL、Redis、Nginx | 各类 Exporter |
| **应用层** | 接口响应时间、错误率 | 自定义 Exporter |
| **业务层** | 订单量、用户活跃度 | 业务埋点 |

## 10. 总结

通过本教程，你已经学会了：

- Prometheus + Grafana 的架构和原理
- 使用 Docker Compose 快速部署监控系统
- 配置多种 Exporter 监控不同服务
- 创建 Grafana 仪表板可视化数据
- 配置告警规则和通知
- 使用 PromQL 查询监控数据
- 故障排查和性能优化

### 进阶学习资源

- [Prometheus 官方文档](https://prometheus.io/docs/)
- [Grafana 官方文档](https://grafana.com/docs/)
- [PromQL 查询语法](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Awesome Prometheus](https://github.com/roaldnefs/awesome-prometheus)

### 下一步

- 学习 Prometheus 联邦集群
- 探索 Thanos 长期存储方案
- 集成 Loki 日志系统
- 使用 Prometheus Operator 管理 Kubernetes 监控

---

**提示**：本教程提供的配置适用于测试和小规模生产环境。大规模生产环境需要考虑高可用、数据持久化、性能优化等更多因素。
