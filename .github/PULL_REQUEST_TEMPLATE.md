name: 📖 Pull Request

description: 提交代码变更 / Submit your change

body:
  - type: textarea
    id: summary
    attributes:
      label: 变更摘要 / Summary
      description: 本次 PR 做了什么 / What does this PR do?
    validations:
      required: true

  - type: textarea
    id: checklist
    attributes:
      label: 自查清单 / Checklist
      description: 请确认以下各项 / Please confirm all items
      value: |
        - [ ] 代码通过 `npm run lint` 与 `npx tsc --noEmit`
        - [ ] 单元测试通过（`npm test`），新增功能附带测试
        - [ ] 不包含任何 API Key、密码或个人敏感信息
        - [ ] 已更新相关文档（README / API.md）
        - [ ] 遵循 [行为准则](../blob/main/CODE_OF_CONDUCT.md)
    validations:
      required: true
