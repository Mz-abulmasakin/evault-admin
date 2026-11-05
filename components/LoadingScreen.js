export default function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />

        <p className="mt-4 text-sm text-slate-400">
          Loading Evault Admin...
        </p>
      </div>
    </div>
  );
}