'use client'

import { useSession } from 'next-auth/react'

export function SessionTest() {
  const { data: session, status } = useSession()

  return (
    <div className="p-4 border rounded-lg m-4">
      <h2 className="text-lg font-bold mb-2">Session Test</h2>
      <p>Status: {status}</p>
      {session ? (
        <div>
          <p>Logged in</p>
          <p>Farcaster ID: {session.user?.fid}</p>
          <pre className="bg-gray-100 p-2 mt-2 rounded">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
      ) : (
        <p>Not logged in</p>
      )}
    </div>
  )
} 