import { createBlock } from '@/app/(dashboard)/coach/_actions'
import Link from 'next/link'

export default function NewBlockPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/coach/blocks" className="text-sm text-gray-500 hover:text-gray-700">
          ← Blocks
        </Link>
      </div>

      <h1 className="text-2xl font-bold">New Block</h1>

      <form action={createBlock} className="space-y-5">
        <div className="space-y-1">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Block name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. Strength Phase 1"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="week_count" className="block text-sm font-medium text-gray-700">
            Number of weeks
          </label>
          <input
            id="week_count"
            name="week_count"
            type="number"
            required
            defaultValue={6}
            min={1}
            max={16}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          Create Block
        </button>
      </form>
    </main>
  )
}
