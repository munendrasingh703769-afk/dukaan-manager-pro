'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Chunk Load Error (purani file) detect karein
  const isChunkError = 
    error?.name === 'ChunkLoadError' || 
    error?.message?.includes('Loading chunk') || 
    error?.message?.includes('Failed to fetch dynamically imported module');

  // Agar chunk error hai, toh ek baar auto-reload karein
  if (isChunkError) {
    if (typeof window !== 'undefined') {
      const lastReload = sessionStorage.getItem('lastReload');
      const now = Date.now();
      // Sirf tab reload karein agar 10 second me reload nahi hua
      if (!lastReload || now - Number(lastReload) > 10000) {
        sessionStorage.setItem('lastReload', String(now));
        window.location.reload();
      }
    }
  }

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
          <span className="text-6xl mb-4">⚠️</span>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Kuch galat ho gaya!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Page load nahi ho paya. Kripya dobara koshish karein.
          </p>
          <button
            onClick={() => {
              // reset() try karein, agar na chale toh hard reload karein
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