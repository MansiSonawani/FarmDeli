const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 70 }, (_, i) => String(THIS_YEAR + 6 - i))

const selectClass =
  'w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15 disabled:bg-slate-50 disabled:text-slate-400'

// Value format: "" | "YYYY" | "YYYY-MM"
export default function DateInput({ label, value, onChange, disabled }) {
  const [year = '', month = ''] = (value || '').split('-')
  const set = (y, m) => onChange(y ? (m ? `${y}-${m}` : y) : '')
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        <select aria-label={`${label} month`} className={selectClass} value={month} disabled={disabled} onChange={(e) => set(year || String(THIS_YEAR), e.target.value)}>
          <option value="">Month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1).padStart(2, '0')}>
              {m}
            </option>
          ))}
        </select>
        <select aria-label={`${label} year`} className={selectClass} value={year} disabled={disabled} onChange={(e) => set(e.target.value, month)}>
          <option value="">Year</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
