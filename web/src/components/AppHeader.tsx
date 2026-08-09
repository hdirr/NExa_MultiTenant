export default function AppHeader({
  initial,
  kicker,
  title,
  right,
  width = "max-w-6xl",
}: {
  initial: string;
  kicker: string;
  title: string;
  right?: React.ReactNode;
  width?: string;
}) {
  return (
    <header className="app-header">
      <div
        className={`${width} mx-auto px-5 sm:px-6 py-3.5 flex items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="logo-mark">{initial}</div>
          <div className="min-w-0">
            <div className="kicker">{kicker}</div>
            <div className="font-semibold leading-tight truncate">{title}</div>
          </div>
        </div>
        {right && <div className="flex items-center gap-2 sm:gap-3">{right}</div>}
      </div>
    </header>
  );
}
