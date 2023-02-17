import { PrismaClient } from "@prisma/client";
// @ts-ignore
import { SendMessageOptions, ChatGPTAPI } from "chatgpt";
import { loadConfig, sendText } from "./lib";
import express from "express";
import AsyncRetry from "async-retry";
import { Queue } from "async-await-queue";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();
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

// app.post(`/message`, async (req, res) => {
//   try {
//     const { message } = req.body;
//     console.log(`Received message: ${message}`);
//     const reply = await sendMesasge(message);
//     return res.json({
//       response: reply.text,
//     });
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({
//       message: "Something went wrong",
//       error: `${e}`,
//     });
//   }
// });

app.post(`/message`, async (req, res) => {
  try {
    const message = req.body.data;
    if (!message.payload?.text) return
    console.log(`Received message: ${message.payload.text}`);
    const reply = await sendMesasge(message.payload.text, message.chatId);
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
  const conversationInfo = await prisma.conversations.findFirst({
    where: {
      sessionId,
    },
  });
  if (conversationInfo) {
    return {
      conversationId: conversationInfo.conversationId as string,
      parentMessageId: conversationInfo.messageId,
    };
  } else {
    return {};
  }
};
const sendMesasge = async (message: string, sessionId?: string) => {
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
        sessionId_conversationId: {
          sessionId,
          conversationId: response.conversationId as string,
        },
      },
      create: {
        sessionId,
        conversationId: response.conversationId,
        messageId: response.id,
      },
      update: {},
    });
  }
  await prisma.result.create({
    data: {
      request: message,
      response: response.text,
      conversationsId: response.conversationId,
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
