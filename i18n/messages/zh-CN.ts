/**
 * 中文消息字典(MVP 占位)。
 *
 * 当前实现说明:本仓库所有 UI 文案均直接写在组件中(中文硬编码)。
 * 真正接入 next-intl 或 react-intl 时,把组件里的字符串迁到这里,
 * 通过 t("home.title") 调用。
 *
 * 维护原则:
 *  - 用点号分层,例 "order.status.pending"
 *  - 同一字符串在多处使用 → 必须先入字典
 *  - 仅一处使用 → MVP 阶段允许就地写中文
 */
export const messages = {
  common: {
    appName: "电工服务撮合平台",
    loading: "加载中...",
    save: "保存",
    cancel: "取消",
    confirm: "确认",
    submit: "提交",
    delete: "删除",
    edit: "编辑",
    back: "返回",
  },
  auth: {
    login: "登录",
    register: "注册",
    logout: "退出登录",
    email: "邮箱",
    password: "密码",
    name: "姓名",
  },
  order: {
    status: {
      DRAFT: "草稿",
      PENDING: "待接单",
      ACCEPTED: "已接单",
      IN_PROGRESS: "进行中",
      AWAITING_CONFIRMATION: "待确认完工",
      COMPLETED: "已完成",
      CANCELLED: "已取消",
      DISPUTED: "申诉中",
    },
    payment: {
      UNPAID: "未支付",
      HELD: "已托管",
      RELEASED: "已结算",
      REFUNDED: "已退款",
    },
  },
} as const

export type Messages = typeof messages
