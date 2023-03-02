import { PrismaClient } from "@prisma/client";
// @ts-ignore
import { SendMessageOptions, ChatGPTAPI } from "chatgpt";
import { loadConfig, sendText } from "./lib";
import express from "express";
import { Queue } from "async-await-queue";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();
let systemMessages: any = {}
// ChatGPT (not plus) is limited to 1 request one time.
const mesasgeQueue = new Queue(1, 100);
const config = loadConfig();
const app = express();
let chatGPTAPI: ChatGPTAPI;
app.use(express.json());
app.get(`/`, async (req, res) => {
  return res.json({
    message: "Hello/👋",
    name: "ChatGPT",
  });
});

app.post(`/api/message`, async (req, res) => {
  try {
    const { message, prompt } = req.body;
    console.log(`Received message: ${message}`);
    const reply = await sendMesasge(message, undefined, prompt);
    return res.json({
      response: reply.text,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: "Something went wrong",
      error: `${e}`,
    });
  }
});

app.post(`/message`, async (req, res) => {
  try {
    const message = req.body.data;
    if (!message.payload?.text) return
    console.log(`Received message: ${message.payload.text}`);

    if (message.payload.text.startsWith('提示@')) {
      const systemMessage: string = message.payload.text.split('@')[1]
      systemMessages[message.chatId] ? systemMessages[message.chatId].push(systemMessage) : systemMessages = {...systemMessages, [message.chatId]: [systemMessage]}
      await sendText(message.chatId, '提示已设置，后续对话将以此提示为背景【本条消息由系统发送】')
      return
    }

    let prompt
    if (systemMessages[message.chatId]) {
      prompt = systemMessages[message.chatId].join(`\n`)
    }
    const reply = await sendMesasge(message.payload.text, message.chatId, prompt);
    await sendText(message.chatId, reply.text)
    return res.json({
      response: reply.text,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: "Something went wrong",
      error: `${e}`,
    });
  }
});

const getOrCreateConversationInfo = async (
  sessionId: string
): Promise<SendMessageOptions> => {
  const [conversationInfo] = await prisma.conversations.findMany({
    where: {
      sessionId,
    },
    orderBy: {
      id: 'desc'
    },
    take: 1
  });
  if (conversationInfo) {
    console.log(`parentMessageId: ${conversationInfo.messageId}`)
    return {
      parentMessageId: conversationInfo.messageId,
    };
  } else {
    return {};
  }
};
const sendMesasge = async (message: string, sessionId?: string, prompt?: string) => {
  let conversationInfo;
  if (sessionId) {
    conversationInfo = await getOrCreateConversationInfo(sessionId);
  }
  const jobId = randomUUID();
  await mesasgeQueue.wait(jobId);
  const startTime = new Date().getTime();
  let response;
  try {
    response = await chatGPTAPI.sendMessage(message, {
      ...conversationInfo,
      systemMessage: prompt,
      timeoutMs: 5 * 60 * 1000,
      onProgress: (partialResponse) => console.log(partialResponse.text)
    });
  } catch (e) {
    console.error(e);
    throw e;
  } finally {
    mesasgeQueue.end(jobId);
  }
  const endTime = new Date().getTime();
  if (sessionId) {
    await prisma.conversations.upsert({
      where: {
        sessionId_messageId: {
          sessionId,
          messageId: response.id as string,
        },
      },
      create: {
        sessionId,
        messageId: response.id,
      },
      update: {},
    });
  }
  await prisma.result.create({
    data: {
      request: message,
      response: response.text,
      messageId: response.id,
      responseTime: endTime - startTime,
    },
  });
  return response;
};
app.post(`/message/:sessionId`, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    console.log(`Received message: ${message} for session: ${sessionId}`);
    const response = await sendMesasge(message, sessionId);
    return res.json({
      response: response.text,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: "Something went wrong",
      error: `${e}`,
    });
  }
});
app.delete(`/message/:sessionId`, async (req, res) => {
  try {
    const { sessionId } = req.params;
    await prisma.conversations.deleteMany({
      where: {
        sessionId,
      },
    });
    return res.json({
      message: "Deleted",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: "Something went wrong",
      error: `${e}`,
    });
  }
});
async function main() {
  // @ts-ignore
  const { ChatGPTAPI } = await import("chatgpt");
  console.log(
    `Starting chatgpt with config: ${JSON.stringify(config, null, 2)}`
  );
  const PORT = process.env.PORT || 4000;
  chatGPTAPI = new ChatGPTAPI(config);
  console.log(`🎉 Started chatgpt success!`);

  app.listen(PORT, () => {
    console.log(`🚀 Server ready at: http://localhost:${PORT}`);
  });
}
main();
