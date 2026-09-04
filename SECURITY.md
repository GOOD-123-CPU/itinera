# Security Policy / 安全策略

## Supported Versions / 支持的版本

| Version | Supported |
| ------- | --------- |
| latest on `main` | ✅ |

## Reporting a Vulnerability / 报告漏洞

**请勿通过公开 Issue 报告安全漏洞。**

如发现安全漏洞，请使用 GitHub 的 "Report a vulnerability"（私有安全公告）功能私下报告：

1. 前往仓库的 **Security** 标签页
2. 点击 **Report a vulnerability**
3. 尽可能详细描述漏洞及复现步骤

我们会在收到报告后尽快响应，并在修复发布前不公开披露细节。

## Security Notes / 安全说明

- 本项目为学习演示用途。生产部署请务必：
  - 更换默认演示账号，接入正式认证方案（OAuth / 邮箱验证 / 多因素）
  - 配置 HTTPS 与安全响应头
  - 将 LLM API Key 等敏感信息保存在环境变量中，切勿提交到仓库
