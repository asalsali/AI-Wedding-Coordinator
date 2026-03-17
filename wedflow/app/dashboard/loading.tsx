export default function DashboardLoading() {
  return (
    <div className="flex h-screen bg-stone-50">
      {/* Sidebar skeleton */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-stone-200 flex flex-col">
        <div className="p-6 border-b border-stone-100">
          <div className="w-12 h-12 bg-stone-200 rounded-lg animate-pulse" />
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-stone-100 rounded-lg animate-pulse" />
          ))}
        </nav>
        <div className="p-4 border-t border-stone-100 space-y-2">
          <div className="h-4 bg-stone-100 rounded animate-pulse w-3/4" />
          <div className="h-8 bg-stone-100 rounded animate-pulse" />
        </div>
      </aside>

      {/* Main content skeleton */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="h-10 bg-stone-200 rounded-xl animate-pulse w-72" />
          <div className="h-64 bg-stone-200 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-stone-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
