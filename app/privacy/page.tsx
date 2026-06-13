// app/privacy/page.tsx
import { Mail, Send } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Політика конфіденційності | ZapysUA',
  description: 'Як ми збираємо, використовуємо та захищаємо ваші дані',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black py-12 px-4">
      <div className="max-w-3xl mx-auto prose prose-zinc dark:prose-invert">
        <h1 className="text-3xl font-bold mb-6">Політика конфіденційності ZapysUA</h1>
        <p className="text-sm text-zinc-500 mb-8">Останнє оновлення: {new Date().toLocaleDateString('uk-UA')}</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. Загальні положення</h2>
          <p>ZapysUA (далі — «Платформа», «ми», «наш») — це український AI-адміністратор для запису клієнтів у Telegram. Ця Політика конфіденційності пояснює, які дані ми збираємо, як їх використовуємо та захищаємо.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. Які дані ми збираємо</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Від майстрів (провайдерів послуг):</strong> Telegram ID, ім&apos;я користувача, назва бізнесу, категорія, адреса, логотип, робочі години, опис послуг, ціни, контактний телефон (якщо надано).</li>
            <li><strong>Від клієнтів:</strong> Telegram ID (якщо клієнт взаємодіє через бота), ім&apos;я, номер телефону, записи на послуги, історія візитів.</li>
            <li><strong>Технічні дані:</strong> IP-адреса, тип пристрою, дані про використання (через Vercel та Supabase).</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. Як ми використовуємо ваші дані</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Надання сервісу: запис клієнтів, нагадування, комунікація через бота.</li>
            <li>Покращення роботи платформи та аналітика.</li>
            <li>Захист від шахрайства та зловживань.</li>
            <li>Відправка важливих повідомлень (оновлення, оплата).</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. Передача даних третім особам</h2>
          <p>Ми не продаємо і не передаємо ваші персональні дані третім особам, за винятком:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Постачальники послуг:</strong> Supabase (хостинг бази даних), Vercel (хостинг застосунку), Telegram (месенджер). Всі вони відповідають стандартам GDPR та законодавству України.</li>
            <li><strong>Законні вимоги:</strong> Якщо це передбачено законодавством України або рішенням суду.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. Зберігання та захист даних</h2>
          <p>Дані зберігаються на серверах Supabase (ЄС). Ми вживаємо технічних та організаційних заходів для захисту від несанкціонованого доступу, втрати або розголошення. Всі з&apos;єднання захищені HTTPS та RLS-політиками.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. Ваші права</h2>
          <p>Ви маєте право:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Отримати копію ваших даних.</li>
            <li>Виправити неточні дані.</li>
            <li>Видалити ваш акаунт та всі пов&apos;язані дані.</li>
            <li>Відкликати згоду на обробку (надіславши запит на контактну адресу).</li>
          </ul>
          <p className="mt-2">Для цього зверніться до нас: <strong>uazapys@gmail.com</strong> (або вкажіть ваш Telegram @ZapysUASupport).</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">7. Файли cookie та аналітика</h2>
          <p>Ми не використовуємо сторонні файли cookie. Наш хостинг (Vercel) може збирати анонімні дані про продуктивність (без прив&apos;язки до особи).</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">8. Зміни в політиці</h2>
          <p>Ми можемо оновлювати цю Політику. Про значні зміни повідомимо через бота або електронною поштою. Продовження використання сервісу після публікації змін означає вашу згоду.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">9. Контакти</h2>
          <p>Якщо у вас виникли питання щодо цієї Політики або ви хочете видалити свої дані, зв&apos;яжіться з нами:</p>
          <ul className="list-none pl-0 space-y-1">
            <li className='flex items-center gap-2'> <Mail className='size-4' strokeWidth={0.75}/> Email: <a href="mailto:uazapys@gmail.com" className="text-sky-500 dark:text-sky-500">uazapys@gmail.com</a></li>
            <li className='flex items-center gap-2'> <Send className='size-4' strokeWidth={0.75} />Telegram: <a href="https://t.me/ZapysUaBot" className="text-sky-500 dark:text-sky-500">@ZapysUASupport</a></li>
          </ul>
        </section>

        <div className="mt-12 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
          © 2026 ZapysUA. Українська платформа запису клієнтів.
        </div>
      </div>
    </div>
  );
}