export default function Button(prop: { name: string; fn: VoidFunction }) {
  return (
    <button
      className="bg-purple-primary hover:bg-purple-hover text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm active:scale-95"
      onClick={prop.fn}
    >
      {prop.name}
    </button>
  );
}
