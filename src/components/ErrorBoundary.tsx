import { Component, type ErrorInfo, type ReactNode } from "react";

const DATA_KEY = "studia:data:v2";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Top-level safety net. Without it, any render error unmounts the whole React
 * tree and leaves the user staring at a blank page. Offers a reload, a backup
 * download of the raw stored data (so nothing is lost), and a last-resort reset.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Only logs to the user's own console; no data leaves the browser.
    console.error("Studia crashed:", error, info.componentStack);
  }

  private downloadBackup = () => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(DATA_KEY);
    } catch {
      /* storage unavailable */
    }
    const blob = new Blob([raw ?? "{}"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `studia-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  private resetData = () => {
    if (
      !window.confirm(
        "This permanently deletes all Studia data stored in this browser. Download a backup first if you want to keep it. Continue?",
      )
    )
      return;
    try {
      localStorage.removeItem(DATA_KEY);
    } catch {
      /* ignore */
    }
    window.location.hash = "dashboard";
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main
        role="alert"
        className="min-h-screen flex items-center justify-center p-6 bg-bg-base text-fg"
      >
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-sm">
            Studia hit an unexpected error. Your data is still saved in this
            browser.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                window.location.hash = "dashboard";
                window.location.reload();
              }}
              className="px-4 h-10 rounded-xl bg-brand-500 text-white text-sm font-medium"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={this.downloadBackup}
              className="px-4 h-10 rounded-xl border border-border-default text-sm font-medium"
            >
              Download backup
            </button>
            <button
              type="button"
              onClick={this.resetData}
              className="px-4 h-10 rounded-xl border border-danger text-danger text-sm font-medium"
            >
              Reset data
            </button>
          </div>
        </div>
      </main>
    );
  }
}
