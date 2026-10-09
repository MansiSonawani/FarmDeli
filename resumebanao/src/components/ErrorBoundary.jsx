import { Component } from 'react'

// Catches render errors so one broken component doesn't blank the whole app.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="flex min-h-dvh flex-col justify-center px-6 sm:px-16">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-4 max-w-2xl text-5xl font-medium tracking-[-0.04em] sm:text-6xl">
          We hit an <span className="font-serif font-normal italic">unexpected</span> error.
        </h1>
        <p className="mt-5 max-w-lg text-ink-2">Your saved work is safe. Reload the page to continue.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-8 inline-flex h-11 items-center self-start rounded-full bg-ink px-6 text-sm font-medium text-paper"
        >
          Reload
        </button>
      </main>
    )
  }
}
