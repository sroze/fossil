import Image from 'next/image'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  return (
    <main
      className={`flex min-h-screen flex-col items-center p-24 ${inter.className}`}
    >
      <div className="z-10 w-full max-w-5xl items-center justify-between text-sm lg:flex">
        <div className="fixed left-0 top-0 w-full justify-center pb-6 pt-8 lg:static lg:w-auto lg:p-4">
          <p className="text-xl">Your list of things to do.</p>
          <div className="text-sm text-gray-500">A typical demo application.</div>
        </div>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <a
            className="pointer-events-none font-mono flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
            href="#"
            target="_blank"
            rel="noopener noreferrer"
          >
            By{' '}
            <span
              className="inline-block p-2 rounded-md bg-slate-100 hover:bg-slate-200"
            >
              🪨
            </span>
          </a>
        </div>
      </div>

      <div className="">
        <input type="text" name="task" placeholder="Write your task..." />
        <button type="submit">Add</button>
      </div>
    </main>
  )
}
