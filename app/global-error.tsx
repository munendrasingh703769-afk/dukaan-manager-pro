'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gray-50">
          <span className="text-6xl mb-4">⚠️</span>
          <h2 className="text-xl font-bold text-red-600 mb-2">Kuch galat ho gaya!</h2>
          
          {/* 👇 Asli Error Message Yahan Dikhega */}
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl max-w-lg mx-auto mb-6 overflow-auto">
            <p className="font-bold mb-1">Error Details:</p>
            <p>{error?.message || "Unknown error"}</p>
            {error?.digest && <p className="mt-2 text-xs text-red-500">Digest: {error.digest}</p>}
          </div>

          <p className="text-gray-500 text-sm mb-6">
            Kripya upar diya gaya error message copy karke mujhe bhejein.
          </p>
          
          <button
            onClick={() => {
              try { reset(); } catch (e) { window.location.reload(); }
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}