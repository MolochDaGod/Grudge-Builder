export default function WorldPageStub() {
  return (
    <div className="grid h-full place-items-center p-8 text-center text-white/70">
      <div className="max-w-md space-y-3">
        <h1 className="text-lg font-semibold text-white">Native world editor unavailable</h1>
        <p className="text-sm">
          This build was produced without the grudge-character-animator vendor. Character
          creation and the rest of Grudge Warlords still work — only the native /world route
          needs a full monorepo checkout.
        </p>
      </div>
    </div>
  );
}