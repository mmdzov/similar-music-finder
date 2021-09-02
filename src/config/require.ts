import dotenv from "dotenv";
import { Bot } from "grammy";

dotenv.config();

let bot = new Bot(process.env.TOKEN!);

export default bot;
