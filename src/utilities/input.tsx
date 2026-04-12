import type { Dispatch, SetStateAction } from "react";

export default function Input(prop: {
  name: string;
  value: any;
  fn: Dispatch<SetStateAction<any>>;
  style?: any;
}) {
  function setValue(value: any) {
    console.log("value", value);

    prop.fn(value);
  }
  return (
    <input
      style={{width:"100%"}}
      className="bg-purple-primary hover:bg-purple-hover text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm active:scale-95"
      value={prop.value}
      onChange={(event) => setValue(event.target.value)}
    >
      {/* {prop.name} */}
    </input>
  );
}
