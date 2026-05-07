import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-red-500 mb-6">
          Cold Email Tools
        </p>

        <h1 className="text-5xl font-extrabold leading-tight text-white mb-5">
          Your email is probably<br />
          <span className="text-red-500">dead by line 3.</span>
        </h1>

        <p className="text-lg text-neutral-400 leading-relaxed mb-10">
          Find out exactly where you lose the reader —<br />
          and fix it before you hit send.
        </p>

        <button
          onClick={() => navigate('/death-clock')}
          className="inline-block bg-red-500 hover:bg-red-600 text-white font-bold text-base px-8 py-3 rounded-md transition-colors mb-14"
        >
          Run the Death Clock &rarr;
        </button>

        <div className="border-t border-neutral-800 pt-10 flex flex-col gap-5 text-left mb-14">
          <Feature icon="⚡" title="Line-by-line attention score">
            Every sentence gets a score. Watch attention rise and fall as the reader moves through your email.
          </Feature>
          <Feature icon="💀" title="Death line detection">
            Pinpoints the exact line where the reader checks out. Everything after it was never read.
          </Feature>
          <Feature icon="✍️" title="AI rewrite for weak lines">
            Rewrites only the lines that failed — same email, sharper execution.
          </Feature>
        </div>

        <p className="text-neutral-600 text-sm">
          topoftheinbox.com &nbsp;&middot;&nbsp; More tools coming soon
        </p>
      </div>
    </div>
  )
}

function Feature({ icon, title, children }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 w-7 h-7 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center text-sm mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-white font-semibold text-sm mb-1">{title}</p>
        <p className="text-neutral-500 text-sm leading-relaxed">{children}</p>
      </div>
    </div>
  )
}
