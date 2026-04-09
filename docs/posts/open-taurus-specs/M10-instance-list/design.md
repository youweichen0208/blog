# M10: hwrds instance list — 怎么做

## 涉及文件
```
cmd/instance_list.go    — Cobra 命令
service/instance.go     — InstanceService.List()
```

## 分页处理
```
offset = 0, limit = 100
loop:
  resp = GET /v3/{project}/instances?offset={offset}&limit=100
  results += resp.instances
  if len(resp.instances) < 100 → break
  offset += 100
```

## 依赖关系
- 依赖 M03（SDK）、M06（格式化）、M07（彩色）
