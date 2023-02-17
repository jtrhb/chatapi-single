import "dotenv/config";
import axios from 'axios'

const JUZI_SEND_URL: string = process.env.JUZI_SEND_URL as string
const JUZI_TOKEN: string = process.env.JUZI_TOKEN as string
export interface ChatGPTAPIBrowserConfig {
  apiKey: string;
  email?: string;
  password?: string;
  isProAccount?: boolean;
  markdown?: boolean;
  debug?: boolean;
  isGoogleLogin?: boolean;
  isMicrosoftLogin?: boolean;
  minimize?: boolean;
  captchaToken?: string;
  nopechaKey?: string;
  executablePath?: string;
  proxyServer?: string;
  userDataDir?: string;
}
export const loadConfig = (): ChatGPTAPIBrowserConfig => {
  const apiKey = process.env.APIKEY;
  if (!apiKey) {
    throw new Error(
      "Please provide email in .env file or environment variable"
    );
  }
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;
  return {
    apiKey,
    email,
    password,
    isProAccount: process.env.IS_PRO_ACCOUNT === "true",
    markdown: process.env.MARKDOWN === "true",
    debug: process.env.DEBUG === "true",
    isGoogleLogin: process.env.IS_GOOGLE_LOGIN === "true",
    isMicrosoftLogin: process.env.IS_MICROSOFT_LOGIN === "true",
    minimize: process.env.MINIMIZE === "true",
    // no "" or undefined
    captchaToken: process.env.CAPTCHA_TOKEN
      ? process.env.CAPTCHA_TOKEN
      : undefined,
    nopechaKey: process.env.NOPECHA_KEY ? process.env.NOPECHA_KEY : undefined,
    executablePath: process.env.EXECUTABLE_PATH
      ? process.env.EXECUTABLE_PATH
      : undefined,
    proxyServer: process.env.PROXY_SERVER
      ? process.env.PROXY_SERVER
      : undefined,
    userDataDir: process.env.USER_DATA_DIR
      ? process.env.USER_DATA_DIR
      : undefined,
  };
};

export async function sendText(chatId: string, text: string, mention: any[] = []) {
  await axios.post(JUZI_SEND_URL, {
    "chatId": chatId,
    "token": JUZI_TOKEN,
    "messageType": 0,
    "payload": {
      "text": text,
      "mention": mention
    }
  })
}
