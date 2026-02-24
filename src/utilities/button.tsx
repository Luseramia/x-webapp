export default function Button(prop: { name: string; fn: VoidFunction }) {
  return (
    <button
      className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 border rounded-md outline w-xl"
      onClick={prop.fn}
    >
      {prop.name}
    </button>
  );
}
