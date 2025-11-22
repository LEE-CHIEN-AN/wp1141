import { LineBot } from "bottender";

// 建立 Line Bot 實例（僅用於驗證簽章等用途）
// 實際的訊息發送已改用直接 LINE API
const bot = new LineBot({
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
  accessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
});

export default bot;
