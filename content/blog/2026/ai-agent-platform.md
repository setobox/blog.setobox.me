---
title: '全栈从 0~1 手写 AI Agent 平台'
description: '从运行循环、工具协议、流式接口到状态持久化和评测，拆开一个可上线的 Agent 平台。'
date: 2026-07-17
tags:
  - AI Agent
  - TypeScript
  - Fastify
  - SQLite
  - LLM
categories:
  - AI
  - 实战
draft: true
---

一个聊天框接上模型接口，只能算最小演示。真正的 Agent 平台还要回答一串更麻烦的问题：模型为什么调用这个工具、工具失败后怎么恢复、页面刷新后任务还能不能继续、危险操作由谁批准、一次回答到底花了多少钱。

最稳妥的做法不是先堆多 Agent，而是先跑通一条可以观察、可以暂停、可以重放的单 Agent 链路。

## 先划清 Agent 的边界

普通对话的主循环是“一问一答”，Agent 的主循环则是：

```text
接收目标
  → 读取上下文
  → 请求模型
  → 解析文本或工具调用
  → 执行工具并写回结果
  → 再次请求模型
  → 得到最终结果或进入等待状态
```

平台负责循环、状态、权限和故障恢复；模型只负责在当前上下文中做下一步决策。把这条边界守住，后面更换模型或工具实现时才不会推翻整个系统。

一个实用的运行状态可以收敛成有限几种：

```ts
type RunStatus
  = | 'queued'
    | 'running'
    | 'waiting_approval'
    | 'succeeded'
    | 'failed'
    | 'cancelled'
```

不要只保存最终回复。模型请求、工具参数、工具结果、人工审批和错误都应该成为独立的 step。线上问题通常发生在中间步骤，而不是最后一句话。

## 一套够用的全栈结构

第一版可以使用 Vue/Nuxt 做界面、Fastify 提供接口、SQLite 保存运行状态，再把模型厂商封装在适配层后面：

```text
Web UI
├─ 会话列表
├─ 流式消息
├─ 工具执行卡片
└─ 审批与取消

Fastify API
├─ Conversation Service
├─ Agent Runtime
├─ Model Adapter
├─ Tool Registry
├─ Approval Service
└─ Event Stream (SSE)

SQLite
├─ conversations / messages
├─ runs / run_steps
├─ tool_calls / approvals
└─ usage_records
```

模型 SDK 不应该直接散落在路由里。应用层只依赖一个小接口：

```ts
interface ModelTurn {
  text?: string
  toolCalls: Array<{
    id: string
    name: string
    arguments: unknown
  }>
  usage: {
    inputTokens: number
    outputTokens: number
  }
}

interface ModelAdapter {
  generate(input: {
    instructions: string
    messages: readonly AgentMessage[]
    tools: readonly ToolDefinition[]
    signal: AbortSignal
  }): Promise<ModelTurn>
}
```

这样做的价值不只是“方便换模型”。测试 Agent Runtime 时，可以用固定响应的假适配器稳定复现工具调用、超时和重试，不必每次真的请求模型。

## 数据库先记录事实，再计算展示状态

建议至少保留这些表：

| 表              | 保存什么                         |
| --------------- | -------------------------------- |
| `conversations` | 会话标题、所有者、创建时间       |
| `messages`      | 用户与 Agent 的可见消息          |
| `runs`          | 一次任务的目标、状态、模型和错误 |
| `run_steps`     | 模型调用、工具调用、审批等事件   |
| `tool_calls`    | 工具名、参数、结果、耗时与幂等键 |
| `approvals`     | 审批范围、决定与操作者           |
| `usage_records` | token、缓存命中、费用和延迟      |

状态变化最好在事务中完成。例如工具执行成功时，同时写入工具结果并推进 run；不要先更新状态再慢慢补日志，否则进程中断后会留下“显示成功但没有结果”的半成品。

长任务还需要租约或乐观锁，防止两个 worker 同时领取同一个 run。SQLite 足够支撑个人项目和中小规模部署，写入压力上来后再迁移队列与数据库，比第一天就引入一整套分布式组件更省事。

## 工具系统决定了平台上限

工具不是随手写的函数集合，而是一组受约束的外部能力。每个工具至少要声明：

- 稳定且明确的名称；
- 可校验的输入 schema；
- 结构化输出；
- 超时、取消和错误语义；
- 是否只读、是否需要审批；
- 重试是否安全。

```ts
interface ToolContext {
  runId: string
  userId: string
  signal: AbortSignal
}

interface Tool<Input, Output> {
  name: string
  description: string
  risk: 'read' | 'write' | 'destructive'
  parse(input: unknown): Input
  execute(input: Input, context: ToolContext): Promise<Output>
}
```

是否自动执行不能只看工具名称。经过授权、范围明确的只读搜索通常可以自动执行；读取敏感库表、发送邮件、付款或删文件，则应按数据敏感度和副作用暂停 run，生成一条审批记录，等用户确认后从原 step 继续。审批的是具体动作和具体参数，不是一句模糊的“允许 Agent 使用工具”。

重试也不能一刀切。只读查询一般可以指数退避重试；创建订单这类写操作必须带幂等键；删除操作若无法证明幂等，宁可交给人工处理。

## 流式输出不是把字符串一段段吐出来

SSE 很适合浏览器中的单向事件流，但事件应有类型，而不只是 `data: hello`：

```ts
type RunEvent
  = { type: 'text.delta'; delta: string }
    | { type: 'tool.started'; stepId: string; name: string }
    | { type: 'tool.completed'; stepId: string; output: unknown }
    | { type: 'approval.required'; approvalId: string }
    | { type: 'run.completed'; runId: string }
    | { type: 'run.failed'; runId: string; message: string }
```

每条事件带单调递增的序号。客户端断线重连时提交最后收到的序号，服务端从事件表补发缺口。这样刷新页面不会丢掉半截工具状态，也不需要把运行中的内存对象当成唯一事实来源。

## 上下文、记忆和知识库不是一回事

可以把传给模型的信息分成四层：

1. 固定指令：角色、规则、输出约束；
2. 当前任务：本轮目标和最近几条消息；
3. 运行记忆：前面步骤的摘要、工具结果；
4. 外部知识：按当前问题检索出来的片段。

历史消息越来越长时，不应无条件全部回放。保留最近窗口，把较早内容压成带版本的摘要；关键业务事实写入结构化字段，不能只藏在一段自然语言总结里。用户要求删除数据时，也要能沿着来源删除原文、向量索引、摘要和缓存副本。

## 安全从工具参数开始

Prompt injection 不是加一句“忽略恶意指令”就能解决。外部网页、邮件和知识库文本都应视为不可信数据，不能覆盖系统策略。真正有效的防线位于模型之外：

- 工具按用户身份做授权，不信任模型传来的 `userId`；
- 文件、租户和项目范围由服务端注入；
- 写操作使用参数白名单和额度限制；
- 秘钥只留在服务端，工具输出先去除敏感字段；
- 高风险操作强制审批，并保留完整、可追溯的审计记录；
- 为一次 run 设置最大步数、最长时间和费用上限。

模型负责提出动作，应用负责决定动作能否发生。

## 可观测性与评测要在上线前出现

每次 run 至少记录首 token 延迟、总耗时、模型耗时、各工具耗时、输入输出 token、重试次数和最终状态。再给请求、模型调用、工具调用分配同一个 trace id，瀑布图才能指出慢在哪里。

评测集可以从二三十个真实任务起步，覆盖正常路径、缺少信息、工具失败、越权请求和需要审批的情况。发布前回放这些任务，检查：

- 是否选择了正确工具；
- 参数是否完整；
- 引用是否来自检索内容；
- 失败时有没有编造结果；
- 危险动作是否停在审批前；
- 延迟和成本有没有越过预算。

没有这组基线，“优化 prompt”往往只是凭感觉改字句。

## 从 0 到 1 的开发顺序

第一阶段只做单 Agent、两个只读工具、SSE 和完整 step 日志；第二阶段补持久化恢复、取消、超时和审批；第三阶段接知识库、评测和观测；最后才考虑模型路由、多 Agent 与分布式 worker。

多 Agent 适合职责确实不同、上下文可以隔离的任务。若只是把一个顺序流程拆成“规划员、搜索员、写作员”三个名字，通常只会增加请求次数、状态同步和排错成本。

## 参考资料

- [OpenAI Agents SDK](https://developers.openai.com/api/docs/guides/agents)
- [OpenAI：Guardrails 与人工审批](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)
- [OpenAI：Agent 工作流评测](https://developers.openai.com/api/docs/guides/agent-evals)
