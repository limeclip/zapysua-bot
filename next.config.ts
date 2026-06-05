import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "cc8a-176-126-148-4.ngrok-free.app", // ⚠️ ЗАМІНІТЬ НА ВАШ АДРЕС ІЗ ТЕРМІНАЛА
    "zapysua-bot.vercel.app",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;