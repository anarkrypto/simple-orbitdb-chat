import Head from 'next/head'
import { Inter } from '@next/font/google'
import { create } from 'ipfs-http-client'
import OrbitDB from 'orbit-db'
import React, { useEffect } from 'react'
import FeedStore from 'orbit-db-feedstore'
import Blockies from 'react-blockies'

const DB_NAME = 'hello'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  const [db, setDb] = React.useState<FeedStore<string>>()
  const [message, setMessage] = React.useState<string>('')
  const [feed, setFeed] = React.useState<LogEntry<string>[]>([])
  const [inited, setInited] = React.useState<boolean>(false)
  const [isAdding, setIsAdding] = React.useState<boolean>(false)

  const feedRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (inited) return
    ;(async function () {
      try {
        const ipfs = create({ url: process.env.NEXT_PUBLIC_IPFS_NODE })
        const orbitdb = await OrbitDB.createInstance(ipfs as any)

        // Create / Open a database
        const db: FeedStore<string> = await orbitdb.feed(DB_NAME, {
          accessController: {
            write: ['*'],
          },
        })
        await db.load()

        setDb(db)

        // Listen for updates from peers
        db.events.on('replicated', (address) => {
          setFeed(db.iterator({ limit: -1 }).collect())
        })

        db.events.on('write', (address) => {
          setFeed(db.iterator({ limit: -1 }).collect())
        })

        // Query
        const result = db.iterator({ limit: -1 }).collect()
        setFeed(result)
      } catch (err) {
        const error: any = err
        console.error(error)
        alert(
          'Failed initing orbitdb: ' +
            (typeof error === 'object' && 'message' in error)
            ? error.message
            : 'Check console',
        )
      } finally {
        setInited(true)
      }
    })()
  }, [])

  useEffect(() => {
    if (!feedRef.current) return
    feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [feed])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsAdding(true)
    e.preventDefault()
    await db?.add(message) // add entry to database
    setMessage('')
    setIsAdding(false)
  }

  return (
    <>
      <Head>
        <title>Simple OrbitDB Chat</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex flex-col space-y-4 bg-gray-100 justify-between items-center h-screen py-2 sm:p-4 md:p-6 lg:p-8">
        <div className="w-full flex justify-between px-2 items-center space-x-2 flex-wrap">
          <h1
            className={`${inter.className} text-xl font-semibold text-gray-700 sm:text-left`}
          >
            Simple OrbitDB Chat
          </h1>
          <div className="flex space-x-1 items-center border border-gray-300 p-1 bg-gray-200 rounded">
            <div
              className={`w-3 h-3 rounded-full border ${
                inited && db !== undefined
                  ? 'bg-green-400 border-green-500'
                  : !inited
                  ? 'bg-yellow-400 border-yellow-500'
                  : 'bg-red-400 border-red-500'
              }`}
            />
            <span className="text-xs font-light text-gray-700">
              {process.env.NEXT_PUBLIC_IPFS_NODE}
            </span>
          </div>
        </div>
        <div
          className="w-full flex flex-1 flex-grow border-y sm:border-x border-gray-300 bg-white rounded overflow-y-auto h-full p-2"
          ref={feedRef}
        >
          <ul className="w-full flex flex-col divide-y divide-gray-100">
            {feed.map((entry) => (
              <li key={entry.hash} className="w-full py-3">
                <div className="flex items-start space-x-2">
                  <Blockies
                    seed={entry.identity.id}
                    size={6}
                    className="rounded-full"
                  />
                  <span className="text-gray-600 text-sm font-semibold">
                    {entry.payload.value}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <form className="w-full flex space-x-2 px-2" onSubmit={handleSubmit}>
          <input
            type="text"
            className="w-full border border-gray-300 p-2 rounded bg-white"
            value={message}
            onChange={handleChange}
            disabled={!db || isAdding}
          />
          <button
            type="submit"
            className="w-40 border border-gray-300 p-2 rounded bg-gray-600 text-white"
            disabled={!db || isAdding}
          >
            {db && !isAdding ? (
              <span>Submit</span>
            ) : (
              <span className="animate-pulse">Loading...</span>
            )}
          </button>
        </form>
      </main>
    </>
  )
}
