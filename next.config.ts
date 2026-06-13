import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "c7b7-176-126-148-39.ngrok-free.app", // ⚠️ ЗАМІНІТЬ НА ВАШ АДРЕС ІЗ ТЕРМІНАЛА
    "zapysua-bot.vercel.app",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;